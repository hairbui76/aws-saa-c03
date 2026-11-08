import { useSyncExternalStore } from 'react';

/** "Xem nhanh": lessons opened in the pop-up over the current page, newest last (back = pop). */
export type PeekTarget = { id: string; h?: string };

let stack: PeekTarget[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: PeekTarget[]) => {
  stack = next;
  emit();
};

export const peek = {
  /** open from the page: starts a new pop-up; from inside the pop-up: goes one level deeper */
  open: (t: PeekTarget, inside = false) => set(inside ? [...stack, t] : [t]),
  back: () => set(stack.slice(0, -1)),
  close: () => set([]),
  use: () =>
    useSyncExternalStore(
      (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      () => stack
    ),
};

/** "/l/<id>?h=<heading>" → { id, h } (null for links that aren't lessons) */
export function parseLessonHref(href: string): PeekTarget | null {
  const m = href.match(/^\/l\/([^?#]+)(?:\?(.*))?$/);
  if (!m) return null;
  const h = new URLSearchParams(m[2] || '').get('h') || undefined;
  return { id: decodeURIComponent(m[1]), h };
}
