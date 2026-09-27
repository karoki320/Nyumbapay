import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { fmtDate, getPost, POSTS } from "@/lib/blog";
import { SITE } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.description, publishedTime: p.date, url: `/blog/${p.slug}` },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  const more = POSTS.filter((x) => x.slug !== p.slug).slice(0, 2);
  const ld = {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description,
    datePublished: p.date, dateModified: p.date, mainEntityOfPage: `${SITE.url}/blog/${p.slug}`,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` } },
  };
  return (
    <article className="mk-article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/blog" className="mk-back">← All articles</Link>
      <h1>{p.title}</h1>
      <div className="mk-meta"><b>{p.tag}</b><time dateTime={p.date}>{fmtDate(p.date)}</time><span>· {p.readMins} min read</span></div>
      <div className="mk-prose"><Markdown source={p.body} /></div>

      <div className="mk-endcta">
        <h3>Let NyumbaPay do the matching</h3>
        <p>Unique account numbers per unit, automatic M-Pesa reconciliation and an arrears list you can trust — KSh {SITE.priceKes.toLocaleString("en-KE")} a year.</p>
        <Link href="/login?mode=signup" className="mk-btn mk-btn-p">Create your account</Link>
      </div>

      <div className="mk-kicker" style={{ marginTop: 56 }}>Keep reading</div>
      <div className="mk-posts" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        {more.map((x) => (
          <Link key={x.slug} href={`/blog/${x.slug}`} className="mk-post">
            <div className="mk-post-b">
              <h3>{x.title}</h3>
              <div className="mk-meta">{x.readMins} min read</div>
            </div>
          </Link>
        ))}
      </div>
    </article>
  );
}
