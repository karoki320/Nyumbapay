import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { Submit } from "@/components/submit";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

export const metadata = { title: "Invitation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Info = { org_name: string; email: string; inviter_email: string | null; status: "pending" | "accepted" | "revoked" | "expired" };

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = await createClient();
  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.rpc("get_invite", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const i = (Array.isArray(data) ? data[0] : data) as Info | undefined;
  if (!i) notFound();
  const next = `/invite/${token}`;
  const q = (mode?: string) => `/login?${new URLSearchParams({ ...(mode ? { mode } : {}), next, email: i.email })}`;
  const sameEmail = user?.email?.toLowerCase() === i.email;

  return (
    <div className="auth">
      <Logo />
      {i.status !== "pending" ? (
        <>
          <h2 style={{ fontSize: 22 }}>
            {i.status === "accepted" ? "This invitation has already been used" : i.status === "expired" ? "This invitation has expired" : "This invitation was cancelled"}
          </h2>
          <p className="sub" style={{ marginTop: 6 }}>Ask the owner of {i.org_name} to send you a new one.</p>
          <Link className="btn btn-g" style={{ marginTop: 18 }} href="/dashboard">Go to NyumbaPay</Link>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 22 }}>Join {i.org_name} as a co-owner</h2>
          <p className="sub" style={{ marginTop: 6 }}>
            {i.inviter_email ? <><b>{i.inviter_email}</b> invited </> : "You were invited "}
            <b>{i.email}</b> to manage {i.org_name}’s properties, tenants and payments on NyumbaPay — with full owner rights.
          </p>

          {user ? (
            sameEmail ? (
              <form action={acceptInvite} style={{ marginTop: 20 }}>
                <input type="hidden" name="token" value={token} />
                <Submit>Accept invitation</Submit>
              </form>
            ) : (
              <div style={{ marginTop: 20 }}>
                <div className="acct warn">You’re signed in as <b>{user.email}</b>, but this invitation is for <b>{i.email}</b>.</div>
                <form action="/auth/signout" method="post" style={{ marginTop: 12 }}>
                  <input type="hidden" name="next" value={next} />
                  <button className="btn btn-g" type="submit">Sign out and switch account</button>
                </form>
              </div>
            )
          ) : (
            <div style={{ marginTop: 20 }}>
              <Link className="btn btn-p" href={q("signup")}>Create an account to accept</Link>
              <Link className="btn btn-g" style={{ marginTop: 8 }} href={q()}>I already have an account — sign in</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
