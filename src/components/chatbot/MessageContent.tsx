import { Fragment, type ReactNode } from 'react';

// A deliberately small renderer: text, emphasis, lists and safe contact links.
// Content is rendered as React text nodes; no HTML is inserted.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      if (/^(tel:\+?[\d ()-]+|mailto:[^\s<>]+@[^\s<>]+)$/i.test(href)) return <a key={i} href={href}>{link[1]}</a>;
      return <Fragment key={i}>{link[1]}</Fragment>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
export function MessageContent({ text }: { text: string }) {
  return <div className="chat-prose">{text.split(/\n\s*\n/).map((block, i) => {
    const lines = block.split('\n');
    if (lines.every(line => /^[-•]\s/.test(line))) return <ul key={i}>{lines.map((line, j) => <li key={j}>{inline(line.replace(/^[-•]\s/, ''))}</li>)}</ul>;
    if (lines.every(line => /^\d+\.\s/.test(line))) return <ol key={i}>{lines.map((line, j) => <li key={j}>{inline(line.replace(/^\d+\.\s/, ''))}</li>)}</ol>;
    return <p key={i}>{lines.map((line, j) => <Fragment key={j}>{j > 0 && <br />}{inline(line)}</Fragment>)}</p>;
  })}</div>;
}
