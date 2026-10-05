import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/mpesa";
import { sendReminder, type DueReminder } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Runs daily at 09:00 Nairobi (vercel.json). Reminds every tenant who still owes, in each business
// whose reminder day is today. At most one reminder per tenant per day.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const db = createAdminClient();
  const { data, error } = await db.rpc("reminders_due_all");
  if (error) {
    console.error("reminders query failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const due = (data ?? []) as DueReminder[];
  const tally = { sent: 0, failed: 0, skipped: 0 };
  for (const r of due) {
    const res = await sendReminder({ ...r, balance: Number(r.balance) });
    tally[res.status]++;
    const { error: le } = await db.rpc("_log_reminder", {
      p_lease: r.lease_id, p_kind: "auto", p_channel: res.channel, p_to: r.phone, p_amount: Number(r.balance),
      p_status: res.status, p_error: res.error ?? null, p_provider_id: res.providerId ?? null, p_actor: null,
    });
    if (le) console.error("reminder log failed", r.lease_id, le);
  }
  return NextResponse.json({ ok: true, due: due.length, ...tally });
}
