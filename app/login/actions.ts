"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/context";
import { done, fail } from "@/lib/flash";

const Creds = z.object({ email: z.email(), password: z.string().min(8, "Password must be at least 8 characters") });

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
function back(mode: "signin" | "signup", next: string) {
  const q = new URLSearchParams();
  if (mode === "signup") q.set("mode", "signup");
  if (next !== "/dashboard" && next !== "/onboarding") q.set("next", next);
  const s = q.toString();
  return s ? `/login?${s}` : "/login";
}

export async function signIn(fd: FormData) {
  const next = safeNext(fd.get("next"));
  const p = Creds.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) fail(back("signin", next), p.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  if (error) fail(back("signin", next), error.message === "Email not confirmed" ? "Confirm your email first — check your inbox" : "Wrong email or password");
  redirect(next);
}

export async function signUp(fd: FormData) {
  const next = safeNext(fd.get("next"), "/onboarding");
  const p = Creds.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) fail(back("signup", next), p.error.issues[0].message);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...p.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) fail(back("signup", next), error.message);
  if (data.session) redirect(next);
  done(back("signin", next), "Check your email to confirm your account");
}

export async function magicLink(fd: FormData) {
  const next = safeNext(fd.get("next"));
  const email = z.email().safeParse(fd.get("email"));
  if (!email.success) fail(back("signin", next), "Enter a valid email");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: false },
  });
  if (error) fail(back("signin", next), "Couldn't send the link — try again in a minute");
  done(back("signin", next), "If that email has an account, a sign-in link is on its way");
}
