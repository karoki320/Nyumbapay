import Link from "next/link";
import { Icon } from "@/components/icon";
import { QuickPay } from "@/components/quick-pay";
import { quickPayment } from "./actions";
import { getContext } from "@/lib/context";
import { ksh, periodLabel, periodOf, when } from "@/lib/money";
import type { LeaseBalance, Payment } from "@/lib/types";

export const metadata = { title: "Home" };

export default async function Dashboard() {
  const { supabase, org } = await getContext();
  const period = periodOf();

  const [{ data: inv }, { data: leases }, { data: pays }, { count: unitCount }] = await Promise.all([
    supabase.from("invoices").select("amount, amount_paid").eq("org_id", org.id).eq("period", period).neq("status", "void"),
    supabase.from("lease_balances").select("*").eq("org_id", org.id),
    supabase.from("payments").select("*").eq("org_id", org.id).neq("status", "reversed")
      .order("received_at", { ascending: false }).limit(6),
    supabase.from("units").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  ]);

  const expected = (inv ?? []).reduce((n, i) => n + Number(i.amount), 0);
  const collected = (inv ?? []).reduce((n, i) => n + Number(i.amount_paid), 0);
  const pct = expected ? Math.round((collected / expected) * 100) : 0;
  const all = (leases ?? []) as LeaseBalance[];
  const byLease = new Map(all.map((l) => [l.lease_id, l]));
  const active = all.filter((l) => l.status === "active");
  const arrears = active.filter((l) => Number(l.arrears) > 0);
  const totalArrears = arrears.reduce((n, l) => n + Number(l.arrears), 0);
  // Owing first (largest first), then everyone who is paid up, by house.
  const tenants = [...active].sort((a, b) => Number(b.arrears) - Number(a.arrears)
    || a.property_name.localeCompare(b.property_name) || a.unit_label.localeCompare(b.unit_label, undefined, { numeric: true }));

  if (!unitCount) {
    return (
      <div className="card empty">
        <p style={{ fontWeight: 650, color: "var(--ink)", fontSize: 15 }}>Welcome to NyumbaPay</p>
        <p style={{ margin: "6px 0 14px" }}>Add a property and its units to start collecting rent.</p>
        <Link className="btn btn-p" href="/units">Add your first property</Link>
      </div>
    );
  }

  return (
    <>
      <div className="sect">Collected · {periodLabel(period)}</div>
      <div className="card">
        <div className="big">{ksh(collected)}</div>
        <div className="sub">of {ksh(expected)} invoiced · {active.length} of {unitCount} units occupied</div>
        <div className="bar"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
        <div className="sub right" style={{ marginTop: 5 }}>{pct}%</div>
        {expected === 0 && active.length > 0 && (
          <div className="acct warn">No invoices for this month yet. <Link href="/invoices"><b>Raise them now →</b></Link></div>
        )}
      </div>

      <Link href="/reports" className="card" style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span><b><Icon name="chart" style={{ color: "var(--brand)", marginRight: 6 }} />Reports</b> <span className="s">· all houses, paid vs not paid, arrears</span></span>
        <span style={{ color: "var(--brand)", fontWeight: 700 }}>›</span>
      </Link>

      <div className="sect">Tenants <span className="r">{arrears.length ? `${arrears.length} owe ${ksh(totalArrears)}` : "all paid"}</span></div>
      {tenants.length ? tenants.map((l) => (
        <QuickPay key={l.lease_id} action={quickPayment} leaseId={l.lease_id} unitId={l.unit_id}
          tenant={l.tenant_name} unit={l.unit_label} property={l.property_name}
          arrears={Number(l.arrears)} credit={Number(l.credit)} rent={Number(l.rent)}
          amountLabel={ksh(Number(l.arrears) > 0 ? l.arrears : l.credit)} />
      )) : <div className="card empty">No tenants yet. <Link href="/units"><b>Add one</b></Link></div>}

      <div className="sect">Recent payments <Link className="r" href="/payments">All</Link></div>
      {(pays as Payment[] | null)?.length ? (pays as Payment[]).map((p) => {
        const l = p.lease_id ? byLease.get(p.lease_id) : undefined;
        return (
          <Link key={p.id} className="card" href={l ? `/units/${l.unit_id}` : "/payments"}>
            <div className="row">
              <div>
                <div className="t">{l?.tenant_name ?? p.payer_name ?? "Unknown payer"}</div>
                <div className="s">{l ? l.unit_label : "Needs assigning"} · {when(p.received_at)}{p.receipt_no ? ` · ${p.receipt_no}` : ""}</div>
              </div>
              <div className="amt" style={{ color: p.status === "unmatched" ? "var(--amber)" : "var(--green)" }}>{ksh(p.amount)}</div>
            </div>
          </Link>
        );
      }) : <div className="card empty">No payments yet.</div>}
    </>
  );
}
