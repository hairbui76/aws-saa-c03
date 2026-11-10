import type { ReactNode } from 'react';
import type { LessonUpdate } from '../lib/updates';
import { viDate } from '../lib/updates';
import { displayTitle } from './Sections';
import { UpdateMark } from './UpdateMark';

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

function Jumps({ items }: { items: { title: string; id: string }[] }) {
  return (
    <span className="upd-jumps">
      {items.map((h) => (
        <button key={h.id} type="button" className="upd-jump" onClick={() => jump(h.id)}>
          {displayTitle(h.title)}
        </button>
      ))}
    </span>
  );
}

/** Frame under the lesson title: what this lesson's update batch changed, with buttons that scroll to the sections. */
export default function UpdateBanner({ update }: { update?: LessonUpdate }) {
  if (!update) return null;
  const { kind, date, summary, changed, dropped } = update;
  const when = viDate(date);

  const droppedRow = (lead: ReactNode) =>
    dropped.length > 0 && (
      <div className="upd-row dropped">
        <UpdateMark kind="removed" />
        <span>{lead}</span>
        <Jumps items={dropped} />
      </div>
    );

  if (kind === 'removed') {
    return (
      <div className="upd-banner removed" role="note">
        <div className="upd-row">
          <UpdateMark kind="removed" />
          <span>
            Bài này không còn trong bản khóa mới{summary ? ` (${summary})` : ''}, giữ lại để tham khảo.
          </span>
        </div>
      </div>
    );
  }
  if (kind === 'new') {
    return (
      <div className="upd-banner new" role="note">
        <div className="upd-row">
          <UpdateMark kind="new" />
          <span>Bài mới thêm ngày {when} theo bản khóa mới.{summary ? ` ${summary}` : ''}</span>
        </div>
      </div>
    );
  }
  if (kind === 'updated') {
    return (
      <div className="upd-banner updated" role="note">
        <div className="upd-row">
          <UpdateMark kind="updated" />
          <span>
            <b>Bài này cập nhật ngày {when} theo video mới.</b>
            {summary ? ` ${summary}` : ''}
          </span>
        </div>
        {changed.length > 0 && (
          <div className="upd-row changed">
            <span className="upd-lead">Mục đã đổi:</span>
            <Jumps items={changed} />
          </div>
        )}
        {droppedRow(<span className="upd-lead">Không còn trong khóa mới:</span>)}
      </div>
    );
  }
  // no kind: only parts of the lesson were dropped
  if (!dropped.length) return null;
  return (
    <div className="upd-banner removed" role="note">
      {droppedRow(<span className="upd-lead">Các phần này không còn trong khóa mới (giữ lại để tham khảo, cập nhật {when}):</span>)}
    </div>
  );
}
