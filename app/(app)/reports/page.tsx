import Link from "next/link";
import { getContext } from "@/lib/context";
import { ksh, periodLabel, periodOf } from "@/lib/money";
import { arrearsRows, loadReport, REPORTS, totals, type ReportKind } from "@/lib/reports";

export const metadata = { title: "Reports" };

const ICON: Record<ReportKind, string> = { summary: "🏠", payments: "✅", arrears: "⚠️" };

export default async function Reports() {
  const { supabase, org } = await getContext();
  const period = periodOf();
  const rows = await loadReport(supabase, org.id, period);
  const t = totals(rows);
  const owing = arrearsRows(rows);
  const stat: Record<ReportKind, string> = {
    summary: `${t.units} houses · ${t.occupied} occupied · ${t.vacant} vacant`,
    payments: `${t.count("paid")} paid · ${t.count("partial")} partly · ${t.count("unpaid")} not paid`,
    arrears: owing.length ? `${owing.length} house${owing.length === 1 ? "" : "s"} owe ${ksh(t.arrears)}` : "Nobody owes rent 🎉",
  };
  return (
    <>
      <div className="sect">Reports · {periodLabel(period)}</div>
      {(Object.keys(REPORTS) as ReportKind[]).map((k) => (
        <Link key={k} href={`/reports/${k}`} className="card">
          <div className="row" style={{ alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 26 }} aria-hidden>{ICON[k]}</span>
              <div><div className="t">{REPORTS[k].title}</div><div className="s">{stat[k]}</div></div>
            </div>
            <span style={{ color: "var(--brand)", fontWeight: 700 }}>›</span>
          </div>
          <div className="s" style={{ marginTop: 8 }}>{REPORTS[k].blurb}</div>
        </Link>
      ))}
      <p className="sub" style={{ marginTop: 14 }}>Each report can be downloaded for Excel or printed / saved as a PDF.</p>
    </>
  );
}
