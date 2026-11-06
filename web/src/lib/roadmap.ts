import { useMemo } from 'react';
import { useIndex, type ChapterSummary, type Index, type LessonRef } from './content';
import { isDone, roadmap, type Progress } from './store';

// A roadmap is a JSON file the learner uploads. It splits the course into stages, each with a
// list of chapters ("05") and/or lessons ("s3-security") and an optional deadline.
//
// {
//   "app": "saa-c03-sketchbook", "kind": "roadmap", "version": 1,
//   "name": "Lộ trình 8 tuần",
//   "start": "2026-11-09",            // optional: day 1; stages with "days" count from here
//   "exam": "2027-01-04",             // optional: exam day, shown as a countdown
//   "exclude": ["decimal-and-binary-conversion"],   // optional: lessons to leave out
//   "stages": [
//     { "title": "Tuần 1", "days": 7, "items": ["00", "01", "iam-basics"], "goal": "..." },
//     { "title": "Tuần 2", "due": "2026-11-22", "items": ["02"] }
//   ]
// }
// Keys starting with "_" are ignored, so templates can carry instructions.

export type RoadmapStageConfig = { title?: string; items?: string[]; days?: number; due?: string; goal?: string };
export type RoadmapConfig = {
  app?: string;
  kind?: string;
  version?: number;
  name?: string;
  start?: string;
  exam?: string;
  exclude?: string[];
  stages: RoadmapStageConfig[];
};

export type StageLesson = LessonRef & { chapter: ChapterSummary };
export type Stage = { index: number; title: string; goal?: string; due?: Date; lessons: StageLesson[] };
export type Plan = { name: string; start?: Date; exam?: Date; stages: Stage[]; warnings: string[]; lessonCount: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11-09" as local midnight (not UTC, so the day doesn't shift). */
export function parseDate(s: unknown): Date | undefined {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : undefined;
}

export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

/** Whole days from a to b (b - a). */
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

export const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Structural check of an uploaded file. Throws a readable error; ids are checked later against the course. */
export function validateConfig(raw: unknown): RoadmapConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('File phải là một object JSON.');
  const c = raw as Record<string, unknown>;
  if (c.app === 'saa-c03-sketchbook' && 'progress' in c)
    throw new Error('Đây là file tiến độ, hãy import ở Cài đặt → Tiến độ học.');
  if (!Array.isArray(c.stages) || c.stages.length === 0) throw new Error('Thiếu "stages": cần ít nhất một giai đoạn.');
  for (const k of ['start', 'exam'] as const)
    if (c[k] !== undefined && !parseDate(c[k])) throw new Error(`"${k}" phải là ngày dạng YYYY-MM-DD.`);
  if (c.exclude !== undefined && !(Array.isArray(c.exclude) && c.exclude.every((x) => typeof x === 'string')))
    throw new Error('"exclude" phải là danh sách id bài học.');
  c.stages.forEach((s, i) => {
    const where = `Giai đoạn ${i + 1}`;
    if (!s || typeof s !== 'object') throw new Error(`${where} phải là một object.`);
    const st = s as Record<string, unknown>;
    if (!Array.isArray(st.items) || !st.items.every((x) => typeof x === 'string'))
      throw new Error(`${where}: "items" phải là danh sách id chương hoặc id bài học.`);
    if (st.due !== undefined && !parseDate(st.due)) throw new Error(`${where}: "due" phải là ngày dạng YYYY-MM-DD.`);
    if (st.days !== undefined && !(typeof st.days === 'number' && st.days > 0))
      throw new Error(`${where}: "days" phải là số ngày lớn hơn 0.`);
  });
  return c as unknown as RoadmapConfig;
}

/** Resolve a config against the course: expand chapters, drop unknown ids (as warnings), compute deadlines. */
export function buildPlan(config: RoadmapConfig, index: Index): Plan {
  const chapters = new Map(index.chapters.map((c) => [c.id, c]));
  const lessons = new Map<string, StageLesson>();
  for (const c of index.chapters) for (const l of c.lessons) lessons.set(l.id, { ...l, chapter: c });
  const warnings: string[] = [];
  const exclude = new Set(config.exclude ?? []);
  for (const id of exclude) if (!lessons.has(id)) warnings.push(`exclude: không có bài "${id}".`);

  const seen = new Set<string>();
  const start = parseDate(config.start);
  let prevEnd = start;
  const stages: Stage[] = config.stages.map((s, i) => {
    const out: StageLesson[] = [];
    const add = (l: StageLesson) => {
      if (exclude.has(l.id) || seen.has(l.id)) return;
      seen.add(l.id);
      out.push(l);
    };
    for (const raw of s.items ?? []) {
      const id = raw.trim();
      const ch = chapters.get(id) ?? chapters.get(id.padStart(2, '0'));
      if (ch) ch.lessons.forEach((l) => add({ ...l, chapter: ch }));
      else if (lessons.has(id)) add(lessons.get(id)!);
      else warnings.push(`Giai đoạn ${i + 1}: không có chương hay bài "${id}".`);
    }
    let due = parseDate(s.due);
    if (!due && s.days && prevEnd) due = addDays(prevEnd, s.days - (prevEnd === start ? 1 : 0));
    if (due) prevEnd = due;
    return { index: i, title: s.title?.trim() || `Giai đoạn ${i + 1}`, goal: s.goal, due, lessons: out };
  });
  const lessonCount = stages.reduce((n, s) => n + s.lessons.length, 0);
  if (!lessonCount) throw new Error('Lộ trình không có bài học nào khớp với khóa học.');
  return { name: config.name?.trim() || 'Lộ trình của tôi', start, exam: parseDate(config.exam), stages, warnings, lessonCount };
}

export type StageStatus = { done: number; total: number; complete: boolean; overdue: boolean; daysLeft?: number };

export function stageStatus(stage: Stage, p: Progress, now = today()): StageStatus {
  const done = stage.lessons.filter((l) => isDone(p.lessons[l.id])).length;
  const complete = done === stage.lessons.length;
  const daysLeft = stage.due ? daysBetween(now, stage.due) : undefined;
  return { done, total: stage.lessons.length, complete, overdue: !complete && daysLeft !== undefined && daysLeft < 0, daysLeft };
}

/** The stage to work on now: the first one not finished. */
export function currentStage(plan: Plan, p: Progress) {
  return plan.stages.find((s) => !stageStatus(s, p).complete) ?? null;
}

/** Where the learner stands against the schedule: lessons that should be done by today vs. done. */
export function pace(plan: Plan, p: Progress, now = today()) {
  let expected = 0;
  let done = 0;
  let from = plan.start;
  for (const s of plan.stages) {
    const st = stageStatus(s, p, now);
    done += st.done;
    if (s.due && from) {
      const span = Math.max(1, daysBetween(from, s.due) + 1);
      const gone = Math.min(span, Math.max(0, daysBetween(from, now) + 1));
      expected += Math.round((s.lessons.length * gone) / span);
    } else if (s.due && daysBetween(now, s.due) < 0) expected += s.lessons.length;
    if (s.due) from = addDays(s.due, 1);
  }
  return { expected, done, scheduled: plan.stages.some((s) => s.due) };
}

// ---------- templates ----------

/** Split chapters into n stages of about the same number of lessons, keeping course order. */
function groupChapters(chapters: ChapterSummary[], n: number) {
  const total = chapters.reduce((s, c) => s + c.lessons.length, 0);
  const groups: ChapterSummary[][] = [];
  let acc = 0;
  for (const c of chapters) {
    const k = Math.min(n - 1, Math.floor((acc / total) * n));
    (groups[k] ??= []).push(c);
    acc += c.lessons.length;
  }
  return groups.filter(Boolean);
}

const HELP = [
  'Mẫu lộ trình SAA-C03 Sketchbook. Sửa file này rồi tải lên ở trang Lộ trình.',
  '"start": ngày bắt đầu (YYYY-MM-DD). "exam": ngày thi, để đếm ngược. Có thể bỏ.',
  '"stages": các giai đoạn theo thứ tự. "items" nhận id chương (vd "05") hoặc id bài (vd "s3-security", lấy từ đường dẫn #/l/<id>).',
  'Mỗi giai đoạn có "days" (số ngày, tính nối tiếp từ "start") hoặc "due" (hạn chót YYYY-MM-DD). Không có cả hai thì không có hạn.',
  '"exclude": các bài muốn bỏ qua. "goal": ghi chú mục tiêu của giai đoạn. Khóa bắt đầu bằng "_" sẽ bị bỏ qua.',
];

const header = (name: string, start: Date, exam: Date) => ({
  _huong_dan: HELP,
  app: 'saa-c03-sketchbook',
  kind: 'roadmap',
  version: 1,
  name,
  start: toIso(start),
  exam: toIso(exam),
  exclude: [] as string[],
});

export type Template = { id: string; label: string; note: string; build: (index: Index) => object };

/** Next Monday (or today if it is Monday): a natural day 1 for a weekly plan. */
function nextMonday() {
  const t = today();
  return addDays(t, (8 - t.getDay()) % 7);
}

function weekly(index: Index, weeks: number, name: string) {
  const start = nextMonday();
  const groups = groupChapters(index.chapters, weeks);
  return {
    ...header(name, start, addDays(start, groups.length * 7 + 2)),
    stages: groups.map((g, i) => ({
      title: `Tuần ${i + 1}: ${g.map((c) => c.title).join(', ')}`,
      days: 7,
      items: g.map((c) => c.id),
      goal: `${g.reduce((n, c) => n + c.lessons.length, 0)} bài, làm hết quiz cuối bài.`,
    })),
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 'weeks-8',
    label: '8 tuần theo khóa học',
    note: 'Đủ mọi chương theo thứ tự khóa học, mỗi tuần một giai đoạn (khoảng 5 bài/ngày).',
    build: (i) => weekly(i, 8, 'Lộ trình 8 tuần'),
  },
  {
    id: 'weeks-12',
    label: '12 tuần thong thả',
    note: 'Như trên nhưng giãn ra 12 tuần cho người vừa học vừa đi làm.',
    build: (i) => weekly(i, 12, 'Lộ trình 12 tuần'),
  },
  {
    id: 'custom',
    label: 'Tự soạn (mẫu ngắn)',
    note: 'Vài giai đoạn ví dụ trộn id chương và id bài, có "due" và "exclude" để bạn sửa tiếp.',
    build: (index) => {
      const start = nextMonday();
      const ch = (id: string) => index.chapters.find((c) => c.id === id);
      const firstLessons = (id: string, n: number) => ch(id)?.lessons.slice(0, n).map((l) => l.id) ?? [];
      const rest = index.chapters.slice(3).map((c) => c.id);
      return {
        ...header('Lộ trình tự soạn', start, addDays(start, 60)),
        exclude: firstLessons('02', 1),
        stages: [
          { title: 'Làm quen', days: 3, items: ['00', '01'], goal: 'Hiểu đề thi và tài khoản AWS.' },
          { title: 'Nền tảng kỹ thuật', days: 7, items: ['02', '03'] },
          { title: 'IAM và S3 trước', due: toIso(addDays(start, 20)), items: ['04', ...firstLessons('05', 5)] },
          { title: 'Phần còn lại', due: toIso(addDays(start, 55)), items: rest },
        ],
      };
    },
  },
];

export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** The uploaded roadmap resolved against the course, or null when none is loaded. */
export function usePlan(): { plan: Plan | null; error?: string; fileName?: string; loadedAt?: number } {
  const { current } = roadmap.use();
  const index = useIndex().data;
  return useMemo(() => {
    if (!current || !index) return { plan: null };
    try {
      return { plan: buildPlan(validateConfig(current.config), index), fileName: current.fileName, loadedAt: current.loadedAt };
    } catch (e) {
      return { plan: null, error: (e as Error).message, fileName: current.fileName };
    }
  }, [current, index]);
}

/** Read and check an uploaded file; on success it becomes the active roadmap. */
export async function loadRoadmapFile(file: File, index: Index): Promise<Plan> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch (e) {
    throw new Error(`Không đọc được JSON: ${(e as Error).message}`);
  }
  const config = validateConfig(raw);
  const plan = buildPlan(config, index);
  roadmap.set({ current: { config, fileName: file.name, loadedAt: Date.now() } });
  return plan;
}
