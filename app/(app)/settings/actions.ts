"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/context";
import { done, fail, friendly } from "@/lib/flash";

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
