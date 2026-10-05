import Link from "next/link";
import { ago, describe } from "@/lib/activity";

export type AdminOrg = {
  id: string; name: string; account_prefix: string; paybill: string | null; paybill_verified: boolean; created_at: string;
  owners: string | null; members: number; units: number; occupied: number; collected_month: number; arrears: number;
  unmatched: number; last_activity: string | null;
};
export type Activity = { at: string; org_id: string; org_name: string; actor_email: string | null; by_admin: boolean; action: string; data: Record<string, unknown> | null };

export function PaybillTag({ o }: { o: Pick<AdminOrg, "paybill" | "paybill_verified"> }) {
  if (!o.paybill) return <span className="tag none">No paybill</span>;
  return o.paybill_verified ? <span className="tag ok">{o.paybill} · verified</span> : <span className="tag wait">{o.paybill} · to verify</span>;
}

export function Feed({ items, showOrg = true }: { items: Activity[]; showOrg?: boolean }) {
  if (!items.length) return <div className="empty">No activity yet.</div>;
  return (
    <ul className="feed">
      {items.map((a, i) => (
        <li key={i}>
          <span className={`dot ${a.by_admin ? "adm" : ""}`} />
          <div>
            <div>
              {showOrg && <><Link href={`/admin/landlords/${a.org_id}`} style={{ fontWeight: 700 }}>{a.org_name}</Link> · </>}
              {describe(a.action, a.data)}
            </div>
            <div className="w">{a.actor_email ?? "System / M-Pesa"}{a.by_admin && <> · <span className="tag adm">admin</span></>} · {ago(a.at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
