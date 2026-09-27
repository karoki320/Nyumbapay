import { Submit } from "@/components/submit";
import { canManage, getContext } from "@/lib/context";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const { supabase, org, role, user } = await getContext();
  const { data: members } = await supabase.from("memberships").select("user_id, role").eq("org_id", org.id);
  const manage = canManage(role);

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
        <div className="kv"><span>Your role</span><b style={{ textTransform: "capitalize" }}>{role}</b></div>
        <div className="kv"><span>Team members</span><b>{members?.length ?? 1}</b></div>
      </div>

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
