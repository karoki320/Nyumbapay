import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Submit } from "@/components/submit";
import { createClient } from "@/lib/supabase/server";
import { ksh } from "@/lib/money";
import { ago } from "@/lib/activity";
import { SITE } from "@/lib/site";
import { openAccount, setPaybillVerified } from "../../actions";
import { Feed, PaybillTag, type Activity, type AdminOrg } from "../../shared";

export const dynamic = "force-dynamic";
type Member = { user_id: string; email: string; role: string; joined_at: string };
type Invite = { id: string; email: string; token: string; expires_at: string };

export default async function Landlord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: orgs }, { data: m }, { data: inv }, { data: act }] = await Promise.all([
    supabase.rpc("admin_orgs", { p_search: null }),
    supabase.rpc("org_members", { p_org: id }),
    supabase.from("org_invites").select("id, email, token, expires_at").eq("org_id", id)
      .is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()),
    supabase.rpc("admin_activity", { p_org: id, p_limit: 60 }),
  ]);
  const o = ((orgs ?? []) as AdminOrg[]).find((x) => x.id === id);
  if (!o) notFound();
  const members = (m ?? []) as Member[];
  const invites = (inv ?? []) as Invite[];

  return (
    <>
      <p className="sub" style={{ marginBottom: 8 }}><Link href="/admin/landlords" style={{ color: "var(--brand)" }}>‹ Landlords</Link></p>
      <div className="ad-h">
        <div><h1>{o.name}</h1><p>Account prefix {o.account_prefix} · joined {ago(o.created_at)} · last active {o.last_activity ? ago(o.last_activity) : "—"}</p></div>
        <form action={openAccount}>
          <input type="hidden" name="org_id" value={o.id} />
          <Submit className="btn btn-p">Open account & manage →</Submit>
        </form>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="k">Units</div><div className="v">{o.units}</div><div className="d">{o.occupied} occupied</div></div>
        <div className="kpi good"><div className="k">Collected this month</div><div className="v">{ksh(o.collected_month)}</div></div>
        <div className={`kpi ${o.arrears ? "warn" : ""}`}><div className="k">Arrears</div><div className="v">{ksh(o.arrears)}</div></div>
        <div className={`kpi ${o.unmatched ? "warn" : ""}`}><div className="k">Unmatched payments</div><div className="v">{o.unmatched}</div></div>
      </div>

      <div className="cols">
        <div style={{ display: "grid", gap: 18 }}>
          <div className="panel2">
            <h2>M-Pesa paybill <PaybillTag o={o} /></h2>
            <div style={{ padding: "14px 18px" }}>
              {!o.paybill ? <p className="sub">The landlord hasn’t added a paybill yet. You can add it for them under Settings after opening the account.</p> : (
                <>
                  <p className="sub" style={{ marginBottom: 12 }}>
                    {o.paybill_verified
                      ? "Verified — M-Pesa callbacks for this paybill are routed to this account."
                      : "Confirm this landlord owns the paybill (e.g. Safaricom statement or business letter) before verifying. Payments that arrived early will be processed."}
                  </p>
                  <form action={setPaybillVerified}>
                    <input type="hidden" name="org_id" value={o.id} />
                    <input type="hidden" name="verified" value={o.paybill_verified ? "false" : "true"} />
                    <Submit className={o.paybill_verified ? "btn btn-d" : "btn btn-p"}
                      confirm={o.paybill_verified ? `Un-verify paybill ${o.paybill}? M-Pesa payments will stop routing to ${o.name}.` : `Verify paybill ${o.paybill} for ${o.name}?`}>
                      {o.paybill_verified ? "Un-verify paybill" : `Verify paybill ${o.paybill}`}
                    </Submit>
                  </form>
                </>
              )}
            </div>
          </div>

          <div className="panel2">
            <h2>Owners</h2>
            <table className="tbl"><tbody>
              {members.map((x) => <tr key={x.user_id}><td><b>{x.email}</b><div className="s">Owner since {ago(x.joined_at)}</div></td></tr>)}
              {invites.map((i) => {
                const link = `${SITE.url}/invite/${i.token}`;
                return (
                  <tr key={i.id}><td>
                    <b>{i.email}</b> <span className="tag wait">invitation pending</span>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <CopyButton text={link} label="Copy invite link" />
                      <a className="btn btn-g btn-sm" target="_blank" rel="noopener noreferrer"
                        href={`https://wa.me/?text=${encodeURIComponent(`Your NyumbaPay account for ${o.name} is ready. Accept here (sign in with ${i.email}): ${link}`)}`}>Share on WhatsApp</a>
                    </div>
                  </td></tr>
                );
              })}
              {!members.length && !invites.length && <tr><td className="empty">No owners.</td></tr>}
            </tbody></table>
          </div>
        </div>

        <div className="panel2">
          <h2>Activity</h2>
          <Feed items={(act ?? []) as Activity[]} showOrg={false} />
        </div>
      </div>
    </>
  );
}
