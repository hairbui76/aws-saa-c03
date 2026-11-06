import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Highlighter, MessageSquarePlus, Quote, Trash2, X } from 'lucide-react';
import { describe, EXCLUDED, hitTest, indexText, locate, offsetsToRange, paint, rangeToOffsets } from '../lib/anchor';
import { addMark, appendNote, MARK_COLORS, marks, removeMark, updateMark, type Mark, type MarkColor } from '../lib/store';

export const COLOR_LABEL: Record<MarkColor, string> = { yellow: 'Vàng', green: 'Xanh lá', pink: 'Hồng', blue: 'Xanh dương' };
const EMPTY: Mark[] = [];

/** Ask the lesson page to scroll to a highlight and flash it. */
export const focusMark = (id: string) => window.dispatchEvent(new CustomEvent('saa:focus-mark', { detail: id }));

// ids of this lesson's highlights whose text is no longer in the lesson (the note says so)
let missingIds = new Set<string>();
const missingListeners = new Set<() => void>();
function setMissing(ids: Set<string>) {
  if (ids.size === missingIds.size && [...ids].every((i) => missingIds.has(i))) return;
  missingIds = ids;
  missingListeners.forEach((l) => l());
}
export const useMissingMarks = () =>
  useSyncExternalStore(
    (l) => (missingListeners.add(l), () => missingListeners.delete(l)),
    () => missingIds
  );

const asQuote = (text: string) =>
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `> ${l}`)
    .join('\n>\n');

const elementOf = (n: Node) => (n instanceof Element ? n : n.parentElement);

type Sel = { x: number; y: number; quote: string; prefix: string; suffix: string };
type Pop = { id: string; x: number; y: number; focus?: boolean };

/**
 * Highlights for one lesson: paints saved ones, offers a toolbar over a fresh selection
 * (colours, add a note, quote into the lesson note) and a popover to edit a highlight when clicked.
 */
export default function LessonMarks({
  lessonId,
  scope,
  focusId,
}: {
  lessonId: string;
  scope: RefObject<HTMLElement | null>;
  focusId?: string | null;
}) {
  const list = marks.use().items[lessonId] ?? EMPTY;
  const listRef = useRef(list);
  listRef.current = list;
  const ranges = useRef(new Map<string, Range>());
  const [sel, setSel] = useState<Sel | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [anchoredAt, setAnchoredAt] = useState(0);

  const anchor = useCallback(() => {
    const root = scope.current;
    if (!root) return;
    const idx = indexText(root);
    const map = new Map<string, Range>();
    const miss = new Set<string>();
    for (const m of listRef.current) {
      const o = locate(idx, m);
      const r = o && offsetsToRange(o[0], o[1], idx);
      if (r) map.set(m.id, r);
      else miss.add(m.id);
    }
    ranges.current = map;
    const found = listRef.current.filter((m) => map.has(m.id));
    for (const c of MARK_COLORS) paint(`hl-${c}`, found.filter((m) => m.color === c).map((m) => map.get(m.id)!));
    paint('hl-note', found.filter((m) => m.note?.trim()).map((m) => map.get(m.id)!), 1);
    setMissing(miss);
    setAnchoredAt(Date.now());
  }, [scope]);

  useEffect(anchor, [list, anchor]);

  // lesson content renders in pieces (diagrams, mermaid, fonts): re-anchor when its text changes
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    let t: ReturnType<typeof setTimeout>;
    const mo = new MutationObserver((muts) => {
      const relevant = muts.some((m) => {
        const el = elementOf(m.target);
        return el && !el.closest(EXCLUDED);
      });
      if (!relevant) return;
      clearTimeout(t);
      t = setTimeout(anchor, 150);
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      clearTimeout(t);
      mo.disconnect();
    };
  }, [scope, anchor]);

  useEffect(
    () => () => {
      for (const c of MARK_COLORS) paint(`hl-${c}`, []);
      paint('hl-note', []);
      paint('hl-focus', []);
      setMissing(new Set());
    },
    []
  );

  // flash a highlight that was jumped to
  useEffect(() => {
    const r = flash ? ranges.current.get(flash) : null;
    paint('hl-focus', r ? [r] : [], 2);
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash, anchoredAt]);

  const jump = useCallback((id: string) => {
    const r = ranges.current.get(id);
    if (!r) return false;
    const b = r.getBoundingClientRect();
    window.scrollTo({ top: b.top + window.scrollY - window.innerHeight / 3, behavior: 'smooth' });
    setFlash(id);
    return true;
  }, []);

  useEffect(() => {
    const on = (e: Event) => jump((e as CustomEvent<string>).detail);
    window.addEventListener('saa:focus-mark', on);
    return () => window.removeEventListener('saa:focus-mark', on);
  }, [jump]);

  // ?hl=<id> in the URL: jump once it is anchored
  const jumped = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || jumped.current === focusId || !anchoredAt) return;
    if (jump(focusId)) jumped.current = focusId;
  }, [focusId, anchoredAt, jump]);

  // a fresh selection inside the lesson text → toolbar
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const s = window.getSelection();
        const root = scope.current;
        if (!s || s.isCollapsed || !s.rangeCount || !root) return setSel(null);
        const r = s.getRangeAt(0);
        const anc = elementOf(r.commonAncestorContainer);
        if (!anc || !root.contains(anc) || anc.closest(EXCLUDED)) return setSel(null);
        const idx = indexText(root);
        const off = rangeToOffsets(r, idx);
        const d = off && describe(idx, off[0], off[1]);
        if (!d) return setSel(null);
        const b = r.getBoundingClientRect();
        setSel({ ...d, x: b.left + b.width / 2 + window.scrollX, y: b.top + window.scrollY });
      }, 160);
    };
    document.addEventListener('selectionchange', check);
    return () => {
      clearTimeout(t);
      document.removeEventListener('selectionchange', check);
    };
  }, [scope]);

  // clicking a painted highlight opens its popover; hovering one shows a pointer
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return;
      if ((e.target as Element).closest('a, button, input, textarea, .player, .mm-player')) return;
      const id = hitTest(ranges.current, e.clientX, e.clientY);
      if (id) setPop({ id, x: e.pageX, y: e.pageY });
    };
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => root.classList.toggle('on-mark', !!hitTest(ranges.current, e.clientX, e.clientY)));
    };
    root.addEventListener('click', onClick);
    root.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener('click', onClick);
      root.removeEventListener('mousemove', onMove);
      root.classList.remove('on-mark');
    };
  }, [scope]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };
  const create = (color: MarkColor) => {
    if (!sel) return null;
    const m = addMark(lessonId, { quote: sel.quote, prefix: sel.prefix, suffix: sel.suffix, color });
    clearSelection();
    return m;
  };

  const popMark = pop && list.find((m) => m.id === pop.id);

  return (
    <>
      {sel &&
        createPortal(
          <div
            className="mark-bar"
            style={{ left: sel.x, top: sel.y }}
            // keep the selection while clicking the toolbar
            onMouseDown={(e) => e.preventDefault()}
          >
            <Highlighter size={15} className="muted" />
            {MARK_COLORS.map((c) => (
              <button key={c} className={`swatch ${c}`} title={`Tô ${COLOR_LABEL[c].toLowerCase()}`} onClick={() => create(c)} />
            ))}
            <span className="mark-sep" />
            <button
              className="mark-act"
              title="Tô vàng và viết ghi chú cho đoạn này"
              onClick={() => {
                const x = sel.x;
                const y = sel.y;
                const m = create('yellow');
                if (m) setPop({ id: m.id, x, y: y + 24, focus: true });
              }}
            >
              <MessageSquarePlus size={15} /> Ghi chú
            </button>
            <button
              className="mark-act"
              title="Chép đoạn này vào ô Ghi chú của tôi"
              onClick={() => {
                appendNote(lessonId, `${asQuote(sel.quote)}\n`);
                clearSelection();
              }}
            >
              <Quote size={14} /> Trích
            </button>
          </div>,
          document.body
        )}
      {pop && popMark && (
        <MarkPopover key={pop.id} lessonId={lessonId} mark={popMark} x={pop.x} y={pop.y} autoFocus={pop.focus} onClose={() => setPop(null)} />
      )}
    </>
  );
}

function MarkPopover({
  lessonId,
  mark,
  x,
  y,
  autoFocus,
  onClose,
}: {
  lessonId: string;
  mark: Mark;
  x: number;
  y: number;
  autoFocus?: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState(mark.note ?? '');
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const latest = useRef(note);
  latest.current = note;

  useEffect(() => {
    if (autoFocus) area.current?.focus();
  }, [autoFocus]);

  // save while typing (debounced) and when closing
  useEffect(() => {
    if (note === (mark.note ?? '')) return;
    const t = setTimeout(() => updateMark(lessonId, mark.id, { note }), 350);
    return () => clearTimeout(t);
  }, [note, mark.note, mark.id, lessonId]);
  const close = useCallback(() => {
    if (latest.current !== (marks.get().items[lessonId]?.find((m) => m.id === mark.id)?.note ?? ''))
      updateMark(lessonId, mark.id, { note: latest.current });
    onClose();
  }, [lessonId, mark.id, onClose]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    // let the click that opened the popover finish first
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [close]);

  const W = 320;
  const left = Math.min(Math.max(x - W / 2, window.scrollX + 8), window.scrollX + document.documentElement.clientWidth - W - 8);

  return createPortal(
    <div ref={box} className="mark-pop" style={{ left, top: y + 12, width: W }}>
      <div className="row between">
        <div className="row">
          {MARK_COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${c} ${mark.color === c ? 'on' : ''}`}
              title={COLOR_LABEL[c]}
              onClick={() => updateMark(lessonId, mark.id, { color: c })}
            />
          ))}
        </div>
        <button className="icon-btn sm" onClick={close} title="Đóng (Esc)">
          <X size={14} />
        </button>
      </div>
      <blockquote className={`mark-quote ${mark.color}`}>{mark.quote}</blockquote>
      <textarea
        ref={area}
        value={note}
        rows={3}
        placeholder="Ghi chú cho đoạn này…"
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="row between small">
        <button
          className="link-btn"
          onClick={() => {
            appendNote(lessonId, `${asQuote(mark.quote)}${note.trim() ? `\n\n${note.trim()}` : ''}\n`);
            close();
          }}
        >
          <Quote size={13} /> Chép vào ghi chú của bài
        </button>
        <button
          className="link-btn danger-inline"
          onClick={() => {
            removeMark(lessonId, mark.id);
            onClose();
          }}
        >
          <Trash2 size={13} /> Bỏ tô
        </button>
      </div>
    </div>,
    document.body
  );
}
