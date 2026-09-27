import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCEPT, amountToCents, authorised, payerName, transTime, type C2BPayload } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.MPESA_ENABLED !== "true" || !authorised(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: C2BPayload;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const db = createAdminClient();
  const amount = amountToCents(body.TransAmount);
  const shortcode = String(body.BusinessShortCode ?? "");
  if (!body.TransID || !amount) {
    await db.from("mpesa_events").insert({ kind: "c2b.confirmation", shortcode, trans_id: body.TransID ?? null,
      payload: body, error: "missing TransID or amount" });
    return NextResponse.json(ACCEPT);
  }

  const { data, error } = await db.rpc("ingest_mpesa_c2b", {
    p_shortcode: shortcode,
    p_trans_id: String(body.TransID),
    p_amount: amount,
    p_bill_ref: String(body.BillRefNumber ?? ""),
    p_msisdn: String(body.MSISDN ?? ""),
    p_payer_name: payerName(body),
    p_trans_time: transTime(body.TransTime),
    p_raw: body,
  });

  if (error) {
    console.error("mpesa ingest failed", body.TransID, error);
    await db.from("mpesa_events").insert({ kind: "c2b.confirmation", shortcode, trans_id: String(body.TransID),
      payload: body, error: error.message });
    // 500 so the failure is visible in Daraja logs; the raw event is kept for replay.
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Temporary error" }, { status: 500 });
  }
  const r = Array.isArray(data) ? data[0] : data;
  if (r?.payment_id) {
    await db.from("mpesa_events").insert({ kind: "c2b.confirmation", shortcode, trans_id: String(body.TransID),
      payment_id: r.payment_id, payload: body, error: r.duplicate ? "duplicate" : null });
  }
  return NextResponse.json(ACCEPT);
}
