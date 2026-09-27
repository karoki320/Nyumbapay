"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { done, fail } from "@/lib/flash";

const Creds = z.object({ email: z.email(), password: z.string().min(8, "Password must be at least 8 characters") });

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function signIn(fd: FormData) {
  const p = Creds.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) fail("/login", p.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  if (error) fail("/login", error.message === "Email not confirmed" ? "Confirm your email first — check your inbox" : "Wrong email or password");
  redirect("/dashboard");
}

export async function signUp(fd: FormData) {
  const p = Creds.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) fail("/login?mode=signup", p.error.issues[0].message);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...p.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) fail("/login?mode=signup", error.message);
  if (data.session) redirect("/onboarding");
  done("/login", "Check your email to confirm your account");
}

export async function magicLink(fd: FormData) {
  const email = z.email().safeParse(fd.get("email"));
  if (!email.success) fail("/login", "Enter a valid email");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/dashboard`, shouldCreateUser: false },
  });
  if (error) fail("/login", "Couldn't send the link — try again in a minute");
  done("/login", "If that email has an account, a sign-in link is on its way");
}
