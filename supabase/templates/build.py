"""Generates the Supabase auth email templates (email-safe HTML: tables + inline styles).

Run:  python3 supabase/templates/build.py
Then paste each .html into Supabase → Authentication → Email Templates (subjects in SUBJECTS.md).
"""
from pathlib import Path

SITE = "https://nyumbapay.co.ke"
BRAND, INK, MUTED, LINE, BG, SOFT = "#0f5132", "#14181f", "#667085", "#e7e4dc", "#f4f2ec", "#e8f3ed"
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def button(label: str, href: str = "{{ .ConfirmationURL }}") -> str:
    return f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
  <tr><td align="center" bgcolor="{BRAND}" style="border-radius:10px">
    <a href="{href}" target="_blank"
       style="display:inline-block;padding:14px 28px;font-family:{FONT};font-size:16px;font-weight:700;
              color:#ffffff;text-decoration:none;border-radius:10px">{label}</a>
  </td></tr>
</table>"""


def fallback_link() -> str:
    return f"""
<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:{MUTED}">
  Button not working? Copy and paste this link into your browser:<br>
  <a href="{{{{ .ConfirmationURL }}}}" style="color:{BRAND};word-break:break-all">{{{{ .ConfirmationURL }}}}</a>
</p>"""


def note(text: str) -> str:
    return f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0">
  <tr><td style="background:{SOFT};border-radius:10px;padding:14px 16px;font-family:{FONT};font-size:13.5px;
                 line-height:1.6;color:#0a3a24">{text}</td></tr>
</table>"""


def p(text: str) -> str:
    return f'<p style="margin:0 0 14px;font-size:15.5px;line-height:1.65;color:{INK}">{text}</p>'


def layout(preheader: str, title: str, body: str, footer_note: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{BG};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{BG}">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BG}" style="background:{BG}">
  <tr><td align="center" style="padding:32px 14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

      <!-- logo -->
      <tr><td style="padding:0 6px 18px">
        <a href="{SITE}" target="_blank" style="text-decoration:none">
          <img src="{SITE}/email/logo.png" width="36" height="36" alt="" style="vertical-align:middle;border:0;border-radius:9px">
          <span style="font-family:{FONT};font-size:19px;font-weight:800;color:{INK};vertical-align:middle;letter-spacing:-0.3px;padding-left:8px">NyumbaPay</span>
        </a>
      </td></tr>

      <!-- card -->
      <tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid {LINE};border-radius:16px;overflow:hidden">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td height="5" bgcolor="{BRAND}" style="background:{BRAND};font-size:0;line-height:0">&nbsp;</td></tr>
          <tr><td style="padding:34px 34px 30px;font-family:{FONT}">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:800;color:{INK};letter-spacing:-0.4px">{title}</h1>
            {body}
            <p style="margin:26px 0 0;font-size:15.5px;line-height:1.6;color:{INK}">
              Asante,<br><strong>The NyumbaPay Team</strong>
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- footer -->
      <tr><td style="padding:22px 10px 0;font-family:{FONT};font-size:12.5px;line-height:1.7;color:{MUTED};text-align:center">
        {footer_note}<br>
        NyumbaPay · Rent collection for Kenyan landlords · Nairobi, Kenya<br>
        <a href="{SITE}" style="color:{MUTED};text-decoration:underline">nyumbapay.co.ke</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
"""


IGNORE = "If you didn’t request this, you can safely ignore this email — nothing will change."

TEMPLATES = {
    "confirm-signup": dict(
        subject="Welcome to NyumbaPay — please confirm your email",
        preheader="One quick click and your account is ready.",
        title="Karibu to NyumbaPay 👋",
        body=p("Thank you for choosing NyumbaPay. We’re glad to have you on board.")
        + p("Please confirm your email address so we can finish setting up your account — it only takes a second.")
        + button("Confirm my email")
        + note("<strong>Your next steps:</strong><br>1. Add your property and its units<br>"
               "2. Move in your tenants with their phone numbers<br>"
               "3. Share each unit’s account number — and let NyumbaPay do the matching")
        + fallback_link(),
        footer="You’re receiving this because this email was used to create a NyumbaPay account. " + IGNORE,
    ),
    "magic-link": dict(
        subject="Your NyumbaPay sign-in link",
        preheader="Tap to sign in securely — no password needed.",
        title="Here’s your sign-in link",
        body=p("Hello,")
        + p("You asked to sign in to NyumbaPay. Tap the button below and you’ll be taken straight to your dashboard.")
        + button("Sign in to NyumbaPay")
        + note("🔒 For your security, this link works once and expires shortly. Never share it with anyone — "
               "NyumbaPay staff will never ask you for it.")
        + fallback_link(),
        footer="Someone entered {{ .Email }} on the NyumbaPay sign-in page. " + IGNORE,
    ),
    "reset-password": dict(
        subject="Reset your NyumbaPay password",
        preheader="Choose a new password for your account.",
        title="Let’s get you back in",
        body=p("Hello,")
        + p("We received a request to reset the password for your NyumbaPay account "
            "(<strong>{{ .Email }}</strong>). Use the button below to continue.")
        + button("Reset my password")
        + note("🔒 This link can only be used once and expires shortly. If you didn’t ask for this, "
               "your password is still safe and you don’t need to do anything.")
        + fallback_link(),
        footer=IGNORE,
    ),
    "invite-user": dict(
        subject="You’ve been invited to join NyumbaPay",
        preheader="Accept your invitation to start managing rent together.",
        title="You’re invited to NyumbaPay",
        body=p("Hello,")
        + p("You’ve been invited to help manage rent collection on NyumbaPay — tracking payments, arrears "
            "and tenants for the properties you look after.")
        + p("Accept the invitation below to set up your login.")
        + button("Accept invitation")
        + fallback_link(),
        footer="This invitation was sent to {{ .Email }}. If you weren’t expecting it, you can ignore this email.",
    ),
    "change-email": dict(
        subject="Confirm your new NyumbaPay email address",
        preheader="Please confirm the change to your account email.",
        title="Confirm your new email address",
        body=p("Hello,")
        + p("You asked to change the email on your NyumbaPay account from "
            "<strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.")
        + p("Please confirm this change to keep your account secure.")
        + button("Confirm new email")
        + fallback_link(),
        footer="If you didn’t request this change, contact us right away at eugenekaroki@biziirise.com.",
    ),
    "reauthentication": dict(
        subject="Your NyumbaPay verification code",
        preheader="Use this code to confirm it’s you.",
        title="Confirm it’s you",
        body=p("Hello,")
        + p("Enter this code in NyumbaPay to confirm your identity and continue:")
        + f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px">
  <tr><td style="background:{SOFT};border:1px dashed {BRAND};border-radius:12px;padding:16px 26px;
                 font-family:ui-monospace,Menlo,Consolas,monospace;font-size:30px;font-weight:800;letter-spacing:8px;color:{BRAND}">
    {{{{ .Token }}}}
  </td></tr>
</table>"""
        + note("🔒 This code expires shortly. NyumbaPay staff will never ask you for it."),
        footer=IGNORE,
    ),
}

SUPABASE_NAMES = {
    "confirm-signup": "Confirm signup", "magic-link": "Magic Link", "reset-password": "Reset Password",
    "invite-user": "Invite user", "change-email": "Change Email Address", "reauthentication": "Reauthentication",
}

if __name__ == "__main__":
    out = Path(__file__).parent
    rows = []
    for name, t in TEMPLATES.items():
        (out / f"{name}.html").write_text(layout(t["preheader"], t["title"], t["body"], t["footer"]), encoding="utf-8")
        rows.append(f"| {SUPABASE_NAMES[name]} | `{name}.html` | {t['subject']} |")
    (out / "SUBJECTS.md").write_text(
        "# Supabase email templates\n\nSupabase → Authentication → Email Templates. For each template, set the subject and paste "
        "the full HTML file into the message body.\n\n| Supabase template | File | Subject |\n|---|---|---|\n"
        + "\n".join(rows) + "\n", encoding="utf-8")
    print("wrote", len(TEMPLATES), "templates")
