import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { Diagram, DiagramEl } from '../lib/content';
import { buildModel, stepDurationMs, type Item, type Model } from '../lib/diagram';

type Phase = 'poster' | 'playing' | 'paused' | 'ended';
const SPEEDS = [0.75, 1, 1.5, 2];

function DiagramText({ t }: { t: DiagramEl }) {
  const fs = t.fs || 16;
  const lines = (t.text || '').split('\n');
  const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start';
  const x = t.align === 'center' ? t.x + t.w / 2 : t.align === 'right' ? t.x + t.w : t.x;
  return (
    <text x={x} textAnchor={anchor} fill={t.stroke} fontSize={fs * 1.08} className="dg-text">
      {lines.map((line, i) => (
        <tspan key={i} x={x} y={t.y + i * fs * 1.25 + fs * 1.02}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function ItemView({ it, state, highlight }: { it: Item; state: 'enter' | 'shown' | 'dim'; highlight: boolean }) {
  const delay = it.order * 0.14;
  const style = { '--d': `${delay}s` } as CSSProperties;
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
          <DiagramText t={t} />
        </g>
      ))}
    </g>
  );
}

/** Dots travelling along arrows; driven by rAF so they start when the arrow is drawn. */
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
        if (t < 0) {
          c.style.opacity = '0';
          return;
        }
        const f = (t % (dur + 350)) / dur;
        if (f > 1) {
          c.style.opacity = '0';
          return;
        }
        let target = f * (a.length || 0);
        let x = pts[0][0], y = pts[0][1];
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
          fill={slow ? '#ffd43b' : '#ffd43b'}
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
  className,
  width,
}: {
  model: Model;
  cur: number;
  phase: Phase;
  runKey: number;
  className?: string;
  width?: number;
}) {
  const [bx, by, bw, bh] = model.box;
  const live = phase === 'playing' || phase === 'paused';
  const allShown = !live;
  const currentArrows = useMemo(
    () => model.items.filter((i) => i.kind === 'arrow' && (allShown || i.step === cur) && i.motion),
    [model, cur, allShown]
  );
  return (
    <svg
      className={`dg-svg ${className || ''}`}
      viewBox={`${bx} ${by} ${bw} ${bh}`}
      role="img"
      style={width ? { width, minWidth: width } : undefined}
    >
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
  return <DiagramSvg model={model} cur={model.steps.length} phase="poster" runKey={0} className={className} />;
}

export default function AnimatedDiagram({ diagram, name }: { diagram: Diagram; name: string }) {
  const model = useMemo(() => buildModel(diagram), [diagram]);
  const last = model.steps.length - 1;
  const [phase, setPhase] = useState<Phase>('poster');
  const [cur, setCur] = useState(last);
  const [runKey, setRunKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState(false);
  const wrap = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // zoom only helps when the diagram is being shrunk noticeably
  const [canZoom, setCanZoom] = useState(false);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanZoom(model.box[2] > el.clientWidth * 1.15));
    ro.observe(el);
    return () => ro.disconnect();
  }, [model]);

  const go = useCallback(
    (step: number, next: Phase) => {
      setCur(Math.max(0, Math.min(last, step)));
      setRunKey((k) => k + 1);
      setPhase(next);
    },
    [last]
  );

  // auto-advance
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setTimeout(() => {
      if (cur >= last) setPhase('ended');
      else go(cur + 1, 'playing');
    }, stepDurationMs(model, cur) / speed);
    return () => clearTimeout(t);
  }, [phase, cur, last, model, speed, go]);

  // pause when scrolled away
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
    const onFs = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggle = () => {
    if (phase === 'playing') setPhase('paused');
    else if (phase === 'paused') setPhase('playing');
    else go(0, 'playing');
  };

  const step = model.steps[phase === 'poster' ? 0 : cur];
  const caption =
    phase === 'poster'
      ? `${model.steps.length} bước · bấm ▶ để xem sơ đồ được vẽ từng bước`
      : phase === 'ended'
        ? 'Hết. Bấm ↺ để xem lại, hoặc dùng ◀ ▶ để đi từng bước.'
        : step?.caption || '';

  return (
    <figure
      ref={wrap}
      className={`player ${phase} ${full ? 'is-full' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ') (e.preventDefault(), toggle());
        if (e.key === 'ArrowRight') go(cur + 1, 'paused');
        if (e.key === 'ArrowLeft') go(cur - 1, 'paused');
      }}
    >
      <div
        ref={stage}
        className={`player-stage ${zoom && canZoom ? 'zoomed' : ''}`}
        onClick={phase === 'poster' || phase === 'ended' ? toggle : undefined}
      >
        <DiagramSvg
          model={model}
          cur={cur}
          phase={phase}
          runKey={runKey}
          width={zoom && canZoom ? Math.round(model.box[2] * 0.95) : undefined}
        />
        {phase === 'poster' && (
          <button className="player-big-play" aria-label="Phát sơ đồ động">
            <Play size={30} fill="currentColor" />
            <span>Xem sơ đồ động</span>
          </button>
        )}
      </div>
      <div className="player-caption" aria-live="polite">
        {phase !== 'poster' && phase !== 'ended' && (
          <span className="step-badge">{step?.badge ?? cur + 1}</span>
        )}
        <span>{caption}</span>
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
              style={{ '--dur': `${stepDurationMs(model, i) / speed}ms` } as CSSProperties}
              title={s.caption || `Bước ${i}`}
              onClick={() => go(i, 'paused')}
            >
              <i key={i === cur ? runKey : undefined} className={phase === 'paused' ? 'paused' : ''} />
            </button>
          ))}
        </div>
        <span className="player-count">
          {phase === 'poster' ? '' : `${Math.min(cur, last) + 1}/${model.steps.length}`}
        </span>
        <button
          className="chip-btn"
          onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
          title="Tốc độ"
        >
          {speed}x
        </button>
        {canZoom && (
          <button
            className={`icon-btn ${zoom ? 'on' : ''}`}
            title={zoom ? 'Thu vừa khung' : 'Phóng to cỡ thật (cuộn ngang)'}
            onClick={() => setZoom(!zoom)}
          >
            {zoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
          </button>
        )}
        <button
          className="icon-btn"
          title={full ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          onClick={() => (full ? document.exitFullscreen() : wrap.current?.requestFullscreen())}
        >
          {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <figcaption className="player-name">🎬 {name}</figcaption>
    </figure>
  );
}
