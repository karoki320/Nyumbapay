import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Org = {
  id: string; name: string; account_prefix: string; paybill: string | null;
  paybill_verified: boolean; rent_due_day: number;
  reminders_enabled: boolean; reminder_day: number;
};
export type Role = "owner" | "admin" | "staff";

export const ORG_COOKIE = "np_org";             // which business a multi-business user is viewing
export const ADMIN_ORG_COOKIE = "np_admin_org"; // which business a super admin is acting inside
const ORG_COLS = "id, name, account_prefix, paybill, paybill_verified, rent_due_day, reminders_enabled, reminder_day";

/** Is the signed-in user a NyumbaPay super admin? */
export const getIsAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
});

/** Signed-in user + the business they're working in. Redirects if either is missing. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const jar = await cookies();
  const isAdmin = await getIsAdmin();

  // super admin acting on a landlord's behalf
  const actingId = isAdmin ? jar.get(ADMIN_ORG_COOKIE)?.value : undefined;
  if (actingId) {
    const { data: org } = await supabase.from("organizations").select(ORG_COLS).eq("id", actingId).maybeSingle();
    if (org) return { supabase, user, org: org as Org, role: "owner" as Role, isAdmin, acting: true, orgs: [] as Org[] };
  }

  const { data: ms } = await supabase
    .from("memberships")
    .select(`role, created_at, organizations(${ORG_COLS})`)
    .eq("user_id", user.id)
    .order("created_at");
  const list = (ms ?? [])
    .map((m) => ({ role: m.role as Role, org: m.organizations as unknown as Org }))
    .filter((m) => m.org);
  if (!list.length) redirect(isAdmin ? "/admin" : "/onboarding");
  const chosen = list.find((m) => m.org.id === jar.get(ORG_COOKIE)?.value) ?? list[0];
  return { supabase, user, org: chosen.org, role: chosen.role, isAdmin, acting: false, orgs: list.map((m) => m.org) };
});

export const canManage = (role: Role) => role === "owner" || role === "admin";

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(v: FormDataEntryValue | string | null | undefined, fallback = "/dashboard") {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}
