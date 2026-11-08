import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, PanelTopOpen } from 'lucide-react';
import { loadJson, type Lesson } from '../lib/content';
import { parseLessonHref, peek, type PeekTarget } from '../lib/peek';

/** True inside the quick-view pop-up: a plain click there opens the next lesson in the pop-up too. */
export const InPeek = createContext(false);

const SHOW_MS = 350;
const HIDE_MS = 220;

const plain = (s: string) => s.replace(/\*\*|`/g, '');

/**
 * A link to another lesson. Hovering it (or a first tap on touch screens) shows a small card with the
 * lesson's TL;DR and two choices: open the page, or read it in a pop-up without leaving this one.
 */
export default function LessonLink({ href, children }: { href: string; children: ReactNode }) {
  const target = parseLessonHref(href)!;
  const inPeek = useContext(InPeek);
  const navigate = useNavigate();
  const ref = useRef<HTMLAnchorElement>(null);
  const [card, setCard] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const timer = useRef<number>(0);
  const touch = useRef(false);

  const clear = () => window.clearTimeout(timer.current);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const above = r.bottom + 190 > window.innerHeight && r.top > 200;
    setCard({ x: Math.max(8, Math.min(r.left, window.innerWidth - 328)), y: above ? r.top - 6 : r.bottom + 6, above });
    loadJson<Lesson>(`l/${target.id}.json`).then(setLesson, () => setLesson(null));
  };
  const hideSoon = () => {
    clear();
    timer.current = window.setTimeout(() => setCard(null), HIDE_MS);
  };
  useEffect(() => clear, []);
  // the card follows the link, so it goes away when the page (or the pop-up) scrolls
  useEffect(() => {
    if (!card) return;
    const off = () => setCard(null);
    window.addEventListener('scroll', off, true);
    window.addEventListener('resize', off);
    return () => {
      window.removeEventListener('scroll', off, true);
      window.removeEventListener('resize', off);
    };
  }, [card]);

  const openPeek = (t: PeekTarget = target) => {
    setCard(null);
    peek.open(t, inPeek);
  };
  const to = target.h ? `/l/${target.id}?h=${encodeURIComponent(target.h)}` : `/l/${target.id}`;

  return (
    <>
      <Link
        ref={ref}
        to={to}
        className="lesson-link"
        onPointerDown={(e) => (touch.current = e.pointerType !== 'mouse')}
        onPointerEnter={(e) => {
          touch.current = e.pointerType !== 'mouse';
          if (touch.current) return;
          clear();
          timer.current = window.setTimeout(show, SHOW_MS);
        }}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hideSoon()}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
          // touch: the first tap shows the choices instead of leaving the page
          if (touch.current && !card) {
            e.preventDefault();
            show();
            return;
          }
          if (inPeek) {
            e.preventDefault();
            openPeek();
          } else peek.close();
        }}
      >
        {children}
      </Link>
      {card &&
        createPortal(
          <div
            className={`peek-card ${card.above ? 'above' : ''}`}
            style={{ left: card.x, top: card.y }}
            onMouseEnter={clear}
            onMouseLeave={hideSoon}
            role="dialog"
            aria-label="Xem trước bài"
          >
            <span className="muted small">{lesson ? `Chương ${lesson.chapterId} · ${lesson.chapterTitle}` : 'Đang tải…'}</span>
            <b className="hand">{lesson?.title ?? target.id}</b>
            {target.h && <span className="small peek-card-h">↳ mục “{target.h}”</span>}
            {lesson?.tldr && <span className="small clamp3">{plain(lesson.tldr)}</span>}
            <div className="peek-card-actions">
              <button className="btn primary" onClick={() => openPeek()}>
                <PanelTopOpen size={15} /> Xem nhanh
              </button>
              <button
                className="btn"
                onClick={() => {
                  setCard(null);
                  peek.close();
                  navigate(to);
                }}
              >
                <ExternalLink size={15} /> Mở trang
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
