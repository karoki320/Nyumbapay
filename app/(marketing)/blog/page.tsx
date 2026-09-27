import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Rent Collection Guides for Kenyan Landlords",
  description: "Practical guides on collecting rent with M-Pesa, reducing arrears, reconciliation and running rental property in Kenya.",
  alternates: { canonical: "/blog" },
};

export default function Blog() {
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <section className="mk-bloghead">
        <div className="mk-wrap">
          <div className="mk-kicker">NyumbaPay Blog</div>
          <h1>Guides for Kenyan landlords</h1>
          <p className="mk-lead">M-Pesa rent collection, arrears, reconciliation and growing your rental business — in plain language.</p>
        </div>
      </section>
      <section style={{ paddingBottom: 96 }}>
        <div className="mk-wrap">
          <div className="mk-posts" style={{ marginTop: 0 }}>
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="mk-post">
                <div className={`mk-cover c${POSTS.indexOf(p) % 5}`}><span>{p.tag}</span></div>
                <div className="mk-post-b">
                  <h2 style={{ fontSize: 19, lineHeight: 1.3, letterSpacing: "-.015em" }}>{p.title}</h2>
                  <p>{p.description}</p>
                  <div className="mk-meta">{fmtDate(p.date)} · {p.readMins} min read</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
