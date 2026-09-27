export type LeaseBalance = {
  lease_id: string; org_id: string; unit_id: string; tenant_id: string; rent: number; status: "active" | "ended";
  pay_token: string; unit_label: string; property_name: string; property_id: string;
  tenant_name: string; tenant_phone: string | null; arrears: number; credit: number;
};
export type Payment = {
  id: string; source: "mpesa" | "cash" | "bank"; provider_ref: string; amount: number; payer_name: string | null;
  payer_phone: string | null; bill_ref: string | null; received_at: string; status: "allocated" | "unmatched" | "reversed";
  lease_id: string | null; matched_by: string | null; receipt_no: string | null; reversed_reason: string | null;
};
export type Invoice = {
  id: string; lease_id: string; period: string; amount: number; amount_paid: number; due_date: string;
  status: "open" | "paid" | "void";
};

export function invoiceState(i: Pick<Invoice, "status" | "amount_paid">) {
  if (i.status === "void") return "void";
  if (i.status === "paid") return "paid";
  return i.amount_paid > 0 ? "partial" : "unpaid";
}
export const SOURCE: Record<Payment["source"], string> = { mpesa: "M-Pesa", cash: "Cash", bank: "Bank" };
