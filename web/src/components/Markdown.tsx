import { lazy, Suspense, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import type { Diagram } from '../lib/content';
import AnimatedDiagram from './AnimatedDiagram';

const Mermaid = lazy(() => import('./Mermaid'));

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

export default function Markdown({ children, diagrams }: { children: string; diagrams?: Record<string, Diagram> }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children }) {
          if (href?.startsWith('/')) return <Link to={href}>{children}</Link>;
          return (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children }) {
          const lang = /language-(\w+)/.exec(className || '')?.[1];
          const src = textOf(children).replace(/\n$/, '');
          if (lang === 'diagram') {
            const d = diagrams?.[src];
            return d ? <AnimatedDiagram diagram={d} name={src} /> : null;
          }
          if (lang === 'mermaid')
            return (
              <Suspense fallback={<div className="mermaid-box loading">Đang vẽ sơ đồ…</div>}>
                <Mermaid code={src} />
              </Suspense>
            );
          if (lang) return <pre className="code-block"><code>{src}</code></pre>;
          return <code className="inline-code">{children}</code>;
        },
        table({ children }) {
          return (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
