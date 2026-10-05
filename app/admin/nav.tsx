"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/landlords", label: "Landlords" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={(l.exact ? path === l.href : path.startsWith(l.href)) ? "on" : ""}>{l.label}</Link>
      ))}
    </>
  );
}
