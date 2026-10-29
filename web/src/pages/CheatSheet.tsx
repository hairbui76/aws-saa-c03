import { Link } from 'react-router-dom';
import { useJson, type CheatSheet } from '../lib/content';
import Sections, { splitSections } from '../components/Sections';

export default function CheatSheetPage() {
  const { data, error } = useJson<CheatSheet>('cheat-sheet.json');
  if (error) return <div className="page">Không tải được cheat sheet.</div>;
  if (!data) return <div className="page loading">Đang tải…</div>;
  const toc = splitSections(data.body).filter((s) => s.title);
  return (
    <div className="page cheat-page">
      <nav className="crumbs">
        <Link to="/">Bài học</Link> / Cheat Sheet
      </nav>
      <h1 className="lesson-title">📋 {data.title}</h1>
      <div className="toc-inline">
        {toc.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={(e) => (e.preventDefault(), document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }))}>
            {s.title}
          </a>
        ))}
      </div>
      <Sections body={data.body} seed="cheat" />
    </div>
  );
}
