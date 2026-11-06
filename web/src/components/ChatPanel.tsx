import { useEffect, useRef, useState } from 'react';
import { Check, KeyRound, NotebookPen, Send, Square, Trash2, X } from 'lucide-react';
import type { Lesson } from '../lib/content';
import { appendNote, CHAT_WIDTH, chats, cleanChat, MODELS, saveChat, settings, viewPrefs, type ChatMsg } from '../lib/store';
import Markdown from './Markdown';

const SUGGEST = [
  'Tóm tắt bài này thành 5 ý cần nhớ khi đi thi',
  'Cho tôi 1 câu hỏi tình huống khó về bài này (chưa đưa đáp án)',
  'Dịch vụ nào dễ nhầm với nội dung bài này? So sánh bằng bảng',
  'Giải thích bài này như cho người mới bắt đầu',
];

const fmtTime = (t: number) =>
  new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** Answer + the question it replies to, as a block for the lesson note. */
function asNote(question: string, answer: string) {
  const q = question
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');
  return `**Hỏi Claude:**\n${q}\n\n${answer.trim()}\n`;
}

const MIN_W = 320;
const maxW = () => Math.max(MIN_W, window.innerWidth - 60);
const clampW = (w: number) => Math.round(Math.min(maxW(), Math.max(MIN_W, w)));

/** Drag handle on the panel's left edge. The width is remembered; double-click resets it. */
function ResizeHandle({ width, onLive }: { width: number; onLive: (w: number | null) => void }) {
  const drag = useRef<{ id: number; w: number } | null>(null);
  const commit = (w: number) => viewPrefs.update((p) => ({ ...p, chatWidth: clampW(w) }));
  return (
    <div
      className="chat-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để đổi độ rộng khung chat"
      aria-valuenow={width}
      aria-valuemin={MIN_W}
      tabIndex={0}
      title="Kéo để đổi độ rộng · nhấp đúp để về mặc định"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, w: width };
        document.body.classList.add('resizing-chat');
      }}
      onPointerMove={(e) => {
        if (drag.current?.id !== e.pointerId) return;
        drag.current.w = clampW(window.innerWidth - e.clientX);
        onLive(drag.current.w);
      }}
      onPointerUp={(e) => {
        if (drag.current?.id !== e.pointerId) return;
        commit(drag.current.w);
        drag.current = null;
        onLive(null);
        document.body.classList.remove('resizing-chat');
      }}
      onPointerCancel={() => {
        drag.current = null;
        onLive(null);
        document.body.classList.remove('resizing-chat');
      }}
      onDoubleClick={() => commit(CHAT_WIDTH)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') (e.preventDefault(), commit(width + 40));
        if (e.key === 'ArrowRight') (e.preventDefault(), commit(width - 40));
      }}
    />
  );
}

/** One conversation per lesson, saved in this browser (mounted with key = lesson id). */
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
  const savedAt = chats.use().items[lesson.id]?.at;
  const { chatWidth } = viewPrefs.use();
  const [liveW, setLiveW] = useState<number | null>(null);
  // a remembered width may not fit a smaller window: shrink it when the window is resized
  const [, onWinResize] = useState(0);
  useEffect(() => {
    const on = () => onWinResize((n) => n + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const width = liveW ?? clampW(chatWidth);
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => cleanChat(chats.get().items[lesson.id]?.msgs ?? []));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noted, setNoted] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const latest = useRef(msgs);
  latest.current = msgs;

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [msgs, open]);
  // save once an answer has finished streaming (not on every token)
  useEffect(() => {
    if (!busy) saveChat(lesson.id, msgs);
  }, [busy, msgs, lesson.id]);
  // leaving the lesson mid-answer: stop it and keep what arrived
  useEffect(
    () => () => {
      abort.current?.abort();
      saveChat(lesson.id, latest.current);
    },
    [lesson.id]
  );

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
    <aside
      className={`chat ${open ? 'open' : ''} ${liveW ? 'resizing' : ''}`}
      aria-hidden={!open}
      style={{ width: `min(${width}px, 100vw)` }}
    >
      <ResizeHandle width={width} onLive={setLiveW} />
      <header className="chat-head">
        <div>
          <b>Hỏi Claude</b>
          <span className="muted small">về “{lesson.title}” · {model}</span>
          {savedAt && msgs.length > 0 && (
            <span className="muted small">Đã lưu trên máy này · {fmtTime(savedAt)}</span>
          )}
        </div>
        <button
          className="icon-btn"
          title="Xóa hội thoại của bài này"
          onClick={() => confirm('Xóa toàn bộ hội thoại với Claude của bài này?') && setMsgs([])}
          disabled={busy || !msgs.length}
        >
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
                {m.role === 'assistant' && m.content && !(busy && i === msgs.length - 1) && (
                  <button
                    className="link-btn bubble-act"
                    onClick={() => {
                      appendNote(lesson.id, asNote(msgs[i - 1]?.content ?? '', m.content));
                      setNoted(i);
                    }}
                  >
                    {noted === i ? <Check size={13} /> : <NotebookPen size={13} />}
                    {noted === i ? 'Đã lưu vào ghi chú' : 'Lưu vào ghi chú'}
                  </button>
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
