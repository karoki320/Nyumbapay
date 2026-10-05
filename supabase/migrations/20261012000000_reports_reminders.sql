-- NyumbaPay — reports and automatic rent reminders
-- Run after 20261005000000_coowners_admin.sql

-- ─────────────────────────────────────────────────────────────
-- one row per unit, for the three landlord reports
-- ─────────────────────────────────────────────────────────────
create or replace function public.report_units(p_org uuid, p_period date default null)
returns table (
  property_name text, unit_id uuid, unit_label text, lease_id uuid, tenant_name text, tenant_phone text,
  rent bigint, status text, invoiced bigint, paid bigint, balance bigint,
  arrears bigint, credit bigint, months_owing int, oldest_unpaid date, last_payment_at timestamptz,
  tenant_language text, pay_token uuid
)
language plpgsql stable security definer set search_path = public as $$
declare v_period date := date_trunc('month', coalesce(p_period, nairobi_period()))::date;
begin
  if not is_member(p_org) then raise exception 'not allowed'; end if;
  return query
  select p.name, u.id, u.label, l.id, t.full_name, t.phone,
         coalesce(l.rent, u.default_rent),
         case when l.id is null then 'vacant'
              when inv.id is null then 'not invoiced'
              when inv.status = 'paid' then 'paid'
              when inv.amount_paid > 0 then 'partial'
              else 'unpaid' end,
         coalesce(inv.amount, 0)::bigint,
         coalesce(inv.amount_paid, 0)::bigint,
         coalesce(inv.amount - inv.amount_paid, 0)::bigint,
         coalesce(ar.arrears, 0)::bigint,
         coalesce(lb.credit, 0)::bigint,
         coalesce(ar.months, 0)::int,
         ar.oldest,
         lp.last_at,
         t.language,
         l.pay_token
    from units u
    join properties p on p.id = u.property_id
    left join leases l on l.unit_id = u.id and l.status = 'active'
    left join tenants t on t.id = l.tenant_id
    left join invoices inv on inv.lease_id = l.id and inv.period = v_period and inv.status <> 'void'
    left join lateral (
      select sum(i.amount - i.amount_paid) as arrears, count(*) as months, min(i.period) as oldest
        from invoices i where i.lease_id = l.id and i.status = 'open'
    ) ar on true
    left join lease_balances lb on lb.lease_id = l.id
    left join lateral (
      select max(py.received_at) as last_at from payments py where py.lease_id = l.id and py.status = 'allocated'
    ) lp on true
   where u.org_id = p_org
   order by p.name, u.label_canon;
end $$;

-- ─────────────────────────────────────────────────────────────
-- reminder settings + log
-- ─────────────────────────────────────────────────────────────
alter table public.organizations
  add column reminders_enabled boolean not null default true,
  add column reminder_day int not null default 5 check (reminder_day between 1 and 28);

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  lease_id    uuid not null references public.leases(id) on delete cascade,
  sent_on     date not null,                 -- Nairobi date; one reminder per lease per day
  kind        text not null check (kind in ('auto', 'manual')),
  channel     text not null check (channel in ('whatsapp', 'sms', 'none')),
  to_phone    text,
  amount      bigint not null,
  status      text not null check (status in ('sent', 'failed', 'skipped')),
  error       text,
  provider_id text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  unique (lease_id, sent_on)
);
create index reminders_org_idx on public.reminders (org_id, created_at desc);
alter table public.reminders enable row level security;
create policy reminders_read on public.reminders for select using (public.is_member(org_id));

create or replace function public.update_reminder_settings(p_org uuid, p_enabled boolean, p_day int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(p_org, array['owner','admin']::member_role[]) then raise exception 'not allowed'; end if;
  if p_day < 1 or p_day > 28 then raise exception 'reminder day must be between 1 and 28'; end if;
  update organizations set reminders_enabled = p_enabled, reminder_day = p_day where id = p_org;
  perform _audit(p_org, 'org.reminders', p_org, jsonb_build_object('enabled', p_enabled, 'day', p_day));
end $$;

-- Tenants who owe and haven't been reminded today (shared query).
--   p_org null  → every organisation whose reminder day is today (and reminders are on)
--   p_org given → that organisation, regardless of day ("send now")
create or replace function public._reminders_due(p_org uuid)
returns table (org_id uuid, org_name text, paybill text, account text, lease_id uuid, unit_label text,
               tenant_name text, phone text, language text, balance bigint, pay_token uuid)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.paybill, o.account_prefix || '-' || u.label, l.id, u.label,
         t.full_name, kenya_msisdn(t.phone), t.language, lb.arrears::bigint, l.pay_token
    from leases l
    join organizations o on o.id = l.org_id
    join units u on u.id = l.unit_id
    join tenants t on t.id = l.tenant_id
    join lease_balances lb on lb.lease_id = l.id
   where l.status = 'active'
     and lb.arrears > 0
     and kenya_msisdn(t.phone) is not null
     and (case when p_org is null
               then o.reminders_enabled
                    and o.reminder_day = extract(day from (now() at time zone 'Africa/Nairobi'))::int
               else o.id = p_org end)
     and not exists (select 1 from reminders r                -- failed/skipped ones can be retried
                      where r.lease_id = l.id and r.status = 'sent'
                        and r.sent_on = (now() at time zone 'Africa/Nairobi')::date)
   order by o.id, u.label_canon
$$;

-- automatic daily run (cron, service role only)
create or replace function public.reminders_due_all()
returns table (org_id uuid, org_name text, paybill text, account text, lease_id uuid, unit_label text,
               tenant_name text, phone text, language text, balance bigint, pay_token uuid)
language sql stable security definer set search_path = public as $$
  select * from _reminders_due(null)
$$;

-- "send now" for one business (members)
create or replace function public.reminders_due_for(p_org uuid)
returns table (org_id uuid, org_name text, paybill text, account text, lease_id uuid, unit_label text,
               tenant_name text, phone text, language text, balance bigint, pay_token uuid)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_member(p_org) then raise exception 'not allowed'; end if;
  return query select * from _reminders_due(p_org);
end $$;

create or replace function public._log_reminder(
  p_lease uuid, p_kind text, p_channel text, p_to text, p_amount bigint, p_status text,
  p_error text, p_provider_id text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from leases where id = p_lease;
  if v_org is null then raise exception 'lease not found'; end if;
  insert into reminders (org_id, lease_id, sent_on, kind, channel, to_phone, amount, status, error, provider_id, created_by)
  values (v_org, p_lease, (now() at time zone 'Africa/Nairobi')::date, p_kind, p_channel, p_to, p_amount,
          p_status, left(p_error, 500), p_provider_id, p_actor)
  on conflict (lease_id, sent_on) do update
    set status = excluded.status, channel = excluded.channel, error = excluded.error,
        provider_id = excluded.provider_id, created_at = now()
    where reminders.status <> 'sent';
end $$;

-- members log their own "send now" results
create or replace function public.log_reminder(
  p_lease uuid, p_channel text, p_to text, p_amount bigint, p_status text, p_error text, p_provider_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from leases l where l.id = p_lease and is_member(l.org_id)) then raise exception 'not allowed'; end if;
  perform _log_reminder(p_lease, 'manual', p_channel, p_to, p_amount, p_status, p_error, p_provider_id, auth.uid());
end $$;

revoke all on function public.report_units(uuid, date), public.update_reminder_settings(uuid, boolean, int),
  public._reminders_due(uuid), public.reminders_due_all(), public.reminders_due_for(uuid),
  public._log_reminder(uuid, text, text, text, bigint, text, text, text, uuid),
  public.log_reminder(uuid, text, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.report_units(uuid, date), public.update_reminder_settings(uuid, boolean, int),
  public.reminders_due_for(uuid), public.log_reminder(uuid, text, text, bigint, text, text, text)
  to authenticated;
grant execute on function public.reminders_due_all(), public._log_reminder(uuid, text, text, text, bigint, text, text, text, uuid)
  to service_role;
revoke insert, update, delete on public.reminders from anon, authenticated;
