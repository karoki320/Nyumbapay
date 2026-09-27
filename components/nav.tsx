"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const IC = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  units: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h2M9 12h2M9 16h2M14 8h1M14 12h1M14 16h1" /></>,
  rent: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  pay: <><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h3" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};
const TABS = [
  { href: "/dashboard", ic: IC.home, l: "Home" },
  { href: "/units", ic: IC.units, l: "Units" },
  { href: "/invoices", ic: IC.rent, l: "Rent" },
  { href: "/payments", ic: IC.pay, l: "Payments" },
  { href: "/settings", ic: IC.cog, l: "Settings" },
];

export function Nav({ unmatched }: { unmatched: number }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path.startsWith(t.href) ? "on" : ""}>
          <svg viewBox="0 0 24 24" aria-hidden>{t.ic}</svg>
          {t.l}
          {t.href === "/payments" && unmatched > 0 && <span className="count">{unmatched}</span>}
        </Link>
      ))}
    </nav>
  );
}
