import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Submit } from "@/components/submit";
import { createClient } from "@/lib/supabase/server";
import { getIsAdmin } from "@/lib/context";
import { createOrg } from "./actions";

export const metadata = { title: "Set up" };

export default async function Onboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("memberships").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  if (count) redirect("/dashboard");
  if (await getIsAdmin()) redirect("/admin");

  return (
    <div className="auth">
      <Logo />
      <h2 style={{ fontSize: 22 }}>Set up your business</h2>
      <p className="sub" style={{ marginTop: 4 }}>You can change the name later. The prefix is permanent.</p>
      <form action={createOrg} style={{ marginTop: 16 }}>
        <label className="l">Business or landlord name
          <input className="field" name="name" placeholder="Karoki Properties" required maxLength={120} />
        </label>
        <label className="l">Account prefix
          <input className="field" name="prefix" placeholder="KAR" required pattern="[A-Za-z]{2,6}" maxLength={6}
            style={{ textTransform: "uppercase" }} />
        </label>
        <p className="sub" style={{ marginTop: 6 }}>
          Tenants pay with account numbers like <b>KAR-A1</b>. Payments are matched to units automatically.
        </p>
        <div style={{ marginTop: 16 }}><Submit>Continue</Submit></div>
      </form>
    </div>
  );
}
