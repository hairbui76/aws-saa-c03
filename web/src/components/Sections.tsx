import type { Diagram } from '../lib/content';
import { slug } from '../lib/content';
import Markdown from './Markdown';
import { Sketch } from './Sketch';
import { UpdateMark } from './UpdateMark';

export type Section = { id: string; title: string; body: string };

const RENAME: Record<string, string> = { '🖼️ Sơ đồ': '🎬 Sơ đồ động' };

/** The heading text as shown on the page. */
export const displayTitle = (title: string) => RENAME[title] || title;

export function splitSections(md: string): Section[] {
  return md
    .split(/^(?=## )/m)
    .map((part) => {
      const m = part.match(/^## (.+)\r?\n?/);
      const title = m ? m[1].trim() : '';
      return { id: title ? slug(title) : 'intro', title: displayTitle(title), body: m ? part.slice(m[0].length) : part };
    })
    .filter((s) => s.title || s.body.trim());
}

const tone = (title: string) =>
  /mẹo thi/i.test(title) ? 'tips' : /sơ đồ/i.test(title) ? 'diagrams' : /liên kết/i.test(title) ? 'links' : '';

export default function Sections({
  body,
  diagrams,
  seed,
  marks,
  markBatch,
}: {
  body: string;
  diagrams?: Record<string, Diagram>;
  seed: string;
  /** section id -> ❗ after the heading: red for "changed", blue for "dropped" */
  marks?: Record<string, 'changed' | 'dropped'>;
  /** date of the update batch, for the tooltip of "changed" marks */
  markBatch?: string;
}) {
  return (
    <>
      {splitSections(body).map((s) => {
        const t = tone(s.title);
        return (
          <Sketch
            key={s.id}
            id={s.id}
            className={`card section ${t}`}
            seed={`${seed}${s.id}`}
            fill={t === 'tips' ? '#fff9db' : '#fff'}
            stroke={t === 'tips' ? '#f08c00' : '#1e1e1e'}
          >
            {s.title && (
              <h2>
                {s.title}
                {marks?.[s.id] && (
                  <>
                    {' '}
                    <UpdateMark
                      kind={marks[s.id] === 'changed' ? 'updated' : 'removed'}
                      size={18}
                      title={
                        marks[s.id] === 'changed'
                          ? `Mục này đổi theo video mới${markBatch ? ` (đợt ${markBatch})` : ''}`
                          : 'Phần này không còn trong bản khóa mới'
                      }
                    />
                  </>
                )}
              </h2>
            )}
            <div className="prose">
              <Markdown diagrams={diagrams}>{s.body}</Markdown>
            </div>
          </Sketch>
        );
      })}
    </>
  );
}
