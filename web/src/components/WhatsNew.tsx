import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { updatesSeen } from '../lib/store';
import type { UpdatesIndex } from '../lib/updates';
import { Sketch } from './Sketch';
import { UpdateLegend, UpdateMark } from './UpdateMark';

/** 2026-11-10 -> 10/11/2026 */
const viDate = (iso: string) => iso.split('-').reverse().join('/');

/**
 * "Có gì mới": what the latest update batch changed. Every way of closing it (button, Esc, backdrop, following
 * a lesson link) records the batch as seen, so it opens by itself only once per batch.
 */
export default function WhatsNew({ data, onClose }: { data: UpdatesIndex; onClose: () => void }) {
  const close = () => {
    updatesSeen.set({ seen: data.id });
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const { counts } = data;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <Sketch className="modal whatsnew" seed="whatsnew" fill="#fff" role="dialog" aria-modal="true" aria-labelledby="wn-title">
        <header className="modal-head">
          <h2 id="wn-title">Có gì mới</h2>
          <button className="icon-btn" onClick={close} title="Đóng">
            <X size={18} />
          </button>
        </header>
        <div className="wn-body">
          <p className="wn-summary">
            Cập nhật ngày {viDate(data.date)}: thêm <b>{counts.new}</b> bài mới, sửa <b>{counts.updated}</b> bài,{' '}
            <b>{counts.removed}</b> bài không còn trong khóa mới
          </p>
          {data.title && <p className="muted small">{data.title}</p>}
          <UpdateLegend />
          {data.chapters.map((ch) => {
            const changed = ch.items.filter((it) => it.kind !== 'removed');
            const removed = ch.items.filter((it) => it.kind === 'removed');
            return (
              <section key={ch.id}>
                <h3>
                  {ch.num}. {ch.title}
                </h3>
                <ul className="wn-list">
                  {changed.map((it) => (
                    <li key={it.id}>
                      <UpdateMark kind={it.kind} />
                      <span>
                        <Link to={`/l/${it.id}`} onClick={close}>
                          {it.name}
                        </Link>
                        {it.summary && <span className="muted"> · {it.summary}</span>}
                      </span>
                    </li>
                  ))}
                  {removed.length > 0 && (
                    <li>
                      <UpdateMark kind="removed" />
                      <span>
                        <span className="muted">Không còn trong khóa mới: </span>
                        {removed.map((it, i) => (
                          <span key={it.id}>
                            {i > 0 && ', '}
                            <Link to={`/l/${it.id}`} onClick={close}>
                              {it.name}
                            </Link>
                          </span>
                        ))}
                      </span>
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
          {data.pages.length > 0 && (
            <section>
              <h3>Trang tổng hợp</h3>
              <ul className="wn-list">
                {data.pages.map((p, i) => (
                  <li key={i}>
                    <span aria-hidden>📋</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.missing.length > 0 && (
            <section>
              <h3>Chưa có video</h3>
              <ul className="wn-list">
                {data.missing.map((m, i) => (
                  <li key={i}>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <footer className="wn-foot">
          <button className="btn primary" onClick={close} autoFocus>
            Đã hiểu
          </button>
        </footer>
      </Sketch>
    </div>
  );
}
