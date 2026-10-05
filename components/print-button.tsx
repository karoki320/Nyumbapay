"use client";
export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return <button type="button" className="btn btn-g btn-sm" onClick={() => window.print()}>{label}</button>;
}
