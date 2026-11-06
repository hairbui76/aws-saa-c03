import { useCallback, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Eraser, Highlighter, PenLine, Trash2, Undo2, X } from 'lucide-react';
import { ink, setInk, type Stroke } from '../lib/store';

// Freehand drawing on a diagram. Strokes live in the diagram's own SVG coordinates (its viewBox),
// so they stay on what they circle at any zoom, screen width or in fullscreen.

export const PEN_COLORS = [
  { c: '#e03131', label: 'Đỏ' },
  { c: '#1971c2', label: 'Xanh dương' },
  { c: '#2f9e44', label: 'Xanh lá' },
  { c: '#1e1e1e', label: 'Đen' },
];
const HL = { c: '#fcc419', o: 0.4 };

export type InkTool = { kind: 'pen'; color: string } | { kind: 'hl' } | { kind: 'eraser' };
const EMPTY: Stroke[] = [];

/** Strokes of one diagram plus an undo history for this visit. */
export function useInk(key: string) {
  const strokes = ink.use().items[key] ?? EMPTY;
  const hist = useRef<Stroke[][]>([]);
  const [, bump] = useState(0);
  const snapshot = useCallback(() => {
    hist.current.push(ink.get().items[key] ?? EMPTY);
    if (hist.current.length > 60) hist.current.shift();
    bump((n) => n + 1);
  }, [key]);
  const set = useCallback((next: Stroke[]) => setInk(key, next), [key]);
  const undo = useCallback(() => {
    const prev = hist.current.pop();
    if (prev) setInk(key, prev);
    bump((n) => n + 1);
  }, [key]);
  const clear = useCallback(() => {
    snapshot();
    setInk(key, []);
  }, [key, snapshot]);
  /** the freshest list (event handlers can run before a re-render) */
  const get = useCallback(() => ink.get().items[key] ?? EMPTY, [key]);
  return { strokes, get, snapshot, set, undo, clear, canUndo: hist.current.length > 0 };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Smooth path through the points (quadratic curves via midpoints). */
function pathOf(p: number[]) {
  if (p.length <= 2) return `M${p[0]} ${p[1]} l0.01 0`;
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length - 2; i += 2) d += ` Q${p[i]} ${p[i + 1]} ${r1((p[i] + p[i + 2]) / 2)} ${r1((p[i + 1] + p[i + 3]) / 2)}`;
  return `${d} L${p[p.length - 2]} ${p[p.length - 1]}`;
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hits(s: Stroke, x: number, y: number, r: number) {
  const p = s.p;
  const reach = r + s.w / 2;
  if (p.length === 2) return Math.hypot(x - p[0], y - p[1]) <= reach;
  for (let i = 0; i < p.length - 2; i += 2) if (distToSeg(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= reach) return true;
  return false;
}

/**
 * Rendered inside the diagram's <svg>. Shows saved strokes; while `tool` is set, a transparent
 * surface on top takes pointer input (mouse, pen or finger) and stops the viewport from panning.
 */
export function InkLayer({
  box,
  inkApi,
  tool,
  hidden,
}: {
  box: [number, number, number, number];
  inkApi: ReturnType<typeof useInk>;
  tool: InkTool | null;
  hidden?: boolean;
}) {
  const [bx, by, bw, bh] = box;
  const unit = Math.max(bw, bh) / 380;
  const [live, setLive] = useState<Stroke | null>(null);
  const active = useRef<number | null>(null);
  const pts = useRef<number[]>([]);
  const base = useRef<Stroke | null>(null);
  // one undo step per eraser drag, taken on the first stroke it actually removes
  const erased = useRef(false);

  const toLocal = (e: RPointerEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement!;
    const r = svg.getBoundingClientRect();
    // the svg keeps its aspect ratio (xMidYMid meet) inside its box
    const k = Math.min(r.width / bw, r.height / bh);
    const ox = r.left + (r.width - bw * k) / 2;
    const oy = r.top + (r.height - bh * k) / 2;
    return [r1(bx + (e.clientX - ox) / k), r1(by + (e.clientY - oy) / k)] as const;
  };

  const erase = (x: number, y: number) => {
    const list = inkApi.get();
    const rest = list.filter((s) => !hits(s, x, y, unit * 3));
    if (rest.length === list.length) return;
    if (!erased.current) inkApi.snapshot();
    erased.current = true;
    inkApi.set(rest);
  };

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <g className="ink">
      {!hidden &&
        inkApi.strokes.map((s, i) => (
          <path
            key={i}
            d={pathOf(s.p)}
            stroke={s.c}
            strokeWidth={s.w}
            strokeOpacity={s.o}
            className={s.o ? 'ink-hl' : undefined}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      {live && (
        <path
          d={pathOf(live.p)}
          stroke={live.c}
          strokeWidth={live.w}
          strokeOpacity={live.o}
          className={live.o ? 'ink-hl' : undefined}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {tool && (
        <rect
          className={`ink-surface ${tool.kind}`}
          x={bx}
          y={by}
          width={bw}
          height={bh}
          fill="transparent"
          onPointerDown={(e) => {
            stop(e);
            if (active.current !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
            active.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            const [x, y] = toLocal(e);
            if (tool.kind === 'eraser') {
              erased.current = false;
              erase(x, y);
              return;
            }
            pts.current = [x, y];
            base.current =
              tool.kind === 'hl' ? { c: HL.c, o: HL.o, w: unit * 7, p: [] } : { c: tool.color, w: unit * 1.3, p: [] };
            setLive({ ...base.current, p: pts.current });
          }}
          onPointerMove={(e) => {
            stop(e);
            if (active.current !== e.pointerId) return;
            const [x, y] = toLocal(e);
            if (tool.kind === 'eraser') return erase(x, y);
            const p = pts.current;
            // skip points too close to the last one: smaller files, smoother lines
            if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) < unit * 0.6) return;
            pts.current = [...p, x, y];
            setLive((s) => (s ? { ...s, p: pts.current } : s));
          }}
          onPointerUp={(e) => {
            stop(e);
            if (active.current !== e.pointerId) return;
            active.current = null;
            if (base.current) {
              inkApi.snapshot();
              inkApi.set([...inkApi.get(), { ...base.current, p: pts.current }]);
            }
            base.current = null;
            setLive(null);
          }}
          onPointerCancel={(e) => {
            stop(e);
            active.current = null;
            base.current = null;
            setLive(null);
          }}
          onClick={stop}
          onDoubleClick={stop}
        />
      )}
    </g>
  );
}

/** Drawing toolbar shown above the diagram while in drawing mode. */
export function InkBar({
  tool,
  setTool,
  inkApi,
  onDone,
}: {
  tool: InkTool;
  setTool: (t: InkTool) => void;
  inkApi: ReturnType<typeof useInk>;
  onDone: () => void;
}) {
  return (
    <div className="ink-bar">
      {PEN_COLORS.map((p) => (
        <button
          key={p.c}
          className={`ink-pen ${tool.kind === 'pen' && tool.color === p.c ? 'on' : ''}`}
          style={{ color: p.c }}
          title={`Bút ${p.label.toLowerCase()}`}
          onClick={() => setTool({ kind: 'pen', color: p.c })}
        >
          <PenLine size={16} />
        </button>
      ))}
      <button className={`ink-pen ${tool.kind === 'hl' ? 'on' : ''}`} style={{ color: '#e8a600' }} title="Bút dạ quang" onClick={() => setTool({ kind: 'hl' })}>
        <Highlighter size={16} />
      </button>
      <button className={`ink-pen ${tool.kind === 'eraser' ? 'on' : ''}`} title="Tẩy: chạm vào nét để xóa" onClick={() => setTool({ kind: 'eraser' })}>
        <Eraser size={16} />
      </button>
      <span className="vp-sep" />
      <button className="ink-pen" title="Hoàn tác (Ctrl Z)" onClick={inkApi.undo} disabled={!inkApi.canUndo}>
        <Undo2 size={16} />
      </button>
      <button
        className="ink-pen"
        title="Xóa hết nét vẽ trên sơ đồ này"
        disabled={!inkApi.strokes.length}
        onClick={() => confirm('Xóa hết nét vẽ trên sơ đồ này?') && inkApi.clear()}
      >
        <Trash2 size={16} />
      </button>
      <span className="ink-hint muted small">Vẽ bằng chuột, bút hoặc ngón tay · tự lưu</span>
      <button className="btn ink-done" onClick={onDone}>
        <X size={15} /> Xong
      </button>
    </div>
  );
}
