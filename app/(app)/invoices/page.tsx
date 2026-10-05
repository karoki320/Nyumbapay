import Link from "next/link";
import { Submit } from "@/components/submit";
import { canManage, getContext } from "@/lib/context";
import { ksh, periodLabel, periodOf, shiftPeriod } from "@/lib/money";
import { invoiceState, type Invoice, type LeaseBalance } from "@/lib/types";
import { generate, voidInvoice } from "./actions";

export const metadata = { title: "Rent" };

export default async function Invoices({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { supabase, org, role } = await getContext();
  const q = (await searchParams).period;
  const current = periodOf();
  const period = periodOf(q && /^\d{4}-\d{2}$/.test(q) ? q : undefined);

  const [{ data: inv }, { data: leases }] = await Promise.all([
    supabase.from("invoices").select("*").eq("org_id", org.id).eq("period", period).order("created_at"),
    supabase.from("lease_balances").select("*").eq("org_id", org.id),
  ]);
  const list = (inv ?? []) as Invoice[];
  const byLease = new Map(((leases ?? []) as LeaseBalance[]).map((l) => [l.lease_id, l]));
  const live = list.filter((i) => i.status !== "void");
  const total = live.reduce((n, i) => n + Number(i.amount), 0);
  const paid = live.reduce((n, i) => n + Number(i.amount_paid), 0);
  const back = `/invoices?period=${period.slice(0, 7)}`;
  list.sort((a, b) => (byLease.get(a.lease_id)?.unit_label ?? "").localeCompare(byLease.get(b.lease_id)?.unit_label ?? "", undefined, { numeric: true }));

  return (
    <>
      <div className="tabs">
        {[-2, -1, 0, 1].map((d) => {
          const p = shiftPeriod(period, d);
          if (p > shiftPeriod(current, 1)) return null;
          return <Link key={p} href={`/invoices?period=${p.slice(0, 7)}`} className={p === period ? "on" : ""}>{periodLabel(p)}</Link>;
        })}
      </div>

      <div className="card">
        <div className="sub">Invoiced for {periodLabel(period)}</div>
        <div className="big">{ksh(total)}</div>
        <div className="sub">{ksh(paid)} paid · {ksh(total - paid)} outstanding · due on day {org.rent_due_day}</div>
        {canManage(role) && period <= shiftPeriod(current, 1) && (
          <form action={generate} style={{ marginTop: 12 }}>
            <input type="hidden" name="period" value={period} />
            <Submit className="btn btn-g">Raise missing invoices for {periodLabel(period)}</Submit>
          </form>
        )}
        <p className="sub" style={{ marginTop: 8 }}>Invoices are raised automatically each month for every active lease.
          {" "}<Link href={`/reports/payments?period=${period.slice(0, 7)}`} style={{ color: "var(--brand)", fontWeight: 650 }}>See the paid vs not paid report →</Link></p>
      </div>

      <div className="sect">{live.length} invoices</div>
      {list.length ? list.map((i) => {
        const l = byLease.get(i.lease_id);
        const st = invoiceState(i);
        return (
          <div key={i.id} className="card" style={i.status === "void" ? { opacity: 0.55 } : undefined}>
            <Link href={l ? `/units/${l.unit_id}` : "#"} className="row">
              <div><div className="t">{l?.tenant_name ?? "—"}</div><div className="s">{l?.unit_label} · due {i.due_date}</div></div>
              <div className="right"><div className="amt">{ksh(i.amount)}</div><span className={`pill p-${st}`}>{st}</span></div>
            </Link>
            {st === "partial" && <div className="acct">Paid {ksh(i.amount_paid)} · <b style={{ color: "var(--red)" }}>{ksh(i.amount - i.amount_paid)} outstanding</b></div>}
            {canManage(role) && i.status !== "void" && (
              <form action={voidInvoice} style={{ marginTop: 8, textAlign: "right" }}>
                <input type="hidden" name="invoice_id" value={i.id} />
                <input type="hidden" name="back" value={back} />
                <Submit className="btn btn-d btn-sm" confirm="Void this invoice? Money already applied to it becomes credit.">Void</Submit>
              </form>
            )}
          </div>
        );
      }) : <div className="card empty">No invoices for this month.</div>}
    </>
  );
}
