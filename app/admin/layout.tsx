import { redirect } from "next/navigation";
import { AdminNav } from "./nav";
import { getIsAdmin } from "@/lib/context";
import { createClient } from "@/lib/supabase/server";
import "./admin.css";

export const metadata = { title: "Super admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await getIsAdmin())) redirect("/dashboard");
  return (
    <div className="ad">
      <aside className="ad-side">
        <div className="ad-brand">
          <i><svg width="20" height="20" viewBox="0 0 64 64"><path d="M14 34 32 18l18 16v14a2 2 0 0 1-2 2H36V38h-8v12H16a2 2 0 0 1-2-2z" fill="#0f5132" /></svg></i>
          <div>NyumbaPay<small>Super admin</small></div>
        </div>
        <AdminNav />
        <div className="sp" />
        <div className="me">{user.email}</div>
        <form action="/auth/signout" method="post"><button className="btn btn-g btn-sm" style={{ margin: "0 12px", background: "transparent", color: "#cfe6d8", borderColor: "rgba(255,255,255,.2)" }}>Sign out</button></form>
      </aside>
      <main className="ad-main">{children}</main>
    </div>
  );
}
