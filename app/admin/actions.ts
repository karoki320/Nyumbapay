"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_ORG_COOKIE, getIsAdmin } from "@/lib/context";
import { done, fail, friendly } from "@/lib/flash";
import { coOwnerInviteEmail, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

async function requireAdmin() {
  if (!(await getIsAdmin())) redirect("/dashboard");
  return createClient();
}
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 };

/** Enter a landlord's account with full rights. */
export async function openAccount(fd: FormData) {
  const supabase = await requireAdmin();
  const id = z.uuid().parse(fd.get("org_id"));
  const { error } = await supabase.rpc("admin_log_open", { p_org: id });
  if (error) fail(`/admin/landlords/${id}`, friendly(error));
  (await cookies()).set(ADMIN_ORG_COOKIE, id, cookieOpts);
  redirect("/dashboard");
}

export async function exitAccount(fd: FormData) {
  (await cookies()).delete(ADMIN_ORG_COOKIE);
  const id = z.uuid().safeParse(fd.get("org_id"));
  redirect(id.success ? `/admin/landlords/${id.data}` : "/admin");
}

export async function setPaybillVerified(fd: FormData) {
  const supabase = await requireAdmin();
  const id = z.uuid().parse(fd.get("org_id"));
  const verified = fd.get("verified") === "true";
  const back = `/admin/landlords/${id}`;
  const { data, error } = await supabase.rpc("admin_set_paybill_verified", { p_org: id, p_verified: verified });
  if (error) fail(back, error.message?.includes("no paybill") ? "This landlord hasn’t added a paybill yet" : friendly(error));
  revalidatePath("/admin", "layout");
  done(back, verified ? `Paybill verified${data ? ` · ${data} held payment(s) processed` : ""}` : "Paybill set back to unverified");
}

const NewOrg = z.object({
  name: z.string().trim().min(2, "Enter the business name").max(120),
  prefix: z.string().trim().toUpperCase().regex(/^[A-Z]{2,6}$/, "Prefix must be 2–6 letters"),
  email: z.email("Enter the landlord’s email"),
});

/** Create an account for a landlord, then invite them as its owner. */
export async function createLandlord(fd: FormData) {
  const supabase = await requireAdmin();
  const p = NewOrg.safeParse({ name: fd.get("name"), prefix: fd.get("prefix"), email: String(fd.get("email") ?? "").trim().toLowerCase() });
  if (!p.success) fail("/admin/landlords", p.error.issues[0].message);
  const { data, error } = await supabase.rpc("admin_create_org", { p_name: p.data.name, p_prefix: p.data.prefix, p_owner_email: p.data.email });
  if (error) fail("/admin/landlords", error.code === "23505" ? "That account prefix is taken — try another" : friendly(error));
  const row = Array.isArray(data) ? data[0] : data;
  const link = `${SITE.url}/invite/${row.token}`;
  const sent = await sendEmail(p.data.email, `Your NyumbaPay account for ${p.data.name} is ready`,
    coOwnerInviteEmail({ orgName: p.data.name, inviter: "The NyumbaPay team", link, site: SITE.url }));
  revalidatePath("/admin", "layout");
  done(`/admin/landlords/${row.org_id}`, sent ? `Account created · invitation emailed to ${p.data.email}` : "Account created · share the invitation link below");
}
