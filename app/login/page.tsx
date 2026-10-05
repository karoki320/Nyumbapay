import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/context";
import { Submit } from "@/components/submit";
import { magicLink, signIn, signUp } from "./actions";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string; email?: string }> }) {
  const sp = await searchParams;
  const signup = sp.mode === "signup";
  const next = sp.next ? safeNext(sp.next) : "";
  const email = typeof sp.email === "string" ? sp.email.slice(0, 200) : "";
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user) redirect(next || "/dashboard");
  const q = (mode?: string) => {
    const p = new URLSearchParams(); if (mode) p.set("mode", mode); if (next) p.set("next", next); if (email) p.set("email", email);
    const s = p.toString(); return s ? `/login?${s}` : "/login";
  };
  const invited = next.startsWith("/invite/");

  return (
    <div className="auth">
      <Link href="/" aria-label="NyumbaPay home"><Logo /></Link>
      <h2 style={{ fontSize: 22 }}>{signup ? "Create your NyumbaPay account" : "Sign in to NyumbaPay"}</h2>
      <p className="sub" style={{ marginTop: 4 }}>
        {invited ? "Use the email address your invitation was sent to." : "Rent collection that reconciles itself."}
      </p>

      <form action={signup ? signUp : signIn} style={{ marginTop: 20 }}>
        {next && <input type="hidden" name="next" value={next} />}
        <label className="l">Email<input className="field" name="email" type="email" autoComplete="email" required defaultValue={email} /></label>
        <label className="l">Password
          <input className="field" name="password" type="password" minLength={8} required
            autoComplete={signup ? "new-password" : "current-password"} />
        </label>
        <div style={{ marginTop: 16 }}><Submit>{signup ? "Create account" : "Sign in"}</Submit></div>
      </form>

      {!signup && (
        <form action={magicLink} style={{ marginTop: 22 }}>
          {next && <input type="hidden" name="next" value={next} />}
          <p className="sub">Forgot your password? Get a one-time sign-in link.</p>
          <input className="field" name="email" type="email" placeholder="you@example.com" required defaultValue={email} />
          <div style={{ marginTop: 8 }}><Submit className="btn btn-g">Email me a sign-in link</Submit></div>
        </form>
      )}

      <p className="sub" style={{ marginTop: 22, textAlign: "center" }}>
        {signup
          ? <>Already have an account? <Link href={q()} style={{ color: "var(--brand)", fontWeight: 650 }}>Sign in</Link></>
          : <>{invited ? "No account yet?" : "New landlord or agent?"} <Link href={q("signup")} style={{ color: "var(--brand)", fontWeight: 650 }}>Create an account</Link></>}
      </p>
    </div>
  );
}
