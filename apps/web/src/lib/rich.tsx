import { Fragment, type ReactNode } from "react";

export type RichTags = Record<string, (children: ReactNode) => ReactNode>;

const base: RichTags = {
  b: (c) => <strong>{c}</strong>,
  em: (c) => <em>{c}</em>,
  code: (c) => <code>{c}</code>
};

/** Renders dictionary strings that contain simple, non-nested inline tags: `Read <link>this</link>` + `{ link: (c) => <Link …>{c}</Link> }`. */
export function rich(text: string, tags: RichTags = {}): ReactNode {
  const all = { ...base, ...tags };
  const out: ReactNode[] = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const render = all[m[1]!];
    out.push(<Fragment key={out.length}>{render ? render(m[2]) : m[2]}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

/** Gradient emphasis used in headlines. */
export const gradTag: RichTags = { g: (c) => <span className="grad-text">{c}</span> };
