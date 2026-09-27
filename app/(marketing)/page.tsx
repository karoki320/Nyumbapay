import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, POSTS } from "@/lib/blog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "NyumbaPay — M-Pesa Rent Collection Software for Kenyan Landlords" },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const FEATURES = [
  { t: "An account number for every unit", d: "Each house gets its own Paybill account like KAR-A1, so every payment says exactly where it belongs — even when a relative pays.",
    ic: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></> },
  { t: "Automatic M-Pesa matching", d: "Payments are matched by account number, unit label or phone. Sloppy typing like “kar b3” still lands in the right place.",
    ic: <><path d="M4 12h6l2-4 2 8 2-4h4" /></> },
  { t: "Invoices raised for you", d: "Every active lease gets its invoice on the 1st. Partial payments, overpayments and credit are handled automatically.",
    ic: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></> },
  { t: "Arrears at a glance", d: "Open the app and see who owes what, sorted by amount. Chase the right people in seconds, not hours.",
    ic: <><path d="M12 8v5l3 2" /><circle cx="12" cy="12" r="9" /></> },
  { t: "WhatsApp reminders & receipts", d: "Send a ready-written reminder in English or Kiswahili with one tap. Every payment gets a numbered receipt.",
    ic: <><path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" /></> },
  { t: "Cash and bank too", d: "Record cash or bank payments in seconds. Everything goes into one ledger with a full audit trail.",
    ic: <><rect x="2" y="6" width="20" height="13" rx="2" /><circle cx="12" cy="12.5" r="2.5" /><path d="M6 10v5M18 10v5" /></> },
];

const FAQ = [
  { q: "How much does NyumbaPay cost?", a: `KSh ${SITE.priceKes.toLocaleString("en-KE")} per year for your business account. That's one simple price with every feature included — no per-transaction fees from us.` },
  { q: "Do I need my own M-Pesa Paybill?", a: "A Paybill is recommended so tenants can type an account number for their unit. If you're still applying for one, you can start straight away by recording cash and bank payments and connect your Paybill when it's ready." },
  { q: "Do my tenants need to install an app?", a: "No. Tenants pay the way they already do — Lipa na M-Pesa → Pay Bill. Each tenant also gets a simple payment link showing their balance and how to pay, with no login." },
  { q: "What happens if a tenant types the wrong account number?", a: "NyumbaPay ignores spaces, dashes and capital letters, then tries the unit label and the payer's phone number. If it still can't place the payment, it's parked in a “Needs assigning” list — never lost — and you assign it with one tap." },
  { q: "Can my caretaker or agent use it too?", a: "Team logins for caretakers and agents are coming soon. Roles are already built in, so sensitive actions like reversing a payment stay limited to owners and admins, and every change is logged." },
  { q: "Is my data safe?", a: "Each landlord's data is isolated at the database level, money records can't be edited directly, and all traffic is encrypted over HTTPS." },
];

export default function Home() {
  const price = SITE.priceKes.toLocaleString("en-KE");
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "SoftwareApplication", name: SITE.name, url: SITE.url,
      applicationCategory: "BusinessApplication", operatingSystem: "Web, Android, iOS",
      description: SITE.description,
      offers: { "@type": "Offer", price: SITE.priceKes, priceCurrency: "KES", description: "Annual subscription" },
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <section className="mk-hero" id="home">
        <div className="mk-wrap">
          <div>
            <span className="mk-eyebrow"><b />Built for Kenyan landlords &amp; agents</span>
            <h1>Rent that <em>reconciles</em> itself.</h1>
            <p className="mk-lead">
              Tenants pay on M-Pesa Paybill. NyumbaPay matches every shilling to the right house, updates balances,
              issues receipts and shows you exactly who still owes — from your phone.
            </p>
            <div className="mk-ctas">
              <Link href="/login?mode=signup" className="mk-btn mk-btn-p mk-btn-lg">Create your account</Link>
              <Link href="/#how-it-works" className="mk-btn mk-btn-o mk-btn-lg">See how it works</Link>
            </div>
            <p className="mk-fine">KSh {price} per year · Set up in minutes · No app for tenants to install</p>
          </div>

          <div style={{ position: "relative", justifySelf: "center" }} aria-hidden>
            <div className="mk-phone">
              <div className="mk-screen">
                <div className="mk-toast"><b>✅ KSh 25,000 from Fatuma Abdi</b><span>Matched by account number → B3. Receipt KAR-000049 issued.</span></div>
                <div className="mk-scr-hd"><small>Karoki Properties</small><b>NyumbaPay</b></div>
                <div className="mk-scr-body">
                  <div className="mk-lbl">Collected · September</div>
                  <div className="mk-sc">
                    <div className="mk-big">KSh 164,000</div>
                    <div style={{ fontSize: 10.5, color: "#667085" }}>of KSh 193,000 invoiced · 11 of 12 units</div>
                    <div className="mk-bar"><i /></div>
                  </div>
                  <div className="mk-lbl">Arrears</div>
                  <div className="mk-sc mk-row"><div><div className="n">Hassan Omar</div><div className="s">K2 · Kayole Flats</div></div><div className="mk-red">KSh 6,500</div></div>
                  <div className="mk-sc mk-row"><div><div className="n">Mutiso Musyoka</div><div className="s">A4 · Riverside Court</div></div><div className="mk-red">KSh 9,000</div></div>
                  <div className="mk-lbl">Recent payments</div>
                  <div className="mk-sc mk-row"><div><div className="n">Fatuma Abdi</div><div className="s">B3 · KAR-000049</div></div><div className="mk-grn">KSh 25,000</div></div>
                  <div className="mk-sc mk-row"><div><div className="n">Wanjiru Kamau</div><div className="s">A1 · KAR-000048</div></div><div className="mk-grn">KSh 9,000</div></div>
                  <div className="mk-sc mk-row"><div><div className="n">Brian Mwangi</div><div className="s">SHOP1 · KAR-000047</div></div><div className="mk-grn">KSh 30,000</div></div>
                </div>
              </div>
            </div>
            <div className="mk-float mk-f1"><i>💬</i><div><b>Reminder sent</b><br /><span style={{ color: "#6b7280" }}>in Kiswahili, via WhatsApp</span></div></div>
            <div className="mk-float mk-f2"><i>🔁</i><div><b>Duplicate ignored</b><br /><span style={{ color: "#6b7280" }}>no double counting</span></div></div>
          </div>
        </div>
      </section>

      <div className="mk-strip">
        <div className="mk-wrap">
          <span>M-Pesa Paybill</span><span>Cash &amp; bank</span><span>WhatsApp reminders</span>
          <span>English &amp; Kiswahili</span><span>Works on any phone</span>
        </div>
      </div>

      {/* ── Problem ── */}
      <section className="mk-sec">
        <div className="mk-wrap mk-center">
          <div className="mk-kicker">Sound familiar?</div>
          <h2>Collecting rent shouldn’t mean scrolling through M-Pesa messages.</h2>
          <div className="mk-pains" style={{ textAlign: "left" }}>
            <div className="mk-pain"><q>Who sent this KSh 12,000? The name doesn’t match any tenant.</q><p>Relatives and employers pay on tenants’ behalf, and the payment tells you nothing about which house it’s for.</p></div>
            <div className="mk-pain"><q>I’m sure I paid in full last month.</q><p>Without receipts and a running balance, every partial payment becomes a debate.</p></div>
            <div className="mk-pain"><q>Month-end takes me a whole evening.</q><p>Matching SMS to a spreadsheet, house by house, gets slower with every unit you add.</p></div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mk-sec alt" id="features">
        <div className="mk-wrap">
          <div className="mk-kicker">Features</div>
          <h2>Everything you need to collect rent on time — nothing you don’t.</h2>
          <p className="mk-sub">Designed around how rent is actually paid in Kenya: M-Pesa first, cash when needed, WhatsApp for everything else.</p>
          <div className="mk-feats">
            {FEATURES.map((f) => (
              <div className="mk-feat" key={f.t}>
                <div className="mk-ic"><svg viewBox="0 0 24 24" aria-hidden>{f.ic}</svg></div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mk-sec" id="how-it-works">
        <div className="mk-wrap">
          <div className="mk-kicker">How it works</div>
          <h2>Up and running in an afternoon.</h2>
          <div className="mk-how">
            <div className="mk-steps">
              <div className="mk-step"><div><h3>Add your properties and units</h3><p>Each unit instantly gets its own M-Pesa account number, like KAR-A1. Move tenants in with their phone number and rent.</p></div></div>
              <div className="mk-step"><div><h3>Share how to pay</h3><p>Give tenants your Paybill and their account number — or send their personal pay link. Invoices go out automatically every month.</p></div></div>
              <div className="mk-step"><div><h3>Watch payments reconcile</h3><p>Every payment is matched, receipted and applied to the oldest balance. You only step in when something truly can’t be placed.</p></div></div>
            </div>
            <div className="mk-match" aria-label="Examples of how NyumbaPay matches payments">
              <h4>What the tenant typed → where it went</h4>
              <div className="mk-mrow"><code>KAR-B3</code><span className="ar">→</span><div className="to"><b>B3 · Fatuma</b><small>account number</small></div></div>
              <div className="mk-mrow"><code>kar b3</code><span className="ar">→</span><div className="to"><b>B3 · Fatuma</b><small>account number, tidied</small></div></div>
              <div className="mk-mrow"><code>A4</code><span className="ar">→</span><div className="to"><b>A4 · Mutiso</b><small>unit label</small></div></div>
              <div className="mk-mrow"><code>(blank)</code><span className="ar">→</span><div className="to"><b>K2 · Hassan</b><small>payer’s phone number</small></div></div>
              <div className="mk-mrow park"><code>RENT SEPT</code><span className="ar">?</span><div className="to"><b>Needs assigning</b><small>parked, never lost</small></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="mk-sec alt" id="pricing">
        <div className="mk-wrap">
          <div className="mk-price-wrap">
            <div>
              <div className="mk-kicker">Pricing</div>
              <h2>One simple price. Everything included.</h2>
              <p className="mk-sub">No setup fees, no per-payment charges from us and no surprises. Less than what a single late payment costs you in follow-up time.</p>
            </div>
            <div className="mk-price">
              <span className="tag">Everything included</span>
              <h3>NyumbaPay Annual</h3>
              <div className="mk-amt"><b>KSh {price}</b><span>/ year</span></div>
              <div className="per">About KSh {Math.round(SITE.priceKes / 12).toLocaleString("en-KE")} a month, billed yearly</div>
              <ul className="mk-list">
                <li>Properties, units and tenants</li>
                <li>Unique M-Pesa account number per unit</li>
                <li>Automatic monthly invoices and matching</li>
                <li>Arrears list, credit and receipts</li>
                <li>WhatsApp reminders in English &amp; Kiswahili</li>
                <li>Cash and bank payments with audit trail</li>
                <li>Tenant pay links — no app for tenants</li>
              </ul>
              <Link href="/login?mode=signup" className="mk-btn mk-btn-p mk-btn-lg">Get started</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mk-sec" id="faq">
        <div className="mk-wrap mk-center">
          <div className="mk-kicker">FAQ</div>
          <h2>Questions landlords ask us</h2>
          <div className="mk-faq" style={{ textAlign: "left" }}>
            {FAQ.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog ── */}
      <section className="mk-sec alt">
        <div className="mk-wrap">
          <div className="mk-kicker">From the blog</div>
          <h2>Guides for Kenyan landlords</h2>
          <div className="mk-posts">
            {POSTS.slice(0, 3).map((p, i) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="mk-post">
                <div className={`mk-cover c${i % 5}`}><span>{p.tag}</span></div>
                <div className="mk-post-b">
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <div className="mk-meta">{fmtDate(p.date)} · {p.readMins} min read</div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <Link href="/blog" className="mk-btn mk-btn-o">Read all articles →</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mk-sec">
        <div className="mk-wrap">
          <div className="mk-band">
            <h2>Stop chasing rent. Start seeing it arrive.</h2>
            <p>Set up your properties today and let NyumbaPay handle the matching.</p>
            <div className="mk-ctas">
              <Link href="/login?mode=signup" className="mk-btn mk-btn-p mk-btn-lg">Create your account</Link>
              <a href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("Hi, I'd like to know more about NyumbaPay")}`}
                target="_blank" rel="noopener noreferrer" className="mk-btn mk-btn-o mk-btn-lg">Talk to us on WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
