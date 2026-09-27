import { ksh } from "./money";

/** Reminder text for a wa.me click-to-chat link, in the tenant's language. */
export function reminderText(o: {
  name: string; unit: string; balance: number; paybill: string | null; account: string; link: string; lang: "en" | "sw";
}) {
  const first = o.name.split(" ")[0];
  const pay = o.paybill ? `Paybill ${o.paybill}, Acc ${o.account}.` : `Account ${o.account}.`;
  return o.lang === "sw"
    ? `Habari ${first}, salio la kodi ya ${o.unit} ni ${ksh(o.balance)}. ${pay} Maelezo: ${o.link}`
    : `Hi ${first}, your rent balance for ${o.unit} is ${ksh(o.balance)}. ${pay} Details: ${o.link}`;
}
