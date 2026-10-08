"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/context";
import { done, fail, friendly } from "@/lib/flash";
import { ksh, parseKsh } from "@/lib/money";

const BACK = "/dashboard";

/** One-tap payment from the Home tenant list (amount only, dated today). */
export async function quickPayment(fd: FormData) {
  const { supabase } = await getContext();
  const lease = z.uuid().safeParse(fd.get("lease_id"));
  if (!lease.success) fail(BACK, "Choose a tenant");
  const amount = parseKsh(fd.get("amount"));
  if (!amount) fail(BACK, "Enter the amount received");
  const { data, error } = await supabase.rpc("record_cash_payment", {
    p_lease: lease.data, p_amount: amount, p_ref: null, p_source: "cash", p_received_at: null,
  });
  if (error) fail(BACK, friendly(error));
  const r = Array.isArray(data) ? data[0] : data;
  revalidatePath(BACK);
  const name = String(fd.get("tenant") ?? "").trim();
  done(BACK, `${ksh(amount)} recorded${name ? ` for ${name}` : ""} · receipt ${r?.receipt_no}`);
}
