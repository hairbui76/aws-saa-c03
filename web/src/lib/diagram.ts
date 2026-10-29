// Turns an Excalidraw scene into a step-by-step "video":
//   step 0  = title + zones (VPC, region, account… frames)
//   steps   = arrows grouped by their circled number ①②③ or, without numbers, by graph depth
//   rows    = shapes no arrow touches, revealed top-to-bottom (comparison tables)
//   last    = loose notes (⚠ exam tips at the bottom)
// Every shape is pre-rendered to rough.js paths so the component only toggles visibility.
import rough from 'roughjs';
import type { Diagram, DiagramEl } from './content';

const gen = rough.generator();

export type RPath = { d: string; stroke: string; sw: number; fill?: string; kind: 'stroke' | 'fill' };
export type Item = {
  id: string;
  kind: 'zone' | 'node' | 'arrow' | 'text';
  el: DiagramEl;
  paths: RPath[];
  texts: DiagramEl[];
  step: number;
  order: number;
  highlight?: RPath[];
  motion?: [number, number][];
  length?: number;
  dashed?: boolean;
};
export type Step = { caption: string; badge?: string };
export type Model = { box: [number, number, number, number]; items: Item[]; steps: Step[] };

const CIRCLED = /[①-⑳]/;
const circledNum = (s?: string) => {
  const m = s?.match(CIRCLED);
  return m ? m[0].charCodeAt(0) - 0x2460 + 1 : undefined;
};

type Rect = { x: number; y: number; w: number; h: number };
const inside = (a: Rect, b: Rect, tol = 3) =>
  a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const center = (r: Rect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];
const rectDist = (p: [number, number], r: Rect) => {
  const dx = Math.max(r.x - p[0], 0, p[0] - (r.x + r.w));
  const dy = Math.max(r.y - p[1], 0, p[1] - (r.y + r.h));
  return Math.hypot(dx, dy);
};
const rectRectDist = (a: Rect, b: Rect) => {
  const dx = Math.max(b.x - (a.x + a.w), 0, a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), 0, a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
};
function segDist(p: [number, number], a: [number, number], b: [number, number]) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}
const absPts = (e: DiagramEl) => (e.pts || []).map(([px, py]) => [e.x + px, e.y + py] as [number, number]);
function polyDist(r: Rect, pts: [number, number][]) {
  // distance from a text box to a polyline: sample the box's corners, edge midpoints and center
  const xs = [r.x, r.x + r.w / 2, r.x + r.w];
  const ys = [r.y, r.y + r.h / 2, r.y + r.h];
  let best = Infinity;
  for (const x of xs)
    for (const y of ys)
      for (let i = 1; i < pts.length; i++) best = Math.min(best, segDist([x, y], pts[i - 1], pts[i]));
  return best;
}

function roundedRect(x: number, y: number, w: number, h: number) {
  const r = Math.min(16, w / 4, h / 4);
  return `M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} Z`;
}

function toR(drawable: ReturnType<typeof gen.rectangle>): RPath[] {
  return gen.toPaths(drawable).map((p) => {
    const isFill = !!p.fill && p.fill !== 'none' && (!p.stroke || p.stroke === 'none');
    return { d: p.d, stroke: p.stroke, sw: p.strokeWidth, fill: p.fill, kind: isFill ? 'fill' : 'stroke' };
  });
}

function shapePaths(e: DiagramEl): RPath[] {
  const o = {
    seed: e.seed % 2 ** 31 || 1,
    roughness: 1,
    bowing: 1,
    stroke: e.stroke,
    strokeWidth: e.sw ?? 2,
    fill: e.bg,
    fillStyle: 'solid',
  };
  if (e.type === 'ellipse') return toR(gen.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w, e.h, o));
  if (e.type === 'diamond')
    return toR(
      gen.polygon(
        [
          [e.x + e.w / 2, e.y],
          [e.x + e.w, e.y + e.h / 2],
          [e.x + e.w / 2, e.y + e.h],
          [e.x, e.y + e.h / 2],
        ],
        o
      )
    );
  if (e.round) return toR(gen.path(roundedRect(e.x, e.y, e.w, e.h), o));
  return toR(gen.rectangle(e.x, e.y, e.w, e.h, o));
}

function highlightPaths(e: DiagramEl): RPath[] {
  return toR(
    gen.rectangle(e.x - 9, e.y - 9, e.w + 18, e.h + 18, {
      seed: (e.seed % 1000) + 7,
      roughness: 2,
      stroke: 'none',
      fill: '#ffd43b',
      fillStyle: 'hachure',
      hachureGap: 6,
      fillWeight: 3,
    })
  ).map((p) => ({ ...p, kind: 'stroke' as const }));
}

function arrowPaths(e: DiagramEl): { paths: RPath[]; pts: [number, number][] } {
  const pts = absPts(e);
  const o = { seed: e.seed % 2 ** 31 || 1, roughness: 0.9, bowing: 1, stroke: e.stroke, strokeWidth: e.sw ?? 2 };
  const body = e.round && pts.length > 2 ? gen.curve(pts, o) : gen.linearPath(pts, o);
  const paths = toR(body);
  const head = (tip: [number, number], from: [number, number]) => {
    const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
    const len = 14 + (e.sw ?? 2) * 1.5;
    const wing = (s: number): [number, number] => [tip[0] - len * Math.cos(a + s), tip[1] - len * Math.sin(a + s)];
    paths.push(...toR(gen.linearPath([wing(0.45), tip, wing(-0.45)], { ...o, roughness: 0.5 })));
  };
  if (pts.length >= 2) {
    if (e.ea) head(pts[pts.length - 1], pts[pts.length - 2]);
    if (e.sa) head(pts[0], pts[1]);
  }
  return { paths, pts };
}

const firstLine = (t?: DiagramEl) => (t?.text || '').split('\n')[0].trim();
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

export function buildModel(d: Diagram): Model {
  const els = d.els;
  const byId = new Map(els.map((e) => [e.id, e]));
  const shapes = els.filter((e) => e.type === 'rectangle' || e.type === 'ellipse' || e.type === 'diamond');
  const arrows = els.filter((e) => e.type === 'arrow' || e.type === 'line');
  const texts = els.filter((e) => e.type === 'text');

  // text bound to a shape or arrow (Excalidraw containerId)
  const bound = new Map<string, DiagramEl>();
  for (const t of texts) if (t.cid && byId.has(t.cid)) bound.set(t.cid, t);
  const free = texts.filter((t) => !t.cid || !byId.has(t.cid));

  // zones: frames that contain other shapes, or dashed empty outlines
  const area = (r: Rect) => r.w * r.h;
  const zoneIds = new Set(
    shapes
      .filter(
        (s) =>
          shapes.some((o) => o !== s && area(o) < area(s) && inside(o, s)) || (s.dash && !s.bg && !bound.has(s.id))
      )
      .map((s) => s.id)
  );
  const zones = shapes.filter((s) => zoneIds.has(s.id));
  const nodes = shapes.filter((s) => !zoneIds.has(s.id));

  // arrow endpoints -> shape ids
  const resolveEnd = (id: string | undefined, p: [number, number] | undefined) => {
    if (id) {
      const e = byId.get(id);
      if (e?.type === 'text' && e.cid) return e.cid;
      if (e) return id;
    }
    if (!p) return undefined;
    let best: DiagramEl | undefined;
    let bd = 40;
    for (const s of nodes) {
      const dd = rectDist(p, s);
      if (dd < bd) (bd = dd), (best = s);
    }
    return best?.id;
  };
  const ends = new Map<string, { from?: string; to?: string; pts: [number, number][] }>();
  for (const a of arrows) {
    const pts = absPts(a);
    ends.set(a.id, { from: resolveEnd(a.from, pts[0]), to: resolveEnd(a.to, pts[pts.length - 1]), pts });
  }

  // classify free text
  const contentTop = Math.min(...shapes.map((s) => s.y), ...arrows.flatMap((a) => absPts(a).map((p) => p[1])), Infinity);
  const titles: DiagramEl[] = [];
  const zoneLabel = new Map<string, DiagramEl[]>();
  const attached = new Map<string, DiagramEl[]>(); // owner id -> texts
  const notes: DiagramEl[] = [];
  const attach = (owner: string, t: DiagramEl) => attached.set(owner, [...(attached.get(owner) || []), t]);

  for (const t of free) {
    const inNode = nodes.filter((n) => inside(t, n)).sort((a, b) => area(a) - area(b))[0];
    if (inNode) {
      attach(inNode.id, t);
      continue;
    }
    const inZones = zones.filter((z) => inside(t, z)).sort((a, b) => area(a) - area(b));
    if (!inZones.length && t.y + t.h <= contentTop + 2) {
      titles.push(t);
      continue;
    }
    if (inZones[0] && t.y < inZones[0].y + 30 && t.x < inZones[0].x + 40) {
      zoneLabel.set(inZones[0].id, [...(zoneLabel.get(inZones[0].id) || []), t]);
      continue;
    }
    let nearArrow: DiagramEl | undefined;
    let da = Infinity;
    for (const a of arrows) {
      const dd = polyDist(t, ends.get(a.id)!.pts);
      if (dd < da) (da = dd), (nearArrow = a);
    }
    let nearNode: DiagramEl | undefined;
    let dn = Infinity;
    for (const n of nodes) {
      const dd = rectRectDist(t, n);
      if (dd < dn) (dn = dd), (nearNode = n);
    }
    const numbered = CIRCLED.test(t.text || '') && !/^[⚠🎯💡]/u.test((t.text || '').trim());
    if (nearArrow && da < 30) attach(nearArrow.id, t);
    else if (numbered && nearArrow && da < 220) attach(nearArrow.id, t);
    else if (nearNode && dn < 40) attach(nearNode.id, t);
    else if (nearArrow && da < 70) attach(nearArrow.id, t);
    else if (inZones[0] && nearNode && dn < 90) attach(nearNode.id, t);
    else notes.push(t);
  }

  const labelsOf = (id: string) => [bound.get(id), ...(attached.get(id) || [])].filter(Boolean) as DiagramEl[];

  // ---- ordering keys for arrows ----
  const nodeNum = new Map<string, number>();
  for (const n of nodes) {
    const k = circledNum(labelsOf(n.id).map((t) => t.text).join(' '));
    if (k) nodeNum.set(n.id, k);
  }
  const key = new Map<string, number>();
  for (const a of arrows) {
    const k = circledNum(labelsOf(a.id).map((t) => t.text).join(' '));
    const to = ends.get(a.id)!.to;
    if (k) key.set(a.id, k);
    else if (to && nodeNum.has(to)) key.set(a.id, nodeNum.get(to)!);
  }
  const hasNums = key.size > 0;
  if (hasNums) {
    // siblings: an unnumbered arrow leaving the same node as numbered arrow k is part of step k
    for (const a of arrows) {
      if (key.has(a.id)) continue;
      const from = ends.get(a.id)!.from;
      const sib = from && arrows.find((b) => b !== a && key.has(b.id) && ends.get(b.id)!.from === from);
      if (sib) key.set(a.id, key.get(sib.id)!);
    }
    // lead-ins: an unnumbered arrow feeding the source of arrow k happens right before k
    for (const a of arrows) {
      if (key.has(a.id)) continue;
      const to = ends.get(a.id)!.to;
      const next = to && arrows.filter((b) => key.has(b.id) && ends.get(b.id)!.from === to);
      if (next && next.length) key.set(a.id, Math.min(...next.map((b) => key.get(b.id)!)) - 0.5);
    }
    // chains: an unnumbered arrow leaving the target of arrow k happens right after k
    for (let pass = 0; pass < 4; pass++) {
      for (const a of arrows) {
        if (key.has(a.id)) continue;
        const from = ends.get(a.id)!.from;
        const feeder = arrows.find((b) => key.has(b.id) && ends.get(b.id)!.to === from);
        if (feeder) key.set(a.id, Math.floor(key.get(feeder.id)!) + 0.5);
      }
    }
  }
  // graph depth for the rest
  const depth = new Map<string, number>();
  {
    const out = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    const involved = new Set<string>();
    for (const a of arrows) {
      const { from, to } = ends.get(a.id)!;
      if (from) involved.add(from);
      if (to) involved.add(to);
      if (from && to && from !== to) {
        out.set(from, [...(out.get(from) || []), to]);
        indeg.set(to, (indeg.get(to) || 0) + 1);
      }
    }
    const xOf = (id: string) => byId.get(id)?.x ?? 0;
    let queue = [...involved].filter((n) => !indeg.get(n)).sort((a, b) => xOf(a) - xOf(b));
    let base = 0;
    while (depth.size < involved.size) {
      if (!queue.length) {
        const rest = [...involved].filter((n) => !depth.has(n)).sort((a, b) => xOf(a) - xOf(b));
        queue = [rest[0]];
        base = Math.max(0, ...depth.values()) + 1;
      }
      for (const q of queue) if (!depth.has(q)) depth.set(q, base);
      const next: string[] = [];
      for (const q of queue)
        for (const t of out.get(q) || [])
          if (!depth.has(t)) {
            depth.set(t, depth.get(q)! + 1);
            next.push(t);
          }
      queue = next;
    }
  }
  const maxNum = Math.max(0, ...key.values());
  for (const a of arrows) {
    if (key.has(a.id)) continue;
    const { from, to } = ends.get(a.id)!;
    const dep = from != null ? depth.get(from) ?? 0 : to != null ? Math.max(0, (depth.get(to) ?? 1) - 1) : 99;
    key.set(a.id, (hasNums ? maxNum + 1 : 0) + dep);
  }

  // ---- steps ----
  const steps: Step[] = [];
  const stepOf = new Map<string, number>();
  const introCaption = oneLine(titles[1]?.text || titles[0]?.text || '');
  steps.push({ caption: introCaption });

  // arrow groups by key, merged into at most 10 groups
  const keys = [...new Set(arrows.map((a) => key.get(a.id)!))].sort((a, b) => a - b);
  const perStep = Math.ceil(keys.length / 10) || 1;
  const arrowGroups: string[][] = [];
  keys.forEach((k, i) => {
    const g = Math.floor(i / perStep);
    arrowGroups[g] = [...(arrowGroups[g] || []), ...arrows.filter((a) => key.get(a.id) === k).map((a) => a.id)];
  });
  const touched = new Set<string>();
  for (const a of arrows) {
    const { from, to } = ends.get(a.id)!;
    if (from) touched.add(from);
    if (to) touched.add(to);
  }
  // nodes no arrow touches: reveal row by row (comparison tables, grids)
  const loose = nodes.filter((n) => !touched.has(n.id)).sort((a, b) => center(a)[1] - center(b)[1] || a.x - b.x);
  let rowGroups: string[][] = [];
  let rowY = -Infinity;
  let rowH = 0;
  for (const n of loose) {
    const cy = center(n)[1];
    if (cy > rowY + Math.max(25, rowH * 0.5)) {
      rowGroups.push([]);
      rowY = cy;
      rowH = n.h;
    }
    rowGroups[rowGroups.length - 1].push(n.id);
  }
  while (rowGroups.length > 8) {
    const merged: string[][] = [];
    for (let i = 0; i < rowGroups.length; i += 2) merged.push([...rowGroups[i], ...(rowGroups[i + 1] || [])]);
    rowGroups = merged;
  }
  // mostly a table with a few arrows -> show the table first
  const rowsFirst = loose.length > touched.size;
  const sequence = rowsFirst ? [...rowGroups, ...arrowGroups] : [...arrowGroups, ...rowGroups];
  for (const g of sequence) {
    steps.push({ caption: '' });
    for (const id of g) stepOf.set(id, steps.length - 1);
  }
  // nodes appear with the first arrow that touches them
  for (const a of arrows) {
    const { from, to } = ends.get(a.id)!;
    const s = stepOf.get(a.id)!;
    for (const n of [from, to]) if (n && !zoneIds.has(n) && (stepOf.get(n) ?? Infinity) > s) stepOf.set(n, s);
  }
  if (notes.length) steps.push({ caption: oneLine(notes.map((t) => t.text).join(' · ')) });
  const notesStep = steps.length - 1;

  // captions
  const label = (id?: string) => (id ? firstLine(labelsOf(id)[0]) : '');
  for (let s = 1; s < steps.length; s++) {
    if (notes.length && s === notesStep) continue;
    const stepArrows = arrows.filter((a) => stepOf.get(a.id) === s);
    let caption = '';
    if (stepArrows.length) {
      const own = [...new Set(stepArrows.flatMap((a) => labelsOf(a.id).map((t) => oneLine(t.text || ''))))].filter(Boolean);
      caption = own.length
        ? own.join(' · ')
        : stepArrows
            .slice(0, 3)
            .map((a) => {
              const { from, to } = ends.get(a.id)!;
              const f = label(from), t = label(to);
              return f && t ? `${f} → ${t}` : f || t;
            })
            .filter(Boolean)
            .join(' · ');
    } else {
      caption = nodes
        .filter((n) => stepOf.get(n.id) === s)
        .sort((a, b) => a.x - b.x)
        .slice(0, 4)
        .map((n) => oneLine(labelsOf(n.id).map((t) => t.text).join(' ')))
        .filter(Boolean)
        .join(' · ');
    }
    const num = circledNum(caption);
    steps[s] = { caption: caption.length > 240 ? caption.slice(0, 237) + '…' : caption, badge: num ? String(num) : undefined };
  }

  // ---- items ----
  const items: Item[] = [];
  zones
    .sort((a, b) => area(b) - area(a))
    .forEach((z) =>
      items.push({
        id: z.id,
        kind: 'zone',
        el: z,
        paths: shapePaths(z),
        texts: [...labelsOf(z.id), ...(zoneLabel.get(z.id) || [])],
        step: 0,
        order: 0,
        dashed: !!z.dash,
      })
    );
  for (const t of titles) items.push({ id: t.id, kind: 'text', el: t, paths: [], texts: [t], step: 0, order: 0 });
  for (const n of nodes)
    items.push({
      id: n.id,
      kind: 'node',
      el: n,
      paths: shapePaths(n),
      texts: labelsOf(n.id),
      step: stepOf.get(n.id) ?? 0,
      order: 0,
      highlight: highlightPaths(n),
      dashed: !!n.dash,
    });
  for (const a of arrows) {
    const { paths, pts } = arrowPaths(a);
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    items.push({
      id: a.id,
      kind: 'arrow',
      el: a,
      paths,
      texts: labelsOf(a.id),
      step: stepOf.get(a.id) ?? 0,
      order: 0,
      motion: pts,
      length,
      dashed: !!a.dash,
    });
  }
  for (const t of notes) items.push({ id: t.id, kind: 'text', el: t, paths: [], texts: [t], step: notesStep, order: 0 });

  // stagger inside each step: zones, then nodes (left→right), then arrows, then text
  const rank = { zone: 0, text: 0, node: 1, arrow: 2 } as const;
  const counters = new Map<number, number>();
  items
    .slice()
    .sort((a, b) => a.step - b.step || rank[a.kind] - rank[b.kind] || a.el.x - b.el.x || a.el.y - b.el.y)
    .forEach((it) => {
      const c = counters.get(it.step) || 0;
      it.order = c;
      counters.set(it.step, c + 1);
    });

  return { box: d.box, items, steps };
}

export function stepDurationMs(model: Model, step: number) {
  const n = model.items.filter((i) => i.step === step).length;
  const read = (model.steps[step]?.caption.length || 0) * 45;
  return Math.min(9000, Math.max(2600, 900 + Math.min(n, 12) * 160 + read));
}
