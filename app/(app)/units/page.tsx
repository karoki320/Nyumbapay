import Link from "next/link";
import { Submit } from "@/components/submit";
import { getContext } from "@/lib/context";
import { ksh } from "@/lib/money";
import type { LeaseBalance } from "@/lib/types";
import { addProperty, addUnit } from "./actions";

export const metadata = { title: "Units" };

type Unit = { id: string; label: string; default_rent: number; property_id: string };
type Property = { id: string; name: string; location: string | null };

export default async function Units() {
  const { supabase, org } = await getContext();
  const [{ data: props }, { data: units }, { data: leases }] = await Promise.all([
    supabase.from("properties").select("id, name, location").eq("org_id", org.id).order("name"),
    supabase.from("units").select("id, label, default_rent, property_id").eq("org_id", org.id).order("label"),
    supabase.from("lease_balances").select("*").eq("org_id", org.id).eq("status", "active"),
  ]);
  const P = (props ?? []) as Property[], U = (units ?? []) as Unit[];
  const byUnit = new Map(((leases ?? []) as LeaseBalance[]).map((l) => [l.unit_id, l]));
  const occupied = U.filter((u) => byUnit.has(u.id)).length;

  return (
    <>
      {U.length > 0 && (
        <div className="card">
          <div className="sub">Occupancy</div>
          <div className="big">{occupied}/{U.length}{" "}
            <span style={{ fontSize: 16, fontWeight: 500, color: "var(--muted)" }}>{Math.round((occupied / U.length) * 100)}%</span>
          </div>
        </div>
      )}

      {P.map((p) => {
        const list = U.filter((u) => u.property_id === p.id);
        return (
          <section key={p.id}>
            <div className="sect">{p.name}{p.location ? ` · ${p.location}` : ""} <span className="r">{list.length} units</span></div>
            {list.length ? list.map((u) => {
              const l = byUnit.get(u.id);
              const state = !l ? "vacant" : Number(l.arrears) > 0 ? "unpaid" : "paid";
              return (
                <Link key={u.id} className="card" href={`/units/${u.id}`}>
                  <div className="row">
                    <div><div className="t">{u.label}</div><div className="s">{l?.tenant_name ?? "Vacant"}</div></div>
                    <div className="right">
                      <div className="amt">{ksh(l?.rent ?? u.default_rent)}</div>
                      <span className={`pill p-${state}`}>{state === "unpaid" ? `owes ${ksh(l!.arrears)}` : state}</span>
                    </div>
                  </div>
                  <div className="acct">Account <b>{org.account_prefix}-{u.label}</b>{org.paybill ? <> · Paybill <b>{org.paybill}</b></> : null}</div>
                </Link>
              );
            }) : <div className="card empty">No units yet.</div>}
          </section>
        );
      })}

      <div className="sect">Add</div>
      {P.length > 0 && (
        <details className="card" open={U.length === 0}>
          <summary>Add a unit</summary>
          <form action={addUnit}>
            <label className="l">Property
              <select className="field" name="property_id" required>
                {P.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <div className="grid2">
              <label className="l">Unit label<input className="field" name="label" placeholder="A1" required maxLength={20} /></label>
              <label className="l">Monthly rent (KSh)<input className="field" name="rent" inputMode="decimal" placeholder="15,000" required /></label>
            </div>
            <div style={{ marginTop: 12 }}><Submit>Add unit</Submit></div>
          </form>
        </details>
      )}
      <details className="card" open={P.length === 0}>
        <summary>Add a property</summary>
        <form action={addProperty}>
          <label className="l">Name<input className="field" name="name" placeholder="Riverside Court" required maxLength={120} /></label>
          <label className="l">Location (optional)<input className="field" name="location" placeholder="Kilimani, Nairobi" /></label>
          <div style={{ marginTop: 12 }}><Submit>Add property</Submit></div>
        </form>
      </details>
    </>
  );
}
