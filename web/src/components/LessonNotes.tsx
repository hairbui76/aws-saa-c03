import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Highlighter, NotebookPen, PencilLine, StickyNote, Trash2 } from 'lucide-react';
import { marks, notes, removeMark, saveNote, type Mark } from '../lib/store';
import { focusMark, useMissingMarks } from './LessonMarks';
import { Sketch } from './Sketch';
import Markdown from './Markdown';

const fmtTime = (t: number) =>
  new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** The learner's own note for one lesson: autosaved to localStorage, Markdown preview. */
export default function LessonNotes({ lessonId }: { lessonId: string }) {
  const stored = notes.use().notes[lessonId];
  const storedText = stored?.text ?? '';
  const [text, setText] = useState(storedText);
  const [mode, setMode] = useState<'edit' | 'view'>(storedText ? 'view' : 'edit');
  const saved = useRef(storedText);
  const latest = useRef(text);
  latest.current = text;
  const area = useRef<HTMLTextAreaElement>(null);

  // picked up from elsewhere (quote button, another tab, an import)
  useEffect(() => {
    if (storedText === saved.current) return;
    saved.current = storedText;
    setText(storedText);
  }, [storedText]);

  // autosave shortly after typing stops, and on leaving the lesson or the page
  useEffect(() => {
    if (text === saved.current) return;
    const t = setTimeout(() => {
      saved.current = text;
      saveNote(lessonId, text);
    }, 400);
    return () => clearTimeout(t);
  }, [text, lessonId]);
  useEffect(() => {
    const flush = () => {
      if (latest.current === saved.current) return;
      saved.current = latest.current;
      saveNote(lessonId, latest.current);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [lessonId]);

  // grow with the text
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(140, el.scrollHeight + 4)}px`;
  }, [text, mode]);

  const dirty = text !== saved.current;
  const edit = () => {
    setMode('edit');
    requestAnimationFrame(() => area.current?.focus());
  };

  return (
    <Sketch id="notes" className="card section notes" seed={`notes${lessonId}`} fill="#fffdf0" stroke="#e67700">
      <div className="notes-head">
        <h2>
          <NotebookPen size={22} /> Ghi chú của tôi
        </h2>
        <div className="notes-seg" role="tablist">
          <button role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'on' : ''} onClick={edit}>
            <PencilLine size={14} /> Viết
          </button>
          <button
            role="tab"
            aria-selected={mode === 'view'}
            className={mode === 'view' ? 'on' : ''}
            onClick={() => setMode('view')}
            disabled={!text.trim()}
          >
            <Eye size={14} /> Xem
          </button>
        </div>
      </div>
      {mode === 'edit' || !text.trim() ? (
        <textarea
          ref={area}
          className="notes-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Ghi lại điều cần nhớ, chỗ hay nhầm, mẹo của riêng bạn…\nHỗ trợ Markdown: **đậm**, - gạch đầu dòng, > trích dẫn.\nBôi đen một đoạn trong bài để tô màu, ghi chú riêng cho đoạn đó, hoặc trích vào đây.'}
          spellCheck={false}
        />
      ) : (
        <div className="prose notes-view" onDoubleClick={edit} title="Nhấp đúp để sửa">
          <Markdown>{text}</Markdown>
        </div>
      )}
      <MarkList lessonId={lessonId} />
      <div className="notes-foot muted small">
        <span>
          {dirty ? 'Đang lưu…' : stored ? `Đã lưu trên máy này · ${fmtTime(stored.at)}` : 'Ghi chú lưu trên máy này, có trong file export tiến độ.'}
        </span>
        <span className="row">
          {stored && (
            <button
              className="link-btn danger-inline"
              onClick={() => {
                if (!confirm('Xóa ghi chú của bài này?')) return;
                saved.current = '';
                setText('');
                saveNote(lessonId, '');
                setMode('edit');
              }}
            >
              <Trash2 size={13} /> Xóa
            </button>
          )}
          <Link to="/notes" className="link-btn">
            <StickyNote size={13} /> Tất cả ghi chú
          </Link>
        </span>
      </div>
    </Sketch>
  );
}

const EMPTY: Mark[] = [];

/** Highlights of this lesson: click one to jump to it in the text. */
function MarkList({ lessonId }: { lessonId: string }) {
  const list = marks.use().items[lessonId] ?? EMPTY;
  const missing = useMissingMarks();
  if (!list.length) return null;
  return (
    <div className="marks-list">
      <span className="muted small">
        <Highlighter size={13} /> Đoạn đã tô ({list.length}) · bấm để tới chỗ đó trong bài
      </span>
      <ul>
        {list.map((m) => (
          <li key={m.id}>
            <button className="mark-item" onClick={() => focusMark(m.id)} disabled={missing.has(m.id)}>
              <i className={`swatch ${m.color}`} />
              <span>
                <span className="mark-item-q">{m.quote}</span>
                {m.note?.trim() && <span className="mark-item-n">{m.note}</span>}
                {missing.has(m.id) && <span className="late-text small">Không còn thấy đoạn này trong bài (nội dung đã đổi).</span>}
              </span>
            </button>
            <button className="icon-btn sm" title="Bỏ tô" onClick={() => removeMark(lessonId, m.id)}>
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
