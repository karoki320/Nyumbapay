import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";
import { periodOf } from "@/lib/money";
import { loadReport, REPORTS, toCsv, type ReportKind } from "@/lib/reports";

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(kind in REPORTS)) return NextResponse.json({ error: "unknown report" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("period");
  const period = periodOf(q && /^\d{4}-\d{2}$/.test(q) ? q : undefined);
  const { supabase, org } = await getContext();
  const rows = await loadReport(supabase, org.id, period);
  const body = toCsv(kind as ReportKind, rows, { org: org.name, period: period.slice(0, 7) });
  const name = `${org.account_prefix}-${kind}-${kind === "arrears" ? new Date().toISOString().slice(0, 10) : period.slice(0, 7)}.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
