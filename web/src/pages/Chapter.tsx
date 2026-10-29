import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { useJson, useIndex, type Chapter } from '../lib/content';
import { isDone, progress } from '../lib/store';
import { Sketch, SketchBar, Stars } from '../components/Sketch';
import Sections from '../components/Sections';

export default function ChapterPage() {
  const { id } = useParams();
  const { data: ch, error } = useJson<Chapter>(`c/${id}.json`);
  const index = useIndex().data;
  const p = progress.use();
  if (error) return <div className="page">Không tìm thấy chương.</div>;
  if (!ch) return <div className="page loading">Đang tải…</div>;
  const done = ch.lessons.filter((l) => isDone(p.lessons[l.id])).length;
  const pos = index?.chapters.findIndex((c) => c.id === ch.id) ?? -1;
  const prev = pos > 0 ? index!.chapters[pos - 1] : null;
  const next = index && pos >= 0 && pos < index.chapters.length - 1 ? index.chapters[pos + 1] : null;

  return (
    <div className="page chapter">
      <nav className="crumbs">
        <Link to="/">Bài học</Link> / Chương {ch.num}
      </nav>
      <Sketch className="card chapter-hero" seed={`hero${ch.id}`} fill="#fff">
        <div className="big-num">{ch.num}</div>
        <div>
          <h1>{ch.title}</h1>
          <p className="muted">{ch.description}</p>
          <div className="row small">
            <SketchBar value={done / ch.lessons.length} color="#228be6" />
            <span className="muted nowrap">
              {done}/{ch.lessons.length} bài hoàn thành
            </span>
          </div>
        </div>
      </Sketch>

      <h2 className="hand">🧭 Lộ trình học</h2>
      <ol className="path">
        {ch.lessons.map((l, i) => {
          const lp = p.lessons[l.id];
          const Icon = isDone(lp) ? CheckCircle2 : lp?.visited ? CircleDot : Circle;
          return (
            <li key={l.id} className={isDone(lp) ? 'done' : lp?.visited ? 'visited' : ''}>
              <Link to={`/l/${l.id}`}>
                <Sketch className="path-card" seed={`p${l.id}`} fill={isDone(lp) ? '#ebfbee' : '#fff'}>
                  <span className="path-num">{i + 1}</span>
                  <div className="path-body">
                    <b>{l.title}</b>
                    {l.summary && <span className="muted small">{l.summary}</span>}
                  </div>
                  <div className="path-status">
                    {lp?.quiz ? <Stars score={lp.quiz.best} total={lp.quiz.total} /> : null}
                    <Icon size={20} />
                  </div>
                </Sketch>
              </Link>
            </li>
          );
        })}
      </ol>

      <Sections body={ch.body} seed={ch.id} />

      <div className="pager">
        {prev ? (
          <Link className="btn" to={`/c/${prev.id}`}>
            ← {prev.num} {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn" to={`/c/${next.id}`}>
            {next.num} {next.title} →
          </Link>
        )}
      </div>
    </div>
  );
}
