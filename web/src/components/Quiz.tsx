import { useMemo, useState } from 'react';
import { Check, MessageCircleQuestion, RotateCcw, X } from 'lucide-react';
import type { Question } from '../lib/content';
import { PASS_RATIO, progress, recordQuiz } from '../lib/store';
import { Sketch, Stars } from './Sketch';

const LETTERS = 'ABCDE';

function shuffle<T>(arr: T[], seed: number) {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Shown = { q: Question; order: number[] }; // order[displayIdx] = original option index

export default function Quiz({
  lessonId,
  questions,
  onAsk,
}: {
  lessonId: string;
  questions: Question[];
  onAsk: (prompt: string) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const record = progress.use().lessons[lessonId]?.quiz;

  // options are reshuffled on every retry so position can't be memorised
  const shown: Shown[] = useMemo(
    () =>
      questions.map((q, i) => ({
        q,
        order: attempt === 0 ? q.options.map((_, k) => k) : shuffle(q.options.map((_, k) => k), attempt * 97 + i),
      })),
    [questions, attempt]
  );

  if (!questions.length) return null;
  const finished = results.length === questions.length && !checked;
  const cur = shown[idx];
  const need = cur.q.answer.length;
  const correctDisplay = cur.order.map((orig, d) => (cur.q.answer.includes(orig) ? d : -1)).filter((d) => d >= 0);
  const isRight = picked.length === need && picked.every((p) => correctDisplay.includes(p));

  const toggle = (d: number) => {
    if (checked) return;
    if (need === 1) setPicked([d]);
    else setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : p.length < need ? [...p, d] : p));
  };

  const check = () => {
    setChecked(true);
    setResults((r) => [...r, isRight]);
  };
  const next = () => {
    const done = results.length === questions.length;
    if (done) recordQuiz(lessonId, results.filter(Boolean).length, questions.length);
    setChecked(false);
    setPicked([]);
    if (!done) setIdx(idx + 1);
  };
  const restart = () => {
    setAttempt((a) => a + 1);
    setIdx(0);
    setPicked([]);
    setChecked(false);
    setResults([]);
  };

  const askAbout = (s: Shown) =>
    onAsk(
      `Giải thích giúp tôi câu quiz này:\n\n${s.q.q}\n${s.order.map((o, d) => `${LETTERS[d]}. ${s.q.options[o]}`).join('\n')}\n\nĐáp án đúng: ${s.order
        .map((o, d) => (s.q.answer.includes(o) ? LETTERS[d] : ''))
        .join('')}. Vì sao các phương án còn lại sai, và trong đề thật cần nhận ra từ khóa nào?`
    );

  if (finished) {
    const score = results.filter(Boolean).length;
    const passed = score / questions.length >= PASS_RATIO;
    return (
      <Sketch className="quiz quiz-result" seed={`r${lessonId}`} fill={passed ? '#ebfbee' : '#fff5f5'}>
        <h3>{passed ? '🎉 Qua bài!' : '💪 Chưa đạt, thử lại nhé'}</h3>
        <div className="quiz-score">
          <Stars score={score} total={questions.length} />
          <b>
            {score}/{questions.length}
          </b>
          <span className="muted">cần ≥ {Math.ceil(questions.length * PASS_RATIO)} câu để hoàn thành bài</span>
        </div>
        {record && (
          <p className="muted">
            Điểm cao nhất: {record.best}/{record.total} · số lần làm: {record.attempts}
          </p>
        )}
        <ul className="quiz-review">
          {shown.map((s, i) => (
            <li key={i} className={results[i] ? 'ok' : 'bad'}>
              {results[i] ? <Check size={16} /> : <X size={16} />}
              <span>{s.q.q}</span>
              {!results[i] && (
                <button className="link-btn" onClick={() => askAbout(s)}>
                  <MessageCircleQuestion size={14} /> Hỏi Claude
                </button>
              )}
            </li>
          ))}
        </ul>
        <button className="btn" onClick={restart}>
          <RotateCcw size={16} /> Làm lại (đảo đáp án)
        </button>
      </Sketch>
    );
  }

  return (
    <Sketch className="quiz" seed={`q${lessonId}${idx}`} fill="#fff">
      <div className="quiz-head">
        <span className="quiz-count">
          Câu {idx + 1}/{questions.length}
        </span>
        <div className="quiz-dots">
          {questions.map((_, i) => (
            <i key={i} className={i < results.length ? (results[i] ? 'ok' : 'bad') : i === idx ? 'now' : ''} />
          ))}
        </div>
        {record && (
          <span className="muted small">
            Cao nhất {record.best}/{record.total}
          </span>
        )}
      </div>
      <p className="quiz-q">{cur.q.q}</p>
      {need > 1 && <p className="muted small">Chọn {need} đáp án</p>}
      <div className="quiz-options">
        {cur.order.map((orig, d) => {
          const sel = picked.includes(d);
          const state = checked ? (correctDisplay.includes(d) ? 'right' : sel ? 'wrong' : 'off') : sel ? 'sel' : '';
          return (
            <button key={d} className={`opt ${state}`} onClick={() => toggle(d)} disabled={checked}>
              <span className="opt-letter">{LETTERS[d]}</span>
              <span>{cur.q.options[orig]}</span>
            </button>
          );
        })}
      </div>
      {checked && (
        <div className={`quiz-explain ${isRight ? 'ok' : 'bad'}`}>
          <b>{isRight ? '✔ Chính xác!' : '✘ Chưa đúng.'}</b> {cur.q.explain}
          <button className="link-btn" onClick={() => askAbout(cur)}>
            <MessageCircleQuestion size={14} /> Hỏi Claude thêm về câu này
          </button>
        </div>
      )}
      <div className="quiz-actions">
        {!checked ? (
          <button className="btn primary" disabled={picked.length !== need} onClick={check}>
            Kiểm tra
          </button>
        ) : (
          <button className="btn primary" onClick={next}>
            {idx + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp →'}
          </button>
        )}
      </div>
    </Sketch>
  );
}
