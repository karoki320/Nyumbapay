import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportRow = {
  property_name: string; unit_id: string; unit_label: string; lease_id: string | null;
  tenant_name: string | null; tenant_phone: string | null; rent: number;
  status: "vacant" | "not invoiced" | "paid" | "partial" | "unpaid";
  invoiced: number; paid: number; balance: number; arrears: number; credit: number;
  months_owing: number; oldest_unpaid: string | null; last_payment_at: string | null;
  tenant_language: "en" | "sw" | null; pay_token: string | null;
};
export type ReportKind = "summary" | "payments" | "arrears";

export const REPORTS: Record<ReportKind, { title: string; blurb: string; monthly: boolean }> = {
  summary: { title: "All houses summary", blurb: "Every house with its tenant, rent, what’s been paid this month and any arrears.", monthly: true },
  payments: { title: "Paid vs not paid", blurb: "Houses grouped into paid, partly paid and not paid for a month.", monthly: true },
  arrears: { title: "Rent arrears", blurb: "Every house that owes rent, biggest balance first, with months owed.", monthly: false },
};

export const STATUS_LABEL: Record<ReportRow["status"], string> = {
  paid: "Paid", partial: "Partly paid", unpaid: "Not paid", vacant: "Vacant", "not invoiced": "No invoice",
};

export async function loadReport(supabase: SupabaseClient, orgId: string, period: string | null) {
  const { data, error } = await supabase.rpc("report_units", { p_org: orgId, p_period: period });
  if (error) throw error;
  return ((data ?? []) as ReportRow[]).map((r) => ({
    ...r, rent: Number(r.rent), invoiced: Number(r.invoiced), paid: Number(r.paid), balance: Number(r.balance),
    arrears: Number(r.arrears), credit: Number(r.credit), months_owing: Number(r.months_owing),
  }));
}

export function totals(rows: ReportRow[]) {
  const occ = rows.filter((r) => r.status !== "vacant");
  const invoiced = rows.reduce((n, r) => n + r.invoiced, 0);
  const paid = rows.reduce((n, r) => n + r.paid, 0);
  return {
    units: rows.length, occupied: occ.length, vacant: rows.length - occ.length,
    invoiced, paid, balance: rows.reduce((n, r) => n + r.balance, 0),
    arrears: rows.reduce((n, r) => n + r.arrears, 0),
    rate: invoiced ? Math.round((paid / invoiced) * 100) : 0,
    count: (s: ReportRow["status"]) => rows.filter((r) => r.status === s).length,
  };
}

export const arrearsRows = (rows: ReportRow[]) =>
  rows.filter((r) => r.arrears > 0).sort((a, b) => b.arrears - a.arrears || a.unit_label.localeCompare(b.unit_label, undefined, { numeric: true }));

/** CSV (opens in Excel/Sheets). Amounts are whole shillings. */
export function toCsv(kind: ReportKind, rows: ReportRow[], meta: { org: string; period: string }): string {
  const K = (c: number) => Math.round(c / 100);
  // spaced phone numbers stay text in Excel (keeps the leading 0)
  const ph = (v: string | null) => { const d = (v ?? "").replace(/\D/g, ""); return /^0\d{9}$/.test(d) ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : v ?? ""; };
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
  };
  const lines: unknown[][] = [];
  if (kind === "arrears") {
    lines.push(["Property", "House", "Tenant", "Phone", "Monthly rent (KSh)", "Months owing", "Owing since", "Arrears (KSh)"]);
    for (const r of arrearsRows(rows)) lines.push([r.property_name, r.unit_label, r.tenant_name, ph(r.tenant_phone), K(r.rent), r.months_owing, r.oldest_unpaid?.slice(0, 7), K(r.arrears)]);
    lines.push(["", "", "", "", "", "", "TOTAL", K(rows.reduce((n, r) => n + r.arrears, 0))]);
  } else {
    lines.push(["Property", "House", "Tenant", "Phone", "Rent (KSh)", `Invoiced ${meta.period} (KSh)`, "Paid (KSh)", "Balance this month (KSh)", "Total arrears (KSh)", "Status"]);
    const order = kind === "payments" ? ["paid", "partial", "unpaid", "not invoiced", "vacant"] : null;
    const sorted = order ? [...rows].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status)) : rows;
    for (const r of sorted) lines.push([r.property_name, r.unit_label, r.tenant_name ?? "", ph(r.tenant_phone), K(r.rent), K(r.invoiced), K(r.paid), K(r.balance), K(r.arrears), STATUS_LABEL[r.status]]);
    const t = totals(rows);
    lines.push(["", "", "", "", "TOTAL", K(t.invoiced), K(t.paid), K(t.balance), K(t.arrears), ""]);
  }
  const head = [[`${meta.org} — ${REPORTS[kind].title}`], [kind === "arrears" ? "As at today" : `Month: ${meta.period}`], []];
  return "﻿" + [...head, ...lines].map((l) => l.map(cell).join(",")).join("\r\n");
}
