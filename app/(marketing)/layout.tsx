import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SITE } from "@/lib/site";
import "./marketing.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk">
      <SiteHeader />
      <main>{children}</main>
      <footer className="mk-ft">
        <div className="mk-wrap">
          <div>
            <Link href="/" className="mk-brand" style={{ marginBottom: 12 }}>
              <i><svg viewBox="0 0 64 64" aria-hidden><path d="M14 34 32 18l18 16v14a2 2 0 0 1-2 2H36V38h-8v12H16a2 2 0 0 1-2-2z" /></svg></i>
              NyumbaPay
            </Link>
            <p style={{ maxWidth: 300 }}>Rent collection and M-Pesa reconciliation for Kenyan landlords and property agents.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link href="/#features">Features</Link></li>
              <li><Link href="/#how-it-works">How it works</Link></li>
              <li><Link href="/#pricing">Pricing</Link></li>
              <li><Link href="/#faq">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/blog/collect-rent-mpesa-paybill-kenya">M-Pesa rent guide</Link></li>
              <li><Link href="/blog/paybill-vs-till-number-for-rent">Paybill vs Till</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><Link href="/login">Sign in</Link></li>
            </ul>
          </div>
          <div className="mk-copy">
            <span>© {new Date().getFullYear()} NyumbaPay. Nairobi, Kenya.</span>
            <span>Built by Biziirise Digital Agency</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
