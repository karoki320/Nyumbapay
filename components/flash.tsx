"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Shows ?ok= / ?err= messages set by server actions, then cleans the URL. */
export function Flash() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);

  useEffect(() => {
    const ok = params.get("ok"), err = params.get("err");
    if (!ok && !err) return;
    setMsg({ text: (err ?? ok)!, err: !!err });
    const rest = new URLSearchParams(params);
    rest.delete("ok"); rest.delete("err");
    const qs = rest.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    const t = setTimeout(() => setMsg(null), err ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [params, path, router]);

  if (!msg) return null;
  return <div role="status" className={`toast ${msg.err ? "err" : ""}`} onClick={() => setMsg(null)}>{msg.text}</div>;
}
