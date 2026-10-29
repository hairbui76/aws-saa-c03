import { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { BookOpenCheck, KeyRound, Search, Settings2 } from 'lucide-react';
import { useIndex } from './lib/content';
import { isDone, progress, settings } from './lib/store';
import SettingsDialog from './components/SettingsDialog';
import SearchPalette from './components/SearchPalette';
import Home from './pages/Home';
import ChapterPage from './pages/Chapter';
import LessonPage from './pages/Lesson';
import CheatSheetPage from './pages/CheatSheet';

type Ui = { openSettings: () => void; openSearch: () => void };
const UiContext = createContext<Ui>({ openSettings: () => {}, openSearch: () => {} });
export const useUi = () => useContext(UiContext);

function Header() {
  const { openSettings, openSearch } = useUi();
  const { data } = useIndex();
  const p = progress.use();
  const s = settings.use();
  const total = data?.chapters.reduce((n, c) => n + c.lessons.length, 0) || 0;
  const done = Object.values(p.lessons).filter(isDone).length;
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark">SAA</span>
        <span className="brand-text">
          <b>SAA-C03 Sketchbook</b>
          <small>Ôn thi AWS Solutions Architect</small>
        </span>
      </Link>
      <nav className="topnav">
        <NavLink to="/" end>
          Bài học
        </NavLink>
        <NavLink to="/cheat-sheet">Cheat Sheet</NavLink>
      </nav>
      <div className="topbar-right">
        <button className="pill search-pill" onClick={openSearch} title="Tìm bài (Ctrl K)">
          <Search size={16} /> <span>Tìm bài…</span> <kbd>Ctrl K</kbd>
        </button>
        <span className="pill" title="Số bài đã hoàn thành">
          <BookOpenCheck size={16} /> {done}/{total}
        </span>
        <button className={`pill ${s.apiKey ? 'ok' : ''}`} onClick={openSettings} title="Anthropic API key">
          <KeyRound size={16} /> <span className="hide-sm">{s.apiKey ? 'Claude ✓' : 'Thêm key'}</span>
        </button>
        <button className="pill icon" onClick={openSettings} title="Cài đặt, export/import tiến độ">
          <Settings2 size={16} />
        </button>
      </div>
    </header>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <HashRouter>
      <UiContext.Provider value={{ openSettings: () => setSettingsOpen(true), openSearch: () => setSearchOpen(true) }}>
        <ScrollTop />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/c/:id" element={<ChapterPage />} />
          <Route path="/l/:id" element={<LessonPage />} />
          <Route path="/cheat-sheet" element={<CheatSheetPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <footer className="footer">
          Ghi chú tổng hợp từ khóa AWS SAA-C03 của Adrian Cantrill · tiến độ lưu trên máy bạn
        </footer>
        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
        {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      </UiContext.Provider>
    </HashRouter>
  );
}
