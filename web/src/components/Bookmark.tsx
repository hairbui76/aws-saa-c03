import { useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { bookmarks, toggleBookmark } from '../lib/store';

/** "Lưu bài" toggle on a lesson page; B toggles it from the keyboard. */
export function BookmarkButton({ lessonId }: { lessonId: string }) {
  const saved = !!bookmarks.use().items[lessonId];
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'b' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], .chat')) return;
      e.preventDefault();
      toggleBookmark(lessonId);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [lessonId]);
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      className={`bookmark-btn ${saved ? 'on' : ''}`}
      onClick={() => toggleBookmark(lessonId)}
      aria-pressed={saved}
      title={saved ? 'Bỏ lưu bài này (phím B)' : 'Lưu bài này để mở lại nhanh từ trang chủ (phím B)'}
    >
      <Icon size={17} /> {saved ? 'Đã lưu' : 'Lưu bài'}
    </button>
  );
}

/** Small filled bookmark in lesson lists. */
export function BookmarkMark({ id }: { id: string }) {
  const saved = !!bookmarks.use().items[id];
  return saved ? <Bookmark size={13} className="bookmark-mark" fill="currentColor" aria-label="Đã lưu" /> : null;
}
