import Link from "next/link";
import { notFound } from "next/navigation";
import { Submit } from "@/components/submit";
import { canManage, getContext } from "@/lib/context";
import { reminderText } from "@/lib/messages";
import { ksh, msisdn, ordinal, periodLabel, when } from "@/lib/money";
import { invoiceState, SOURCE, type Invoice, type LeaseBalance, type Payment } from "@/lib/types";
import { changeRent, deleteUnit, endLease, moveIn, recordPayment, updateTenant, updateUnit } from "../actions";

export const metadata = { title: "Unit" };

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, org, role } = await getContext();

  const { data: unit } = await supabase.from("units")
    .select("id, label, default_rent, properties(name)").eq("id", id).maybeSingle();
  if (!unit) notFound();
  const propertyName = (unit.properties as unknown as { name: string } | null)?.name ?? "";

  const { data: leaseRows } = await supabase.from("lease_balances").select("*").eq("unit_id", id);
  const leases = (leaseRows ?? []) as LeaseBalance[];
  const lease = leases.find((l) => l.status === "active");
  const leaseIds = leases.map((l) => l.lease_id);

  const [{ data: tenant }, { data: inv }, { data: pays }] = await Promise.all([
    lease ? supabase.from("tenants").select("id, full_name, phone, language").eq("id", lease.tenant_id).single()
          : Promise.resolve({ data: null }),
    leaseIds.length ? supabase.from("invoices").select("*").in("lease_id", leaseIds).order("period", { ascending: false }).limit(24)
                    : Promise.resolve({ data: [] }),
    leaseIds.length ? supabase.from("payments").select("*").in("lease_id", leaseIds).order("received_at", { ascending: false }).limit(50)
                    : Promise.resolve({ data: [] }),
  ]);

  const account = `${org.account_prefix}-${unit.label}`;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const payLink = lease ? `${site}/pay/${lease.pay_token}` : "";
  const today = new Date().toISOString().slice(0, 10);
  const phone = msisdn(tenant?.phone);
  const wa = lease && tenant && phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(reminderText({
        name: tenant.full_name, unit: unit.label, balance: Number(lease.arrears), paybill: org.paybill,
        account, link: payLink, lang: tenant.language as "en" | "sw" }))}`
    : null;

  return (
    <>
      <p className="sub" style={{ marginBottom: 8 }}><Link href="/units" style={{ color: "var(--brand)" }}>‹ Units</Link> · {propertyName}</p>
      <h2 style={{ fontSize: 20, marginBottom: 10 }}>{unit.label}{lease ? ` · ${lease.tenant_name}` : " · Vacant"}</h2>

      {lease && tenant ? (
        <>
          <div className="card">
            <div className="sub">Balance owed</div>
            <div className="big" style={{ color: Number(lease.arrears) ? "var(--red)" : "var(--brand)" }}>{ksh(lease.arrears)}</div>
            <div className="sub">Rent {ksh(lease.rent)} / month · due on the {ordinal(org.rent_due_day)}</div>
            {Number(lease.credit) > 0 && <div className="acct ok"><b>{ksh(lease.credit)} credit</b> — applied to the next invoice automatically</div>}
            <div className="acct">{org.paybill ? <>Paybill <b>{org.paybill}</b> · </> : null}Account <b>{account}</b></div>
          </div>

          <div className="sect">Actions</div>
          {wa && <a className="btn btn-p" href={wa} target="_blank" rel="noopener noreferrer">💬 Send reminder on WhatsApp</a>}
          <details className="card" style={{ marginTop: 8 }}>
            <summary>💵 Record a cash or bank payment</summary>
            <form action={recordPayment}>
              <input type="hidden" name="unit_id" value={unit.id} />
              <input type="hidden" name="lease_id" value={lease.lease_id} />
              <div className="grid2">
                <label className="l">Amount (KSh)
                  <input className="field" name="amount" inputMode="decimal" required defaultValue={Number(lease.arrears) ? Math.round(Number(lease.arrears) / 100) : ""} />
                </label>
                <label className="l">Method
                  <select className="field" name="source"><option value="cash">Cash</option><option value="bank">Bank transfer</option></select>
                </label>
              </div>
              <div className="grid2">
                <label className="l">Date received<input className="field" type="date" name="received_on" defaultValue={today} max={today} /></label>
                <label className="l">Reference (optional)<input className="field" name="ref" placeholder="Receipt book no." maxLength={60} /></label>
              </div>
              <div style={{ marginTop: 12 }}><Submit>Record payment</Submit></div>
            </form>
          </details>
          <details className="card">
            <summary>🔗 Tenant pay link</summary>
            <p className="sub">Share this link — no app or login needed. It shows the balance and how to pay.</p>
            <input className="field" readOnly value={payLink} />
            <Link className="btn btn-g" style={{ marginTop: 8 }} href={`/pay/${lease.pay_token}`} target="_blank">Open pay page</Link>
          </details>

          <div className="sect">Tenant</div>
          <details className="card">
            <summary>{tenant.full_name} · {tenant.phone ?? "no phone"}</summary>
            <form action={updateTenant}>
              <input type="hidden" name="unit_id" value={unit.id} />
              <input type="hidden" name="tenant_id" value={tenant.id} />
              <label className="l">Full name<input className="field" name="full_name" defaultValue={tenant.full_name} required /></label>
              <div className="grid2">
                <label className="l">Phone<input className="field" name="phone" type="tel" defaultValue={tenant.phone ?? ""} /></label>
                <label className="l">Language
                  <select className="field" name="language" defaultValue={tenant.language}>
                    <option value="en">English</option><option value="sw">Kiswahili</option>
                  </select>
                </label>
              </div>
              <div style={{ marginTop: 12 }}><Submit className="btn btn-g">Save tenant</Submit></div>
            </form>
          </details>
          <details className="card">
            <summary>Change rent</summary>
            <form action={changeRent}>
              <input type="hidden" name="unit_id" value={unit.id} />
              <input type="hidden" name="lease_id" value={lease.lease_id} />
              <label className="l">New monthly rent (KSh)<input className="field" name="rent" inputMode="decimal" defaultValue={Math.round(Number(lease.rent) / 100)} required /></label>
              <p className="sub" style={{ marginTop: 6 }}>Invoices already raised keep the old amount.</p>
              <div style={{ marginTop: 12 }}><Submit className="btn btn-g">Update rent</Submit></div>
            </form>
          </details>
          <details className="card">
            <summary>Move tenant out</summary>
            <form action={endLease}>
              <input type="hidden" name="unit_id" value={unit.id} />
              <input type="hidden" name="lease_id" value={lease.lease_id} />
              <label className="l">Move-out date<input className="field" type="date" name="end_date" defaultValue={today} required /></label>
              <p className="sub" style={{ marginTop: 6 }}>Any balance stays on record. The unit becomes vacant.</p>
              <div style={{ marginTop: 12 }}><Submit className="btn btn-d" confirm={`Move ${tenant.full_name} out of ${unit.label}?`}>End lease</Submit></div>
            </form>
          </details>
        </>
      ) : (
        <>
          <div className="card">
            <div className="sub">This unit is vacant</div>
            <div className="acct">Account <b>{account}</b> · rent {ksh(unit.default_rent)}</div>
          </div>
          <div className="sect">Move a tenant in</div>
          <form className="card" action={moveIn}>
            <input type="hidden" name="unit_id" value={unit.id} />
            <label className="l">Tenant full name<input className="field" name="full_name" required maxLength={120} /></label>
            <div className="grid2">
              <label className="l">Phone<input className="field" name="phone" type="tel" placeholder="0712 345 678" /></label>
              <label className="l">Language
                <select className="field" name="language"><option value="en">English</option><option value="sw">Kiswahili</option></select>
              </label>
            </div>
            <div className="grid2">
              <label className="l">Monthly rent (KSh)<input className="field" name="rent" inputMode="decimal" defaultValue={Math.round(Number(unit.default_rent) / 100) || ""} required /></label>
              <label className="l">Deposit held (KSh)<input className="field" name="deposit" inputMode="decimal" placeholder="0" /></label>
            </div>
            <label className="l">Move-in date<input className="field" type="date" name="start_date" defaultValue={today} required /></label>
            <div style={{ marginTop: 12 }}><Submit>Move in</Submit></div>
          </form>
          <details className="card">
            <summary>Edit unit</summary>
            <form action={updateUnit}>
              <input type="hidden" name="unit_id" value={unit.id} />
              <div className="grid2">
                <label className="l">Label<input className="field" name="label" defaultValue={unit.label} required /></label>
                <label className="l">Default rent (KSh)<input className="field" name="rent" inputMode="decimal" defaultValue={Math.round(Number(unit.default_rent) / 100)} required /></label>
              </div>
              <p className="sub" style={{ marginTop: 6 }}>Changing the label changes the M-Pesa account number.</p>
              <div style={{ marginTop: 12 }}><Submit className="btn btn-g">Save</Submit></div>
            </form>
            {canManage(role) && leases.length === 0 && (
              <form action={deleteUnit} style={{ marginTop: 8 }}>
                <input type="hidden" name="unit_id" value={unit.id} />
                <Submit className="btn btn-d" confirm={`Delete unit ${unit.label}?`}>Delete unit</Submit>
              </form>
            )}
          </details>
        </>
      )}

      <div className="sect">Invoices</div>
      {(inv as Invoice[] | null)?.length ? (inv as Invoice[]).map((i) => {
        const st = invoiceState(i);
        return (
          <div key={i.id} className="card">
            <div className="row">
              <div><div className="t">{periodLabel(i.period)}</div><div className="s">Due {i.due_date} · paid {ksh(i.amount_paid)}</div></div>
              <div className="right"><div className="amt">{ksh(i.amount)}</div><span className={`pill p-${st}`}>{st}</span></div>
            </div>
          </div>
        );
      }) : <div className="card empty">No invoices yet.</div>}

      <div className="sect">Payment history</div>
      {(pays as Payment[] | null)?.length ? (pays as Payment[]).map((p) => (
        <div key={p.id} className="card">
          <div className="row">
            <div>
              <div className="t">{when(p.received_at)}</div>
              <div className="s">{SOURCE[p.source]} · {p.provider_ref}{p.matched_by ? ` · ${p.matched_by}` : ""}</div>
              {p.receipt_no && <div className="s" style={{ color: "var(--brand)", fontWeight: 650 }}>{p.receipt_no}</div>}
            </div>
            <div className="right">
              <div className="amt" style={{ color: p.status === "reversed" ? "var(--muted)" : "var(--green)", textDecoration: p.status === "reversed" ? "line-through" : undefined }}>{ksh(p.amount)}</div>
              {p.status === "reversed" && <span className="pill p-reversed">reversed</span>}
            </div>
          </div>
        </div>
      )) : <div className="card empty">No payments recorded yet.</div>}
    </>
  );
}
