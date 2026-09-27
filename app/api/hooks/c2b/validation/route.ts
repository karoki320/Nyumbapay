import { NextResponse } from "next/server";
import { ACCEPT, authorised } from "@/lib/mpesa";

// We accept every payment: a wrongly-typed account is parked for assignment, never bounced.
export async function POST(req: Request) {
  if (process.env.MPESA_ENABLED !== "true" || !authorised(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(ACCEPT);
}
