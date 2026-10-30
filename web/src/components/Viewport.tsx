import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { Maximize, Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import { viewPrefs } from '../lib/store';

export const FONT_MIN = 0.8;
export const FONT_MAX = 1.9;

/** Tracks whether `el` is the fullscreen element. */
export function useFullscreen(el: RefObject<HTMLElement | null>) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const onFs = () => setFull(!!el.current && document.fullscreenElement === el.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [el]);
  const toggle = () => (full ? document.exitFullscreen() : el.current?.requestFullscreen());
  return [full, toggle] as const;
}

/** Shared toolbar for every diagram: font size (A−/A+), zoom, fullscreen. */
export function DiagramTools({
  api,
  scale,
  full,
  onFull,
}: {
  api: { current: ViewportApi | null };
  scale: number;
  full: boolean;
  onFull: () => void;
}) {
  const { fontScale } = viewPrefs.use();
  const setFont = (d: number) =>
    viewPrefs.update((p) => ({ ...p, fontScale: Math.round(Math.min(FONT_MAX, Math.max(FONT_MIN, p.fontScale + d)) * 100) / 100 }));
  return (
    <div className="vp-tools">
      <button className="vp-btn" onClick={() => setFont(-0.15)} disabled={fontScale <= FONT_MIN} title="Chữ nhỏ hơn">
        <span className="vp-a small">A</span>−
      </button>
      <button className="vp-btn" onClick={() => setFont(0.15)} disabled={fontScale >= FONT_MAX} title="Chữ to hơn">
        <span className="vp-a">A</span>+
      </button>
      <span className="vp-sep" />
      <ZoomButtons api={api} scale={scale} />
      <span className="vp-sep" />
      <button className="vp-btn" title={full ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onClick={onFull}>
        {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  );
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;
const MIN = ZOOM_MIN;
const MAX = ZOOM_MAX;
type T = { s: number; x: number; y: number };
export type ViewportApi = { zoom: (factor: number) => void; reset: () => void };

/** Zoom buttons for a Viewport whose api is held by the caller (so they can live in a toolbar elsewhere). */
export function ZoomButtons({ api, scale }: { api: { current: ViewportApi | null }; scale: number }) {
  return (
    <>
      <button className="vp-btn" onClick={() => api.current?.zoom(1 / 1.4)} disabled={scale <= MIN} title="Thu nhỏ">
        <Minus size={15} />
      </button>
      <span className="vp-pct">{Math.round(scale * 100)}%</span>
      <button className="vp-btn" onClick={() => api.current?.zoom(1.4)} disabled={scale >= MAX} title="Phóng to (Ctrl + lăn chuột, hoặc pinch)">
        <Plus size={15} />
      </button>
      <button className="vp-btn" onClick={() => api.current?.reset()} disabled={scale === 1} title="Vừa khung">
        <Maximize size={14} />
      </button>
    </>
  );
}

/**
 * Pan/zoom container: buttons, Ctrl/⌘ + wheel (and trackpad pinch), two-finger pinch on touch,
 * drag to pan when zoomed, double-click to toggle zoom. A plain wheel or one-finger swipe still scrolls the page.
 */
export default function Viewport({
  children,
  onTap,
  resetKey,
  apiRef,
  onScale,
}: {
  children: ReactNode;
  onTap?: () => void;
  resetKey?: unknown;
  apiRef?: Ref<ViewportApi>;
  onScale?: (s: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<T>({ s: 1, x: 0, y: 0 });
  const tRef = useRef(t);
  tRef.current = t;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; pinch?: number }>({ moved: 0 });

  const clamp = useCallback((n: T): T => {
    const el = box.current;
    if (!el) return n;
    const s = Math.min(MAX, Math.max(MIN, n.s));
    const w = el.clientWidth;
    const h = el.clientHeight;
    return { s, x: Math.min(0, Math.max(w - w * s, n.x)), y: Math.min(0, Math.max(h - h * s, n.y)) };
  }, []);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const el = box.current;
      if (!el) return;
      const cur = tRef.current;
      const px = cx ?? el.clientWidth / 2;
      const py = cy ?? el.clientHeight / 2;
      const s = Math.min(MAX, Math.max(MIN, cur.s * factor));
      const k = s / cur.s;
      setT(clamp({ s, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k }));
    },
    [clamp]
  );

  useEffect(() => setT({ s: 1, x: 0, y: 0 }), [resetKey]);
  useEffect(() => onScale?.(t.s), [t.s, onScale]);
  useImperativeHandle(apiRef, () => ({ zoom: (f: number) => zoomAt(f), reset: () => setT({ s: 1, x: 0, y: 0 }) }), [zoomAt]);

  // wheel needs a non-passive listener to stop the page from zooming
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        if (tRef.current.s > 1) {
          e.preventDefault();
          setT((c) => clamp({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
        }
        return;
      }
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, clamp]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div
      ref={box}
      className={`vp ${t.s > 1 ? 'zoomed' : ''}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.vp-tools, button')) return;
        pointers.current.set(e.pointerId, local(e));
        gesture.current = { moved: 0 };
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        }
        if (tRef.current.s > 1 || pointers.current.size === 2) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const prev = pointers.current.get(e.pointerId);
        if (!prev) return;
        const p = local(e);
        pointers.current.set(e.pointerId, p);
        if (pointers.current.size === 2 && gesture.current.pinch) {
          const [a, b] = [...pointers.current.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          zoomAt(d / gesture.current.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
          gesture.current.pinch = d;
          gesture.current.moved += 10;
        } else if (tRef.current.s > 1) {
          setT((c) => clamp({ ...c, x: c.x + p.x - prev.x, y: c.y + p.y - prev.y }));
          gesture.current.moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
        }
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) gesture.current.pinch = undefined;
      }}
      onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.vp-tools, button')) return;
        if (gesture.current.moved < 6) onTap?.();
      }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.vp-tools, button')) return;
        const p = local(e);
        if (tRef.current.s > 1) setT({ s: 1, x: 0, y: 0 });
        else zoomAt(2.2, p.x, p.y);
      }}
    >
      <div className="vp-inner" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}>
        {children}
      </div>
      {t.s > 1 && <span className="vp-hint">Kéo để di chuyển · nhấp đúp để thu về</span>}
    </div>
  );
}
