import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_ORG_COOKIE, ORG_COOKIE, safeNext } from "@/lib/context";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  let next = "";
  try { next = safeNext((await req.formData()).get("next"), ""); } catch { /* no body */ }
  const res = NextResponse.redirect(new URL(next ? `/login?next=${encodeURIComponent(next)}` : "/login", req.url), { status: 303 });
  res.cookies.delete(ORG_COOKIE);
  res.cookies.delete(ADMIN_ORG_COOKIE);
  return res;
}
