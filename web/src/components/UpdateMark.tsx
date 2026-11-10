import { CircleAlert } from 'lucide-react';
import type { UpdateKind } from '../lib/updates';

const TITLES: Record<UpdateKind, string> = {
  new: 'Bài mới theo bản khóa mới',
  updated: 'Bài có cập nhật theo bản khóa mới',
  removed: 'Bài không còn trong bản khóa mới, giữ lại để tham khảo',
};

/** ❗ (red: changed, blue: no longer in the new course) or a green MỚI chip, on a lesson touched by the update batch. */
export function UpdateMark({ kind, size = 15 }: { kind?: UpdateKind; size?: number }) {
  if (!kind) return null;
  const title = TITLES[kind];
  return (
    <span className={`upd-mark ${kind}`} title={title} aria-label={title}>
      {kind === 'new' ? 'MỚI' : <CircleAlert size={size} strokeWidth={2.4} />}
    </span>
  );
}

/** One line explaining the three marks. */
export function UpdateLegend() {
  return (
    <p className="upd-legend">
      <span>
        <UpdateMark kind="new" /> bài mới
      </span>
      <span>
        <UpdateMark kind="updated" /> có cập nhật
      </span>
      <span>
        <UpdateMark kind="removed" /> không còn trong khóa mới
      </span>
    </p>
  );
}
