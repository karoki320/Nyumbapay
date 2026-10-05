import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sendReminder, type DueReminder } from "./notify";

const r: DueReminder = {
  org_id: "o", org_name: "Karoki", paybill: "600000", account: "KAR-B3", lease_id: "l", unit_label: "B3",
  tenant_name: "Fatuma Abdi", phone: "254777333444", language: "sw", balance: 1500000, pay_token: "tok",
};
const ENV = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_REMINDER_TEMPLATE", "WHATSAPP_TEMPLATE_LANGS", "AT_USERNAME", "AT_API_KEY"];

describe("sendReminder", () => {
  beforeEach(() => { ENV.forEach((k) => delete process.env[k]); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("skips when nothing is configured", async () => {
    expect((await sendReminder(r)).status).toBe("skipped");
  });

  it("sends a WhatsApp template with the six variables in the tenant's language", async () => {
    Object.assign(process.env, { WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_REMINDER_TEMPLATE: "rent_reminder", WHATSAPP_TEMPLATE_LANGS: "en,sw" });
    const f = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.X" }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const res = await sendReminder(r);
    expect(res).toMatchObject({ channel: "whatsapp", status: "sent", providerId: "wamid.X" });
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.to).toBe("254777333444");
    expect(body.template.language.code).toBe("sw");
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text))
      .toEqual(["Fatuma", "B3", "KSh 15,000", "600000", "KAR-B3", "https://nyumbapay.co.ke/pay/tok"]);
  });

  it("falls back to SMS when WhatsApp fails", async () => {
    Object.assign(process.env, { WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_REMINDER_TEMPLATE: "rent_reminder", AT_USERNAME: "acme", AT_API_KEY: "k" });
    const f = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "not a WhatsApp user" } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ SMSMessageData: { Recipients: [{ status: "Success", messageId: "ATX1" }] } }), { status: 201 }));
    vi.stubGlobal("fetch", f);
    const res = await sendReminder(r);
    expect(res).toMatchObject({ channel: "sms", status: "sent", providerId: "ATX1" });
    const sms = (f.mock.calls[1] as unknown as [string, RequestInit]);
    expect(sms[0]).toContain("api.africastalking.com");
    expect(String(sms[1].body)).toContain("to=%2B254777333444");
    expect(new URLSearchParams(String(sms[1].body)).get("message")).toContain("Habari Fatuma");
  });
});
