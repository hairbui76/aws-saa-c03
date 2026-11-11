import { useJson } from './content';
import { FLASH_KNOWN_BOX, type FlashCardState } from './store';

/** public/content/flashcards.json (built from web/flashcards/<chapter>.json and abbreviations.json) */
export type TermCard = { id: string; d: string; t: string; f?: string; def: string; tip?: string; l: string[] };
export type AbbrCard = { id: string; t: string; f: string; l: string[]; ref?: string };
export type FlashData = { decks: { id: string; title: string; count: number }[]; cards: TermCard[]; abbr: AbbrCard[] };
export type Card = (TermCard & { kind: 'term' }) | (AbbrCard & { kind: 'abbr' });

export const useFlashData = () => useJson<FlashData>('flashcards.json');

export type Deck = 'all' | 'abbr' | `ch:${string}` | `lesson:${string}`;
export type Mode = 'review' | 'new' | 'browse' | 'hard';

export function deckCards(data: FlashData, deck: Deck): Card[] {
  const terms = data.cards.map((c) => ({ ...c, kind: 'term' as const }));
  const abbr = data.abbr.map((c) => ({ ...c, kind: 'abbr' as const }));
  if (deck === 'abbr') return abbr;
  if (deck === 'all') return terms;
  if (deck.startsWith('ch:')) return terms.filter((c) => c.d === deck.slice(3));
  const id = deck.slice(7);
  return [...terms, ...abbr].filter((c) => c.l.includes(id));
}

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export type DeckStats = { total: number; fresh: number; learning: number; known: number; due: number; hard: number };

export function stats(cards: Card[], st: Record<string, FlashCardState>): DeckStats {
  const eod = endOfToday();
  const s: DeckStats = { total: cards.length, fresh: 0, learning: 0, known: 0, due: 0, hard: 0 };
  for (const c of cards) {
    const x = st[c.id];
    if (!x) s.fresh++;
    else {
      if (x.box >= FLASH_KNOWN_BOX) s.known++;
      else s.learning++;
      if (x.due <= eod) s.due++;
      if (x.lapses > 0) s.hard++;
    }
  }
  return s;
}

function shuffled<T>(a: T[]) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Card ids for a session: due first (oldest first) then new ones; or new only; or all; or the often-missed. */
export function buildSession(cards: Card[], st: Record<string, FlashCardState>, mode: Mode, newLimit: number): string[] {
  const eod = endOfToday();
  const fresh = cards.filter((c) => !st[c.id]);
  switch (mode) {
    case 'review': {
      const due = cards.filter((c) => st[c.id] && st[c.id].due <= eod).sort((a, b) => st[a.id].due - st[b.id].due);
      return [...due, ...fresh.slice(0, newLimit)].map((c) => c.id);
    }
    case 'new':
      return fresh.slice(0, newLimit).map((c) => c.id);
    case 'hard':
      return cards
        .filter((c) => (st[c.id]?.lapses ?? 0) > 0)
        .sort((a, b) => st[b.id].lapses - st[a.id].lapses || st[a.id].box - st[b.id].box)
        .slice(0, 50)
        .map((c) => c.id);
    case 'browse':
      return shuffled(cards).map((c) => c.id);
  }
}

/** "10 phút", "1 ngày", "2 tuần"… for the rating buttons */
export function fmtInterval(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return m <= 1 ? 'ngay' : `${m} phút`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} ngày`;
  if (d < 60) return `${Math.round(d / 7)} tuần`;
  return `${Math.round(d / 30)} tháng`;
}
