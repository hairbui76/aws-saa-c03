import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import { slug, useJson, type Lesson } from '../lib/content';
import { peek } from '../lib/peek';
import { Sketch } from './Sketch';
import Sections from './Sections';
import Markdown from './Markdown';
import { InPeek } from './LessonLink';
import { BookmarkButton } from './Bookmark';

/** Quick view of another lesson in a pop-up over the current page ("Xem nhanh"). */
export default function LessonPeek() {
  const stack = peek.use();
  const cur = stack[stack.length - 1];
  const { pathname } = useLocation();
  const { data: lesson, error } = useJson<Lesson>(cur ? `l/${cur.id}.json` : null);
  const body = useRef<HTMLDivElement>(null);

  // leaving the page closes it
  useEffect(() => peek.close(), [pathname]);

  // Esc: back one level, then close; the page behind doesn't scroll meanwhile
  useEffect(() => {
    if (!cur) return;
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (stack.length > 1) peek.back();
      else peek.close();
    };
    window.addEventListener('keydown', on);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', on);
      document.body.style.overflow = prev;
    };
  }, [cur, stack.length]);

  // start at the top, or at the section the link points to
  useEffect(() => {
    const el = body.current;
    if (!el || !lesson || lesson.id !== cur?.id) return;
    el.scrollTop = 0;
    if (cur.h) requestAnimationFrame(() => el.querySelector(`#${CSS.escape(slug(cur.h!))}`)?.scrollIntoView({ block: 'start' }));
  }, [lesson, cur]);

  if (!cur) return null;
  const to = cur.h ? `/l/${cur.id}?h=${encodeURIComponent(cur.h)}` : `/l/${cur.id}`;
  const ready = lesson && lesson.id === cur.id;

  return (
    <div className="modal-backdrop peek-backdrop" onMouseDown={(e) => e.target === e.currentTarget && peek.close()}>
      {/* a plain CSS frame: the sketched one would sit under the scrolling body and get covered */}
      <div className="modal peek" role="dialog" aria-modal="true" aria-label="Xem nhanh bài học">
        <header className="peek-head">
          {stack.length > 1 && (
            <button className="icon-btn" onClick={peek.back} title="Quay lại bài trước trong cửa sổ này (Esc)">
              <ArrowLeft size={17} />
            </button>
          )}
          <div className="peek-title">
            <span className="muted small">
              Xem nhanh{ready ? ` · Chương ${lesson.chapterId} ${lesson.chapterTitle}` : ''}
              {stack.length > 1 ? ` · ${stack.length} bài` : ''}
            </span>
            <b className="hand">{ready ? lesson.title : error ? 'Không tìm thấy bài' : 'Đang tải…'}</b>
          </div>
          {ready && <BookmarkButton lessonId={lesson.id} />}
          <Link className="btn primary peek-open" to={to} onClick={() => peek.close()} title="Mở trang đầy đủ của bài này">
            <ExternalLink size={15} /> <span>Mở trang</span>
          </Link>
          <button className="icon-btn" onClick={peek.close} title="Đóng (Esc)">
            <X size={18} />
          </button>
        </header>
        <div className="peek-body" ref={body}>
          {ready && (
            <InPeek.Provider value={true}>
              {lesson.tldr && (
                <Sketch className="card tldr" seed={`ptldr${lesson.id}`} fill="#e7f5ff" stroke="#1971c2">
                  <span className="tldr-tag">TL;DR</span>
                  <div className="prose">
                    <Markdown>{lesson.tldr}</Markdown>
                  </div>
                </Sketch>
              )}
              <Sections body={lesson.body} diagrams={lesson.diagrams} seed={`p${lesson.id}`} />
            </InPeek.Provider>
          )}
        </div>
      </div>
    </div>
  );
}
