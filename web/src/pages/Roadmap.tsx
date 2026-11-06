import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Circle, CircleDot, Download, FileJson, Play, Trash2, Upload } from 'lucide-react';
import { useIndex } from '../lib/content';
import { isDone, progress, roadmap } from '../lib/store';
import {
  currentStage,
  daysBetween,
  downloadJson,
  fmtDate,
  loadRoadmapFile,
  pace,
  stageStatus,
  TEMPLATES,
  today,
  usePlan,
  type Plan,
} from '../lib/roadmap';
import { Sketch, SketchBar, Stars } from '../components/Sketch';

export default function RoadmapPage() {
  const { data: index } = useIndex();
  const { plan, error, fileName, loadedAt } = usePlan();
  const stored = roadmap.use().current;
  const [msg, setMsg] = useState<{ ok: boolean; text: string; warnings?: string[] } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (f?: File | null) => {
    if (!f || !index) return;
    if (plan && !confirm('Thay lộ trình hiện tại bằng file mới? Tiến độ học không bị ảnh hưởng.')) return;
    try {
      const p = await loadRoadmapFile(f, index);
      setMsg({
        ok: true,
        text: `Đã tải “${p.name}”: ${p.stages.length} giai đoạn, ${p.lessonCount} bài.`,
        warnings: p.warnings,
      });
    } catch (e) {
      setMsg({ ok: false, text: `Không tải được ${f.name}: ${(e as Error).message}` });
    }
  };

  if (!index) return <div className="page loading">Đang tải…</div>;

  return (
    <div className="page roadmap-page">
      <nav className="crumbs">
        <Link to="/">Bài học</Link> / Lộ trình
      </nav>
      <div className="section-head">
        <h1>🧭 Lộ trình học</h1>
        {fileName && (
          <span className="muted small">
            {fileName}
            {loadedAt && ` · tải lên ${new Date(loadedAt).toLocaleDateString('vi-VN')}`}
          </span>
        )}
      </div>

      {msg && (
        <div className={`toast ${msg.ok ? '' : 'bad'}`}>
          {msg.text}
          {!!msg.warnings?.length && (
            <ul className="small">
              {msg.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="toast bad">
          Lộ trình đã lưu ({fileName}) không còn hợp lệ: {error}{' '}
          <button className="link-btn" onClick={() => roadmap.set({ current: null })}>
            Gỡ lộ trình
          </button>
        </div>
      )}

      {plan && <PlanView plan={plan} />}

      <div className="row wrap roadmap-actions">
        {plan && stored && (
          <>
            <button className="btn" onClick={() => downloadJson(stored.config, stored.fileName || 'lo-trinh.json')}>
              <Download size={16} /> Tải file lộ trình hiện tại
            </button>
            <button
              className="link-btn danger-inline"
              onClick={() => confirm('Gỡ lộ trình này? Tiến độ học vẫn giữ nguyên.') && (roadmap.set({ current: null }), setMsg(null))}
            >
              <Trash2 size={14} /> Gỡ lộ trình
            </button>
          </>
        )}
      </div>

      <h2 className="hand">{plan ? 'Đổi lộ trình' : 'Tạo lộ trình của bạn'}</h2>
      <div className="roadmap-setup">
        <Sketch className="card" seed="rm-upload" fill="#fff">
          <h3>1. Lấy file mẫu</h3>
          <p className="muted small">
            File mẫu là JSON, đã điền sẵn id chương và bài của khóa học, ngày bắt đầu là thứ Hai tới. Mở bằng trình soạn
            thảo bất kỳ, sửa ngày, tên giai đoạn, bỏ bớt hay đổi thứ tự bài.
          </p>
          <ul className="template-list">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <div>
                  <b>{t.label}</b>
                  <span className="muted small">{t.note}</span>
                </div>
                <button className="btn" onClick={() => downloadJson(t.build(index), `lo-trinh-${t.id}.json`)}>
                  <FileJson size={16} /> Tải mẫu
                </button>
              </li>
            ))}
          </ul>
        </Sketch>
        <Sketch className="card" seed="rm-drop" fill="#fff">
          <h3>2. Tải lên file đã sửa</h3>
          <div
            className={`dropzone ${drag ? 'over' : ''}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={26} />
            <b className="hand">Kéo thả file .json vào đây</b>
            <span className="muted small">hoặc bấm để chọn file</span>
          </div>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              upload(f);
            }}
          />
          <p className="muted small">
            Lộ trình lưu trong trình duyệt này và đi kèm file export tiến độ (Cài đặt), nên chuyển máy vẫn giữ được.
          </p>
        </Sketch>
      </div>

      <details className="format-help">
        <summary className="hand">📄 Định dạng file lộ trình</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khóa</th>
                <th>Ý nghĩa</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>name</code></td>
                <td>Tên lộ trình.</td>
              </tr>
              <tr>
                <td><code>start</code></td>
                <td>Ngày bắt đầu, dạng <code>YYYY-MM-DD</code>. Các giai đoạn dùng <code>days</code> tính nối tiếp từ ngày này.</td>
              </tr>
              <tr>
                <td><code>exam</code></td>
                <td>Ngày thi (không bắt buộc), để đếm ngược.</td>
              </tr>
              <tr>
                <td><code>exclude</code></td>
                <td>Danh sách id bài muốn bỏ qua.</td>
              </tr>
              <tr>
                <td><code>stages[].title</code></td>
                <td>Tên giai đoạn.</td>
              </tr>
              <tr>
                <td><code>stages[].items</code></td>
                <td>
                  Id chương (<code>"05"</code>, lấy cả chương) hoặc id bài (<code>"s3-security"</code>, là phần cuối đường dẫn{' '}
                  <code>#/l/&lt;id&gt;</code>). Bài trùng chỉ tính ở lần xuất hiện đầu tiên.
                </td>
              </tr>
              <tr>
                <td><code>stages[].days</code> / <code>due</code></td>
                <td>Số ngày cho giai đoạn, hoặc hạn chót <code>YYYY-MM-DD</code>. Không có thì giai đoạn không có hạn.</td>
              </tr>
              <tr>
                <td><code>stages[].goal</code></td>
                <td>Ghi chú mục tiêu, hiện dưới tên giai đoạn.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted small">Id các chương:</p>
        <div className="aliases">
          {index.chapters.map((c) => (
            <span key={c.id} className="chip">
              <b>{c.id}</b> {c.title}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

function PlanView({ plan }: { plan: Plan }) {
  const p = progress.use();
  const now = today();
  const cur = currentStage(plan, p);
  const done = plan.stages.reduce((n, s) => n + stageStatus(s, p).done, 0);
  const next = cur?.lessons.find((l) => !isDone(p.lessons[l.id]));
  const pc = pace(plan, p, now);
  const examIn = plan.exam ? daysBetween(now, plan.exam) : undefined;
  const diff = pc.done - pc.expected;

  return (
    <>
      <Sketch className="card plan-summary" seed="plan-sum" fill="#fff">
        <div className="plan-summary-main">
          <b className="hand big">{plan.name}</b>
          <div className="row small">
            <SketchBar value={done / plan.lessonCount} color="#fab005" />
            <span className="nowrap">
              {done}/{plan.lessonCount} bài
            </span>
          </div>
          <span className="muted small">
            {pc.scheduled &&
              (diff >= 0
                ? `Đúng lịch${diff > 0 ? `, vượt ${diff} bài` : ''} (theo lịch nên xong ${pc.expected} bài tới hôm nay).`
                : `Chậm ${-diff} bài so với lịch (nên xong ${pc.expected} bài tới hôm nay).`)}
            {plan.start && daysBetween(now, plan.start) > 0 && ` Bắt đầu ${fmtDate(plan.start)}.`}
          </span>
        </div>
        {examIn !== undefined && (
          <div className="exam-count">
            <CalendarClock size={18} />
            <b className="hand big">{examIn > 0 ? examIn : examIn === 0 ? 'Hôm nay' : 'Đã qua'}</b>
            <span className="muted small">{examIn > 0 ? `ngày tới ngày thi (${fmtDate(plan.exam!)})` : 'ngày thi'}</span>
          </div>
        )}
        {next ? (
          <Link className="btn primary" to={`/l/${next.id}`}>
            <Play size={16} /> {next.title}
          </Link>
        ) : (
          <span className="hand big">🎉 Xong lộ trình!</span>
        )}
      </Sketch>

      <ol className="stages">
        {plan.stages.map((s) => {
          const st = stageStatus(s, p, now);
          const isCur = s === cur;
          const perDay = isCur && st.daysLeft !== undefined && st.daysLeft >= 0 ? (st.total - st.done) / (st.daysLeft + 1) : 0;
          return (
            <li key={s.index} className={`${st.complete ? 'done' : ''} ${isCur ? 'cur' : ''} ${st.overdue ? 'late' : ''}`}>
              <Sketch className="card stage-card" seed={`st${s.index}${s.title}`} fill={st.complete ? '#ebfbee' : isCur ? '#fffdf0' : '#fff'}>
                <details open={isCur}>
                  <summary>
                    <span className="path-num">{s.index + 1}</span>
                    <div className="stage-body">
                      <b className="hand">{s.title}</b>
                      {s.goal && <span className="muted small">{s.goal}</span>}
                      <div className="row small">
                        <SketchBar value={st.total ? st.done / st.total : 0} color={st.complete ? '#40c057' : '#228be6'} />
                        <span className="nowrap muted">
                          {st.done}/{st.total}
                        </span>
                      </div>
                    </div>
                    <div className="stage-due small">
                      {s.due ? (
                        <>
                          <b>Hạn {fmtDate(s.due)}</b>
                          <span className={st.overdue ? 'late-text' : 'muted'}>
                            {st.complete
                              ? 'Đã xong'
                              : st.overdue
                                ? `Trễ ${-st.daysLeft!} ngày`
                                : st.daysLeft === 0
                                  ? 'Hôm nay'
                                  : `Còn ${st.daysLeft} ngày`}
                          </span>
                          {perDay > 0 && <span className="muted">≈ {Math.ceil(perDay)} bài/ngày</span>}
                        </>
                      ) : (
                        <span className="muted">{st.complete ? 'Đã xong' : 'Không đặt hạn'}</span>
                      )}
                    </div>
                  </summary>
                  <ul className="stage-lessons">
                    {s.lessons.map((l) => {
                      const lp = p.lessons[l.id];
                      const Icon = isDone(lp) ? CheckCircle2 : lp?.visited ? CircleDot : Circle;
                      return (
                        <li key={l.id} className={isDone(lp) ? 'done' : ''}>
                          <Link to={`/l/${l.id}`}>
                            <Icon size={15} />
                            <span className="ch-chip">{l.chapter.num}</span>
                            <span>{l.title}</span>
                            {lp?.quiz && <Stars score={lp.quiz.best} total={lp.quiz.total} />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </Sketch>
            </li>
          );
        })}
      </ol>

      {plan.warnings.length > 0 && (
        <details className="muted small warn-list">
          <summary>{plan.warnings.length} mục trong file không khớp với khóa học (đã bỏ qua)</summary>
          <ul>
            {plan.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
