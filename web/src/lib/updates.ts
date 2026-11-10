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
