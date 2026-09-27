import "server-only";
import { redirect } from "next/navigation";

/** Redirect back to a page with a toast message. Never returns. */
export function done(path: string, msg: string): never {
  redirect(withParam(path, "ok", msg));
}
export function fail(path: string, msg: string): never {
  redirect(withParam(path, "err", msg));
}
function withParam(path: string, key: string, msg: string) {
  const [base, qs = ""] = path.split("?");
  const p = new URLSearchParams(qs);
  p.delete("ok"); p.delete("err");
  p.set(key, msg.slice(0, 200));
  return `${base}?${p.toString()}`;
}

/** Map Postgres / Supabase errors to something a landlord can read. */
export function friendly(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return "Something went wrong";
  if (err.code === "23505") return "That already exists — labels and account prefixes must be unique";
  if (err.code === "23503") return "It is still in use, so it can't be removed";
  if (err.code === "23514") return "Some of the values aren't valid";
  if (err.message && /not allowed|already assigned|reason required|not found|positive/.test(err.message)) {
    return err.message.charAt(0).toUpperCase() + err.message.slice(1);
  }
  console.error(err);
  return "Something went wrong — please try again";
}
