import { useEffect, useRef, useState } from 'react';
import { KeyRound, Send, Square, Trash2, X } from 'lucide-react';
import type { Lesson } from '../lib/content';
import type { ChatMsg } from '../lib/claude';
import { MODELS, settings } from '../lib/store';
import Markdown from './Markdown';

const SUGGEST = [
  'Tóm tắt bài này thành 5 ý cần nhớ khi đi thi',
  'Cho tôi 1 câu hỏi tình huống khó về bài này (chưa đưa đáp án)',
  'Dịch vụ nào dễ nhầm với nội dung bài này? So sánh bằng bảng',
  'Giải thích bài này như cho người mới bắt đầu',
];

// per-lesson chat history survives navigation within the session
const histories = new Map<string, ChatMsg[]>();

export default function ChatPanel({
  lesson,
  open,
  onClose,
  pending,
  onPendingUsed,
  onOpenSettings,
}: {
  lesson: Lesson;
  open: boolean;
  onClose: () => void;
  pending: string | null;
  onPendingUsed: () => void;
  onOpenSettings: () => void;
}) {
  const s = settings.use();
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => histories.get(lesson.id) || []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs(histories.get(lesson.id) || []);
    setError('');
  }, [lesson.id]);
  useEffect(() => {
    histories.set(lesson.id, msgs);
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [msgs, lesson.id]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !s.apiKey) return;
    setError('');
    setInput('');
    const history: ChatMsg[] = [...msgs, { role: 'user', content: q }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    const ac = new AbortController();
    abort.current = ac;
    // the SDK is only downloaded once someone actually asks a question
    const { streamAnswer, ChatError } = await import('../lib/claude');
    try {
      await streamAnswer({
        settings: s,
        lesson,
        history,
        signal: ac.signal,
        onText: (d) =>
          setMsgs((m) => {
            const copy = m.slice();
            copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1].content + d };
            return copy;
          }),
      });
    } catch (e) {
      setError(e instanceof ChatError ? e.message : String(e));
      // drop the empty assistant bubble and keep the question in the box to retry
      setMsgs((m) => (m[m.length - 1]?.content ? m : m.slice(0, -2)));
      setInput(q);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  useEffect(() => {
    if (open && pending && s.apiKey && !busy) {
      send(pending);
      onPendingUsed();
    } else if (open && pending && !s.apiKey) {
      setInput(pending);
      onPendingUsed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending]);

  const model = MODELS.find((m) => m.id === s.model)?.label || s.model;

  return (
    <aside className={`chat ${open ? 'open' : ''}`} aria-hidden={!open}>
      <header className="chat-head">
        <div>
          <b>Hỏi Claude</b>
          <span className="muted small">về “{lesson.title}” · {model}</span>
        </div>
        <button className="icon-btn" title="Xóa hội thoại" onClick={() => setMsgs([])} disabled={busy || !msgs.length}>
          <Trash2 size={16} />
        </button>
        <button className="icon-btn" title="Đóng" onClick={onClose}>
          <X size={18} />
        </button>
      </header>

      {!s.apiKey ? (
        <div className="chat-empty">
          <KeyRound size={28} />
          <p>
            Thêm <b>Anthropic API key</b> của bạn để hỏi Claude ngay trong bài học. Key chỉ lưu trong trình duyệt này và
            được gửi thẳng tới <code>api.anthropic.com</code>.
          </p>
          <button className="btn primary" onClick={onOpenSettings}>
            Thêm API key
          </button>
        </div>
      ) : (
        <>
          <div className="chat-list" ref={list}>
            {!msgs.length && (
              <div className="chat-suggest">
                <p className="muted small">Claude đã đọc bài này. Thử hỏi:</p>
                {SUGGEST.map((q) => (
                  <button key={q} className="suggest" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.role === 'assistant' ? (
                  m.content ? <Markdown>{m.content}</Markdown> : <span className="typing">Claude đang nghĩ…</span>
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            ))}
            {error && <div className="chat-error">{error}</div>}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              value={input}
              placeholder="Hỏi về bài học… (Enter để gửi, Shift+Enter xuống dòng)"
              rows={2}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            {busy ? (
              <button type="button" className="icon-btn send" onClick={() => abort.current?.abort()} title="Dừng">
                <Square size={16} />
              </button>
            ) : (
              <button type="submit" className="icon-btn send" disabled={!input.trim()} title="Gửi">
                <Send size={16} />
              </button>
            )}
          </form>
        </>
      )}
    </aside>
  );
}
