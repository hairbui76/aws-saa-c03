import { useEffect, useState } from 'react';

export type LessonRef = { id: string; title: string; summary: string; quiz: number };
export type ChapterSummary = { id: string; num: string; title: string; description: string; lessons: LessonRef[] };
export type Chapter = ChapterSummary & { body: string };
export type SearchItem = { id: string; t: string; a: string; c: string; d: string };
export type Index = { chapters: ChapterSummary[]; search: SearchItem[] };

export type Question = {
  type: 'single' | 'multi';
  q: string;
  options: string[];
  answer: number[];
  explain: string;
};

export type DiagramEl = {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'arrow' | 'line';
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  seed: number;
  bg?: string;
  sw?: number;
  dash?: 'dashed' | 'dotted';
  round?: 1;
  op?: number;
  text?: string;
  fs?: number;
  align?: 'left' | 'center' | 'right';
  cid?: string;
  pts?: [number, number][];
  from?: string;
  to?: string;
  sa?: 1;
  ea?: 1;
};
export type Narration = { sig: string; steps: { t: string; a: string | null }[] };
export type Diagram = { box: [number, number, number, number]; els: DiagramEl[]; narr?: Narration };

export type Lecture = { num: string; title: string; video: string | null };
export type Lesson = {
  id: string;
  title: string;
  name: string;
  chapterId: string;
  chapterTitle: string;
  aliases: string[];
  tldr: string;
  body: string;
  diagrams: Record<string, Diagram>;
  lectures: Lecture[];
  quiz: Question[];
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
};
export type CheatSheet = { title: string; body: string };

const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}content/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${path}`);
      return r.json();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p as Promise<T>;
}

export function useJson<T>(path: string | null): { data?: T; error?: Error } {
  const [state, setState] = useState<{ path: string | null; data?: T; error?: Error }>({ path });
  useEffect(() => {
    if (!path) return;
    let alive = true;
    loadJson<T>(path).then(
      (data) => alive && setState({ path, data }),
      (error: Error) => alive && setState({ path, error })
    );
    return () => {
      alive = false;
    };
  }, [path]);
  return state.path === path ? state : {};
}

export const useIndex = () => useJson<Index>('index.json');

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const slug = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
