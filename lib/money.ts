/** All amounts are integer cents. KSh 9,000 = 900_000. */
export function ksh(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0);
  const whole = Math.round(n / 100);
  return "KSh " + whole.toLocaleString("en-KE");
}

/** "9,000" | "9000.50" | "KSh 9 000" → 900050. Returns null if not a positive amount. */
export function parseKsh(input: FormDataEntryValue | null | undefined): number | null {
  const s = String(input ?? "").replace(/ksh|kes|[\s,]/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100_000_000_00) return null;
  return cents;
}

/** "2026-09" or Date → "2026-09-01" (first of month, Nairobi time). */
export function periodOf(input?: string | Date | null): string {
  if (typeof input === "string" && /^\d{4}-\d{2}$/.test(input)) return `${input}-01`;
  const d = input instanceof Date ? input : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit" })
    .formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}-01`;
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-KE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

export function when(ts: string | Date): string {
  return new Date(ts).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Kenyan phone → 2547XXXXXXXX for wa.me links. */
export function msisdn(phone: string | null | undefined): string | null {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^0[17]\d{8}$/.test(d)) return "254" + d.slice(1);
  if (/^[17]\d{8}$/.test(d)) return "254" + d;
  return null;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
