import type { Diagram } from '../lib/content';
import { slug } from '../lib/content';
import Markdown from './Markdown';
import { Sketch } from './Sketch';

export type Section = { id: string; title: string; body: string };

const RENAME: Record<string, string> = { '🖼️ Sơ đồ': '🎬 Sơ đồ động' };

export function splitSections(md: string): Section[] {
  return md
    .split(/^(?=## )/m)
    .map((part) => {
      const m = part.match(/^## (.+)\r?\n?/);
      const title = m ? m[1].trim() : '';
      return { id: title ? slug(title) : 'intro', title: RENAME[title] || title, body: m ? part.slice(m[0].length) : part };
    })
    .filter((s) => s.title || s.body.trim());
}

const tone = (title: string) =>
  /mẹo thi/i.test(title) ? 'tips' : /sơ đồ/i.test(title) ? 'diagrams' : /liên kết/i.test(title) ? 'links' : '';

export default function Sections({
  body,
  diagrams,
  seed,
}: {
  body: string;
  diagrams?: Record<string, Diagram>;
  seed: string;
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
            {s.title && <h2>{s.title}</h2>}
            <div className="prose">
              <Markdown diagrams={diagrams}>{s.body}</Markdown>
            </div>
          </Sketch>
        );
      })}
    </>
  );
}
