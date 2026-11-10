// Shapes of public/content/updates.json and of `update` / `u` on lessons (see scripts/lib/updates.mjs).
export type UpdateKind = 'new' | 'updated' | 'removed';

export type LessonUpdate = {
  kind?: UpdateKind;
  date: string;
  summary?: string;
  changed: { title: string; id: string }[];
  dropped: { title: string; id: string }[];
};

export type UpdatesIndex = {
  id: string;
  date: string;
  title: string;
  pages: string[];
  missing: string[];
  counts: Record<UpdateKind, number>;
  chapters: {
    id: string;
    num: string;
    title: string;
    items: { id: string; name: string; kind: UpdateKind; summary?: string }[];
  }[];
};

/** The popup opens only when there is a batch and the learner has not seen that very batch. */
export function shouldShowWhatsNew(seen: string | null | undefined, batchId: string | undefined): boolean {
  return !!batchId && seen !== batchId;
}

/** The later of two batch ids (they are ISO dates, so plain string order); empty values are ignored. */
export function newerBatchId(a?: string | null, b?: string | null): string | null {
  if (!a) return b || null;
  if (!b) return a;
  return a >= b ? a : b;
}

export function chapterUpdateCounts(lessons: { u?: UpdateKind }[]): Record<UpdateKind, number> {
  const n: Record<UpdateKind, number> = { new: 0, updated: 0, removed: 0 };
  for (const l of lessons) if (l.u) n[l.u]++;
  return n;
}

/** Non-zero counts as short Vietnamese phrases, in the fixed order new, updated, removed ("2 bài mới", "3 cập nhật", ...). */
export function updateCountParts(counts: Record<UpdateKind, number>): { kind: UpdateKind; text: string }[] {
  const parts: { kind: UpdateKind; text: string }[] = [];
  if (counts.new) parts.push({ kind: 'new', text: `${counts.new} bài mới` });
  if (counts.updated) parts.push({ kind: 'updated', text: `${counts.updated} cập nhật` });
  if (counts.removed) parts.push({ kind: 'removed', text: `${counts.removed} không còn trong khóa` });
  return parts;
}
