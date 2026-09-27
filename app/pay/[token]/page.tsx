import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ksh } from "@/lib/money";

export const metadata = { title: "Pay rent", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Info = { org_name: string; property_name: string; unit_label: string; tenant_first_name: string;
  balance: number; paybill: string | null; account: string };

export default async function Pay({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_pay_info", { p_token: token });
  const i = (Array.isArray(data) ? data[0] : data) as Info | undefined;
  if (!i) notFound();
  const due = Number(i.balance);

  return (
    <div className="auth" style={{ textAlign: "center" }}>
      <div className="sub">{i.org_name}</div>
      <h2 style={{ fontSize: 18, marginTop: 2 }}>Rent for {i.unit_label}, {i.property_name}</h2>
      <div className="sub" style={{ marginBottom: 14 }}>Hi {i.tenant_first_name}</div>
      <div className="card">
        <div className="sub">Amount due</div>
        <div className="big">{ksh(due)}</div>
        {due === 0 && <div className="acct ok">You're fully paid — asante!</div>}
      </div>
      <div className="card" style={{ textAlign: "left", marginTop: 10 }}>
        <div className="t" style={{ marginBottom: 6 }}>Pay with M-Pesa</div>
        <p className="s" style={{ marginBottom: 4 }}>M-Pesa → Lipa na M-Pesa → Pay Bill</p>
        {i.paybill && <div className="kv"><span>Business number</span><b>{i.paybill}</b></div>}
        <div className="kv"><span>Account number</span><b>{i.account}</b></div>
        <div className="kv"><span>Amount</span><b>{ksh(due)}</b></div>
      </div>
      <p className="sub" style={{ marginTop: 12 }}>Use the account number exactly so your payment is matched and a receipt is sent to you.</p>
    </div>
  );
}
