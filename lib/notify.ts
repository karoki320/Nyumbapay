import "server-only";
import { reminderText } from "./messages";
import { ksh } from "./money";
import { SITE } from "./site";

export type DueReminder = {
  org_id: string; org_name: string; paybill: string | null; account: string; lease_id: string; unit_label: string;
  tenant_name: string; phone: string; language: "en" | "sw"; balance: number; pay_token: string;
};
export type SendResult = { channel: "whatsapp" | "sms" | "none"; status: "sent" | "failed" | "skipped"; error?: string; providerId?: string };

const env = (k: string) => process.env[k]?.trim() || "";
export const whatsappReady = () => !!(env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_NUMBER_ID") && env("WHATSAPP_REMINDER_TEMPLATE"));
export const smsReady = () => !!(env("AT_USERNAME") && env("AT_API_KEY"));
export const anyChannel = () => whatsappReady() || smsReady();

/**
 * WhatsApp Cloud API template message. The approved template must have 6 body variables:
 * {{1}} first name, {{2}} house, {{3}} amount, {{4}} paybill, {{5}} account number, {{6}} pay link.
 */
async function sendWhatsApp(r: DueReminder): Promise<SendResult> {
  const langs = (env("WHATSAPP_TEMPLATE_LANGS") || "en").split(",").map((s) => s.trim());
  const lang = langs.includes(r.language) ? r.language : langs[0];
  const params = [r.tenant_name.split(" ")[0], r.unit_label, ksh(r.balance), r.paybill ?? "-", r.account, `${SITE.url}/pay/${r.pay_token}`];
  try {
    const res = await fetch(`https://graph.facebook.com/${env("WHATSAPP_API_VERSION") || "v23.0"}/${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: r.phone, type: "template",
        template: {
          name: env("WHATSAPP_REMINDER_TEMPLATE"), language: { code: lang },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { channel: "whatsapp", status: "failed", error: j?.error?.message ?? `HTTP ${res.status}` };
    return { channel: "whatsapp", status: "sent", providerId: j?.messages?.[0]?.id };
  } catch (e) {
    return { channel: "whatsapp", status: "failed", error: String(e) };
  }
}

/** SMS through Africa's Talking. */
async function sendSms(r: DueReminder): Promise<SendResult> {
  const sandbox = env("AT_USERNAME") === "sandbox";
  const message = reminderText({
    name: r.tenant_name, unit: r.unit_label, balance: r.balance, paybill: r.paybill, account: r.account,
    link: `${SITE.url}/pay/${r.pay_token}`, lang: r.language,
  });
  const body = new URLSearchParams({ username: env("AT_USERNAME"), to: `+${r.phone}`, message });
  if (env("AT_SENDER_ID")) body.set("from", env("AT_SENDER_ID"));
  try {
    const res = await fetch(`https://api.${sandbox ? "sandbox." : ""}africastalking.com/version1/messaging`, {
      method: "POST",
      headers: { apiKey: env("AT_API_KEY"), Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const j = await res.json().catch(() => ({}));
    const rec = j?.SMSMessageData?.Recipients?.[0];
    if (!res.ok || !rec || !/success/i.test(rec.status ?? "")) {
      return { channel: "sms", status: "failed", error: rec?.status ?? j?.SMSMessageData?.Message ?? `HTTP ${res.status}` };
    }
    return { channel: "sms", status: "sent", providerId: rec.messageId };
  } catch (e) {
    return { channel: "sms", status: "failed", error: String(e) };
  }
}

/** WhatsApp first, SMS as fallback. */
export async function sendReminder(r: DueReminder): Promise<SendResult> {
  if (!anyChannel()) return { channel: "none", status: "skipped", error: "No WhatsApp or SMS sender configured" };
  let wa: SendResult | null = null;
  if (whatsappReady()) {
    wa = await sendWhatsApp(r);
    if (wa.status === "sent") return wa;
  }
  if (smsReady()) {
    const sms = await sendSms(r);
    if (sms.status === "sent" || !wa) return sms;
    return { ...sms, error: `WhatsApp: ${wa.error}; SMS: ${sms.error}` };
  }
  return wa!;
}
