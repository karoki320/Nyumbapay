"use client";
import { useFormStatus } from "react-dom";

/** Submit button that disables itself while the server action runs (no double submits). */
export function Submit({ children, className = "btn btn-p", confirm }: {
  children: React.ReactNode; className?: string; confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {pending ? "Working…" : children}
    </button>
  );
}
