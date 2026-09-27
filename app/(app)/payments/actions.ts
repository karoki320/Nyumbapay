"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/context";
import { done, fail, friendly } from "@/lib/flash";

export async function assign(fd: FormData) {
  const { supabase } = await getContext();
  const lease = z.uuid().safeParse(fd.get("lease_id"));
  if (!lease.success) fail("/payments", "Choose the unit this payment belongs to");
  const { data, error } = await supabase.rpc("assign_payment", {
    p_payment: z.uuid().parse(fd.get("payment_id")), p_lease: lease.data,
  });
  if (error) fail("/payments", friendly(error));
  revalidatePath("/", "layout");
  done("/payments", `Assigned · receipt ${data}`);
}

export async function reverse(fd: FormData) {
  const { supabase } = await getContext();
  const reason = String(fd.get("reason") ?? "").trim();
  if (reason.length < 3) fail("/payments", "Give a reason for the reversal");
  const { error } = await supabase.rpc("reverse_payment", { p_payment: z.uuid().parse(fd.get("payment_id")), p_reason: reason });
  if (error) fail("/payments", friendly(error));
  revalidatePath("/", "layout");
  done("/payments", "Payment reversed");
}
