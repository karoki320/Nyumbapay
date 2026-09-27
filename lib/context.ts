import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Org = {
  id: string; name: string; account_prefix: string; paybill: string | null;
  paybill_verified: boolean; rent_due_day: number;
};
export type Role = "owner" | "admin" | "staff";

/** Signed-in user + their organisation. Redirects if either is missing. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, account_prefix, paybill, paybill_verified, rent_due_day)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const org = (m?.organizations ?? null) as unknown as Org | null;
  if (!m || !org) redirect("/onboarding");
  return { supabase, user, org, role: m.role as Role };
});

export const canManage = (role: Role) => role === "owner" || role === "admin";
