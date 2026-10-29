import { useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import rough from 'roughjs';

const gen = rough.generator();

function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) || 1;
}

/** A box whose border is drawn by rough.js, so cards look hand-sketched like Excalidraw. */
export function Sketch({
  children,
  className = '',
  seed = 'x',
  stroke = '#1e1e1e',
  strokeWidth = 2,
  fill,
  roughness = 1.1,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  seed?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  roughness?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.offsetWidth, el.offsetHeight]));
    ro.observe(el);
    setSize([el.offsetWidth, el.offsetHeight]);
    return () => ro.disconnect();
  }, []);
  const paths = useMemo(() => {
    const [w, h] = size;
    if (!w || !h) return [];
    const r = Math.min(14, w / 6, h / 6);
    const d = `M${r + 2} 2 L${w - r - 2} 2 Q${w - 2} 2 ${w - 2} ${r + 2} L${w - 2} ${h - r - 2} Q${w - 2} ${h - 2} ${w - r - 2} ${h - 2} L${r + 2} ${h - 2} Q2 ${h - 2} 2 ${h - r - 2} L2 ${r + 2} Q2 2 ${r + 2} 2 Z`;
    return gen.toPaths(
      gen.path(d, { seed: hash(seed), roughness, bowing: 0.6, stroke, strokeWidth, fill, fillStyle: 'solid' })
    );
  }, [size, seed, stroke, strokeWidth, fill, roughness]);
  return (
    <div ref={ref} className={`sk ${className}`} {...rest}>
      <svg className="sk-border" width={size[0]} height={size[1]} aria-hidden>
        {paths.map((p, i) => (
          <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill || 'none'} />
        ))}
      </svg>
      {children}
    </div>
  );
}

/** Hand-drawn progress bar. */
export function SketchBar({ value, color = '#4c6ef5' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="sk-bar">
      <div className="sk-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stars({ score, total }: { score: number; total: number }) {
  const n = total ? (score / total >= 1 ? 3 : score / total >= 0.8 ? 2 : score / total >= 0.6 ? 1 : 0) : 0;
  return (
    <span className="stars" title={`${score}/${total}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'on' : ''}>
          ★
        </span>
      ))}
    </span>
  );
}
