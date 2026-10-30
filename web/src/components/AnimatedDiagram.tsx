import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Diagram, DiagramEl } from '../lib/content';
import { buildModel, stepDurationMs, stepSig, type Item, type Model } from '../lib/diagram';
import { viewPrefs } from '../lib/store';
import Viewport, { ZoomButtons, type ViewportApi } from './Viewport';

type Phase = 'poster' | 'playing' | 'paused' | 'ended';
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const FONT_MIN = 0.8;
const FONT_MAX = 1.9;

// width of the widest line in the hand font, measured once per text/size
const measureCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(lines: string[], size: number) {
  const key = `${size}|${lines.join('\n')}`;
  let w = measureCache.get(key);
  if (w == null) {
    measureCtx ??= document.createElement('canvas').getContext('2d');
    if (!measureCtx) return 0;
    measureCtx.font = `${size}px "Patrick Hand"`;
    w = Math.max(...lines.map((l) => measureCtx!.measureText(l).width));
    measureCache.set(key, w);
  }
  return w;
}

// re-render once the hand font has loaded so measurements use it
function useFontsReady() {
  const [ready, setReady] = useState(() => document.fonts?.status === 'loaded');
  useEffect(() => {
    if (ready) return;
    document.fonts?.ready.then(() => {
      measureCache.clear();
      setReady(true);
    });
  }, [ready]);
  return ready;
}

function DiagramText({ t, scale, maxW }: { t: DiagramEl; scale: number; maxW?: number }) {
  const lines = (t.text || '').split('\n');
  const base = (t.fs || 16) * 1.08;
  // titles are already large; everything else grows only as far as its room allows:
  // the box for labels inside shapes, a little past the original width for loose text
  const s = (t.fs || 16) >= 22 ? Math.min(scale, 1) : scale;
  let fs = base * s;
  const room = maxW ?? t.w * 1.15;
  if (s > 1) {
    const w = textWidth(lines, base);
    if (w * s > room) fs = Math.max(base, (room / w) * base);
  }
  const lh = fs * 1.2;
  const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start';
  const x = t.align === 'center' ? t.x + t.w / 2 : t.align === 'right' ? t.x + t.w : t.x;
  // labels inside shapes stay centred on the shape when the font grows; loose text grows downward
  const top = t.cid ? t.y + t.h / 2 - (lines.length * lh) / 2 : t.y;
  return (
    <text x={x} textAnchor={anchor} fill={t.stroke} fontSize={fs} className="dg-text">
      {lines.map((line, i) => (
        <tspan key={i} x={x} y={top + i * lh + fs * 0.92}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function ItemView({
  it,
  state,
  highlight,
  fontScale,
}: {
  it: Item;
  state: 'enter' | 'shown' | 'dim';
  highlight: boolean;
  fontScale: number;
}) {
  const style = { '--d': `${it.order * 0.14}s` } as CSSProperties;
  return (
    <g className={`dg-item dg-${it.kind} ${state}`} style={style} opacity={it.el.op != null ? it.el.op / 100 : undefined}>
      {highlight && it.highlight && (
        <g className="dg-hl">
          {it.highlight.map((p, i) => (
            <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.sw} fill="none" />
          ))}
        </g>
      )}
      {it.paths
        .filter((p) => p.kind === 'fill')
        .map((p, i) => (
          <path key={`f${i}`} className="dg-fill" d={p.d} fill={p.fill} stroke="none" />
        ))}
      {it.paths
        .filter((p) => p.kind === 'stroke')
        .map((p, i) => (
          <path
            key={`s${i}`}
            className={`${it.dashed ? 'dg-dash' : 'dg-stroke'}${it.kind === 'arrow' && i > 0 ? ' dg-head' : ''}`}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.sw}
            fill="none"
            pathLength={it.dashed ? undefined : 1}
            strokeLinecap="round"
          />
        ))}
      {it.texts.map((t) => (
        <g key={t.id} className="dg-label">
          <DiagramText
            t={t}
            scale={fontScale}
            maxW={it.kind === 'node' && t.cid === it.id ? (it.el.type === 'rectangle' ? it.el.w - 14 : it.el.w * 0.78) : undefined}
          />
        </g>
      ))}
    </g>
  );
}

/** Dots travelling along arrows; driven by rAF so they start once the arrow is drawn. */
function Packets({ arrows, running, slow }: { arrows: Item[]; running: boolean; slow: boolean }) {
  const refs = useRef<(SVGCircleElement | null)[]>([]);
  useEffect(() => {
    if (!running || !arrows.length) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      arrows.forEach((a, i) => {
        const c = refs.current[i];
        const pts = a.motion;
        if (!c || !pts || pts.length < 2) return;
        const startDelay = slow ? (i % 5) * 300 : a.order * 140 + 650;
        const dur = Math.max(900, (a.length || 200) * (slow ? 9 : 5));
        const t = now - t0 - startDelay;
        const f = t < 0 ? -1 : (t % (dur + 350)) / dur;
        if (f < 0 || f > 1) {
          c.style.opacity = '0';
          return;
        }
        let target = f * (a.length || 0);
        let x = pts[0][0];
        let y = pts[0][1];
        for (let k = 1; k < pts.length; k++) {
          const seg = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
          if (target <= seg) {
            const r = seg ? target / seg : 0;
            x = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * r;
            y = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * r;
            break;
          }
          target -= seg;
          x = pts[k][0];
          y = pts[k][1];
        }
        c.setAttribute('cx', String(x));
        c.setAttribute('cy', String(y));
        c.style.opacity = slow ? '0.7' : '1';
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [arrows, running, slow]);
  return (
    <g className="dg-packets">
      {arrows.map((a, i) => (
        <circle
          key={a.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          r={slow ? 5 : 7}
          fill="#ffd43b"
          stroke="#1e1e1e"
          strokeWidth={2}
          style={{ opacity: 0 }}
        />
      ))}
    </g>
  );
}

export function DiagramSvg({
  model,
  cur,
  phase,
  runKey,
  fontScale = 1.25,
  className,
}: {
  model: Model;
  cur: number;
  phase: Phase | 'static';
  runKey: number;
  fontScale?: number;
  className?: string;
}) {
  const [bx, by, bw, bh] = model.box;
  useFontsReady();
  const live = phase === 'playing' || phase === 'paused';
  const allShown = !live;
  const currentArrows = useMemo(
    () => model.items.filter((i) => i.kind === 'arrow' && (allShown || i.step === cur) && i.motion),
    [model, cur, allShown]
  );
  return (
    <svg className={`dg-svg ${className || ''}`} viewBox={`${bx} ${by} ${bw} ${bh}`} role="img">
      {model.items.map((it) => {
        if (!allShown && it.step > cur) return null;
        const entering = live && it.step === cur;
        const state = entering ? 'enter' : live && it.step < cur ? 'dim' : 'shown';
        return (
          <ItemView
            key={entering ? `${it.id}-${runKey}` : it.id}
            it={it}
            state={state}
            highlight={entering && it.kind === 'node'}
            fontScale={fontScale}
          />
        );
      })}
      {(live || phase === 'ended') && (
        <Packets
          key={`${runKey}-${phase === 'ended'}`}
          arrows={currentArrows}
          running={phase !== 'paused'}
          slow={phase === 'ended'}
        />
      )}
    </svg>
  );
}

export function StaticDiagram({ diagram, className }: { diagram: Diagram; className?: string }) {
  const model = useMemo(() => buildModel(diagram), [diagram]);
  return <DiagramSvg model={model} cur={model.steps.length} phase="static" runKey={0} fontScale={1} className={className} />;
}

export default function AnimatedDiagram({ diagram, name }: { diagram: Diagram; name: string }) {
  const model = useMemo(() => buildModel(diagram), [diagram]);
  const prefs = viewPrefs.use();
  // narration is only valid for the step sequence it was written for
  const narr = useMemo(
    () => (diagram.narr && diagram.narr.sig === stepSig(model) ? diagram.narr.steps : null),
    [diagram, model]
  );
  const last = model.steps.length - 1;
  const [tab, setTab] = useState<'static' | 'video'>(prefs.tab);
  const [phase, setPhase] = useState<Phase>('poster');
  const [cur, setCur] = useState(last);
  const [runKey, setRunKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [full, setFull] = useState(false);
  const [stepMs, setStepMs] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const vpApi = useRef<ViewportApi | null>(null);
  const wrap = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stepStart = useRef(0);

  const voiceOn = prefs.voice && !!narr;
  const clipFor = (i: number) => (narr?.[i]?.a ? `${import.meta.env.BASE_URL}audio/${narr[i].a}` : null);

  const go = useCallback(
    (step: number, next: Phase) => {
      setCur(Math.max(0, Math.min(last, step)));
      setRunKey((k) => k + 1);
      setPhase(next);
    },
    [last]
  );
  const curRef = useRef(cur);
  curRef.current = cur;
  const advance = useCallback(() => {
    if (curRef.current >= last) setPhase('ended');
    else go(curRef.current + 1, 'playing');
  }, [last, go]);

  // a new step starts: load its clip (if any) and measure how long the step should last
  useEffect(() => {
    stepStart.current = performance.now();
    setStepMs(null);
    const a = audio.current;
    a?.pause();
    if (phase === 'poster' || phase === 'ended') return;
    const src = voiceOn ? clipFor(cur) : null;
    if (!src) return;
    const el = a || (audio.current = new Audio());
    el.src = src;
    el.playbackRate = speed;
    el.onloadedmetadata = () => setStepMs(Math.max(el.duration * 1000, 1500) / speed + 600);
    if (phase === 'playing') el.play().catch(() => setStepMs(-1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, runKey, voiceOn]);

  // play / pause / speed changes on the current clip
  useEffect(() => {
    const a = audio.current;
    if (!a || !a.src || !voiceOn) return;
    a.playbackRate = speed;
    if (phase === 'playing' && a.paused && !a.ended) a.play().catch(() => {});
    if (phase !== 'playing') a.pause();
  }, [phase, speed, voiceOn]);

  // auto-advance: after the clip ends (plus a beat), or on a timer when there is no voice
  useEffect(() => {
    if (phase !== 'playing') return;
    const a = audio.current;
    const usingAudio = voiceOn && !!clipFor(cur) && stepMs !== -1;
    if (usingAudio && a) {
      const minMs = stepDurationMs(model, cur) * 0.55;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onEnd = () => {
        const elapsed = performance.now() - stepStart.current;
        timer = setTimeout(advance, Math.max(450, minMs - elapsed));
      };
      if (a.ended) onEnd();
      a.addEventListener('ended', onEnd);
      return () => {
        a.removeEventListener('ended', onEnd);
        clearTimeout(timer);
      };
    }
    const base = narr ? Math.max(stepDurationMs(model, cur), narr[cur].t.length * 70) : stepDurationMs(model, cur);
    const t = setTimeout(advance, base / speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cur, runKey, model, speed, voiceOn, stepMs, advance]);

  useEffect(() => () => audio.current?.pause(), []);

  // pause when scrolled away or when switching to the static tab
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) setPhase((p) => (p === 'playing' ? 'paused' : p));
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (tab === 'static') setPhase((p) => (p === 'playing' ? 'paused' : p));
  }, [tab]);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggle = () => {
    if (phase === 'playing') setPhase('paused');
    else if (phase === 'paused') setPhase('playing');
    else go(0, 'playing');
  };
  const setFont = (d: number) =>
    viewPrefs.update((p) => ({ ...p, fontScale: Math.round(Math.min(FONT_MAX, Math.max(FONT_MIN, p.fontScale + d)) * 100) / 100 }));
  const switchTab = (t: 'static' | 'video') => {
    setTab(t);
    viewPrefs.update((p) => ({ ...p, tab: t }));
  };

  const narrText = narr?.[cur]?.t;
  const total = Math.round(
    (narr ? narr.reduce((n, s) => n + s.t.length * 70, 0) : model.steps.reduce((n, _, i) => n + stepDurationMs(model, i), 0)) / 1000
  );
  // Every caption this player can show, stacked in one grid cell: the box is always as tall as the
  // longest one, so stepping through the video never makes the layout jump.
  const captions = [
    ...model.steps.map((s, i) => narr?.[i]?.t || s.caption || ''),
    `${model.steps.length} bước · khoảng ${Math.max(1, Math.round(total / 60))} phút${narr ? ' · có thuyết minh' : ''}`,
    'Hết. Bấm ↺ để xem lại, hoặc dùng ◀ ▶ để đi từng bước.',
  ];
  const captionIdx = phase === 'poster' ? model.steps.length : phase === 'ended' ? model.steps.length + 1 : cur;
  const showBadge = phase !== 'poster' && phase !== 'ended';
  const dur = stepMs && stepMs > 0 ? stepMs : narr ? Math.max(stepDurationMs(model, cur), (narrText?.length || 0) * 70) / speed : stepDurationMs(model, cur) / speed;

  const tools = (
    <div className="vp-tools">
      <button className="vp-btn" onClick={() => setFont(-0.15)} disabled={prefs.fontScale <= FONT_MIN} title="Chữ nhỏ hơn">
        <span className="vp-a small">A</span>−
      </button>
      <button className="vp-btn" onClick={() => setFont(0.15)} disabled={prefs.fontScale >= FONT_MAX} title="Chữ to hơn">
        <span className="vp-a">A</span>+
      </button>
      <span className="vp-sep" />
      <ZoomButtons api={vpApi} scale={scale} />
      <span className="vp-sep" />
      <button
        className="vp-btn"
        title={full ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        onClick={() => (full ? document.exitFullscreen() : wrap.current?.requestFullscreen())}
      >
        {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  );

  return (
    <figure
      ref={wrap}
      className={`player ${tab} ${phase} ${full ? 'is-full' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (tab !== 'video') return;
        if (e.key === ' ') (e.preventDefault(), toggle());
        if (e.key === 'ArrowRight') go(cur + 1, 'paused');
        if (e.key === 'ArrowLeft') go(cur - 1, 'paused');
      }}
    >
      <div className="player-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'static'} className={tab === 'static' ? 'on' : ''} onClick={() => switchTab('static')}>
          <ImageIcon size={16} /> Hình tĩnh
        </button>
        <button role="tab" aria-selected={tab === 'video'} className={tab === 'video' ? 'on' : ''} onClick={() => switchTab('video')}>
          <Clapperboard size={16} /> Video{narr ? ' thuyết minh' : ''}
        </button>
        <span className="player-title">{name}</span>
        {tools}
      </div>

      {tab === 'static' ? (
        <div className="player-stage">
          <Viewport resetKey={tab} apiRef={vpApi} onScale={setScale}>
            <DiagramSvg model={model} cur={last} phase="static" runKey={0} fontScale={prefs.fontScale} />
          </Viewport>
        </div>
      ) : (
        <>
          <div className="player-stage">
            <Viewport
              resetKey={tab}
              apiRef={vpApi}
              onScale={setScale}
              onTap={phase === 'poster' || phase === 'ended' ? toggle : undefined}
            >
              <DiagramSvg model={model} cur={cur} phase={phase} runKey={runKey} fontScale={prefs.fontScale} />
            </Viewport>
            {phase === 'poster' && (
              <button className="player-big-play" onClick={toggle} aria-label="Phát video sơ đồ">
                <Play size={30} fill="currentColor" />
                <span>{narr ? 'Xem video thuyết minh' : 'Xem sơ đồ động'}</span>
              </button>
            )}
          </div>
          <div className="player-caption" aria-live="polite">
            <span className={`step-badge ${showBadge ? '' : 'off'}`} aria-hidden={!showBadge}>
              {cur + 1}
            </span>
            <div className="cap-stack">
              {captions.map((c, i) => (
                <span key={i} className={i === captionIdx ? 'on' : ''} aria-hidden={i !== captionIdx}>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="player-bar">
            <button className="icon-btn" onClick={toggle} title={phase === 'playing' ? 'Tạm dừng (Space)' : 'Phát (Space)'}>
              {phase === 'playing' ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button className="icon-btn" onClick={() => go(cur - 1, 'paused')} title="Bước trước (←)" disabled={phase === 'poster'}>
              <ChevronLeft size={18} />
            </button>
            <button className="icon-btn" onClick={() => go(phase === 'poster' ? 0 : cur + 1, 'paused')} title="Bước sau (→)">
              <ChevronRight size={18} />
            </button>
            <button className="icon-btn" onClick={() => go(0, 'playing')} title="Xem lại từ đầu">
              <RotateCcw size={16} />
            </button>
            <div className="player-track">
              {model.steps.map((s, i) => (
                <button
                  key={i}
                  className={`seg ${phase !== 'poster' && (i < cur || phase === 'ended') ? 'done' : ''} ${
                    (phase === 'playing' || phase === 'paused') && i === cur ? 'now' : ''
                  }`}
                  style={{ '--dur': `${i === cur ? dur : stepDurationMs(model, i)}ms` } as CSSProperties}
                  title={narr?.[i]?.t || s.caption || `Bước ${i + 1}`}
                  onClick={() => go(i, 'paused')}
                >
                  <i key={i === cur ? `${runKey}-${stepMs ?? 0}` : undefined} className={phase === 'paused' ? 'paused' : ''} />
                </button>
              ))}
            </div>
            <span className="player-count">{phase === 'poster' ? '' : `${Math.min(cur, last) + 1}/${model.steps.length}`}</span>
            {narr && (
              <button
                className={`icon-btn ${prefs.voice ? 'on' : ''}`}
                onClick={() => viewPrefs.update((p) => ({ ...p, voice: !p.voice }))}
                title={prefs.voice ? 'Tắt giọng đọc' : 'Bật giọng đọc'}
              >
                {prefs.voice ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            )}
            <button className="chip-btn" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} title="Tốc độ">
              {speed}x
            </button>
          </div>
        </>
      )}
    </figure>
  );
}
