"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fail, friendly } from "@/lib/flash";

const Org = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(120),
  prefix: z.string().trim().toUpperCase().regex(/^[A-Z]{2,6}$/, "Account prefix must be 2–6 letters, e.g. KAR"),
});

export async function createOrg(fd: FormData) {
  const p = Org.safeParse({ name: fd.get("name"), prefix: fd.get("prefix") });
  if (!p.success) fail("/onboarding", p.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { p_name: p.data.name, p_prefix: p.data.prefix });
  if (error) fail("/onboarding", error.code === "23505" ? "That account prefix is taken — try another" : friendly(error));
  redirect("/units?ok=Welcome!+Add+your+first+property");
}
