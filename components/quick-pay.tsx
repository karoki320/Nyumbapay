"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./icon";
import { Submit } from "./submit";

type Props = {
  leaseId: string; unitId: string; tenant: string; unit: string; property: string;
  arrears: number; credit: number; rent: number; amountLabel: string;
  action: (fd: FormData) => Promise<void>;
};

/** Tenant row on Home with a tick button that opens a one-step "record payment" form. */
export function QuickPay({ leaseId, unitId, tenant, unit, property, arrears, credit, rent, amountLabel, action }: Props) {
  const [open, setOpen] = useState(false);
  const owes = arrears > 0;
  const suggested = Math.round((owes ? arrears : rent) / 100);
  return (
    <div className="card qp">
      <div className="row" style={{ alignItems: "center" }}>
        <Link href={`/units/${unitId}`} style={{ flex: 1, minWidth: 0 }}>
          <div className="t">{tenant}</div>
          <div className="s">{unit} · {property}</div>
        </Link>
        <div className="right">
          <div className="amt" style={{ color: owes ? "var(--red)" : "var(--green)" }}>{owes ? amountLabel : "Paid"}</div>
          {!owes && credit > 0 && <div className="s">{amountLabel} credit</div>}
        </div>
        <button type="button" className={`qp-tick${open ? " on" : ""}`} aria-expanded={open}
          aria-label={`Record a payment from ${tenant}`} title="Record a payment" onClick={() => setOpen((v) => !v)}>
          <Icon name="tick" size={18} />
        </button>
      </div>
      {open && (
        <form action={action} className="qp-form">
          <input type="hidden" name="lease_id" value={leaseId} />
          <input type="hidden" name="tenant" value={tenant} />
          <div className="grid2">
            <label className="l">Amount received (KSh)
              <input className="field" name="amount" inputMode="decimal" required autoFocus defaultValue={suggested || ""} />
            </label>
            <label className="l">Method
              <select className="field" name="source"><option value="cash">Cash</option><option value="bank">Bank transfer</option></select>
            </label>
          </div>
          <label className="l">Reference (optional)<input className="field" name="ref" placeholder="Receipt book or bank ref" maxLength={60} /></label>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Submit className="btn btn-p">Record payment</Submit>
            <button type="button" className="btn btn-g" style={{ marginTop: 0 }} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
