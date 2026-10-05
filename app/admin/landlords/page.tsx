import Link from "next/link";
import { Submit } from "@/components/submit";
import { createClient } from "@/lib/supabase/server";
import { ksh } from "@/lib/money";
import { ago } from "@/lib/activity";
import { createLandlord } from "../actions";
import { PaybillTag, type AdminOrg } from "../shared";

export const dynamic = "force-dynamic";

export default async function Landlords({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_orgs", { p_search: q || null });
  const list = (data ?? []) as AdminOrg[];

  return (
    <>
      <div className="ad-h">
        <div><h1>Landlords</h1><p>{list.length} account{list.length === 1 ? "" : "s"}{q ? ` matching “${q}”` : ""}</p></div>
        <form className="search">
          <input name="q" defaultValue={q} placeholder="Search name, prefix, paybill or email" />
          <button className="btn btn-g">Search</button>
        </form>
      </div>

      <div className="panel2">
        <table className="tbl">
          <thead><tr>
            <th>Business</th><th className="hide-m">Owners</th><th className="hide-m">Paybill</th>
            <th className="num">Units</th><th className="num">Collected (month)</th><th className="num hide-m">Arrears</th><th className="num hide-m">Last active</th>
          </tr></thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id}>
                <td><Link href={`/admin/landlords/${x.id}`} style={{ fontWeight: 700 }}>{x.name}</Link>
                  <div className="s">{x.account_prefix} · joined {ago(x.created_at)}{x.unmatched ? <> · <span className="tag wait">{x.unmatched} unmatched</span></> : null}</div></td>
                <td className="hide-m s">{x.owners ?? <span className="tag wait">Invite pending</span>}</td>
                <td className="hide-m"><PaybillTag o={x} /></td>
                <td className="num">{x.occupied}/{x.units}</td>
                <td className="num">{ksh(x.collected_month)}</td>
                <td className="num hide-m" style={{ color: x.arrears ? "var(--red)" : undefined }}>{ksh(x.arrears)}</td>
                <td className="num hide-m s">{x.last_activity ? ago(x.last_activity) : "—"}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="empty">No landlord accounts found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel2" id="new" style={{ marginTop: 22, maxWidth: 760 }}>
        <h2>Set up an account for a landlord</h2>
        <form action={createLandlord} style={{ padding: "6px 18px 18px" }}>
          <p className="sub" style={{ marginTop: 8 }}>For landlords who need a hand: create their account, set up their units on their behalf, and they accept the invitation when ready.</p>
          <div className="split">
            <label className="l">Business name<input className="field" name="name" required placeholder="Mama Njeri Homes" /></label>
            <label className="l">Account prefix<input className="field" name="prefix" required pattern="[A-Za-z]{2,6}" maxLength={6} placeholder="MNH" style={{ textTransform: "uppercase" }} /></label>
            <label className="l">Landlord’s email<input className="field" name="email" type="email" required placeholder="landlord@gmail.com" /></label>
          </div>
          <div style={{ marginTop: 14 }}><Submit className="btn btn-p">Create account & invite</Submit></div>
        </form>
      </div>
    </>
  );
}
