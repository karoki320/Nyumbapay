import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ksh, periodLabel, periodOf } from "@/lib/money";
import { ago } from "@/lib/activity";
import { Feed, PaybillTag, type Activity, type AdminOrg } from "./shared";

export const dynamic = "force-dynamic";

type Overview = Record<string, number>;

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ data: ov }, { data: orgs }, { data: act }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_orgs", { p_search: null }),
    supabase.rpc("admin_activity", { p_org: null, p_limit: 25 }),
  ]);
  const o = (ov ?? {}) as Overview;
  const list = (orgs ?? []) as AdminOrg[];
  const n = (k: string) => Number(o[k] ?? 0).toLocaleString("en-KE");
  const attention = Number(o.unmatched ?? 0) + Number(o.paybills_pending ?? 0) + Number(o.unrouted ?? 0);

  return (
    <>
      <div className="ad-h">
        <div><h1>Overview</h1><p>Everything happening on NyumbaPay · {periodLabel(periodOf())}</p></div>
        <Link className="btn btn-p" href="/admin/landlords#new">+ New landlord account</Link>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="k">Landlord accounts</div><div className="v">{n("landlords")}</div><div className="d">+{n("landlords_7d")} in the last 7 days</div></div>
        <div className="kpi"><div className="k">Users</div><div className="v">{n("users")}</div><div className="d">+{n("users_7d")} in the last 7 days</div></div>
        <div className="kpi"><div className="k">Units</div><div className="v">{n("units")}</div><div className="d">{n("occupied")} occupied · {n("properties")} properties</div></div>
        <div className="kpi"><div className="k">Tenants</div><div className="v">{n("tenants")}</div><div className="d">with an active lease</div></div>
        <div className="kpi good"><div className="k">Collected this month</div><div className="v">{ksh(o.collected_month ?? 0)}</div><div className="d">{n("payments_month")} payments</div></div>
        <div className="kpi"><div className="k">Invoiced this month</div><div className="v">{ksh(o.invoiced_month ?? 0)}</div><div className="d">across all landlords</div></div>
        <div className="kpi"><div className="k">Collected all-time</div><div className="v">{ksh(o.collected_all ?? 0)}</div><div className="d">through NyumbaPay</div></div>
        <div className={`kpi ${attention ? "warn" : ""}`}><div className="k">Needs attention</div><div className="v">{attention}</div>
          <div className="d">{n("paybills_pending")} paybills to verify · {n("unmatched")} unmatched · {n("unrouted")} unrouted</div></div>
      </div>

      <div className="cols">
        <div className="panel2">
          <h2>Newest landlords <Link href="/admin/landlords">All {list.length} →</Link></h2>
          <table className="tbl">
            <thead><tr><th>Business</th><th className="hide-m">Paybill</th><th className="num">Units</th><th className="num hide-m">Joined</th></tr></thead>
            <tbody>
              {list.slice(0, 8).map((x) => (
                <tr key={x.id}>
                  <td><Link href={`/admin/landlords/${x.id}`} style={{ fontWeight: 700 }}>{x.name}</Link><div className="sub s">{x.owners ?? "Awaiting owner"}</div></td>
                  <td className="hide-m"><PaybillTag o={x} /></td>
                  <td className="num">{x.occupied}/{x.units}</td>
                  <td className="num hide-m s">{ago(x.created_at)}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={4} className="empty">No landlords yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel2">
          <h2>Live activity <Link href="/admin/activity">See all →</Link></h2>
          <Feed items={(act ?? []) as Activity[]} />
        </div>
      </div>
    </>
  );
}
