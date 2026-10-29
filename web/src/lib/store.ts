import { useSyncExternalStore } from 'react';

// Tiny localStorage-backed store. Everything lives in the learner's browser;
// progress can be exported to a file and imported on another device.

function createStore<T>(key: string, initial: T) {
  let value: T = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) value = { ...initial, ...JSON.parse(raw) };
  } catch {
    /* private mode or corrupted entry: start fresh */
  }
  const listeners = new Set<() => void>();
  const set = (next: T) => {
    value = next;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked */
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  // keep tabs in sync
  window.addEventListener('storage', (e) => {
    if (e.key !== key || !e.newValue) return;
    try {
      value = { ...initial, ...JSON.parse(e.newValue) };
      listeners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  });
  return {
    get: () => value,
    set,
    update: (fn: (v: T) => T) => set(fn(value)),
    use: () => useSyncExternalStore(subscribe, () => value),
  };
}

// ---------- progress ----------
export type QuizResult = { best: number; last: number; total: number; at: number; attempts: number };
export type LessonProgress = { visited?: number; done?: number; quiz?: QuizResult };
export type Progress = { lessons: Record<string, LessonProgress>; last?: string };

export const progress = createStore<Progress>('saa.progress.v1', { lessons: {} });

export const PASS_RATIO = 0.8;

export function markVisited(id: string) {
  progress.update((p) => ({
    ...p,
    last: id,
    lessons: { ...p.lessons, [id]: { ...p.lessons[id], visited: Date.now() } },
  }));
}

export function setDone(id: string, done: boolean) {
  progress.update((p) => ({
    ...p,
    lessons: { ...p.lessons, [id]: { ...p.lessons[id], done: done ? Date.now() : undefined } },
  }));
}

export function recordQuiz(id: string, score: number, total: number) {
  progress.update((p) => {
    const cur = p.lessons[id] || {};
    const prev = cur.quiz;
    const quiz: QuizResult = {
      best: Math.max(prev?.best ?? 0, score),
      last: score,
      total,
      at: Date.now(),
      attempts: (prev?.attempts ?? 0) + 1,
    };
    const passed = score / total >= PASS_RATIO;
    return {
      ...p,
      lessons: { ...p.lessons, [id]: { ...cur, quiz, done: cur.done ?? (passed ? Date.now() : undefined) } },
    };
  });
}

export const isDone = (lp?: LessonProgress) => !!lp?.done;

// ---------- settings (API key never leaves the browser except to api.anthropic.com) ----------
export type Settings = { apiKey: string; model: string; effort: 'low' | 'medium' | 'high' };
export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Giải thích sâu nhất (mặc định)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Nhanh, rẻ hơn' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Nhanh và rẻ nhất' },
];
export const settings = createStore<Settings>('saa.settings.v1', {
  apiKey: '',
  model: 'claude-opus-5-5',
  effort: 'medium',
});

// ---------- export / import ----------
type ExportFile = { app: 'saa-c03-sketchbook'; version: 1; exportedAt: string; progress: Progress };

export function exportProgress() {
  const data: ExportFile = {
    app: 'saa-c03-sketchbook',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: progress.get(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `saa-c03-tien-do-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Merge an exported file into local progress: keeps the best of both for each lesson. */
export async function importProgress(file: File, mode: 'merge' | 'replace'): Promise<number> {
  const data = JSON.parse(await file.text()) as ExportFile;
  if (data?.app !== 'saa-c03-sketchbook' || !data.progress?.lessons) throw new Error('File không đúng định dạng tiến độ.');
  const incoming = data.progress;
  if (mode === 'replace') {
    progress.set({ lessons: incoming.lessons, last: incoming.last });
    return Object.keys(incoming.lessons).length;
  }
  const cur = progress.get();
  const lessons = { ...cur.lessons };
  for (const [id, b] of Object.entries(incoming.lessons)) {
    const a = lessons[id] || {};
    const qa = a.quiz;
    const qb = b.quiz;
    lessons[id] = {
      visited: Math.max(a.visited ?? 0, b.visited ?? 0) || undefined,
      done: a.done || b.done ? Math.min(a.done ?? Infinity, b.done ?? Infinity) : undefined,
      quiz:
        qa && qb
          ? {
              best: Math.max(qa.best, qb.best),
              total: qa.total,
              last: qa.at >= qb.at ? qa.last : qb.last,
              at: Math.max(qa.at, qb.at),
              attempts: qa.attempts + qb.attempts,
            }
          : qa || qb,
    };
  }
  progress.set({ lessons, last: cur.last || incoming.last });
  return Object.keys(incoming.lessons).length;
}

export function resetProgress() {
  progress.set({ lessons: {} });
}
