import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

// Runs daily (vercel.json). Idempotent: raises this month's invoice for any active lease missing one
// and applies tenant credit.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("generate_invoices_all", {});
  if (error) {
    console.error("invoice cron failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, created: data });
}
