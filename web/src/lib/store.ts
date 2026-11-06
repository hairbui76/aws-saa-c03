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

// ---------- diagram viewer preferences ----------
// (every diagram opens on the static tab; the chosen tab is not remembered)
export type ViewPrefs = { fontScale: number; voice: boolean; chatWidth: number };
export const CHAT_WIDTH = 440;
export const viewPrefs = createStore<ViewPrefs>('saa.view.v1', { fontScale: 1.25, voice: true, chatWidth: CHAT_WIDTH });

// ---------- personal notes, one per lesson ----------
export type Note = { text: string; at: number };
export type Notes = { notes: Record<string, Note> };
export const notes = createStore<Notes>('saa.notes.v1', { notes: {} });

export function saveNote(id: string, text: string) {
  notes.update((n) => {
    const next = { ...n.notes };
    if (text.trim()) next[id] = { text, at: Date.now() };
    else delete next[id];
    return { notes: next };
  });
}

export function appendNote(id: string, text: string) {
  const cur = notes.get().notes[id]?.text ?? '';
  saveNote(id, cur.trim() ? `${cur.replace(/\s+$/, '')}\n\n${text}` : text);
}

// ---------- highlights in lesson text (anchored by the quoted text and a little context) ----------
export const MARK_COLORS = ['yellow', 'green', 'pink', 'blue'] as const;
export type MarkColor = (typeof MARK_COLORS)[number];
export type Mark = { id: string; quote: string; prefix: string; suffix: string; color: MarkColor; note?: string; at: number };
export const marks = createStore<{ items: Record<string, Mark[]> }>('saa.marks.v1', { items: {} });

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function addMark(lessonId: string, m: Omit<Mark, 'id' | 'at'>) {
  const mark: Mark = { ...m, id: newId(), at: Date.now() };
  marks.update((s) => ({ items: { ...s.items, [lessonId]: [...(s.items[lessonId] ?? []), mark] } }));
  return mark;
}

export function updateMark(lessonId: string, id: string, patch: Partial<Pick<Mark, 'color' | 'note'>>) {
  marks.update((s) => ({
    items: { ...s.items, [lessonId]: (s.items[lessonId] ?? []).map((m) => (m.id === id ? { ...m, ...patch, at: Date.now() } : m)) },
  }));
}

export function removeMark(lessonId: string, id: string) {
  marks.update((s) => {
    const rest = (s.items[lessonId] ?? []).filter((m) => m.id !== id);
    const items = { ...s.items };
    if (rest.length) items[lessonId] = rest;
    else delete items[lessonId];
    return { items };
  });
}

// ---------- freehand drawing on diagrams, in the diagram's own coordinates ----------
/** c: colour, w: width, o: opacity (highlighter), p: flat [x0, y0, x1, y1, …] */
export type Stroke = { c: string; w: number; o?: number; p: number[] };
export const ink = createStore<{ items: Record<string, Stroke[]> }>('saa.ink.v1', { items: {} });

export function setInk(key: string, strokes: Stroke[]) {
  ink.update((s) => {
    const items = { ...s.items };
    if (strokes.length) items[key] = strokes;
    else delete items[key];
    return { items };
  });
}

// ---------- "Hỏi Claude" conversations, one per lesson ----------
export type ChatMsg = { role: 'user' | 'assistant'; content: string };
export type ChatThread = { msgs: ChatMsg[]; at: number };
export const chats = createStore<{ items: Record<string, ChatThread> }>('saa.chat.v1', { items: {} });
// localStorage is ~5 MB per site: keep the latest messages of the most recent conversations
const CHAT_MAX_MSGS = 40;
const CHAT_MAX_THREADS = 60;

/** Usable history: no empty bubbles, and it ends with an answer (a question left unanswered is dropped). */
export function cleanChat(msgs: ChatMsg[]) {
  const out = msgs.filter((m) => m.content.trim());
  while (out.length && out[out.length - 1].role === 'user') out.pop();
  return out;
}

export function saveChat(lessonId: string, msgs: ChatMsg[]) {
  const kept = cleanChat(msgs).slice(-CHAT_MAX_MSGS);
  // the API wants the conversation to start with a question
  while (kept.length && kept[0].role !== 'user') kept.shift();
  const cur = chats.get().items[lessonId];
  if (cur ? JSON.stringify(cur.msgs) === JSON.stringify(kept) : !kept.length) return;
  chats.update((s) => {
    const items = { ...s.items };
    if (kept.length) items[lessonId] = { msgs: kept, at: Date.now() };
    else delete items[lessonId];
    const ids = Object.keys(items).sort((a, b) => items[b].at - items[a].at);
    for (const id of ids.slice(CHAT_MAX_THREADS)) delete items[id];
    return { items };
  });
}

// ---------- learning roadmap (the uploaded config file, kept as-is) ----------
export type StoredRoadmap = { config: unknown; fileName: string; loadedAt: number } | null;
export const roadmap = createStore<{ current: StoredRoadmap }>('saa.roadmap.v1', { current: null });

// ---------- export / import ----------
type ExportFile = {
  app: 'saa-c03-sketchbook';
  version: 1;
  exportedAt: string;
  progress: Progress;
  notes?: Record<string, Note>;
  marks?: Record<string, Mark[]>;
  ink?: Record<string, Stroke[]>;
  chats?: Record<string, ChatThread>;
  roadmap?: StoredRoadmap;
};

export function exportProgress() {
  const data: ExportFile = {
    app: 'saa-c03-sketchbook',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: progress.get(),
    notes: notes.get().notes,
    marks: marks.get().items,
    ink: ink.get().items,
    chats: chats.get().items,
    roadmap: roadmap.get().current,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `saa-c03-tien-do-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const obj = <T,>(v: T | undefined): T => (v && typeof v === 'object' ? v : ({} as T));

/**
 * Notes, highlights, drawings and chats from an import. Replace takes the file's; merge keeps the newer note
 * and chat, the union of highlights (newer edit wins) and local drawings where both have one. Also takes the roadmap.
 */
function importExtras(data: ExportFile, mode: 'merge' | 'replace') {
  const inNotes = obj(data.notes);
  const inMarks = obj(data.marks);
  const inInk = obj(data.ink);
  const inChats = obj(data.chats);
  if (mode === 'replace') {
    notes.set({ notes: inNotes });
    marks.set({ items: inMarks });
    ink.set({ items: inInk });
    chats.set({ items: inChats });
  } else {
    const mc = { ...chats.get().items };
    for (const [id, t] of Object.entries(inChats)) if (!mc[id] || mc[id].at < t.at) mc[id] = t;
    chats.set({ items: mc });
    const merged = { ...notes.get().notes };
    for (const [id, n] of Object.entries(inNotes)) if (!merged[id] || merged[id].at < n.at) merged[id] = n;
    notes.set({ notes: merged });
    const mm = { ...marks.get().items };
    for (const [id, list] of Object.entries(inMarks)) {
      const byId = new Map((mm[id] ?? []).map((m) => [m.id, m]));
      for (const m of list) if (!byId.has(m.id) || byId.get(m.id)!.at < m.at) byId.set(m.id, m);
      mm[id] = [...byId.values()];
    }
    marks.set({ items: mm });
    ink.set({ items: { ...inInk, ...ink.get().items } });
  }
  if (data.roadmap && (mode === 'replace' || !roadmap.get().current)) roadmap.set({ current: data.roadmap });
}

/** Merge an exported file into local progress: keeps the best of both for each lesson. */
export async function importProgress(file: File, mode: 'merge' | 'replace'): Promise<number> {
  const data = JSON.parse(await file.text()) as ExportFile;
  if (data?.app !== 'saa-c03-sketchbook' || !data.progress?.lessons) throw new Error('File không đúng định dạng tiến độ.');
  const incoming = data.progress;
  importExtras(data, mode);
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
