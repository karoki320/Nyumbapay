import Link from "next/link";
import { Logo } from "@/components/logo";
import { Submit } from "@/components/submit";
import { magicLink, signIn, signUp } from "./actions";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const signup = (await searchParams).mode === "signup";
  return (
    <div className="auth">
      <Logo />
      <h2 style={{ fontSize: 22 }}>{signup ? "Create your NyumbaPay account" : "Sign in to NyumbaPay"}</h2>
      <p className="sub" style={{ marginTop: 4 }}>Rent collection that reconciles itself.</p>

      <form action={signup ? signUp : signIn} style={{ marginTop: 20 }}>
        <label className="l">Email<input className="field" name="email" type="email" autoComplete="email" required /></label>
        <label className="l">Password
          <input className="field" name="password" type="password" minLength={8} required
            autoComplete={signup ? "new-password" : "current-password"} />
        </label>
        <div style={{ marginTop: 16 }}><Submit>{signup ? "Create account" : "Sign in"}</Submit></div>
      </form>

      {!signup && (
        <form action={magicLink} style={{ marginTop: 22 }}>
          <p className="sub">Forgot your password? Get a one-time sign-in link.</p>
          <input className="field" name="email" type="email" placeholder="you@example.com" required />
          <div style={{ marginTop: 8 }}><Submit className="btn btn-g">Email me a sign-in link</Submit></div>
        </form>
      )}

      <p className="sub" style={{ marginTop: 22, textAlign: "center" }}>
        {signup
          ? <>Already have an account? <Link href="/login" style={{ color: "var(--brand)", fontWeight: 650 }}>Sign in</Link></>
          : <>New landlord or agent? <Link href="/login?mode=signup" style={{ color: "var(--brand)", fontWeight: 650 }}>Create an account</Link></>}
      </p>
    </div>
  );
}
