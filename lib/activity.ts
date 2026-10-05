import { ksh } from "./money";

type Data = Record<string, unknown> | null;
const L = (d: Data) => (d && typeof d.label === "string" ? d.label : "");

/** Human-readable sentence for an audit_log entry. */
export function describe(action: string, data: Data): string {
  const d = data ?? {};
  switch (action) {
    case "org.created": return "Created the account";
    case "org.settings": return `Updated business settings${d.paybill ? ` (paybill ${d.paybill})` : ""}`;
    case "property.created": return `Added property ${L(data)}`;
    case "property.updated": return `Edited property ${L(data)}`;
    case "property.deleted": return `Deleted property ${L(data)}`;
    case "unit.created": return `Added unit ${L(data)}`;
    case "unit.updated": return `Edited unit ${L(data)}`;
    case "unit.deleted": return `Deleted unit ${L(data)}`;
    case "tenant.created": return `Added tenant ${L(data)}`;
    case "tenant.updated": return `Edited tenant ${L(data)}`;
    case "tenant.deleted": return `Removed tenant ${L(data)}`;
    case "lease.created": return `Moved in ${L(data)}`;
    case "lease.updated": return `Updated lease ${L(data)}`;
    case "lease.ended": return `Moved out ${L(data)}`;
    case "lease.deleted": return `Deleted lease ${L(data)}`;
    case "invoices.generated": return `Raised ${d.count ?? 0} invoice(s)`;
    case "invoice.voided": return "Voided an invoice";
    case "payment.received": return `${d.status === "unmatched" ? "Unmatched payment" : "Payment"} of ${ksh(Number(d.amount ?? 0))} (${d.source === "mpesa" ? "M-Pesa" : d.source ?? ""})`;
    case "payment.assigned": return "Assigned a payment to a unit";
    case "payment.reversed": return `Reversed a payment${d.reason ? `: ${d.reason}` : ""}`;
    case "member.invited": return `Invited co-owner ${d.email ?? ""}`;
    case "member.joined": return `${d.email ?? "Someone"} joined as co-owner`;
    case "member.removed": return `Removed ${d.email ?? "a member"}`;
    case "member.invite_cancelled": return "Cancelled an invitation";
    case "admin.opened_account": return "Super admin opened the account";
    case "admin.created_account": return `Super admin created the account for ${d.owner_email ?? ""}`;
    case "admin.paybill_verified": return "Super admin verified the paybill";
    case "admin.paybill_unverified": return "Super admin un-verified the paybill";
    default: return action;
  }
}

export function ago(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(ts).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
}
