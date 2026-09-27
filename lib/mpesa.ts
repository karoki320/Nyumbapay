import { timingSafeEqual } from "node:crypto";

export type C2BPayload = {
  TransactionType?: string; TransID: string; TransTime: string; TransAmount: string | number;
  BusinessShortCode: string | number; BillRefNumber?: string; InvoiceNumber?: string;
  MSISDN?: string | number; FirstName?: string; MiddleName?: string; LastName?: string;
};

/** "25000.00" → 2500000 cents; null if invalid. */
export function amountToCents(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  const c = Number(w) * 100 + Number((f + "00").slice(0, 2));
  return c > 0 && Number.isSafeInteger(c) ? c : null;
}

/** Daraja TransTime "20260806094100" (Nairobi) → ISO string. */
export function transTime(v: unknown): string {
  const m = String(v ?? "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return new Date().toISOString();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+03:00`).toISOString();
}

export function payerName(p: C2BPayload): string {
  return [p.FirstName, p.MiddleName, p.LastName].filter(Boolean).join(" ").trim() || "M-Pesa customer";
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checks the shared secret in the callback URL and (optionally) the caller IP. */
export function authorised(req: Request): boolean {
  const secret = process.env.MPESA_CALLBACK_SECRET;
  if (!secret) return false;
  const given = new URL(req.url).searchParams.get("secret") ?? "";
  if (!safeEqual(given, secret)) return false;
  const allow = (process.env.MPESA_ALLOWED_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allow.length) return true;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return allow.includes(ip);
}

export const ACCEPT = { ResultCode: 0, ResultDesc: "Accepted" } as const;
