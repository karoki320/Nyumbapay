import { createClient } from "@/lib/supabase/server";
import { Feed, type Activity } from "../shared";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_activity", { p_org: null, p_limit: 300 });
  const items = (data ?? []) as Activity[];
  return (
    <>
      <div className="ad-h"><div><h1>Activity</h1><p>The latest {items.length} actions across all landlord accounts. Blue dots are super admin actions.</p></div></div>
      <div className="panel2"><Feed items={items} /></div>
    </>
  );
}
