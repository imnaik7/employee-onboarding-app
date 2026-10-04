import { Fragment, type ReactNode } from 'react';

/** Inline **bold**, *italic* and `code` → React nodes (no HTML injection from agent text). */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={m.index}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={m.index}>{tok.slice(1, -1)}</code>);
    else out.push(<em key={m.index}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Minimal markdown for chat answers: headings, bullet / numbered lists, paragraphs. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]!);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(h ? <h4 key={blocks.length}>{inline(h[1]!)}</h4> : <p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <Fragment>{blocks}</Fragment>;
}
