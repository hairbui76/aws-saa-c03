import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, BookOpen, ChevronLeft, ChevronRight, Layers, RotateCcw, Search, Shuffle, Sparkles, Target } from 'lucide-react';
import { useIndex } from '../lib/content';
import { flashcards, FLASH_KNOWN_BOX, nextFlashState, rateFlash, type FlashRating } from '../lib/store';
import { buildSession, deckCards, fmtInterval, stats, useFlashData, type Card, type Deck, type FlashData, type Mode } from '../lib/flash';
import { Sketch, SketchBar } from '../components/Sketch';
import LessonLink from '../components/LessonLink';

const NEW_LIMITS = [10, 20, 30, 50];
const RATINGS: { r: FlashRating; label: string; cls: string }[] = [
  { r: 0, label: 'Quên', cls: 'again' },
  { r: 1, label: 'Khó', cls: 'hard' },
  { r: 2, label: 'Nhớ', cls: 'good' },
  { r: 3, label: 'Dễ', cls: 'easy' },
];
const MODE_TITLE: Record<Mode, string> = { review: 'Ôn hôm nay', new: 'Học thẻ mới', browse: 'Xem tự do', hard: 'Thẻ hay quên' };

// small per-viewer preferences
function usePref<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : init;
    } catch {
      return init;
    }
  });
  const set = (x: T) => {
    setV(x);
    try {
      localStorage.setItem(key, JSON.stringify(x));
    } catch {
      /* ignore */
    }
  };
  return [v, set];
}

type Session = { mode: Mode; ids: string[]; idx: number; flipped: boolean; tally: number[] };

export default function FlashcardsPage() {
  const { data, error } = useFlashData();
  const index = useIndex().data;
  const [params, setParams] = useSearchParams();
  const st = flashcards.use().cards;
  const [reverse, setReverse] = usePref('saa.flash.reverse', false);
  const [newLimit, setNewLimit] = usePref('saa.flash.newLimit', 20);
  const [session, setSession] = useState<Session | null>(null);

  const lessonParam = params.get('lesson');
  const deck: Deck = lessonParam ? `lesson:${lessonParam}` : ((params.get('deck') as Deck | null) ?? 'all');
  const setDeck = (d: Deck) => setParams(d === 'all' ? {} : { deck: d }, { replace: true });
  const lessonTitle = useMemo(() => {
    if (!lessonParam || !index) return null;
    for (const c of index.chapters) for (const l of c.lessons) if (l.id === lessonParam) return l.title;
    return lessonParam;
  }, [lessonParam, index]);

  const cards = useMemo(() => (data ? deckCards(data, deck) : []), [data, deck]);
  const byId = useMemo(() => new Map(data ? deckCards(data, 'all').concat(deckCards(data, 'abbr')).map((c) => [c.id, c]) : []), [data]);
  const s = useMemo(() => stats(cards, st), [cards, st]);

  if (error) return <div className="page">Không tải được bộ thẻ.</div>;
  if (!data) return <div className="page loading">Đang tải bộ thẻ…</div>;

  const deckTitle =
    deck === 'all'
      ? 'Tất cả thuật ngữ'
      : deck === 'abbr'
        ? 'Viết tắt'
        : deck.startsWith('ch:')
          ? `Chương ${data.decks.find((d) => d.id === deck.slice(3))?.title ?? deck.slice(3)}`
          : `Bài: ${lessonTitle ?? ''}`;

  const start = (mode: Mode) => {
    const ids = buildSession(cards, st, mode, newLimit);
    if (ids.length) setSession({ mode, ids, idx: 0, flipped: false, tally: [0, 0, 0, 0] });
  };

  if (session)
    return (
      <Study
        session={session}
        setSession={setSession}
        byId={byId}
        data={data}
        reverse={reverse}
        title={`${MODE_TITLE[session.mode]} · ${deckTitle}`}
        onExit={() => setSession(null)}
        onAgain={() => start(session.mode)}
      />
    );

  return (
    <div className="page flash">
      <nav className="crumbs">
        <Link to="/">Bài học</Link> / Flashcard
      </nav>
      <Sketch className="card fl-hero" seed="flhero" fill="#fff">
        <Layers size={40} className="fl-hero-icon" />
        <div>
          <h1>Flashcard thuật ngữ</h1>
          <p className="muted">
            {data.cards.length} thẻ thuật ngữ theo chương và {data.abbr.length} từ viết tắt. Lật thẻ, tự chấm mức nhớ; thẻ nhớ tốt
            sẽ được hẹn ôn lại sau 1, 3, 7, 16 rồi 35 ngày, thẻ quên quay lại ngay trong lượt.
          </p>
          <div className="fl-stats">
            <span>
              <b>{s.due}</b> đến hạn hôm nay
            </span>
            <span>
              <b>{s.fresh}</b> chưa học
            </span>
            <span>
              <b>{s.learning}</b> đang học
            </span>
            <span>
              <b>{s.known}</b> đã thuộc
            </span>
          </div>
          <SketchBar value={s.total ? s.known / s.total : 0} color="#40c057" />
        </div>
      </Sketch>

      <div className="fl-controls">
        <label className="fl-field">
          <span className="hand">Bộ thẻ</span>
          <select className="pr-select" value={deck} onChange={(e) => setDeck(e.target.value as Deck)}>
            {lessonParam && <option value={deck}>Bài: {lessonTitle}</option>}
            <option value="all">Tất cả thuật ngữ ({data.cards.length})</option>
            <option value="abbr">Viết tắt ({data.abbr.length})</option>
            {data.decks.map((d) => (
              <option key={d.id} value={`ch:${d.id}`}>
                Chương {d.title} ({d.count})
              </option>
            ))}
          </select>
        </label>
        <label className="fl-field">
          <span className="hand">Thẻ mới mỗi lượt</span>
          <select className="pr-select" value={newLimit} onChange={(e) => setNewLimit(Number(e.target.value))}>
            {NEW_LIMITS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button className={`chip-btn fl-reverse ${reverse ? 'on' : ''}`} onClick={() => setReverse(!reverse)} aria-pressed={reverse}>
          <ArrowLeftRight size={15} /> {reverse ? 'Định nghĩa → thuật ngữ' : 'Thuật ngữ → định nghĩa'}
        </button>
      </div>

      <div className="pr-grid fl-modes">
        <ModeCard
          icon={<Target size={18} />}
          title="Ôn hôm nay"
          text={`${s.due} thẻ đến hạn + tối đa ${newLimit} thẻ mới.`}
          disabled={!s.due && !s.fresh}
          primary
          onClick={() => start('review')}
        />
        <ModeCard
          icon={<Sparkles size={18} />}
          title="Học thẻ mới"
          text={s.fresh ? `${Math.min(s.fresh, newLimit)} thẻ chưa học (còn ${s.fresh}).` : 'Đã học hết thẻ của bộ này.'}
          disabled={!s.fresh}
          onClick={() => start('new')}
        />
        <ModeCard
          icon={<RotateCcw size={18} />}
          title="Thẻ hay quên"
          text={s.hard ? `${s.hard} thẻ từng bấm “Quên”.` : 'Chưa có thẻ nào bị quên.'}
          disabled={!s.hard}
          onClick={() => start('hard')}
        />
        <ModeCard
          icon={<Shuffle size={18} />}
          title="Xem tự do"
          text={`Lật cả ${s.total} thẻ theo thứ tự ngẫu nhiên, không chấm điểm.`}
          disabled={!s.total}
          onClick={() => start('browse')}
        />
      </div>

      <Glossary cards={cards} st={st} />
    </div>
  );
}

function ModeCard({
  icon,
  title,
  text,
  disabled,
  primary,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  disabled: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <Sketch className="pr-card" seed={`fm${title}`} fill="#fff">
      <b className="hand pr-card-title">
        {icon} {title}
      </b>
      <span className="muted small">{text}</span>
      <button className={`btn ${primary ? 'primary' : ''}`} disabled={disabled} onClick={onClick}>
        Bắt đầu
      </button>
    </Sketch>
  );
}

/** Both faces of a card's content. */
function Back({ c, data, byId }: { c: Card; data: FlashData; byId: Map<string, Card> }) {
  const ref = c.kind === 'abbr' && c.ref ? (byId.get(c.ref) as Extract<Card, { kind: 'term' }> | undefined) : undefined;
  const def = c.kind === 'term' ? c.def : ref?.def;
  const tip = c.kind === 'term' ? c.tip : ref?.tip;
  const lessons = c.kind === 'term' ? c.l : [...new Set([...(ref?.l ?? []), ...c.l])].slice(0, 3);
  return (
    <>
      <div className="fl-term">
        <b>{c.t}</b>
        {c.f && <span className="fl-full">{c.f}</span>}
      </div>
      {def && <p className="fl-def">{def}</p>}
      {tip && <p className="fl-tip">🎯 {tip}</p>}
      <LessonChips ids={lessons} />
    </>
  );
}

function LessonChips({ ids }: { ids: string[] }) {
  const index = useIndex().data;
  const title = (id: string) => {
    for (const ch of index?.chapters ?? []) for (const l of ch.lessons) if (l.id === id) return l.title;
    return id;
  };
  return (
    <div className="fl-lessons" onClick={(e) => e.stopPropagation()}>
      <BookOpen size={14} />
      {ids.map((id) => (
        <LessonLink key={id} href={`/l/${id}`}>
          {title(id)}
        </LessonLink>
      ))}
    </div>
  );
}

function Study({
  session,
  setSession,
  byId,
  data,
  reverse,
  title,
  onExit,
  onAgain,
}: {
  session: Session;
  setSession: (s: Session | null) => void;
  byId: Map<string, Card>;
  data: FlashData;
  reverse: boolean;
  title: string;
  onExit: () => void;
  onAgain: () => void;
}) {
  const st = flashcards.use().cards;
  const browse = session.mode === 'browse';
  const done = session.idx >= session.ids.length;
  const c = done ? undefined : byId.get(session.ids[session.idx]);

  const flip = useCallback(() => setSession({ ...session, flipped: !session.flipped }), [session, setSession]);
  const move = useCallback(
    (d: number) => {
      const idx = Math.max(0, Math.min(session.ids.length, session.idx + d));
      setSession({ ...session, idx, flipped: false });
    },
    [session, setSession]
  );
  const rate = useCallback(
    (r: FlashRating) => {
      if (!c || !session.flipped) return;
      rateFlash(c.id, r);
      const ids = session.ids.slice();
      // forgotten: see it again a few cards later in this session
      if (r === 0) ids.splice(Math.min(ids.length, session.idx + 4), 0, c.id);
      const tally = session.tally.slice();
      tally[r]++;
      setSession({ ...session, ids, idx: session.idx + 1, flipped: false, tally });
    },
    [c, session, setSession]
  );

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, .chat, .modal')) return;
      if (e.key === 'Escape') onExit();
      else if (done) return;
      else if (e.key === ' ' || e.key === 'Enter') flip();
      else if (browse && e.key === 'ArrowRight') move(1);
      else if (browse && e.key === 'ArrowLeft') move(-1);
      else if (!browse && session.flipped && '1234'.includes(e.key)) rate((Number(e.key) - 1) as FlashRating);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [browse, done, flip, move, rate, onExit, session.flipped]);

  const total = session.ids.length;
  const ch = c?.kind === 'term' ? data.decks.find((d) => d.id === c.d) : undefined;

  return (
    <div className="page flash fl-study">
      <div className="fl-bar">
        <button className="icon-btn" onClick={onExit} title="Về trang flashcard (Esc)">
          <ArrowLeft size={17} />
        </button>
        <b className="hand fl-bar-title">{title}</b>
        <span className="muted small nowrap">
          {Math.min(session.idx + 1, total)}/{total}
        </span>
      </div>
      <SketchBar value={total ? session.idx / total : 0} color="#fab005" />

      {done || !c ? (
        <Sketch className="card fl-done" seed="fldone" fill="#ebfbee">
          <h2>🎉 Xong lượt này!</h2>
          {!browse && (
            <p>
              Quên <b>{session.tally[0]}</b> · Khó <b>{session.tally[1]}</b> · Nhớ <b>{session.tally[2]}</b> · Dễ <b>{session.tally[3]}</b>
            </p>
          )}
          <div className="row wrap">
            <button className="btn primary" onClick={onAgain}>
              <RotateCcw size={16} /> Thêm một lượt
            </button>
            <button className="btn" onClick={onExit}>
              Về trang flashcard
            </button>
          </div>
        </Sketch>
      ) : (
        <>
          <div
            className={`fl-card ${session.flipped ? 'flipped' : ''}`}
            onClick={flip}
            role="button"
            tabIndex={0}
            aria-label={session.flipped ? 'Mặt sau, bấm để lật lại' : 'Bấm để lật thẻ'}
          >
            <div className="fl-face fl-front">
              <span className="fl-chip muted small">
                {c.kind === 'abbr' ? 'Viết tắt' : ch ? `Chương ${ch.title}` : ''}
                {st[c.id] ? (st[c.id].box >= FLASH_KNOWN_BOX ? ' · đã thuộc' : ' · đang học') : ' · thẻ mới'}
              </span>
              {reverse ? (
                <p className="fl-q">{c.kind === 'abbr' ? c.f : c.def}</p>
              ) : (
                <b className="fl-big">{c.t}</b>
              )}
              <span className="muted small fl-hint">{reverse ? 'Thuật ngữ nào?' : 'Nhớ nghĩa rồi bấm để lật'} · Space</span>
            </div>
            <div className="fl-face fl-back">
              <Back c={c} data={data} byId={byId} />
            </div>
          </div>

          <div className="fl-actions">
            {browse ? (
              <>
                <button className="btn" disabled={session.idx === 0} onClick={() => move(-1)}>
                  <ChevronLeft size={16} /> Trước
                </button>
                <button className="btn" onClick={flip}>
                  Lật thẻ
                </button>
                <button className="btn primary" onClick={() => move(1)}>
                  Sau <ChevronRight size={16} />
                </button>
              </>
            ) : session.flipped ? (
              RATINGS.map(({ r, label, cls }, i) => {
                const next = nextFlashState(st[c.id], r);
                return (
                  <button key={r} className={`btn fl-rate ${cls}`} onClick={() => rate(r)} title={`Phím ${i + 1}`}>
                    <b>{label}</b>
                    <span className="small">{r === 0 ? 'ngay trong lượt' : fmtInterval(next.due - Date.now())}</span>
                  </button>
                );
              })
            ) : (
              <button className="btn primary fl-flip" onClick={flip}>
                Lật thẻ <kbd>Space</kbd>
              </button>
            )}
          </div>
          <p className="muted small fl-keys">
            {browse ? 'Space lật · ← → chuyển thẻ · Esc thoát' : 'Space lật · 1 Quên · 2 Khó · 3 Nhớ · 4 Dễ · Esc thoát'}
          </p>
        </>
      )}
    </div>
  );
}

const PAGE = 120;

function Glossary({ cards, st }: { cards: Card[]; st: Record<string, { box: number }> }) {
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
  const nq = norm(q.trim());
  const shown = useMemo(
    () =>
      (nq ? cards.filter((c) => norm(`${c.t} ${c.f ?? ''} ${c.kind === 'term' ? c.def : ''}`).includes(nq)) : cards)
        .slice()
        .sort((a, b) => a.t.localeCompare(b.t)),
    [cards, nq]
  );
  return (
    <section className="fl-glossary">
      <div className="section-head">
        <h2 className="hand">📖 Tra cứu thuật ngữ</h2>
        <span className="muted small">{shown.length} thẻ</span>
      </div>
      <label className="fl-search">
        <Search size={16} />
        <input value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} placeholder="Tìm thuật ngữ, tên đầy đủ hoặc nghĩa…" />
      </label>
      <ul className="fl-list">
        {shown.slice(0, limit).map((c) => {
          const x = st[c.id];
          return (
            <li key={c.id}>
              <div className="fl-list-head">
                <b>{c.t}</b>
                {c.f && <span className="muted small">{c.f}</span>}
                <span className={`fl-badge ${!x ? 'new' : x.box >= FLASH_KNOWN_BOX ? 'known' : 'learning'}`}>
                  {!x ? 'mới' : x.box >= FLASH_KNOWN_BOX ? 'đã thuộc' : 'đang học'}
                </span>
              </div>
              {c.kind === 'term' && <p className="small">{c.def}</p>}
              {c.kind === 'term' && c.tip && <p className="small fl-list-tip">🎯 {c.tip}</p>}
              <LessonChips ids={c.l} />
            </li>
          );
        })}
      </ul>
      {shown.length > limit && (
        <button className="btn" onClick={() => setLimit(limit + PAGE)}>
          Xem thêm ({shown.length - limit})
        </button>
      )}
    </section>
  );
}
