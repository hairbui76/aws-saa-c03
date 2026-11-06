import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, MessageCircle, NotebookPen, Search, Trash2 } from 'lucide-react';
import { normalize, useIndex } from '../lib/content';
import { chats, marks, notes, removeMark, saveChat, saveNote, type ChatMsg, type Mark } from '../lib/store';
import { Sketch } from '../components/Sketch';
import Markdown from '../components/Markdown';

const fmtTime = (t: number) =>
  new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

type Entry = { id: string; title: string; text: string; marks: Mark[]; chat: ChatMsg[]; at: number };

export default function NotesPage() {
  const { data: index } = useIndex();
  const { notes: all } = notes.use();
  const { items: allMarks } = marks.use();
  const { items: allChats } = chats.use();
  const [q, setQ] = useState('');

  // lessons with a note, highlights or a Claude conversation, in course order, grouped by chapter;
  // unknown lessons go last
  const groups = useMemo(() => {
    const entry = (id: string, title: string): Entry => {
      const ms = allMarks[id] ?? [];
      return {
        id,
        title,
        text: all[id]?.text ?? '',
        marks: ms,
        chat: allChats[id]?.msgs ?? [],
        at: Math.max(all[id]?.at ?? 0, allChats[id]?.at ?? 0, ...ms.map((m) => m.at)),
      };
    };
    const has = (id: string) => !!all[id] || !!allMarks[id]?.length || !!allChats[id];
    const out: { id: string; title: string; items: Entry[] }[] = [];
    const known = new Set<string>();
    for (const c of index?.chapters ?? []) {
      const items = c.lessons.filter((l) => has(l.id)).map((l) => entry(l.id, l.title));
      c.lessons.forEach((l) => known.add(l.id));
      if (items.length) out.push({ id: c.id, title: `${c.num} ${c.title}`, items });
    }
    if (index) {
      const ids = new Set(
        [...Object.keys(all), ...Object.keys(allMarks), ...Object.keys(allChats)].filter((id) => !known.has(id) && has(id))
      );
      if (ids.size) out.push({ id: '_', title: 'Bài không còn trong khóa', items: [...ids].map((id) => entry(id, id)) });
    }
    return out;
  }, [all, allMarks, allChats, index]);

  const nq = normalize(q.trim());
  const shown = nq
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter((n) =>
            normalize(
              [n.title, n.text, ...n.marks.flatMap((m) => [m.quote, m.note ?? '']), ...n.chat.map((c) => c.content)].join('\n')
            ).includes(nq)
          ),
        }))
        .filter((g) => g.items.length)
    : groups;
  const count = groups.reduce((n, g) => n + g.items.length, 0);

  const download = () => {
    const md = [
      '# Ghi chú SAA-C03',
      '',
      ...groups.flatMap((g) => [
        `## ${g.title}`,
        '',
        ...g.items.flatMap((n) => [
          `### ${n.title}`,
          '',
          ...(n.text.trim() ? [n.text.trim(), ''] : []),
          ...n.marks.flatMap((m) => [`> ${m.quote.replace(/\n+/g, ' ')}`, ...(m.note?.trim() ? ['', m.note.trim()] : []), '']),
          ...(n.chat.length
            ? [
                '#### Hỏi Claude',
                '',
                ...n.chat.flatMap((c) => (c.role === 'user' ? [`**Hỏi:** ${c.content.trim()}`, ''] : [c.content.trim(), ''])),
              ]
            : []),
        ]),
      ]),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `saa-c03-ghi-chu-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (!index) return <div className="page loading">Đang tải…</div>;

  return (
    <div className="page notes-page">
      <nav className="crumbs">
        <Link to="/">Bài học</Link> / Ghi chú
      </nav>
      <div className="section-head">
        <h1>🗒️ Ghi chú của tôi</h1>
        <span className="muted small">{count} bài có ghi chú hoặc đoạn tô · lưu trên máy này</span>
      </div>

      {count === 0 ? (
        <Sketch className="card empty-card" seed="notes-empty" fill="#fffdf0">
          <NotebookPen size={28} />
          <div>
            <b className="hand big">Chưa có ghi chú nào</b>
            <p className="muted">
              Bôi đen một đoạn trong bài để tô màu và ghi chú riêng cho đoạn đó. Mỗi bài còn có ô “Ghi chú của tôi” ngay
              trên phần quiz. Mọi thứ tự lưu và đi kèm file export tiến độ.
            </p>
          </div>
        </Sketch>
      ) : (
        <>
          <div className="row wrap notes-tools">
            <label className="notes-search">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lọc theo tên bài hoặc nội dung…" />
            </label>
            <button className="btn" onClick={download}>
              <Download size={16} /> Tải về Markdown
            </button>
          </div>
          {shown.length === 0 && <p className="muted">Không có ghi chú nào khớp “{q}”.</p>}
          {shown.map((g) => (
            <section key={g.id} className="notes-group">
              <h2 className="hand">{g.title}</h2>
              {g.items.map((n) => (
                <Sketch key={n.id} className="card note-card" seed={`nc${n.id}`} fill="#fffdf0">
                  <div className="row between">
                    {g.id === '_' ? <b>{n.title}</b> : <Link to={`/l/${n.id}?h=notes`} className="hand note-title">{n.title}</Link>}
                    <span className="row small muted">
                      {fmtTime(n.at)}
                      {n.text && (
                        <button
                          className="icon-btn sm"
                          title="Xóa ghi chú của bài (giữ các đoạn tô)"
                          onClick={() => confirm(`Xóa ghi chú của “${n.title}”?`) && saveNote(n.id, '')}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </span>
                  </div>
                  {n.text && (
                    <div className="prose">
                      <Markdown>{n.text}</Markdown>
                    </div>
                  )}
                  {n.marks.length > 0 && (
                    <ul className="marks-list plain">
                      {n.marks.map((m) => (
                        <li key={m.id}>
                          {g.id === '_' ? (
                            <span className="mark-item">
                              <MarkBody m={m} />
                            </span>
                          ) : (
                            <Link className="mark-item" to={`/l/${n.id}?hl=${m.id}`} title="Mở bài tại đoạn này">
                              <MarkBody m={m} />
                            </Link>
                          )}
                          <button className="icon-btn sm" title="Bỏ tô" onClick={() => removeMark(n.id, m.id)}>
                            <Trash2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {n.chat.length > 0 && <ChatLine entry={n} linked={g.id !== '_'} />}
                </Sketch>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

/** "💬 3 câu đã hỏi Claude: <last question>" with a link that reopens the conversation. */
function ChatLine({ entry, linked }: { entry: Entry; linked: boolean }) {
  const qs = entry.chat.filter((c) => c.role === 'user');
  const body = (
    <>
      <MessageCircle size={15} />
      <span>
        <b>{qs.length} câu đã hỏi Claude</b>
        <span className="mark-item-q">Gần nhất: {qs[qs.length - 1]?.content}</span>
      </span>
    </>
  );
  return (
    <div className="chat-line">
      {linked ? (
        <Link className="mark-item" to={`/l/${entry.id}?chat=1`} title="Mở lại hội thoại">
          {body}
        </Link>
      ) : (
        <span className="mark-item">{body}</span>
      )}
      <button
        className="icon-btn sm"
        title="Xóa hội thoại"
        onClick={() => confirm(`Xóa hội thoại với Claude của “${entry.title}”?`) && saveChat(entry.id, [])}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function MarkBody({ m }: { m: Mark }) {
  return (
    <>
      <i className={`swatch ${m.color}`} />
      <span>
        <span className="mark-item-q">{m.quote}</span>
        {m.note?.trim() && <span className="mark-item-n">{m.note}</span>}
      </span>
    </>
  );
}
