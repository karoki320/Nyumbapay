import "server-only";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends an email through Resend. Returns false (without throwing) when Resend isn't configured or fails. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM || "NyumbaPay <no-reply@nyumbapay.co.ke>", to: [to], subject, html }),
    });
    if (!res.ok) console.error("resend failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("resend error", e);
    return false;
  }
}

export function coOwnerInviteEmail(o: { orgName: string; inviter: string; link: string; site: string }) {
  const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const org = esc(o.orgName), who = esc(o.inviter), link = esc(o.link);
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f2ec">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f2ec"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 6px 18px"><img src="${o.site}/email/logo.png" width="36" height="36" alt="" style="vertical-align:middle;border-radius:9px">
<span style="font-family:${F};font-size:19px;font-weight:800;color:#14181f;vertical-align:middle;padding-left:8px">NyumbaPay</span></td></tr>
<tr><td bgcolor="#ffffff" style="background:#fff;border:1px solid #e7e4dc;border-radius:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td height="5" bgcolor="#0f5132" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:34px;font-family:${F};color:#14181f">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">You’re invited to co-own ${org} on NyumbaPay</h1>
<p style="margin:0 0 14px;font-size:15.5px;line-height:1.65"><strong>${who}</strong> has added you as a co-owner of <strong>${org}</strong>.</p>
<p style="margin:0 0 14px;font-size:15.5px;line-height:1.65">You’ll see the same properties, tenants, invoices and payments, and have the same rights to manage them.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px"><tr><td bgcolor="#0f5132" style="border-radius:10px">
<a href="${link}" style="display:inline-block;padding:14px 28px;font-family:${F};font-size:16px;font-weight:700;color:#fff;text-decoration:none">Accept invitation</a></td></tr></table>
<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#667085">Sign in or create an account with this email address to accept. The link expires in 14 days.<br>
<a href="${link}" style="color:#0f5132;word-break:break-all">${link}</a></p>
<p style="margin:26px 0 0;font-size:15.5px">Asante,<br><strong>The NyumbaPay Team</strong></p>
</td></tr></table></td></tr>
<tr><td style="padding:22px 10px 0;font-family:${F};font-size:12.5px;line-height:1.7;color:#667085;text-align:center">
If you weren’t expecting this, you can ignore this email.<br>NyumbaPay · Rent collection for Kenyan landlords · Nairobi, Kenya</td></tr>
</table></td></tr></table></body></html>`;
}
