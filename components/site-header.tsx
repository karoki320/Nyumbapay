"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`mk-hd ${scrolled ? "scrolled" : ""}`}>
      <div className="mk-wrap">
        <Link href="/" className="mk-brand" aria-label="NyumbaPay home">
          <i><svg viewBox="0 0 64 64" aria-hidden><path d="M14 34 32 18l18 16v14a2 2 0 0 1-2 2H36V38h-8v12H16a2 2 0 0 1-2-2z" /></svg></i>
          NyumbaPay
        </Link>
        <nav className="mk-nav" aria-label="Site">
          <Link href="/#features">Features</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
        </nav>
        <div className="mk-sp" />
        <div className="mk-auth">
          <Link href="/login" className="mk-btn mk-btn-g">Sign in</Link>
          <Link href="/login?mode=signup" className="mk-btn mk-btn-p">Sign up</Link>
        </div>
      </div>
    </header>
  );
}
