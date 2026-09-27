"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/context";
import { done, fail, friendly } from "@/lib/flash";
import { periodLabel } from "@/lib/money";

export async function generate(fd: FormData) {
  const { supabase, org } = await getContext();
  const period = z.iso.date().parse(fd.get("period"));
  const back = `/invoices?period=${period.slice(0, 7)}`;
  const { data, error } = await supabase.rpc("generate_invoices", { p_org: org.id, p_period: period });
  if (error) fail(back, friendly(error));
  revalidatePath("/invoices");
  done(back, data ? `${data} invoice${data === 1 ? "" : "s"} raised for ${periodLabel(period)}` : "All invoices for this month already exist");
}

export async function voidInvoice(fd: FormData) {
  const { supabase } = await getContext();
  const back = String(fd.get("back") ?? "/invoices");
  const { error } = await supabase.rpc("void_invoice", { p_invoice: z.uuid().parse(fd.get("invoice_id")) });
  if (error) fail(back, friendly(error));
  revalidatePath("/invoices");
  done(back, "Invoice voided — any money on it is back as credit");
}
