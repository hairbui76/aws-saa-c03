import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  look: 'handDrawn',
  theme: 'base',
  securityLevel: 'strict',
  fontFamily: '"Patrick Hand", "Be Vietnam Pro", sans-serif',
  themeVariables: {
    fontFamily: '"Patrick Hand", "Be Vietnam Pro", sans-serif',
    fontSize: '17px',
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
  flowchart: { htmlLabels: true, curve: 'basis' },
});

export default function Mermaid({ code }: { code: string }) {
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState<string>();
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    mermaid
      .render(id, code)
      .then((r) => alive && setSvg(r.svg))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [code, id]);
  if (err) return <pre className="code-block">{code}</pre>;
  if (!svg) return <div className="mermaid-box loading">Đang vẽ sơ đồ…</div>;
  return <div className="mermaid-box" dangerouslySetInnerHTML={{ __html: svg }} />;
}
