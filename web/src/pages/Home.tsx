import { Link } from 'react-router-dom';
import { ArrowRight, Play, Search } from 'lucide-react';
import { useIndex, useJson, type Diagram } from '../lib/content';
import { isDone, progress } from '../lib/store';
import { Sketch, SketchBar } from '../components/Sketch';
import { StaticDiagram } from '../components/AnimatedDiagram';
import { useUi } from '../App';

const ACCENTS = ['#a5d8ff', '#ffc9c9', '#b2f2bb', '#ffec99', '#d0bfff', '#ffd8a8', '#96f2d7', '#eebefa'];

export default function Home() {
  const { data, error } = useIndex();
  const thumbs = useJson<Record<string, Diagram>>('thumbs.json').data;
  const p = progress.use();
  const { openSearch } = useUi();
  if (error) return <div className="page">Không tải được nội dung: {error.message}</div>;
  if (!data) return <div className="page loading">Đang tải…</div>;

  const all = data.chapters.flatMap((c) => c.lessons.map((l) => ({ ...l, ch: c })));
  const done = all.filter((l) => isDone(p.lessons[l.id])).length;
  const quizzes = Object.values(p.lessons).filter((l) => l.quiz);
  const avg = quizzes.length ? quizzes.reduce((n, l) => n + l.quiz!.best / l.quiz!.total, 0) / quizzes.length : 0;
  const lastIdx = p.last ? all.findIndex((l) => l.id === p.last) : -1;
  const cont = lastIdx >= 0 ? all[lastIdx] : all[0];
  const totalQ = all.reduce((n, l) => n + l.quiz, 0);

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-text">
          <h1>Học SAA-C03 bằng sơ đồ</h1>
          <p>
            {all.length} bài học, mỗi bài có sơ đồ động vẽ từng bước, mẹo thi và quiz cuối bài ({totalQ} câu). Kẹt chỗ nào
            thì hỏi Claude ngay trong bài.
          </p>
          <button className="pill search-pill big" onClick={openSearch}>
            <Search size={18} /> Tìm bài: VPC, KMS, Aurora… <kbd>Ctrl K</kbd>
          </button>
        </div>
        <Sketch className="card continue" seed="continue" fill="#fff">
          <div className="continue-num">{cont.ch.num}</div>
          <div className="continue-body">
            <span className="muted small">
              {lastIdx >= 0 ? 'Học tiếp' : 'Bắt đầu'} · Chương {cont.ch.num} {cont.ch.title}
            </span>
            <b className="hand big">{cont.title}</b>
            {cont.summary && <span className="muted small clamp2">{cont.summary}</span>}
          </div>
          <Link className="btn primary" to={`/l/${cont.id}`}>
            <Play size={16} /> {lastIdx >= 0 ? 'Học tiếp' : 'Bắt đầu'}
          </Link>
        </Sketch>
        <Sketch className="card stat" seed="stat" fill="#fff">
          <span className="muted small">Tiến độ</span>
          <b className="hand big">
            {done}/{all.length} bài
          </b>
          <SketchBar value={done / all.length} color="#fab005" />
          <span className="muted small">
            {quizzes.length ? `Điểm quiz trung bình (tốt nhất): ${Math.round(avg * 100)}%` : 'Chưa làm quiz nào'}
          </span>
        </Sketch>
      </section>

      <div className="section-head">
        <h2>Các chương</h2>
        <span className="muted small">{data.chapters.length} chương · theo thứ tự khóa học</span>
      </div>
      <div className="chapter-grid">
        {data.chapters.map((c, i) => {
          const d = c.lessons.filter((l) => isDone(p.lessons[l.id])).length;
          const accent = ACCENTS[i % ACCENTS.length];
          return (
            <Link key={c.id} to={`/c/${c.id}`} className="chapter-link">
              <Sketch className="card chapter-card" seed={`ch${c.id}`} fill="#fff">
                <div className="thumb">
                  {thumbs?.[c.id] ? <StaticDiagram diagram={thumbs[c.id]} /> : <div className="thumb-empty" />}
                </div>
                <div className="chapter-body">
                  <div className="row between">
                    <b className="hand chapter-title">
                      <span className="ch-num">{c.num}</span> {c.title}
                    </b>
                    <span className="badge" style={{ background: accent }}>
                      {c.lessons.length} bài
                    </span>
                  </div>
                  <p className="muted clamp2">{c.description}</p>
                  <div className="row between small">
                    <SketchBar value={d / c.lessons.length} color="#228be6" />
                    <span className="muted nowrap">
                      {d}/{c.lessons.length}
                    </span>
                  </div>
                  <span className="go">
                    {d === c.lessons.length ? 'Ôn lại' : d ? 'Học tiếp' : 'Vào học'} <ArrowRight size={16} />
                  </span>
                </div>
              </Sketch>
            </Link>
          );
        })}
        <Link to="/cheat-sheet" className="chapter-link">
          <Sketch className="card chapter-card cheat" seed="cheat" fill="#fff9db">
            <div className="chapter-body">
              <b className="hand chapter-title">📋 Exam Cheat Sheet</b>
              <p className="muted">
                Ôn nhanh trước giờ thi: từ khóa trong đề → dịch vụ nên chọn, số liệu quan trọng, bảng so sánh.
              </p>
              <span className="go">
                Mở cheat sheet <ArrowRight size={16} />
              </span>
            </div>
          </Sketch>
        </Link>
      </div>
    </div>
  );
}
