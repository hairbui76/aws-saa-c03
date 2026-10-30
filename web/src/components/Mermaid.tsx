import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { viewPrefs } from '../lib/store';
import Viewport, { DiagramTools, useFullscreen, type ViewportApi } from './Viewport';

mermaid.initialize({
  startOnLoad: false,
  look: 'handDrawn',
  theme: 'base',
  securityLevel: 'strict',
  fontFamily: '"Patrick Hand", "Be Vietnam Pro", sans-serif',
  themeVariables: {
    fontFamily: '"Patrick Hand", "Be Vietnam Pro", sans-serif',
    primaryColor: '#fff9db',
    primaryBorderColor: '#1e1e1e',
    primaryTextColor: '#1e1e1e',
    secondaryColor: '#e7f5ff',
    tertiaryColor: '#f3f0ff',
    lineColor: '#1e1e1e',
    noteBkgColor: '#fff3bf',
    noteBorderColor: '#f08c00',
    actorBkg: '#e7f5ff',
    actorBorder: '#1e1e1e',
    signalColor: '#1e1e1e',
    clusterBkg: '#f8f9fa',
    clusterBorder: '#868e96',
  },
  flowchart: { htmlLabels: true, curve: 'basis', nodeSpacing: 40, rankSpacing: 45 },
});

/** Font size follows the same A−/A+ setting as the animated diagrams (re-rendered on change). */
function withFont(code: string, scale: number) {
  const px = Math.round(16 * scale);
  const init = {
    themeVariables: { fontSize: `${px}px` },
    sequence: { actorFontSize: px, messageFontSize: px, noteFontSize: px - 1 },
  };
  return `%%{init: ${JSON.stringify(init)}}%%\n${code}`;
}

// Small diagrams show at a fixed fraction of their natural size (not blown up to the column);
// wider ones are fitted to the column by CSS max-width. Zoom / fullscreen give the detail.
const DISPLAY = 0.85;
function sizeSvg(svg: string) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = doc.documentElement;
  const vb = el.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4) return svg;
  el.setAttribute('width', String(Math.round(vb[2] * DISPLAY)));
  el.setAttribute('height', String(Math.round(vb[3] * DISPLAY)));
  el.style.removeProperty('max-width');
  return new XMLSerializer().serializeToString(el);
}

export default function Mermaid({ code }: { code: string }) {
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const { fontScale } = viewPrefs.use();
  const [svg, setSvg] = useState<string>();
  const [err, setErr] = useState(false);
  const [scale, setScale] = useState(1);
  const api = useRef<ViewportApi | null>(null);
  const wrap = useRef<HTMLElement>(null);
  const [full, toggleFull] = useFullscreen(wrap);

  useEffect(() => {
    let alive = true;
    mermaid
      .render(`${id}f${Math.round(fontScale * 100)}`, withFont(code, fontScale))
      .then((r) => alive && setSvg(sizeSvg(r.svg)))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [code, id, fontScale]);

  if (err) return <pre className="code-block">{code}</pre>;
  return (
    <figure ref={wrap} className={`mm-player ${full ? 'is-full' : ''}`}>
      <div className="mm-bar">
        <span className="player-title">Sơ đồ</span>
        <DiagramTools api={api} scale={scale} full={full} onFull={toggleFull} />
      </div>
      <div className="mm-stage">
        {svg ? (
          <Viewport apiRef={api} onScale={setScale} resetKey={svg.length}>
            <div className="mm-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          </Viewport>
        ) : (
          <div className="mermaid-box loading">Đang vẽ sơ đồ…</div>
        )}
      </div>
    </figure>
  );
}
