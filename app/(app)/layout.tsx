import Link from "next/link";
import { Nav } from "@/components/nav";
import { getContext } from "@/lib/context";
import { exitAccount } from "@/app/admin/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, org, isAdmin, acting } = await getContext();
  const { count } = await supabase.from("payments").select("id", { count: "exact", head: true })
    .eq("org_id", org.id).eq("status", "unmatched");
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className="shell">
      {acting && (
        <form action={exitAccount} className="actbar">
          <input type="hidden" name="org_id" value={org.id} />
          <span>Super admin · working inside <b>{org.name}</b> — changes are saved for them and logged</span>
          <button type="submit">Exit</button>
        </form>
      )}
      <header className="hd">
        <div><div className="org">{org.name}</div><h1>NyumbaPay</h1></div>
        <div className="sp" />
        {isAdmin && !acting && <Link href="/admin" className="btn btn-g btn-sm">Admin</Link>}
        <div className="avatar" title={user.email ?? ""}>{initials}</div>
      </header>
      <main>{children}</main>
      <Nav unmatched={count ?? 0} />
    </div>
  );
}
