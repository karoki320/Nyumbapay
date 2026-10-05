"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext, ORG_COOKIE } from "@/lib/context";
import { done, fail, friendly } from "@/lib/flash";
import { coOwnerInviteEmail, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

const S = z.object({
  name: z.string().trim().min(2, "Enter a business name").max(120),
  paybill: z.string().trim().regex(/^(\d{5,7})?$/, "Paybill must be 5–7 digits"),
  due_day: z.coerce.number().int().min(1).max(28),
});

export async function saveSettings(fd: FormData) {
  const { supabase, org } = await getContext();
  const p = S.safeParse({ name: fd.get("name"), paybill: fd.get("paybill"), due_day: fd.get("due_day") });
  if (!p.success) fail("/settings", p.error.issues[0].message);
  const { error } = await supabase.rpc("update_org_settings", {
    p_org: org.id, p_name: p.data.name, p_paybill: p.data.paybill, p_due_day: p.data.due_day,
  });
  if (error) fail("/settings", friendly(error));
  revalidatePath("/", "layout");
  done("/settings", "Settings saved");
}

const msg = (e: { message?: string } | null) => {
  const m = e?.message ?? "";
  if (/already has access|valid email|at least one owner|not allowed|not found/.test(m)) return m.charAt(0).toUpperCase() + m.slice(1);
  return friendly(e);
};

export async function inviteCoOwner(fd: FormData) {
  const { supabase, org, user } = await getContext();
  const email = z.email().safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (!email.success) fail("/settings", "Enter a valid email address");
  const { data, error } = await supabase.rpc("invite_member", { p_org: org.id, p_email: email.data });
  if (error) fail("/settings", msg(error));
  const row = Array.isArray(data) ? data[0] : data;
  const link = `${SITE.url}/invite/${row.token}`;
  const sent = await sendEmail(email.data, `You’re invited to co-own ${org.name} on NyumbaPay`,
    coOwnerInviteEmail({ orgName: org.name, inviter: user.email ?? "A NyumbaPay owner", link, site: SITE.url }));
  revalidatePath("/settings");
  done("/settings", sent ? `Invitation emailed to ${email.data}` : `Invitation ready — share the link with ${email.data}`);
}

export async function cancelInvite(fd: FormData) {
  const { supabase } = await getContext();
  const { error } = await supabase.rpc("revoke_invite", { p_invite: z.uuid().parse(fd.get("invite_id")) });
  if (error) fail("/settings", msg(error));
  revalidatePath("/settings");
  done("/settings", "Invitation cancelled");
}

export async function removeMember(fd: FormData) {
  const { supabase, org, user } = await getContext();
  const target = z.uuid().parse(fd.get("user_id"));
  const { error } = await supabase.rpc("remove_member", { p_org: org.id, p_user: target });
  if (error) fail("/settings", msg(error));
  if (target === user.id) {
    (await cookies()).delete(ORG_COOKIE);
    redirect("/dashboard?ok=" + encodeURIComponent(`You left ${org.name}`));
  }
  revalidatePath("/settings");
  done("/settings", "Co-owner removed");
}

export async function switchOrg(fd: FormData) {
  const { orgs } = await getContext();
  const id = z.uuid().parse(fd.get("org_id"));
  const target = orgs.find((o) => o.id === id);
  if (!target) fail("/settings", "Business not found");
  (await cookies()).set(ORG_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  redirect("/dashboard?ok=" + encodeURIComponent(`Switched to ${target.name}`));
}
