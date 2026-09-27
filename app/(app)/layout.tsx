import { Nav } from "@/components/nav";
import { getContext } from "@/lib/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, org } = await getContext();
  const { count } = await supabase.from("payments").select("id", { count: "exact", head: true })
    .eq("org_id", org.id).eq("status", "unmatched");
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className="shell">
      <header className="hd">
        <div><div className="org">{org.name}</div><h1>NyumbaPay</h1></div>
        <div className="sp" />
        <div className="avatar" title={user.email ?? ""}>{initials}</div>
      </header>
      <main>{children}</main>
      <Nav unmatched={count ?? 0} />
    </div>
  );
}
