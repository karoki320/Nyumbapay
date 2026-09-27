# NyumbaPay

Rent collection and M-Pesa reconciliation for Kenyan landlords and agents. Multi-landlord SaaS:
each account gets its own account prefix (e.g. `KAR`), so tenants pay with `KAR-A1` and payments
land on the right unit automatically.

**Stack:** Next.js 16 (App Router, server actions) · Supabase (Postgres, Auth, RLS) · Vercel.

## What works

- Sign up / sign in / magic link, onboarding (business name + account prefix)
- Properties, units, tenants, leases (move in, change rent, move out)
- Monthly invoices raised automatically (daily cron, idempotent) + manual "raise missing invoices"
- Payments: cash/bank recorded in-app, M-Pesa C2B via Daraja callback (off until go-live)
- Reconciliation: account number (sloppy typing tolerated) → unit label → payer phone (plain or SHA-256 hashed)
- Duplicate callbacks ignored; unplaceable payments parked in a "Needs assigning" queue, never dropped
- Partial payments, overpayments → credit that auto-applies to next month; reversals and voids with audit log
- Sequential receipts per business (`KAR-000123`)
- Tenant pay page (`/pay/<token>`) — no login, shows balance, paybill and account
- WhatsApp reminder button (click-to-chat, EN/SW) — no API cost
- Owner/admin/staff roles; every table is isolated per business with row-level security

KRA / MRI was removed from this version as requested.

## Local development

```bash
npm install
cp .env.example .env.local           # fill from `npx supabase status`
npx supabase start                   # needs Docker; applies supabase/migrations
npm run dev
```

Tests:

```bash
npm test                             # unit tests (money, M-Pesa parsing)
npm run test:db                      # SQL suite: reconciliation, credit, RLS isolation (needs a local Postgres, see supabase/tests/run.sh)
```

## Deploy to production

1. **Supabase** — create a project (region closest to Kenya, e.g. `eu-west` or `af-south` if available).
   - `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - Auth → URL configuration: Site URL = your domain; add `https://<domain>/auth/callback` to redirect URLs
   - Auth → SMTP: plug in Resend so confirmation emails come from your domain
   - Turn on "Leaked password protection" and keep email confirmation ON
2. **Vercel** — import the repo, set every variable from `.env.example`
   (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `MPESA_CALLBACK_SECRET` are server-only). Add your domain.
   `vercel.json` schedules the invoice cron daily at 00:05 Nairobi time.
3. Smoke test: sign up, add a property/unit, move in a tenant, record a cash payment, open the pay link.

## M-Pesa (Daraja) go-live checklist

Until this is done, keep `MPESA_ENABLED=false` — the rest of the app works with cash/bank entries.

1. Create an app on developer.safaricom.co.ke, test C2B on sandbox (shortcode `600000`).
2. Register callback URLs (C2B *Register URL*, `ResponseType: Completed`):
   - Confirmation: `https://<domain>/api/hooks/c2b/confirmation?secret=<MPESA_CALLBACK_SECRET>`
   - Validation: `https://<domain>/api/hooks/c2b/validation?secret=<MPESA_CALLBACK_SECRET>`
   (The paths deliberately avoid the words "mpesa"/"safaricom", which Daraja rejects in callback URLs.)
3. Apply for go-live with the landlord's paybill (needs the paybill owner's admin/business manager on the Safaricom portal).
4. When a landlord enters their paybill in Settings it shows *awaiting verification*. After you confirm they own it, run in the SQL editor:
   ```sql
   update organizations set paybill_verified = true where paybill = '123456';
   select replay_unrouted_mpesa();   -- re-processes callbacks that arrived before verification
   ```
5. Optional hardening: set `MPESA_ALLOWED_IPS` to Safaricom's published callback IPs.

Routing rule: a callback goes to the business whose **verified** paybill received it; otherwise to the business whose
account prefix starts the account number (for a shared platform paybill). Raw callbacks are stored in `mpesa_events`.

## Not in v1 (next up)

- STK Push from the pay page · automatic WhatsApp Cloud API receipts/reminders · SMS fallback
- Team invites (roles exist; add members via SQL for now) · switching between several businesses
- Pro-rated first month (move-ins are invoiced the full month) · deposit refunds · expenses
- CSV import of units/tenants · PDF receipts · platform billing for landlords

## Data model (money in cents)

`organizations → properties → units → leases ← tenants`; `leases → invoices`; `payments → allocations → invoices`.
Money tables are read-only to the app; all writes go through SQL functions (`record_cash_payment`,
`assign_payment`, `reverse_payment`, `void_invoice`, `generate_invoices`, `ingest_mpesa_c2b`) so balances can't drift.
"# Nyumbapay" 
