"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ORG_COOKIE } from "@/lib/context";
import { fail } from "@/lib/flash";

export async function acceptInvite(fd: FormData) {
  const token = z.uuid().parse(fd.get("token"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    const m = error.message ?? "";
    fail(`/invite/${token}`, /invitation|sent to|signed in/.test(m) ? m.charAt(0).toUpperCase() + m.slice(1) : "Couldn’t accept the invitation — try again");
  }
  (await cookies()).set(ORG_COOKIE, String(data), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard?ok=" + encodeURIComponent("Welcome! You’re now a co-owner"));
}
