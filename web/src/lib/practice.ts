import { useMemo } from 'react';
import { useIndex, useJson, type Question } from './content';
import { practice, type PracticeLast, type PracticeSession } from './store';

/** One question of a practice test (public/content/practice.json, built from ../data/99 Banks). */
export type BankQuestion = Question & { k: string; t: string; no: number; lessons: string[] };
export type PracticeBank = { tests: { num: string; title: string; count: number }[]; questions: BankQuestion[] };

export const EXAM_SIZE = 65;
export const EXAM_MINUTES = 130; // the real SAA-C03: 65 questions in 130 minutes
export const LETTERS = 'ABCDEF';

export type LessonInfo = { id: string; title: string; chapterId: string; chapterNum: string; chapterTitle: string };

/** The bank plus lookups: question by key, lesson/chapter of each lesson id. */
export function usePracticeBank() {
  const { data: bank, error } = useJson<PracticeBank>('practice.json');
  const { data: index } = useIndex();
  return useMemo(() => {
    const byKey = new Map(bank?.questions.map((q) => [q.k, q]) ?? []);
    const lessons = new Map<string, LessonInfo>();
    for (const c of index?.chapters ?? [])
      for (const l of c.lessons) lessons.set(l.id, { id: l.id, title: l.title, chapterId: c.id, chapterNum: c.num, chapterTitle: c.title });
    return { bank, error, byKey, lessons, chapters: index?.chapters ?? [] };
  }, [bank, error, index]);
}

/** Chapter of a question = chapter of its main lesson (the first one it is mapped to). */
export const chapterOf = (q: BankQuestion, lessons: Map<string, LessonInfo>) => lessons.get(q.lessons[0]);

function shuffled<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Source =
  | { kind: 'test'; num: string }
  | { kind: 'random' }
  | { kind: 'wrong' }
  | { kind: 'chapter'; id: string };

/** The questions a source would give, and its title. */
export function pickQuestions(
  src: Source,
  bank: PracticeBank,
  last: PracticeLast,
  lessons: Map<string, LessonInfo>
): { title: string; keys: string[] } {
  const qs = bank.questions;
  switch (src.kind) {
    case 'test':
      return { title: `Đề ${src.num}`, keys: qs.filter((q) => q.t === src.num).map((q) => q.k) };
    case 'random':
      return { title: 'Đề ngẫu nhiên', keys: shuffled(qs).slice(0, EXAM_SIZE).map((q) => q.k) };
    case 'wrong': {
      const wrong = qs.filter((q) => last[q.k] && !last[q.k].ok);
      return { title: 'Ôn câu sai', keys: shuffled(wrong).slice(0, EXAM_SIZE).map((q) => q.k) };
    }
    case 'chapter': {
      const inCh = qs.filter((q) => chapterOf(q, lessons)?.chapterId === src.id);
      const ch = lessons.get(inCh[0]?.lessons[0] ?? '');
      return { title: ch ? `Chương ${ch.chapterNum}: ${ch.chapterTitle}` : 'Theo chương', keys: shuffled(inCh).map((q) => q.k) };
    }
  }
}

export function startSession(title: string, keys: string[], mode: 'exam' | 'study') {
  const now = Date.now();
  const session: PracticeSession = {
    id: now,
    title,
    mode,
    keys,
    answers: keys.map(() => null),
    checked: keys.map(() => false),
    flags: keys.map(() => false),
    idx: 0,
    // same pace as the real exam: 2 minutes per question
    deadline: mode === 'exam' ? now + Math.round((keys.length * EXAM_MINUTES * 60_000) / EXAM_SIZE) : null,
  };
  practice.update((s) => ({ ...s, session }));
}

export const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
};

export const fmtDate = (t: number) =>
  new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
