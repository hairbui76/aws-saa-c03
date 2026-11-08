import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GraduationCap,
  History,
  MessageCircleQuestion,
  Play,
  RotateCcw,
  Shuffle,
  Target,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { loadJson, type Lesson } from '../lib/content';
import {
  isRightAnswer,
  practice,
  PRACTICE_PASS,
  submitSession,
  updateSession,
  type PracticeAttempt,
  type PracticeSession,
} from '../lib/store';
import {
  chapterOf,
  EXAM_MINUTES,
  EXAM_SIZE,
  fmtDate,
  fmtDuration,
  LETTERS,
  pickQuestions,
  resultKey,
  startSession,
  usePracticeBank,
  type BankQuestion,
  type LessonInfo,
  type Source,
} from '../lib/practice';
import { Sketch, SketchBar } from '../components/Sketch';
import ChatPanel from '../components/ChatPanel';
import { useUi } from '../App';

type Mode = 'exam' | 'study';
type Bank = ReturnType<typeof usePracticeBank>;

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

// ---------- shared: ask Claude about a question, in the chat of its main lesson ----------
function useAskClaude() {
  const { openSettings } = useUi();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const ask = useCallback((q: BankQuestion, picked: number[] | null) => {
    const prompt =
      `Giải thích giúp tôi câu này trong bộ đề luyện thi SAA-C03 (${q.src}):\n\n${q.q}\n` +
      q.options.map((o, i) => `${LETTERS[i]}. ${o}`).join('\n') +
      `\n\nĐáp án trong bộ đề: ${q.answer.map((i) => LETTERS[i]).join(', ')}.` +
      (picked?.length ? ` Tôi đã chọn: ${picked.map((i) => LETTERS[i]).join(', ')}.` : '') +
      (q.doubt ? ` (Có ý kiến cho rằng đáp án này chưa đúng: ${q.doubt})` : '') +
      ' Vì sao đáp án đó đúng, các phương án còn lại sai ở đâu, và trong đề thật cần nhận ra từ khóa nào?';
    loadJson<Lesson>(`l/${q.lessons[0]}.json`).then((l) => {
      setLesson(l);
      setPending(prompt);
      setOpen(true);
    });
  }, []);
  const panel = lesson ? (
    <ChatPanel
      key={lesson.id}
      lesson={lesson}
      open={open}
      onClose={() => setOpen(false)}
      pending={pending}
      onPendingUsed={() => setPending(null)}
      onOpenSettings={openSettings}
    />
  ) : null;
  return { ask, panel };
}

function LessonLinks({ q, lessons }: { q: BankQuestion; lessons: Map<string, LessonInfo> }) {
  return (
    <div className="pr-lessons">
      <BookOpen size={15} />
      <span className="muted small">Ôn lại:</span>
      {q.lessons.map((id) => {
        const l = lessons.get(id);
        return (
          <Link key={id} to={`/l/${id}`} className="chip">
            {l ? l.title : id}
          </Link>
        );
      })}
    </div>
  );
}

/** Question text + options. `reveal` marks right/wrong; otherwise options are pickable. */
function QuestionView({
  q,
  picked,
  reveal,
  onPick,
}: {
  q: BankQuestion;
  picked: number[] | null;
  reveal: boolean;
  onPick?: (i: number) => void;
}) {
  const need = q.answer.length;
  return (
    <>
      <p className="quiz-q exam">{q.q}</p>
      {need > 1 && <p className="muted small">Chọn {need} đáp án</p>}
      <div className="quiz-options">
        {q.options.map((o, i) => {
          const sel = !!picked?.includes(i);
          const state = reveal ? (q.answer.includes(i) ? 'right' : sel ? 'wrong' : 'off') : sel ? 'sel' : '';
          return (
            <button key={i} className={`opt ${state}`} disabled={reveal || !onPick} onClick={() => onPick?.(i)}>
              <span className="opt-letter">{LETTERS[i]}</span>
              <span>{o}</span>
              {reveal && sel && <span className="pr-you">bạn chọn</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Explanation({
  q,
  picked,
  lessons,
  onAsk,
}: {
  q: BankQuestion;
  picked: number[] | null;
  lessons: Map<string, LessonInfo>;
  onAsk: () => void;
}) {
  const ok = isRightAnswer(picked, q.answer);
  return (
    <div className={`quiz-explain ${ok ? 'ok' : 'bad'}`}>
      <b>
        {ok ? '✔ Chính xác!' : picked ? '✘ Chưa đúng.' : '— Chưa trả lời.'} Đáp án: {q.answer.map((i) => LETTERS[i]).join(', ')}
      </b>
      <span>{q.explain}</span>
      {q.doubt && (
        <p className="quiz-doubt">
          <AlertTriangle size={15} />
          <span>
            <b>Đáp án trong bộ đề có thể chưa đúng:</b> {q.doubt}
          </span>
        </p>
      )}
      <LessonLinks q={q} lessons={lessons} />
      <button className="link-btn" onClick={onAsk}>
        <MessageCircleQuestion size={14} /> Hỏi Claude về câu này
      </button>
    </div>
  );
}

// ---------- overview ----------
export default function PracticePage() {
  const data = usePracticeBank();
  const st = practice.use();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('exam');
  const [chapter, setChapter] = useState('');
  const { bank, lessons, chapters } = data;

  const perTest = useMemo(() => {
    const out = new Map<string, { tried: number; ok: number }>();
    for (const q of bank?.questions ?? []) {
      const r = st.last[resultKey(q)];
      const c = out.get(q.t) ?? { tried: 0, ok: 0 };
      if (r) {
        c.tried++;
        if (r.ok) c.ok++;
      }
      out.set(q.t, c);
    }
    return out;
  }, [bank, st.last]);

  const chapterCounts = useMemo(() => {
    const out = new Map<string, number>();
    for (const q of bank?.questions ?? []) {
      if (q.dupOf) continue;
      const c = chapterOf(q, lessons)?.chapterId;
      if (c) out.set(c, (out.get(c) ?? 0) + 1);
    }
    return out;
  }, [bank, lessons]);

  if (data.error) return <div className="page">Không tải được bộ đề.</div>;
  if (!bank) return <div className="page loading">Đang tải bộ đề…</div>;

  // distinct questions: a repeat in a later test counts once, under its first copy
  const uniqKeys = new Set(bank.questions.filter((q) => !q.dupOf).map((q) => q.k));
  const total = uniqKeys.size;
  const tried = Object.keys(st.last).filter((k) => uniqKeys.has(k)).length;
  const okCount = Object.entries(st.last).filter(([k, v]) => v.ok && uniqKeys.has(k)).length;
  const wrongCount = tried - okCount;

  const start = (src: Source) => {
    const { title, keys } = pickQuestions(src, bank, st.last, lessons);
    if (!keys.length) return;
    if (st.session && !confirm(`Bỏ bài đang làm dở “${st.session.title}” để bắt đầu bài mới?`)) return;
    startSession(title, keys, mode);
    navigate('/practice/run');
  };
  const bestOf = (title: string) =>
    st.attempts.filter((a) => a.title === title).reduce<PracticeAttempt | null>((b, a) => (!b || a.score / a.total > b.score / b.total ? a : b), null);

  return (
    <div className="page practice">
      <nav className="crumbs">
        <Link to="/">Bài học</Link> / Luyện đề
      </nav>
      <Sketch className="card pr-hero" seed="prhero" fill="#fff">
        <Target size={42} className="pr-hero-icon" />
        <div>
          <h1>Luyện đề</h1>
          <p className="muted">
            {bank.tests.length} đề ({total} câu khác nhau) tiếng Anh như đề thật, mỗi câu có giải thích tiếng Việt và link về bài học liên quan.
            Đề thật SAA-C03: {EXAM_SIZE} câu trong {EXAM_MINUTES} phút, đậu từ 720/1000 điểm (mốc tham khảo ở đây: {Math.round(PRACTICE_PASS * 100)}%).
          </p>
          <div className="row small wrap">
            <SketchBar value={tried / total} color="#fab005" />
            <span className="muted nowrap">
              đã làm {tried}/{total} câu · đúng {pct(okCount, tried)}%
            </span>
          </div>
        </div>
      </Sketch>

      {st.session && <ResumeCard s={st.session} />}

      <div className="pr-mode">
        <span className="hand">Chế độ:</span>
        <div className="notes-seg" role="tablist">
          <button role="tab" aria-selected={mode === 'exam'} className={mode === 'exam' ? 'on' : ''} onClick={() => setMode('exam')}>
            <Timer size={15} /> Thi thử
          </button>
          <button role="tab" aria-selected={mode === 'study'} className={mode === 'study' ? 'on' : ''} onClick={() => setMode('study')}>
            <GraduationCap size={15} /> Luyện tập
          </button>
        </div>
        <span className="muted small">
          {mode === 'exam'
            ? `Bấm giờ như thi thật (2 phút/câu), chỉ chấm và xem đáp án khi nộp bài.`
            : 'Không bấm giờ, kiểm tra đáp án và đọc giải thích ngay sau mỗi câu.'}
        </span>
      </div>

      <h2 className="hand">📝 Đề gốc</h2>
      <div className="pr-grid">
        {bank.tests.map((t) => {
          const c = perTest.get(t.num) ?? { tried: 0, ok: 0 };
          const best = bestOf(t.title);
          return (
            <Sketch key={t.num} className="pr-card" seed={`pt${t.num}`} fill="#fff">
              <div className="row between">
                <b className="hand pr-card-title">{t.title}</b>
                <span className="muted small" title={t.dups ? `${t.dups} câu giống câu ở đề trước; vẫn giữ trong đề này, nhưng chỉ tính một lần ở đề ngẫu nhiên, ôn câu sai và theo chương` : undefined}>
                  {t.count} câu{t.dups ? ` · ${t.dups} trùng` : ''}
                </span>
              </div>
              <SketchBar value={c.tried / t.count} color={c.tried && c.ok / c.tried >= PRACTICE_PASS ? '#40c057' : '#fab005'} />
              <span className="muted small">
                {c.tried ? `đã làm ${c.tried}/${t.count} · đúng ${c.ok}` : 'chưa làm'}
                {best && ` · tốt nhất ${pct(best.score, best.total)}%`}
              </span>
              <button className="btn primary" onClick={() => start({ kind: 'test', num: t.num })}>
                <Play size={16} /> {c.tried ? 'Làm lại' : 'Làm đề'}
              </button>
            </Sketch>
          );
        })}
      </div>

      <h2 className="hand">🎲 Tự trộn đề</h2>
      <div className="pr-grid">
        <Sketch className="pr-card" seed="prrand" fill="#fff">
          <b className="hand pr-card-title">
            <Shuffle size={18} /> Đề ngẫu nhiên
          </b>
          <span className="muted small">
            {EXAM_SIZE} câu bốc ngẫu nhiên từ cả {total} câu.
          </span>
          <button className="btn primary" onClick={() => start({ kind: 'random' })}>
            <Play size={16} /> Bắt đầu
          </button>
        </Sketch>
        <Sketch className="pr-card" seed="prwrong" fill={wrongCount ? '#fff5f5' : '#fff'}>
          <b className="hand pr-card-title">
            <RotateCcw size={18} /> Ôn câu sai
          </b>
          <span className="muted small">
            {wrongCount
              ? `${wrongCount} câu lần gần nhất làm sai${wrongCount > EXAM_SIZE ? ` (mỗi lượt ${EXAM_SIZE} câu)` : ''}. Làm đúng thì câu đó ra khỏi danh sách.`
              : 'Chưa có câu sai nào. Làm vài đề trước đã.'}
          </span>
          <button className="btn primary" disabled={!wrongCount} onClick={() => start({ kind: 'wrong' })}>
            <Play size={16} /> Bắt đầu
          </button>
        </Sketch>
        <Sketch className="pr-card" seed="prch" fill="#fff">
          <b className="hand pr-card-title">
            <BookOpen size={18} /> Theo chương
          </b>
          <select className="pr-select" value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="">Chọn chương…</option>
            {chapters
              .filter((c) => chapterCounts.get(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.num} {c.title} ({chapterCounts.get(c.id)} câu)
                </option>
              ))}
          </select>
          <button className="btn primary" disabled={!chapter} onClick={() => start({ kind: 'chapter', id: chapter })}>
            <Play size={16} /> Bắt đầu
          </button>
        </Sketch>
      </div>

      <h2 className="hand">
        <History size={22} /> Lịch sử làm bài
      </h2>
      {st.attempts.length ? (
        <ul className="pr-history">
          {st.attempts.map((a) => {
            const passed = a.score / a.total >= PRACTICE_PASS;
            return (
              <li key={a.id}>
                <Link to={`/practice/r/${a.id}`}>
                  <span className={`pr-score ${passed ? 'ok' : 'bad'}`}>{pct(a.score, a.total)}%</span>
                  <span className="pr-h-main">
                    <b>{a.title}</b>
                    <span className="muted small">
                      {a.mode === 'exam' ? 'Thi thử' : 'Luyện tập'} · {a.score}/{a.total} câu · {fmtDuration(a.ms)} · {fmtDate(a.at)}
                    </span>
                  </span>
                  <ChevronRight size={18} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">Chưa có lần làm nào.</p>
      )}
    </div>
  );
}

function ResumeCard({ s }: { s: PracticeSession }) {
  const done = s.answers.filter(Boolean).length;
  const left = s.deadline ? s.deadline - Date.now() : null;
  return (
    <Sketch className="card pr-resume" seed="prres" fill="#fff9db">
      <div>
        <b className="hand">Đang làm dở: {s.title}</b>
        <div className="muted small">
          {s.mode === 'exam' ? 'Thi thử' : 'Luyện tập'} · đã trả lời {done}/{s.keys.length} câu
          {left != null && (left > 0 ? ` · còn ${fmtDuration(left)}` : ' · đã hết giờ')}
        </div>
      </div>
      <div className="row">
        <Link className="btn primary" to="/practice/run">
          <Play size={16} /> Làm tiếp
        </Link>
        <button
          className="btn"
          onClick={() => confirm('Bỏ bài đang làm? Bài này sẽ không được chấm.') && practice.update((st) => ({ ...st, session: null }))}
        >
          <Trash2 size={16} /> Bỏ
        </button>
      </div>
    </Sketch>
  );
}

/** Height of the sticky site header, so the test bar can stick right under it (it wraps on phones). */
function useTopbarHeight() {
  const [h, setH] = useState(64);
  useEffect(() => {
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    const ro = new ResizeObserver(() => setH(bar.getBoundingClientRect().height));
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
  return h;
}

// ---------- taking a test ----------
export function PracticeRun() {
  const topH = useTopbarHeight();
  const data = usePracticeBank();
  const s = practice.use().session;
  const navigate = useNavigate();
  const { ask, panel } = useAskClaude();
  const [now, setNow] = useState(() => Date.now());

  const submit = useCallback(() => {
    const a = submitSession(
      (k) => data.byKey.get(k)?.answer,
      (k) => data.byKey.get(k)?.dupOf ?? k
    );
    if (a) navigate(`/practice/r/${a.id}`, { replace: true });
  }, [data.byKey, navigate]);

  // exam clock; hand the paper in when time is up
  useEffect(() => {
    if (!s?.deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [s?.deadline]);
  const left = s?.deadline ? s.deadline - now : null;
  useEffect(() => {
    if (left != null && left <= 0 && data.bank) submit();
  }, [left, data.bank, submit]);

  const q = s && data.bank ? data.byKey.get(s.keys[s.idx]) : undefined;
  const picked = s?.answers[s.idx] ?? null;
  const revealed = !!s && s.mode === 'study' && s.checked[s.idx];

  // handlers read the store, not the render's copy, so fast key presses never act on a stale session
  const { byKey } = data;
  const cur = () => {
    const x = practice.get().session;
    const xq = x && byKey.get(x.keys[x.idx]);
    return x && xq ? { x, xq } : null;
  };
  const pick = useCallback(
    (i: number) => {
      const c = cur();
      if (!c || (c.x.mode === 'study' && c.x.checked[c.x.idx])) return;
      const { x, xq } = c;
      const need = xq.answer.length;
      const was = x.answers[x.idx] ?? [];
      const next = need === 1 ? [i] : was.includes(i) ? was.filter((v) => v !== i) : was.length < need ? [...was, i] : was;
      const answers = x.answers.slice();
      answers[x.idx] = next.length ? next.sort() : null;
      updateSession({ answers });
    },
    [byKey]
  );
  const go = useCallback((idx: number) => {
    const x = practice.get().session;
    if (x && idx >= 0 && idx < x.keys.length) updateSession({ idx });
  }, []);
  const step = useCallback((d: number) => go((practice.get().session?.idx ?? 0) + d), [go]);
  const check = useCallback(() => {
    const c = cur();
    if (!c || c.x.answers[c.x.idx]?.length !== c.xq.answer.length) return;
    const checked = c.x.checked.slice();
    checked[c.x.idx] = true;
    updateSession({ checked });
  }, [byKey]);
  const toggleFlag = useCallback(() => {
    const x = practice.get().session;
    if (!x) return;
    const flags = x.flags.slice();
    flags[x.idx] = !flags[x.idx];
    updateSession({ flags });
  }, []);
  const handIn = useCallback(() => {
    if (!s) return;
    const blank = s.answers.filter((a) => !a).length;
    const flagged = s.flags.filter(Boolean).length;
    const warn = [blank && `${blank} câu chưa trả lời`, flagged && `${flagged} câu đang đánh dấu`].filter(Boolean).join(', ');
    if (confirm(warn ? `Còn ${warn}. Nộp bài?` : 'Nộp bài?')) submit();
  }, [s, submit]);

  // keyboard: A–F / 1–6 pick, ← → move, Enter check / next, M mark for review
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const c = cur();
      if (!c || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, .chat')) return;
      const { x, xq } = c;
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const i = LETTERS.includes(k) && k.length === 1 ? LETTERS.indexOf(k) : '123456'.indexOf(k);
      if (i >= 0 && i < xq.options.length) pick(i);
      else if (k === 'ArrowRight') step(1);
      else if (k === 'ArrowLeft') step(-1);
      else if (k === 'M') toggleFlag();
      else if (k === 'Enter') {
        if (x.mode === 'study' && !x.checked[x.idx]) check();
        else step(1);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [pick, step, toggleFlag, check]);

  if (!s)
    return (
      <div className="page">
        <p>Không có bài nào đang làm.</p>
        <Link className="btn" to="/practice">
          ← Về trang luyện đề
        </Link>
      </div>
    );
  if (data.error) return <div className="page">Không tải được bộ đề.</div>;
  if (!data.bank) return <div className="page loading">Đang tải bộ đề…</div>;
  if (!q) return <div className="page">Câu hỏi không còn trong bộ đề.</div>;

  const answered = s.answers.filter(Boolean).length;
  const last = s.idx === s.keys.length - 1;
  const ok = revealed && isRightAnswer(picked, q.answer);

  return (
    <div className="page practice pr-run">
      <div className="pr-bar" style={{ top: topH }}>
        <Link to="/practice" className="icon-btn" title="Về trang luyện đề (bài vẫn được giữ)">
          <ChevronLeft size={18} />
        </Link>
        <b className="hand pr-bar-title">{s.title}</b>
        <span className="muted small nowrap">
          {answered}/{s.keys.length} đã trả lời
        </span>
        {left != null && (
          <span className={`pr-clock ${left < 5 * 60_000 ? 'low' : ''}`} title="Thời gian còn lại">
            <Clock size={15} /> {fmtDuration(left)}
          </span>
        )}
        <button className="btn primary pr-submit" onClick={handIn}>
          Nộp bài
        </button>
      </div>

      <div className="pr-layout">
        <Sketch className="quiz pr-q" seed={`pq${s.idx}`} fill="#fff">
          <div className="quiz-head">
            <span className="quiz-count">
              Câu {s.idx + 1}/{s.keys.length}
            </span>
            <span className="quiz-src">🎯 {q.src}</span>
            <button className={`chip-btn pr-flag ${s.flags[s.idx] ? 'on' : ''}`} onClick={toggleFlag} title="Đánh dấu để xem lại (phím M)">
              <Flag size={14} /> {s.flags[s.idx] ? 'Đã đánh dấu' : 'Đánh dấu'}
            </button>
          </div>
          <QuestionView q={q} picked={picked} reveal={revealed} onPick={pick} />
          {revealed && <Explanation q={q} picked={picked} lessons={data.lessons} onAsk={() => ask(q, picked)} />}
          <div className="pr-actions">
            <button className="btn" disabled={s.idx === 0} onClick={() => go(s.idx - 1)}>
              <ChevronLeft size={16} /> Câu trước
            </button>
            {s.mode === 'study' && !revealed ? (
              <button className="btn primary" disabled={picked?.length !== q.answer.length} onClick={check}>
                Kiểm tra
              </button>
            ) : last ? (
              <button className="btn primary" onClick={handIn}>
                Nộp bài
              </button>
            ) : (
              <button className={`btn ${ok || s.mode === 'exam' ? 'primary' : ''}`} onClick={() => go(s.idx + 1)}>
                Câu tiếp <ChevronRight size={16} />
              </button>
            )}
          </div>
          <p className="muted small pr-keys">Phím tắt: A–F chọn · ← → chuyển câu · Enter {s.mode === 'study' ? 'kiểm tra / ' : ''}câu tiếp · M đánh dấu</p>
        </Sketch>

        <aside className="pr-nav" style={{ top: topH + 70 }}>
          <div className="pr-nav-grid">
            {s.keys.map((k, i) => {
              const a = s.answers[i];
              const r = s.mode === 'study' && s.checked[i] ? (isRightAnswer(a, data.byKey.get(k)?.answer ?? []) ? 'ok' : 'bad') : a ? 'done' : '';
              return (
                <button
                  key={k}
                  className={`pr-dot ${r} ${i === s.idx ? 'now' : ''} ${s.flags[i] ? 'flag' : ''}`}
                  onClick={() => go(i)}
                  title={`Câu ${i + 1}${s.flags[i] ? ' · đã đánh dấu' : ''}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="pr-legend muted small">
            <span>
              <i className="pr-dot done" /> đã trả lời
            </span>
            {s.mode === 'study' && (
              <>
                <span>
                  <i className="pr-dot ok" /> đúng
                </span>
                <span>
                  <i className="pr-dot bad" /> sai
                </span>
              </>
            )}
            <span>
              <i className="pr-dot flag" /> đánh dấu
            </span>
          </div>
        </aside>
      </div>
      {panel}
    </div>
  );
}

// ---------- result + review ----------
type Filter = 'all' | 'wrong' | 'flag' | 'blank';

export function PracticeResult() {
  const { id } = useParams();
  const data = usePracticeBank();
  const st = practice.use();
  const navigate = useNavigate();
  const { ask, panel } = useAskClaude();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const a = st.attempts.find((x) => String(x.id) === id);

  const byChapter = useMemo(() => {
    if (!a) return [];
    const m = new Map<string, { id: string; title: string; ok: number; n: number }>();
    a.keys.forEach((k, i) => {
      const q = data.byKey.get(k);
      const c = q && chapterOf(q, data.lessons);
      if (!c) return;
      const e = m.get(c.chapterId) ?? { id: c.chapterId, title: `${c.chapterNum} ${c.chapterTitle}`, ok: 0, n: 0 };
      e.n++;
      if (a.correct[i]) e.ok++;
      m.set(c.chapterId, e);
    });
    return [...m.values()].sort((x, y) => x.ok / x.n - y.ok / y.n || y.n - x.n);
  }, [a, data.byKey, data.lessons]);

  if (!a)
    return (
      <div className="page">
        <p>Không tìm thấy lần làm bài này.</p>
        <Link className="btn" to="/practice">
          ← Về trang luyện đề
        </Link>
      </div>
    );
  if (!data.bank) return <div className="page loading">Đang tải bộ đề…</div>;

  const passed = a.score / a.total >= PRACTICE_PASS;
  const wrongKeys = a.keys.filter((_, i) => !a.correct[i]);
  const counts = {
    all: a.total,
    wrong: wrongKeys.length,
    flag: a.flags.filter(Boolean).length,
    blank: a.answers.filter((x) => !x).length,
  };
  const shown = a.keys.map((k, i) => ({ k, i })).filter(({ i }) =>
    filter === 'wrong' ? !a.correct[i] : filter === 'flag' ? a.flags[i] : filter === 'blank' ? !a.answers[i] : true
  );
  const restart = (keys: string[], title: string) => {
    if (st.session && !confirm(`Bỏ bài đang làm dở “${st.session.title}” để bắt đầu bài mới?`)) return;
    startSession(title, keys, a.mode);
    navigate('/practice/run');
  };
  const toggle = (i: number) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="page practice">
      <nav className="crumbs">
        <Link to="/practice">Luyện đề</Link> / Kết quả
      </nav>
      <Sketch className="card pr-result" seed={`res${a.id}`} fill={passed ? '#ebfbee' : '#fff5f5'}>
        <div className="pr-result-score">
          <b>{pct(a.score, a.total)}%</b>
          <span className="hand">{passed ? '🎉 Đạt mốc' : '💪 Chưa đạt mốc'}</span>
        </div>
        <div className="pr-result-main">
          <h1>{a.title}</h1>
          <p className="muted">
            {a.mode === 'exam' ? 'Thi thử' : 'Luyện tập'} · đúng {a.score}/{a.total} câu
            {counts.blank ? ` · bỏ trống ${counts.blank}` : ''} · {fmtDuration(a.ms)} · {fmtDate(a.at)}
          </p>
          <p className="small muted">
            Mốc tham khảo {Math.round(PRACTICE_PASS * 100)}% ({Math.ceil(a.total * PRACTICE_PASS)}/{a.total} câu). Điểm thi thật là điểm quy đổi
            100–1000, đậu từ 720.
          </p>
          <div className="row wrap">
            <button className="btn primary" onClick={() => restart(a.keys, a.title)}>
              <RotateCcw size={16} /> Làm lại
            </button>
            {wrongKeys.length > 0 && (
              <button className="btn" onClick={() => restart(wrongKeys, `${a.title} · câu sai`)}>
                <X size={16} /> Làm lại {wrongKeys.length} câu sai
              </button>
            )}
            <Link className="btn" to="/practice">
              Về trang luyện đề
            </Link>
          </div>
        </div>
      </Sketch>

      {byChapter.length > 1 && (
        <>
          <h2 className="hand">📊 Theo chương (yếu nhất trước)</h2>
          <ul className="pr-chapters">
            {byChapter.map((c) => (
              <li key={c.id}>
                <Link to={`/c/${c.id}`}>{c.title}</Link>
                <SketchBar value={c.ok / c.n} color={c.ok / c.n >= PRACTICE_PASS ? '#40c057' : c.ok / c.n >= 0.5 ? '#fab005' : '#fa5252'} />
                <span className="nowrap small">
                  {c.ok}/{c.n}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="pr-review-head">
        <h2 className="hand">🔍 Xem lại</h2>
        <div className="notes-seg">
          {(
            [
              ['all', 'Tất cả'],
              ['wrong', 'Sai'],
              ['flag', 'Đánh dấu'],
              ['blank', 'Bỏ trống'],
            ] as const
          ).map(([f, label]) => (
            <button key={f} className={filter === f ? 'on' : ''} disabled={!counts[f]} onClick={() => setFilter(f)}>
              {label} ({counts[f]})
            </button>
          ))}
        </div>
      </div>
      <ul className="pr-review">
        {shown.map(({ k, i }) => {
          const q = data.byKey.get(k);
          if (!q) return null;
          const isOpen = open.has(i);
          return (
            <li key={k} className={a.correct[i] ? 'ok' : 'bad'}>
              <button className="pr-review-row" onClick={() => toggle(i)} aria-expanded={isOpen}>
                <span className="pr-review-num">{i + 1}</span>
                {a.correct[i] ? <Check size={16} /> : <X size={16} />}
                {a.flags[i] && <Flag size={14} className="pr-flag-ic" />}
                <span className={isOpen ? '' : 'clamp2'}>{q.q.split('\n')[0]}</span>
                <span className="quiz-src">{q.src}</span>
              </button>
              {isOpen && (
                <div className="pr-review-body">
                  <QuestionView q={q} picked={a.answers[i]} reveal />
                  <Explanation q={q} picked={a.answers[i]} lessons={data.lessons} onAsk={() => ask(q, a.answers[i])} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {panel}
    </div>
  );
}
