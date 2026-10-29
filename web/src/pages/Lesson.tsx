import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, CircleDot, MessageCircle, MonitorPlay } from 'lucide-react';
import { slug, useJson, type Chapter, type Lesson } from '../lib/content';
import { isDone, markVisited, progress, setDone } from '../lib/store';
import { Sketch } from '../components/Sketch';
import Sections, { splitSections } from '../components/Sections';
import Quiz from '../components/Quiz';
import ChatPanel from '../components/ChatPanel';
import { useUi } from '../App';

// The course videos are only served by the local dev/preview server (see vite.config.ts).
let videosOk: Promise<boolean> | null = null;
function useVideosAvailable(sample?: string | null) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!sample) return;
    videosOk ??= fetch(`videos/${encodeURIComponent(sample)}`, { method: 'HEAD' })
      .then((r) => r.ok && (r.headers.get('content-type') || '').includes('video'))
      .catch(() => false);
    videosOk.then(setOk);
  }, [sample]);
  return ok;
}

export default function LessonPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data: lesson, error } = useJson<Lesson>(`l/${id}.json`);
  const chapter = useJson<Chapter>(lesson ? `c/${lesson.chapterId}.json` : null).data;
  const p = progress.use();
  const { openSettings } = useUi();
  const [chatOpen, setChatOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const videos = useVideosAvailable(lesson?.lectures.find((l) => l.video)?.video);

  useEffect(() => {
    if (lesson) markVisited(lesson.id);
  }, [lesson]);

  useEffect(() => {
    const h = params.get('h');
    if (lesson && h) requestAnimationFrame(() => document.getElementById(slug(h))?.scrollIntoView({ behavior: 'smooth' }));
  }, [lesson, params]);

  const toc = useMemo(() => (lesson ? splitSections(lesson.body).filter((s) => s.title) : []), [lesson]);

  if (error) return <div className="page">Không tìm thấy bài học.</div>;
  if (!lesson) return <div className="page loading">Đang tải…</div>;
  const lp = p.lessons[lesson.id];

  const ask = (prompt: string) => {
    setPending(prompt);
    setChatOpen(true);
  };

  return (
    <div className={`lesson-layout ${chatOpen ? 'chat-open' : ''}`}>
      <aside className="lesson-side">
        <Link to={`/c/${lesson.chapterId}`} className="side-chapter">
          <span className="ch-num">{lesson.chapterId}</span> {lesson.chapterTitle}
        </Link>
        <ol>
          {chapter?.lessons.map((l) => {
            const s = p.lessons[l.id];
            const Icon = isDone(s) ? CheckCircle2 : s?.visited ? CircleDot : Circle;
            return (
              <li key={l.id} className={l.id === lesson.id ? 'cur' : ''}>
                <Link to={`/l/${l.id}`}>
                  <Icon size={15} className={isDone(s) ? 'ok' : ''} />
                  <span>{l.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </aside>

      <main className="lesson-main">
        <nav className="crumbs">
          <Link to="/">Bài học</Link> / <Link to={`/c/${lesson.chapterId}`}>Chương {lesson.chapterId} {lesson.chapterTitle}</Link>
        </nav>
        {chapter && (
          <details className="mobile-lessons" key={lesson.id}>
            <summary>
              📚 Bài {chapter.lessons.findIndex((l) => l.id === lesson.id) + 1}/{chapter.lessons.length} trong chương
            </summary>
            <ol>
              {chapter.lessons.map((l) => (
                <li key={l.id} className={`${l.id === lesson.id ? 'cur' : ''} ${isDone(p.lessons[l.id]) ? 'done' : ''}`}>
                  <Link to={`/l/${l.id}`}>{l.title}</Link>
                </li>
              ))}
            </ol>
          </details>
        )}
        <h1 className="lesson-title">{lesson.title}</h1>
        {lesson.aliases.length > 0 && (
          <div className="aliases">
            {lesson.aliases.slice(0, 8).map((a) => (
              <span key={a} className="chip">
                {a}
              </span>
            ))}
          </div>
        )}
        {lesson.tldr && (
          <Sketch className="card tldr" seed={`tldr${lesson.id}`} fill="#e7f5ff" stroke="#1971c2">
            <span className="tldr-tag">TL;DR</span>
            <div className="prose">
              <p dangerouslySetInnerHTML={{ __html: escapeBold(lesson.tldr) }} />
            </div>
          </Sketch>
        )}

        <Sections body={lesson.body} diagrams={lesson.diagrams} seed={lesson.id} />

        {lesson.lectures.length > 0 && (
          <Sketch className="card section" seed={`lec${lesson.id}`} fill="#fff">
            <h2>📺 Bài giảng gốc</h2>
            <ul className="lectures">
              {lesson.lectures.map((l) => (
                <li key={l.num}>
                  {videos && l.video ? (
                    <details>
                      <summary>
                        <MonitorPlay size={16} /> <b>{l.num}</b> {l.title}
                      </summary>
                      <video controls preload="none" src={`videos/${encodeURIComponent(l.video)}`} />
                    </details>
                  ) : (
                    <span>
                      <MonitorPlay size={16} /> <b>{l.num}</b> {l.title}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Sketch>
        )}

        <section id="quiz" className="quiz-section">
          <h2 className="hand">📝 Kiểm tra cuối bài</h2>
          {lesson.quiz.length ? (
            <Quiz key={lesson.id} lessonId={lesson.id} questions={lesson.quiz} onAsk={ask} />
          ) : (
            <p className="muted">Bài này chưa có quiz.</p>
          )}
          <label className="done-toggle">
            <input type="checkbox" checked={isDone(lp)} onChange={(e) => setDone(lesson.id, e.target.checked)} />
            Đánh dấu đã học xong bài này
          </label>
        </section>

        <div className="pager">
          {lesson.prev ? (
            <Link className="btn" to={`/l/${lesson.prev.id}`}>
              ← {lesson.prev.title}
            </Link>
          ) : (
            <span />
          )}
          {lesson.next && (
            <Link className="btn primary" to={`/l/${lesson.next.id}`}>
              {lesson.next.title} →
            </Link>
          )}
        </div>
      </main>

      <nav className="lesson-toc">
        <span className="muted small">Trong bài</span>
        {toc.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={(e) => (e.preventDefault(), document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }))}>
            {s.title}
          </a>
        ))}
        <a href="#quiz" onClick={(e) => (e.preventDefault(), document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' }))}>
          📝 Quiz
        </a>
      </nav>

      {!chatOpen && (
        <button className="ask-fab" onClick={() => setChatOpen(true)}>
          <MessageCircle size={20} /> Hỏi Claude
        </button>
      )}
      <ChatPanel
        lesson={lesson}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        pending={pending}
        onPendingUsed={() => setPending(null)}
        onOpenSettings={openSettings}
      />
    </div>
  );
}

function escapeBold(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
