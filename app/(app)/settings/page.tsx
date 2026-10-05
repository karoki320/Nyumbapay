import { CopyButton } from "@/components/copy-button";
import { Submit } from "@/components/submit";
import { canManage, getContext } from "@/lib/context";
import { SITE } from "@/lib/site";
import { cancelInvite, inviteCoOwner, removeMember, saveSettings, switchOrg } from "./actions";

export const metadata = { title: "Settings" };

type Member = { user_id: string; email: string; role: string; joined_at: string; is_you: boolean };
type Invite = { id: string; email: string; token: string; expires_at: string };

const day = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function Settings() {
  const { supabase, org, role, user, orgs, acting } = await getContext();
  const [{ data: m }, { data: inv }] = await Promise.all([
    supabase.rpc("org_members", { p_org: org.id }),
    supabase.from("org_invites").select("id, email, token, expires_at").eq("org_id", org.id)
      .is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at"),
  ]);
  const members = (m ?? []) as Member[];
  const invites = (inv ?? []) as Invite[];
  const manage = canManage(role);
  const isOwner = role === "owner";
  const owners = members.filter((x) => x.role === "owner").length;

  return (
    <>
      <div className="sect">Business</div>
      <form className="card" action={saveSettings}>
        <fieldset disabled={!manage} style={{ border: 0, padding: 0, margin: 0 }}>
          <label className="l">Business name<input className="field" name="name" defaultValue={org.name} required /></label>
          <div className="grid2">
            <label className="l">M-Pesa paybill<input className="field" name="paybill" inputMode="numeric" defaultValue={org.paybill ?? ""} placeholder="e.g. 600000" /></label>
            <label className="l">Rent due day<input className="field" name="due_day" type="number" min={1} max={28} defaultValue={org.rent_due_day} required /></label>
          </div>
          {org.paybill && (
            <div className={`acct ${org.paybill_verified ? "ok" : "warn"}`}>
              {org.paybill_verified
                ? <>Paybill <b>{org.paybill}</b> is connected — M-Pesa payments reconcile automatically.</>
                : <>Paybill <b>{org.paybill}</b> is awaiting verification. Payments will start flowing in once we confirm you own it.</>}
            </div>
          )}
          {manage && <div style={{ marginTop: 12 }}><Submit>Save</Submit></div>}
        </fieldset>
      </form>

      <div className="card">
        <div className="kv"><span>Account prefix</span><b>{org.account_prefix}</b></div>
        <div className="kv"><span>Example account</span><b>{org.account_prefix}-A1</b></div>
        <div className="kv"><span>Your role</span><b style={{ textTransform: "capitalize" }}>{acting ? "Super admin" : role}</b></div>
      </div>

      <div className="sect" id="co-owners">Co-owners <span className="r">{members.length}</span></div>
      {members.map((x) => (
        <div key={x.user_id} className="card">
          <div className="row">
            <div>
              <div className="t">{x.email}{x.is_you && <span className="pill p-paid" style={{ marginLeft: 6 }}>You</span>}</div>
              <div className="s">Owner · since {day(x.joined_at)}</div>
            </div>
            {(isOwner && (!x.is_you || owners > 1)) && (
              <form action={removeMember}>
                <input type="hidden" name="user_id" value={x.user_id} />
                <Submit className="btn btn-d btn-sm" confirm={x.is_you ? `Leave ${org.name}? You'll lose access to it.` : `Remove ${x.email}? They will lose access to ${org.name}.`}>
                  {x.is_you ? "Leave" : "Remove"}
                </Submit>
              </form>
            )}
          </div>
        </div>
      ))}
      {invites.map((i) => {
        const link = `${SITE.url}/invite/${i.token}`;
        const wa = `https://wa.me/?text=${encodeURIComponent(`I've added you as a co-owner of ${org.name} on NyumbaPay. Accept here (sign in with ${i.email}): ${link}`)}`;
        return (
          <div key={i.id} className="card" style={{ borderStyle: "dashed" }}>
            <div className="row">
              <div><div className="t">{i.email}</div><div className="s">Invited · expires {day(i.expires_at)}</div></div>
              <span className="pill p-partial">pending</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <CopyButton text={link} />
              <a className="btn btn-g btn-sm" href={wa} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
              {isOwner && (
                <form action={cancelInvite}>
                  <input type="hidden" name="invite_id" value={i.id} />
                  <Submit className="btn btn-d btn-sm" confirm={`Cancel the invitation for ${i.email}?`}>Cancel</Submit>
                </form>
              )}
            </div>
          </div>
        );
      })}
      {isOwner && (
        <details className="card" open={members.length < 2 && invites.length === 0}>
          <summary>Add a co-owner</summary>
          <p className="sub">Co-owners get full access — the same rights as you — to this business’s properties, tenants and payments.</p>
          <form action={inviteCoOwner}>
            <label className="l">Their email address<input className="field" name="email" type="email" required placeholder="partner@example.com" /></label>
            <div style={{ marginTop: 12 }}><Submit>Send invitation</Submit></div>
          </form>
        </details>
      )}

      {orgs.length > 1 && (
        <>
          <div className="sect">Your businesses</div>
          {orgs.map((o) => (
            <form key={o.id} action={switchOrg} className="card">
              <input type="hidden" name="org_id" value={o.id} />
              <div className="row" style={{ alignItems: "center" }}>
                <div><div className="t">{o.name}</div><div className="s">Accounts {o.account_prefix}-…</div></div>
                {o.id === org.id ? <span className="pill p-paid">Viewing</span> : <Submit className="btn btn-g btn-sm">Switch</Submit>}
              </div>
            </form>
          ))}
        </>
      )}

      <div className="sect">Account</div>
      <div className="card">
        <div className="kv"><span>Signed in as</span><b>{user.email}</b></div>
      </div>
      <form action="/auth/signout" method="post" style={{ marginTop: 8 }}>
        <button className="btn btn-g" type="submit">Sign out</button>
      </form>
    </>
  );
}
