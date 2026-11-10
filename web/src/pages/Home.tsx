import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Play, Route as RouteIcon, Search, Target, X } from 'lucide-react';
import { UpdateMark } from '../components/UpdateMark';
import { chapterUpdateCounts, updateCountParts, type UpdateKind } from '../lib/updates';
import { useIndex, useJson, type Diagram, type Index } from '../lib/content';
import { bookmarks, isDone, progress, toggleBookmark } from '../lib/store';
import { Sketch, SketchBar } from '../components/Sketch';
import { StaticDiagram } from '../components/AnimatedDiagram';
import { useUi } from '../App';
import { currentStage, fmtDate, stageStatus, usePlan } from '../lib/roadmap';

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

      <RoadmapStrip />
      <SavedLessons index={data} />

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
                    <span className="badge" style={{ background: accent, color: '#1e1e1e' }}>
                      {c.lessons.length} bài
                    </span>
                  </div>
                  <p className="muted clamp2">{c.description}</p>
                  {c.lessons.some((l) => l.pq) && (
                    <span
                      className="exam-mark ch"
                      title="Số bài trong chương có câu hỏi từ bộ đề luyện thi (đánh dấu 🎯 ở danh sách bài)"
                    >
                      <Target size={13} strokeWidth={2.4} /> {c.lessons.filter((l) => l.pq).length}/{c.lessons.length} bài có trong đề
                      luyện thi
                    </span>
                  )}
                  <ChapterUpdates lessons={c.lessons} />
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

/** Bookmarked lessons, newest first; hidden until there is one. */
function SavedLessons({ index }: { index: Index }) {
  const { items } = bookmarks.use();
  const p = progress.use();
  const lessons = new Map(index.chapters.flatMap((c) => c.lessons.map((l) => [l.id, { ...l, ch: c }] as const)));
  const saved = Object.entries(items)
    .filter(([id]) => lessons.has(id))
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id]) => lessons.get(id)!);
  if (!saved.length) return null;
  return (
    <section className="saved">
      <div className="section-head">
        <h2>
          <Bookmark size={22} /> Bài đã lưu
        </h2>
        <span className="muted small">{saved.length} bài · bấm “Lưu bài” (phím B) trong bài để thêm/bỏ</span>
      </div>
      <ul className="saved-list">
        {saved.map((l) => (
          <li key={l.id} className={isDone(p.lessons[l.id]) ? 'done' : ''}>
            <Link to={`/l/${l.id}`}>
              <span className="ch-num">{l.ch.num}</span>
              <span className="saved-main">
                <b>{l.title}</b>
                <span className="muted small clamp2">{l.summary || l.ch.title}</span>
              </span>
            </Link>
            <button className="icon-btn saved-x" title="Bỏ lưu" onClick={() => toggleBookmark(l.id)}>
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The uploaded roadmap at a glance, or an invitation to make one. */
function RoadmapStrip() {
  const { plan } = usePlan();
  const p = progress.use();
  if (!plan)
    return (
      <Link to="/roadmap" className="roadmap-strip empty">
        <RouteIcon size={18} />
        <span>
          <b>Tự đặt lộ trình học:</b> tải file mẫu (8 tuần, 12 tuần…), sửa ngày và thứ tự bài rồi tải lên để theo dõi hạn
          từng giai đoạn.
        </span>
        <ArrowRight size={16} />
      </Link>
    );
  const cur = currentStage(plan, p);
  const st = cur && stageStatus(cur, p);
  const next = cur?.lessons.find((l) => !isDone(p.lessons[l.id]));
  return (
    <Sketch className="card roadmap-strip" seed="rm-strip" fill="#fffdf0">
      <RouteIcon size={20} />
      <div className="roadmap-strip-body">
        <span className="muted small">
          {plan.name} · giai đoạn {cur ? cur.index + 1 : plan.stages.length}/{plan.stages.length}
        </span>
        <b className="hand">{cur ? cur.title : '🎉 Đã xong lộ trình'}</b>
        {st && (
          <span className={`small ${st.overdue ? 'late-text' : 'muted'}`}>
            {st.done}/{st.total} bài
            {cur!.due && ` · hạn ${fmtDate(cur!.due)}${st.overdue ? ` (trễ ${-st.daysLeft!} ngày)` : st.daysLeft ? ` (còn ${st.daysLeft} ngày)` : ' (hôm nay)'}`}
          </span>
        )}
      </div>
      {next && (
        <Link className="btn primary" to={`/l/${next.id}`}>
          <Play size={16} /> {next.title}
        </Link>
      )}
      <Link className="btn" to="/roadmap">
        Xem lộ trình
      </Link>
    </Sketch>
  );
}

/** "2 bài mới · 3 cập nhật · 1 không còn trong khóa": what the latest update batch touched in this chapter. */
function ChapterUpdates({ lessons }: { lessons: { u?: UpdateKind }[] }) {
  const parts = updateCountParts(chapterUpdateCounts(lessons));
  if (!parts.length) return null;
  return (
    <span className="upd-ch" title="Bài của chương thay đổi theo bản khóa mới (đánh dấu ở danh sách bài)">
      {parts.map((p, i) => (
        <span key={p.kind} className={p.kind}>
          {i > 0 && <span className="sep"> · </span>}
          {p.kind !== 'new' && <UpdateMark kind={p.kind} size={13} />}
          {p.text}
        </span>
      ))}
    </span>
  );
}
