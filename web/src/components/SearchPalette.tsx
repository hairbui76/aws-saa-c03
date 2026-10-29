import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { normalize, useIndex } from '../lib/content';
import { Sketch } from './Sketch';

export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const { data } = useIndex();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);

  const prepared = useMemo(
    () => (data?.search || []).map((s) => ({ ...s, nt: normalize(s.t), na: normalize(s.a), nd: normalize(s.d) })),
    [data]
  );
  const results = useMemo(() => {
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return prepared.slice(0, 8);
    return prepared
      .map((s) => {
        let score = 0;
        for (const t of terms) {
          if (s.nt.includes(t)) score += s.nt.startsWith(t) ? 6 : 4;
          else if (s.na.includes(t)) score += 3;
          else if (s.nd.includes(t)) score += 1;
          else return null;
        }
        return { s, score };
      })
      .filter((x): x is { s: (typeof prepared)[number]; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.s);
  }, [q, prepared]);

  const go = (id: string) => {
    nav(`/l/${id}`);
    onClose();
  };
  const chTitle = (id: string) => data?.chapters.find((c) => c.id === id)?.title || '';

  return (
    <div className="modal-backdrop top" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Sketch className="palette" seed="search" fill="#fff">
        <div className="palette-input">
          <Search size={18} />
          <input
            ref={input}
            value={q}
            placeholder="Tìm bài học: NAT Gateway, SQS, Aurora…"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') (e.preventDefault(), setSel((v) => Math.min(v + 1, results.length - 1)));
              if (e.key === 'ArrowUp') (e.preventDefault(), setSel((v) => Math.max(v - 1, 0)));
              if (e.key === 'Enter' && results[sel]) go(results[sel].id);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list">
          {results.map((r, i) => (
            <li key={r.id} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => go(r.id)}>
              <span className="ch-chip">{r.c}</span>
              <div>
                <b>{r.t}</b>
                <span className="muted small">
                  {chTitle(r.c)}
                  {r.a ? ` · ${r.a}` : ''}
                </span>
              </div>
            </li>
          ))}
          {!results.length && <li className="muted">Không tìm thấy bài nào.</li>}
        </ul>
      </Sketch>
    </div>
  );
}
