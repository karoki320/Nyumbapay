import Link from "next/link";
import { Submit } from "@/components/submit";
import { canManage, getContext } from "@/lib/context";
import { ksh, when } from "@/lib/money";
import { SOURCE, type LeaseBalance, type Payment } from "@/lib/types";
import { assign, reverse } from "./actions";

export const metadata = { title: "Payments" };

export default async function Payments() {
  const { supabase, org, role } = await getContext();
  const [{ data: unmatched }, { data: feed }, { data: leases }] = await Promise.all([
    supabase.from("payments").select("*").eq("org_id", org.id).eq("status", "unmatched").order("received_at"),
    supabase.from("payments").select("*").eq("org_id", org.id).neq("status", "unmatched")
      .order("received_at", { ascending: false }).limit(100),
    supabase.from("lease_balances").select("*").eq("org_id", org.id),
  ]);
  const all = (leases ?? []) as LeaseBalance[];
  const byLease = new Map(all.map((l) => [l.lease_id, l]));
  const active = all.filter((l) => l.status === "active")
    .sort((a, b) => a.unit_label.localeCompare(b.unit_label, undefined, { numeric: true }));
  const U = (unmatched ?? []) as Payment[];

  return (
    <>
      {U.length > 0 && (
        <>
          <div className="sect" style={{ color: "var(--amber)" }}>Needs assigning <span className="r">{U.length}</span></div>
          {U.map((p) => (
            <form key={p.id} action={assign} className="card" style={{ borderColor: "#fec84b", background: "var(--amber-bg)" }}>
              <div className="amt" style={{ fontSize: 19 }}>{ksh(p.amount)}</div>
              <div className="s">{p.payer_name ?? "Unknown"} · {when(p.received_at)}</div>
              <div className="s">Account typed “<b>{p.bill_ref || "nothing"}</b>” · {p.provider_ref}</div>
              <input type="hidden" name="payment_id" value={p.id} />
              <select className="field" name="lease_id" required defaultValue="">
                <option value="" disabled>Assign to a unit…</option>
                {active.map((l) => <option key={l.lease_id} value={l.lease_id}>{l.unit_label} — {l.tenant_name} ({l.property_name})</option>)}
              </select>
              <div style={{ marginTop: 8 }}><Submit>Assign</Submit></div>
            </form>
          ))}
        </>
      )}

      <div className="sect">Payment feed</div>
      {(feed as Payment[] | null)?.length ? (feed as Payment[]).map((p) => {
        const l = p.lease_id ? byLease.get(p.lease_id) : undefined;
        const rev = p.status === "reversed";
        return (
          <div key={p.id} className="card" style={rev ? { opacity: 0.6 } : undefined}>
            <div className="row">
              <div>
                {l ? <Link href={`/units/${l.unit_id}`} className="t">{l.tenant_name}</Link> : <div className="t">{p.payer_name}</div>}
                <div className="s">{l?.unit_label} · {SOURCE[p.source]} · {when(p.received_at)}</div>
                <div className="s" style={{ color: "var(--brand)", fontWeight: 650 }}>{p.receipt_no} · {p.provider_ref}</div>
                {rev && <div className="s">Reversed: {p.reversed_reason}</div>}
              </div>
              <div className="right">
                <div className="amt" style={{ color: rev ? "var(--muted)" : "var(--green)", textDecoration: rev ? "line-through" : undefined }}>{ksh(p.amount)}</div>
                {p.matched_by && !rev && <div className="s">{p.matched_by}</div>}
              </div>
            </div>
            {canManage(role) && !rev && (
              <details style={{ marginTop: 6 }}>
                <summary className="s" style={{ cursor: "pointer" }}>Reverse…</summary>
                <form action={reverse}>
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input className="field" name="reason" placeholder="Reason, e.g. recorded twice" required minLength={3} />
                  <div style={{ marginTop: 8 }}><Submit className="btn btn-d" confirm="Reverse this payment? The tenant's balance goes back up.">Reverse payment</Submit></div>
                </form>
              </details>
            )}
          </div>
        );
      }) : <div className="card empty">No payments yet. M-Pesa payments appear here automatically once your paybill is connected.</div>}
    </>
  );
}
