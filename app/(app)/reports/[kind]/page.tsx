import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Icon } from "@/components/icon";
import { getContext } from "@/lib/context";
import { reminderText } from "@/lib/messages";
import { ksh, msisdn, periodLabel, periodOf, shiftPeriod } from "@/lib/money";
import { arrearsRows, loadReport, REPORTS, STATUS_LABEL, totals, type ReportKind, type ReportRow } from "@/lib/reports";
import { SITE } from "@/lib/site";

export const metadata = { title: "Report" };

const pill: Record<ReportRow["status"], string> = { paid: "paid", partial: "partial", unpaid: "unpaid", vacant: "vacant", "not invoiced": "void" };
const monthName = (p: string | null) => (p ? periodLabel(p) : "—");

export default async function Report({ params, searchParams }: {
  params: Promise<{ kind: string }>; searchParams: Promise<{ period?: string }>;
}) {
  const { kind } = await params;
  if (!(kind in REPORTS)) notFound();
  const k = kind as ReportKind;
  const q = (await searchParams).period;
  const current = periodOf();
  const period = periodOf(q && /^\d{4}-\d{2}$/.test(q) ? q : undefined);
  const { supabase, org } = await getContext();
  const rows = await loadReport(supabase, org.id, period);
  const t = totals(rows);
  const generated = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const csv = `/reports/${k}/csv${REPORTS[k].monthly ? `?period=${period.slice(0, 7)}` : ""}`;

  return (
    <div className="report">
      <p className="sub noprint" style={{ marginBottom: 8 }}><Link href="/reports" style={{ color: "var(--brand)" }}>‹ Reports</Link></p>
      <div className="rhead">
        <div className="sub">{org.name}</div>
        <h2 style={{ fontSize: 21, margin: "2px 0 2px" }}>{REPORTS[k].title}</h2>
        <div className="sub">{REPORTS[k].monthly ? periodLabel(period) : "As at today"} · generated {generated}</div>
      </div>

      {REPORTS[k].monthly && (
        <div className="tabs noprint" style={{ marginTop: 10 }}>
          {[0, -1, -2, -3].map((d) => {
            const p = shiftPeriod(current, d);
            return <Link key={p} href={`/reports/${k}?period=${p.slice(0, 7)}`} className={p === period ? "on" : ""}>{periodLabel(p)}</Link>;
          })}
        </div>
      )}
      <div className="noprint" style={{ display: "flex", gap: 8, margin: "10px 0 12px", flexWrap: "wrap" }}>
        <a className="btn btn-g btn-sm" href={csv}><Icon name="download" size={15} style={{ marginRight: 6 }} />Download for Excel</a>
        <PrintButton />
      </div>

      {k === "summary" && <Summary rows={rows} t={t} />}
      {k === "payments" && <Payments rows={rows} t={t} />}
      {k === "arrears" && <Arrears rows={rows} org={org} />}
    </div>
  );
}

function Stats({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="rstats">
      {items.map(([k, v, c]) => <div key={k}><div className="s">{k}</div><div className="amt" style={{ fontSize: 17, color: c }}>{v}</div></div>)}
    </div>
  );
}

function Summary({ rows, t }: { rows: ReportRow[]; t: ReturnType<typeof totals> }) {
  return (
    <>
      <Stats items={[["Houses", `${t.units}`], ["Occupied", `${t.occupied}`], ["Vacant", `${t.vacant}`],
        ["Rent invoiced", ksh(t.invoiced)], ["Collected", ksh(t.paid), "var(--green)"], ["Total arrears", ksh(t.arrears), t.arrears ? "var(--red)" : undefined]]} />
      <div className="rtable"><table>
        <thead><tr><th>House</th><th>Tenant</th><th className="n mh">Rent</th><th className="n mh">Paid</th><th className="n">Arrears</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.unit_id}>
              <td><b>{r.unit_label}</b><div className="s">{r.property_name}</div></td>
              <td>{r.tenant_name ?? <span className="s">—</span>}{r.tenant_phone && <div className="s">{r.tenant_phone}</div>}</td>
              <td className="n mh">{ksh(r.rent)}</td>
              <td className="n mh">{r.status === "vacant" ? "—" : ksh(r.paid)}</td>
              <td className="n" style={{ color: r.arrears ? "var(--red)" : undefined }}>{r.status === "vacant" ? "—" : ksh(r.arrears)}</td>
              <td><span className={`pill p-${pill[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={2}>Total · {t.units} houses</td><td className="n mh">{ksh(rows.reduce((n, r) => n + (r.status === "vacant" ? 0 : r.rent), 0))}</td><td className="n mh">{ksh(t.paid)}</td><td className="n">{ksh(t.arrears)}</td><td>{t.rate}% collected</td></tr></tfoot>
      </table></div>
      {!rows.length && <div className="card empty">No houses yet.</div>}
    </>
  );
}

function Payments({ rows, t }: { rows: ReportRow[]; t: ReturnType<typeof totals> }) {
  const groups: [ReportRow["status"][], string, string][] = [
    [["paid"], "Paid", "var(--green)"], [["partial"], "Partly paid", "var(--amber)"],
    [["unpaid"], "Not paid", "var(--red)"], [["not invoiced", "vacant"], "Vacant / no invoice", "var(--muted)"],
  ];
  return (
    <>
      <Stats items={[["Paid", `${t.count("paid")}`, "var(--green)"], ["Partly paid", `${t.count("partial")}`, "var(--amber)"],
        ["Not paid", `${t.count("unpaid")}`, "var(--red)"], ["Collected", ksh(t.paid), "var(--green)"], ["Still to collect", ksh(t.balance), t.balance ? "var(--red)" : undefined], ["Collection rate", `${t.rate}%`]]} />
      {groups.map(([sts, label, color]) => {
        const g = rows.filter((r) => sts.includes(r.status));
        if (!g.length) return null;
        return (
          <section key={label}>
            <div className="sect" style={{ color }}>{label} <span className="r" style={{ color }}>{g.length}</span></div>
            <div className="rtable"><table>
              <thead><tr><th>House</th><th>Tenant</th><th className="n mh">Rent</th><th className="n">Paid</th><th className="n">Balance</th></tr></thead>
              <tbody>{g.map((r) => (
                <tr key={r.unit_id}>
                  <td><b>{r.unit_label}</b><div className="s">{r.property_name}</div></td>
                  <td>{r.tenant_name ?? <span className="s">Vacant</span>}{r.last_payment_at && <div className="s">last paid {new Date(r.last_payment_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" })}</div>}</td>
                  <td className="n mh">{ksh(r.status === "vacant" ? 0 : r.invoiced || r.rent)}</td>
                  <td className="n">{ksh(r.paid)}</td>
                  <td className="n" style={{ color: r.balance ? "var(--red)" : undefined }}>{ksh(r.balance)}</td>
                </tr>))}
              </tbody>
              <tfoot><tr><td colSpan={2}>{g.length} house{g.length === 1 ? "" : "s"}</td><td className="n mh">{ksh(g.reduce((n, r) => n + r.invoiced, 0))}</td><td className="n">{ksh(g.reduce((n, r) => n + r.paid, 0))}</td><td className="n">{ksh(g.reduce((n, r) => n + r.balance, 0))}</td></tr></tfoot>
            </table></div>
          </section>
        );
      })}
    </>
  );
}

function Arrears({ rows, org }: { rows: ReportRow[]; org: { account_prefix: string; paybill: string | null } }) {
  const owing = arrearsRows(rows);
  const total = owing.reduce((n, r) => n + r.arrears, 0);
  if (!owing.length) return <div className="card empty"><Icon name="check" size={22} style={{ color: "var(--green)", display: "block", margin: "0 auto 6px" }} />No house has rent arrears.</div>;
  return (
    <>
      <Stats items={[["Houses owing", `${owing.length}`, "var(--red)"], ["Total arrears", ksh(total), "var(--red)"],
        ["Owing 2+ months", `${owing.filter((r) => r.months_owing >= 2).length}`]]} />
      <div className="rtable"><table>
        <thead><tr><th>House</th><th>Tenant</th><th className="n mh">Months</th><th className="mh">Since</th><th className="n">Arrears</th><th className="noprint"></th></tr></thead>
        <tbody>{owing.map((r) => {
          const phone = msisdn(r.tenant_phone);
          const wa = phone && r.tenant_name ? `https://wa.me/${phone}?text=${encodeURIComponent(reminderText({
            name: r.tenant_name, unit: r.unit_label, balance: r.arrears, paybill: org.paybill,
            account: `${org.account_prefix}-${r.unit_label}`, link: `${SITE.url}/pay/${r.pay_token}`, lang: r.tenant_language ?? "en" }))}` : null;
          return (
            <tr key={r.unit_id}>
              <td><Link href={`/units/${r.unit_id}`}><b>{r.unit_label}</b></Link><div className="s">{r.property_name}</div>
                <div className="s mo">{r.months_owing} month{r.months_owing === 1 ? "" : "s"} · since {monthName(r.oldest_unpaid)}</div></td>
              <td>{r.tenant_name}<div className="s">{r.tenant_phone ?? "no phone"}</div></td>
              <td className="n mh">{r.months_owing}</td>
              <td className="mh">{monthName(r.oldest_unpaid)}</td>
              <td className="n" style={{ color: "var(--red)", fontWeight: 700 }}>{ksh(r.arrears)}</td>
              <td className="noprint">{wa && <a className="btn btn-p btn-sm" href={wa} target="_blank" rel="noopener noreferrer">Remind</a>}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr><td colSpan={2}>Total · {owing.length} houses</td><td className="mh"></td><td className="mh"></td><td className="n">{ksh(total)}</td><td className="noprint"></td></tr></tfoot>
      </table></div>
    </>
  );
}
