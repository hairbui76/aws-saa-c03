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
