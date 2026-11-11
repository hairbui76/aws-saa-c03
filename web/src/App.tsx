import { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { BookOpenCheck, KeyRound, Monitor, Moon, Search, Settings2, Sparkles, Sun } from 'lucide-react';
import { useIndex, useJson } from './lib/content';
import { isDone, progress, settings, updatesSeen, viewPrefs } from './lib/store';
import { shouldShowWhatsNew, type UpdatesIndex } from './lib/updates';
import { nextTheme, THEMES, useThemeSync } from './lib/theme';
import SettingsDialog from './components/SettingsDialog';
import SearchPalette from './components/SearchPalette';
import WhatsNew from './components/WhatsNew';
import LessonPeek from './components/LessonPeek';
import Home from './pages/Home';
import ChapterPage from './pages/Chapter';
import LessonPage from './pages/Lesson';
import CheatSheetPage from './pages/CheatSheet';
import NotesPage from './pages/Notes';
import RoadmapPage from './pages/Roadmap';
import PracticePage, { PracticeResult, PracticeRun } from './pages/Practice';
import FlashcardsPage from './pages/Flashcards';

type Ui = { openSettings: () => void; openSearch: () => void; openWhatsNew?: () => void };
const UiContext = createContext<Ui>({ openSettings: () => {}, openSearch: () => {} });
export const useUi = () => useContext(UiContext);

function Header() {
  const { openSettings, openSearch, openWhatsNew } = useUi();
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
        <NavLink to="/practice">Luyện đề</NavLink>
        <NavLink to="/flashcards">Flashcard</NavLink>
        <NavLink to="/roadmap">Lộ trình</NavLink>
        <NavLink to="/notes">Ghi chú</NavLink>
        <NavLink to="/cheat-sheet">Cheat Sheet</NavLink>
      </nav>
      <div className="topbar-right">
        <button className="pill search-pill" onClick={openSearch} title="Tìm bài (Ctrl K)">
          <Search size={16} /> <span>Tìm bài…</span> <kbd>Ctrl K</kbd>
        </button>
        <span className="pill progress-pill" title="Số bài đã hoàn thành">
          <BookOpenCheck size={16} /> {done}/{total}
        </span>
        <button className={`pill ${s.apiKey ? 'ok' : ''}`} onClick={openSettings} title="Anthropic API key">
          <KeyRound size={16} /> <span className="hide-sm">{s.apiKey ? 'Claude ✓' : 'Thêm key'}</span>
        </button>
        {openWhatsNew && (
          <button className="pill upd-pill" onClick={openWhatsNew} title="Những thay đổi theo bản khóa mới" aria-label="Có gì mới">
            <Sparkles size={16} /> <span className="hide-md">Có gì mới</span>
          </button>
        )}
        <ThemeButton />
        <button className="pill icon" onClick={openSettings} title="Cài đặt, export/import tiến độ">
          <Settings2 size={16} />
        </button>
      </div>
    </header>
  );
}

function ThemeButton() {
  const { theme } = viewPrefs.use();
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = THEMES.find((t) => t.id === theme)!.label;
  const next = THEMES.find((t) => t.id === nextTheme(theme))!.label;
  return (
    <button
      className="pill icon theme-btn"
      onClick={() => viewPrefs.update((v) => ({ ...v, theme: nextTheme(v.theme) }))}
      title={`Giao diện: ${label} · bấm để chuyển sang ${next}`}
      aria-label={`Giao diện: ${label}`}
    >
      <Icon size={16} />
    </button>
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
  useThemeSync();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // the update batch, if the build has one (no file: no popup and no header button)
  const updates = useJson<UpdatesIndex>('updates.json').data;
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const updatesId = updates?.id;
  useEffect(() => {
    if (shouldShowWhatsNew(updatesSeen.get().seen, updatesId)) setWhatsNewOpen(true);
  }, [updatesId]);
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
      <UiContext.Provider
        value={{
          openSettings: () => setSettingsOpen(true),
          openSearch: () => setSearchOpen(true),
          openWhatsNew: updates ? () => setWhatsNewOpen(true) : undefined,
        }}
      >
        <ScrollTop />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/c/:id" element={<ChapterPage />} />
          <Route path="/l/:id" element={<LessonPage />} />
          <Route path="/cheat-sheet" element={<CheatSheetPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/practice/run" element={<PracticeRun />} />
          <Route path="/practice/r/:id" element={<PracticeResult />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <footer className="footer">
          Ghi chú tổng hợp từ khóa AWS SAA-C03 của Adrian Cantrill · tiến độ lưu trên máy bạn
        </footer>
        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
        {whatsNewOpen && updates && <WhatsNew data={updates} onClose={() => setWhatsNewOpen(false)} />}
        {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
        <LessonPeek />
      </UiContext.Provider>
    </HashRouter>
  );
}
