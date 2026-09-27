import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/** Renders the small markdown subset used by blog posts (our own content only). */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}b${i++}`}>{m[1]}</strong>);
    else out.push(<Link key={`${key}l${i++}`} href={m[3]}>{m[2]}</Link>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((b, i) => {
        const k = String(i);
        const lines = b.split("\n").map((l) => l.trim());
        if (b.startsWith("### ")) return <h3 key={k}>{inline(b.slice(4), k)}</h3>;
        if (b.startsWith("## ")) return <h2 key={k} id={b.slice(3).toLowerCase().replace(/[^a-z0-9]+/g, "-")}>{inline(b.slice(3), k)}</h2>;
        if (b.startsWith("> ")) return <aside key={k} className="mk-callout">{inline(lines.map((l) => l.replace(/^> ?/, "")).join(" "), k)}</aside>;
        if (lines.every((l) => l.startsWith("- ")))
          return <ul key={k}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2), `${k}-${j}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l)))
          return <ol key={k}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ""), `${k}-${j}`)}</li>)}</ol>;
        return <p key={k}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && " "}{inline(l, `${k}-${j}`)}</Fragment>)}</p>;
      })}
    </>
  );
}
