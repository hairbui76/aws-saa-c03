// Anchoring highlights to lesson text without touching the DOM React owns.
// The lesson's readable text is flattened into one string (text nodes in document order);
// a highlight stores its quote plus a little text before/after, and is found again by search.
// Painting uses the CSS Custom Highlight API (::highlight()), so no <mark> elements are inserted.

/** Where highlights may live: the lesson's TL;DR and content sections. */
const ALLOWED = '.tldr, .section';
/** Never inside these: own notes, diagrams, buttons, popovers. */
export const EXCLUDED = '.notes, .player, .mm-player, .mermaid-box, svg, button, textarea, input, .mark-pop, .mark-bar';

export type TextIndex = { text: string; nodes: { node: Text; start: number }[] };

export function indexText(root: HTMLElement): TextIndex {
  const nodes: TextIndex['nodes'] = [];
  let text = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const el = n.parentElement;
      if (!el || !el.closest(ALLOWED) || el.closest(EXCLUDED)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    nodes.push({ node: t, start: text.length });
    text += t.data;
  }
  return { text, nodes };
}

/** Character offsets of a DOM range in the index, or null when it covers no indexed text. */
export function rangeToOffsets(range: Range, idx: TextIndex): [number, number] | null {
  let s = -1;
  let e = -1;
  for (const { node, start } of idx.nodes) {
    if (!range.intersectsNode(node)) continue;
    const a = start + (node === range.startContainer ? range.startOffset : 0);
    const b = start + (node === range.endContainer ? range.endOffset : node.length);
    if (s < 0) s = a;
    e = b;
  }
  if (s < 0 || e <= s) return null;
  return [s, e];
}

export function offsetsToRange(s: number, e: number, idx: TextIndex): Range | null {
  let startNode: { node: Text; start: number } | undefined;
  let endNode: { node: Text; start: number } | undefined;
  for (const n of idx.nodes) {
    const end = n.start + n.node.length;
    if (!startNode && s >= n.start && s < end) startNode = n;
    if (e > n.start && e <= end) {
      endNode = n;
      break;
    }
  }
  if (!startNode || !endNode) return null;
  const r = document.createRange();
  r.setStart(startNode.node, s - startNode.start);
  r.setEnd(endNode.node, e - endNode.start);
  return r;
}

const CONTEXT = 32;

/** Quote + context for a new highlight. Leading/trailing whitespace of the selection is trimmed off. */
export function describe(idx: TextIndex, s: number, e: number) {
  while (s < e && /\s/.test(idx.text[s])) s++;
  while (e > s && /\s/.test(idx.text[e - 1])) e--;
  if (e <= s) return null;
  return {
    quote: idx.text.slice(s, e),
    prefix: idx.text.slice(Math.max(0, s - CONTEXT), s),
    suffix: idx.text.slice(e, e + CONTEXT),
  };
}

function commonSuffix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}
function commonPrefix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/** Find a quote again: of all its occurrences, the one whose surroundings match best. */
export function locate(idx: TextIndex, m: { quote: string; prefix: string; suffix: string }): [number, number] | null {
  if (!m.quote) return null;
  let best = -1;
  let bestScore = -1;
  for (let i = idx.text.indexOf(m.quote); i >= 0; i = idx.text.indexOf(m.quote, i + 1)) {
    const score =
      commonSuffix(idx.text.slice(Math.max(0, i - m.prefix.length), i), m.prefix) +
      commonPrefix(idx.text.slice(i + m.quote.length, i + m.quote.length + m.suffix.length), m.suffix);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best < 0 ? null : [best, best + m.quote.length];
}

// ---------- CSS Custom Highlight API, feature-detected ----------
type HighlightCtor = new (...ranges: Range[]) => { priority: number };
const g = globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> }; Highlight?: HighlightCtor };
export const canPaint = !!(g.CSS?.highlights && g.Highlight);

export function paint(name: string, ranges: Range[], priority = 0) {
  if (!canPaint) return;
  if (!ranges.length) {
    g.CSS!.highlights!.delete(name);
    return;
  }
  const h = new g.Highlight!(...ranges);
  h.priority = priority;
  g.CSS!.highlights!.set(name, h);
}

/** Id of the highlight drawn at a viewport point, if any (smallest one wins when they overlap). */
export function hitTest(ranges: Map<string, Range>, x: number, y: number): string | null {
  let hit: string | null = null;
  let size = Infinity;
  for (const [id, r] of ranges) {
    for (const b of r.getClientRects()) {
      if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
        const n = r.toString().length;
        if (n < size) [hit, size] = [id, n];
        break;
      }
    }
  }
  return hit;
}
