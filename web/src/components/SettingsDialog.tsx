import { useRef, useState } from 'react';
import { Download, Eye, EyeOff, Trash2, Upload, X } from 'lucide-react';
import { exportProgress, importProgress, MODELS, progress, resetProgress, settings } from '../lib/store';
import { Sketch } from './Sketch';

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const s = settings.use();
  const p = progress.use();
  const [key, setKey] = useState(s.apiKey);
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const file = useRef<HTMLInputElement>(null);
  const count = Object.keys(p.lessons).length;

  const saveKey = () => {
    settings.update((v) => ({ ...v, apiKey: key.trim() }));
    setMsg(key.trim() ? 'Đã lưu API key trong trình duyệt này.' : 'Đã xóa API key.');
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Sketch className="modal" seed="settings" fill="#fff">
        <header className="modal-head">
          <h2>Cài đặt</h2>
          <button className="icon-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </header>

        <section>
          <h3>🤖 Hỏi Claude</h3>
          <label className="field">
            <span>Anthropic API key</span>
            <div className="row">
              <input
                type={show ? 'text' : 'password'}
                value={key}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setKey(e.target.value)}
              />
              <button className="icon-btn" onClick={() => setShow(!show)} title={show ? 'Ẩn' : 'Hiện'}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button className="btn primary" onClick={saveKey}>
                Lưu
              </button>
            </div>
          </label>
          <p className="muted small">
            Key chỉ lưu trong localStorage của trình duyệt này, không nằm trong file export, và chỉ được gửi tới{' '}
            <code>api.anthropic.com</code>. Lấy key tại console.anthropic.com. Dùng máy chung thì nên xóa key sau khi học.
          </p>
          <div className="row wrap">
            <label className="field">
              <span>Model</span>
              <select value={s.model} onChange={(e) => settings.update((v) => ({ ...v, model: e.target.value }))}>
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.note}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Mức suy nghĩ (effort)</span>
              <select
                value={s.effort}
                onChange={(e) => settings.update((v) => ({ ...v, effort: e.target.value as typeof v.effort }))}
              >
                <option value="low">Thấp — trả lời nhanh</option>
                <option value="medium">Vừa (khuyên dùng)</option>
                <option value="high">Cao — kỹ hơn, chậm hơn</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <h3>📦 Tiến độ học</h3>
          <p className="muted small">
            Tiến độ ({count} bài đã mở) lưu trên máy này. Export ra file để chuyển sang thiết bị khác rồi Import ở đó.
          </p>
          <div className="row wrap">
            <button className="btn" onClick={exportProgress}>
              <Download size={16} /> Export tiến độ
            </button>
            <button className="btn" onClick={() => file.current?.click()}>
              <Upload size={16} /> Import tiến độ
            </button>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'merge' | 'replace')}>
              <option value="merge">Gộp với tiến độ hiện tại</option>
              <option value="replace">Thay thế tiến độ hiện tại</option>
            </select>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const n = await importProgress(f, mode);
                  setMsg(`Đã import tiến độ của ${n} bài (${mode === 'merge' ? 'gộp' : 'thay thế'}).`);
                } catch (err) {
                  setMsg(`Import lỗi: ${(err as Error).message}`);
                }
              }}
            />
          </div>
          <button
            className="link-btn danger"
            onClick={() => {
              if (confirm('Xóa toàn bộ tiến độ học trên máy này? Nên Export trước.')) {
                resetProgress();
                setMsg('Đã xóa tiến độ.');
              }
            }}
          >
            <Trash2 size={14} /> Xóa tiến độ
          </button>
        </section>
        {msg && <p className="toast">{msg}</p>}
      </Sketch>
    </div>
  );
}
