-- NyumbaPay — initial schema
-- Multi-landlord rent collection: organisations, properties, units, tenants,
-- leases, monthly invoices, payments (M-Pesa / cash / bank), allocations.
-- All money is stored as bigint cents (KSh 9,000 = 900000).

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.canon(s text) returns text
language sql immutable parallel safe as $$
  select upper(regexp_replace(coalesce(s, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- '0712 345 678' | '+254712345678' | '712345678' → '254712345678'
create or replace function public.kenya_msisdn(p text) returns text
language sql immutable parallel safe as $$
  select case
    when d ~ '^254[17][0-9]{8}$' then d
    when d ~ '^0[17][0-9]{8}$'   then '254' || substr(d, 2)
    when d ~ '^[17][0-9]{8}$'    then '254' || d
    else nullif(d, '')
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x
$$;

create or replace function public.nairobi_period(ts timestamptz default now()) returns date
language sql stable as $$
  select date_trunc('month', ts at time zone 'Africa/Nairobi')::date
$$;

-- ─────────────────────────────────────────────────────────────
-- organisations & membership
-- ─────────────────────────────────────────────────────────────
create table public.organizations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) between 2 and 120),
  account_prefix   text not null unique check (account_prefix ~ '^[A-Z]{2,6}$'),
  paybill          text check (paybill ~ '^[0-9]{5,7}$'),
  paybill_verified boolean not null default false,   -- set by platform staff only
  rent_due_day     int not null default 5 check (rent_due_day between 1 and 28),
  receipt_seq      bigint not null default 0,
  created_at       timestamptz not null default now()
);
-- a verified paybill can only belong to one organisation
create unique index organizations_paybill_verified_uq
  on public.organizations (paybill) where paybill_verified;

create type public.member_role as enum ('owner', 'admin', 'staff');

create table public.memberships (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where org_id = p_org and user_id = auth.uid())
$$;

create or replace function public.has_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships
                 where org_id = p_org and user_id = auth.uid() and role = any(p_roles))
$$;

-- ─────────────────────────────────────────────────────────────
-- properties, units, tenants, leases
-- ─────────────────────────────────────────────────────────────
create table public.properties (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 120),
  location   text,
  created_at timestamptz not null default now(),
  unique (org_id, id)
);

create table public.units (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  property_id  uuid not null,
  label        text not null check (length(trim(label)) between 1 and 20),
  label_canon  text generated always as (public.canon(label)) stored,
  default_rent bigint not null default 0 check (default_rent >= 0),
  created_at   timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, label_canon),            -- account numbers must be unambiguous
  check (label_canon <> ''),
  foreign key (org_id, property_id) references public.properties(org_id, id) on delete restrict
);

create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  full_name   text not null check (length(trim(full_name)) between 2 and 120),
  phone       text,
  msisdn      text generated always as (public.kenya_msisdn(phone)) stored,
  -- Safaricom C2B callbacks may send a SHA-256 of the MSISDN instead of the number
  msisdn_hash text generated always as
                (encode(extensions.digest(coalesce(public.kenya_msisdn(phone), ''), 'sha256'), 'hex')) stored,
  email       text,
  language    text not null default 'en' check (language in ('en', 'sw')),
  created_at  timestamptz not null default now(),
  unique (org_id, id)
);
create index tenants_msisdn_idx on public.tenants (org_id, msisdn);
create index tenants_msisdn_hash_idx on public.tenants (org_id, msisdn_hash);

create table public.leases (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  unit_id    uuid not null,
  tenant_id  uuid not null,
  rent       bigint not null check (rent > 0),
  deposit    bigint not null default 0 check (deposit >= 0),
  start_date date not null default current_date,
  end_date   date,
  status     text not null default 'active' check (status in ('active', 'ended')),
  pay_token  uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (org_id, id),
  check (end_date is null or end_date >= start_date),
  foreign key (org_id, unit_id)   references public.units(org_id, id)   on delete restrict,
  foreign key (org_id, tenant_id) references public.tenants(org_id, id) on delete restrict
);
create unique index leases_one_active_per_unit on public.leases (unit_id) where status = 'active';
create index leases_tenant_idx on public.leases (tenant_id);

-- ─────────────────────────────────────────────────────────────
-- money: invoices, payments, allocations
-- ─────────────────────────────────────────────────────────────
create table public.invoices (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  lease_id    uuid not null,
  period      date not null check (extract(day from period) = 1),
  amount      bigint not null check (amount > 0),
  amount_paid bigint not null default 0 check (amount_paid >= 0),
  due_date    date not null,
  status      text not null default 'open' check (status in ('open', 'paid', 'void')),
  created_at  timestamptz not null default now(),
  unique (lease_id, period),
  check (amount_paid <= amount),
  foreign key (org_id, lease_id) references public.leases(org_id, id) on delete restrict
);
create index invoices_org_period_idx on public.invoices (org_id, period);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  source      text not null check (source in ('mpesa', 'cash', 'bank')),
  provider_ref text not null,                      -- M-Pesa TransID / receipt book no.
  amount      bigint not null check (amount > 0),
  payer_name  text,
  payer_phone text,
  bill_ref    text,
  received_at timestamptz not null default now(),
  status      text not null check (status in ('allocated', 'unmatched', 'reversed')),
  lease_id    uuid,
  matched_by  text,
  receipt_no  text,
  recorded_by uuid references auth.users(id),
  reversed_reason text,
  raw         jsonb,
  created_at  timestamptz not null default now(),
  unique (org_id, source, provider_ref),            -- idempotency: callbacks can repeat
  foreign key (org_id, lease_id) references public.leases(org_id, id) on delete restrict,
  check (status <> 'allocated' or lease_id is not null)
);
create index payments_org_received_idx on public.payments (org_id, received_at desc);
create index payments_lease_idx on public.payments (lease_id);
create unique index payments_receipt_uq on public.payments (org_id, receipt_no) where receipt_no is not null;

create table public.allocations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount     bigint not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index allocations_payment_idx on public.allocations (payment_id);
create index allocations_invoice_idx on public.allocations (invoice_id);

create table public.audit_log (
  id        bigint generated always as identity primary key,
  org_id    uuid not null references public.organizations(id) on delete cascade,
  actor     uuid,
  action    text not null,
  entity_id uuid,
  data      jsonb,
  at        timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log (org_id, at desc);

-- raw M-Pesa callbacks, kept for support/debugging (service role only)
create table public.mpesa_events (
  id          bigint generated always as identity primary key,
  kind        text not null,
  shortcode   text,
  trans_id    text,
  org_id      uuid references public.organizations(id) on delete set null,
  payment_id  uuid references public.payments(id) on delete set null,
  payload     jsonb not null,
  error       text,
  received_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- views (respect caller's RLS)
-- ─────────────────────────────────────────────────────────────
create view public.lease_balances with (security_invoker = true) as
select l.id as lease_id, l.org_id, l.unit_id, l.tenant_id, l.rent, l.status, l.pay_token,
       u.label as unit_label, p.name as property_name, p.id as property_id,
       t.full_name as tenant_name, t.phone as tenant_phone,
       coalesce(inv.arrears, 0) as arrears,
       coalesce(pay.received, 0) - coalesce(pay.allocated, 0) as credit
from public.leases l
join public.units u      on u.id = l.unit_id
join public.properties p on p.id = u.property_id
join public.tenants t    on t.id = l.tenant_id
left join lateral (
  select sum(i.amount - i.amount_paid) as arrears
  from public.invoices i where i.lease_id = l.id and i.status = 'open'
) inv on true
left join lateral (
  select sum(py.amount) as received,
         (select coalesce(sum(a.amount), 0) from public.allocations a
            join public.payments p2 on p2.id = a.payment_id
          where p2.lease_id = l.id and p2.status = 'allocated') as allocated
  from public.payments py where py.lease_id = l.id and py.status = 'allocated'
) pay on true;

-- ─────────────────────────────────────────────────────────────
-- core money functions
-- ─────────────────────────────────────────────────────────────
create or replace function public._audit(p_org uuid, p_action text, p_entity uuid, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (org_id, actor, action, entity_id, data)
  values (p_org, auth.uid(), p_action, p_entity, p_data)
$$;

create or replace function public._next_receipt(p_org uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_seq bigint; v_prefix text;
begin
  update organizations set receipt_seq = receipt_seq + 1
   where id = p_org returning receipt_seq, account_prefix into v_seq, v_prefix;
  return v_prefix || '-' || lpad(v_seq::text, 6, '0');
end $$;

-- Apply every unallocated shilling on a lease to its open invoices, oldest first.
-- Handles partial payments, overpayments (credit) and later invoices uniformly.
create or replace function public._allocate_lease(p_lease uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r_pay record; r_inv record; v_left bigint; v_amt bigint; v_org uuid;
begin
  select org_id into v_org from leases where id = p_lease for update;   -- serialise per lease
  if v_org is null then return; end if;

  for r_pay in
    select py.id,
           py.amount - coalesce((select sum(a.amount) from allocations a where a.payment_id = py.id), 0) as left_amt
      from payments py
     where py.lease_id = p_lease and py.status = 'allocated'
     order by py.received_at, py.created_at
  loop
    v_left := r_pay.left_amt;
    continue when v_left <= 0;
    for r_inv in
      select i.id, i.amount - i.amount_paid as due
        from invoices i
       where i.lease_id = p_lease and i.status = 'open'
       order by i.period, i.created_at
    loop
      exit when v_left <= 0;
      continue when r_inv.due <= 0;
      v_amt := least(v_left, r_inv.due);
      insert into allocations (org_id, payment_id, invoice_id, amount)
      values (v_org, r_pay.id, r_inv.id, v_amt);
      update invoices
         set amount_paid = amount_paid + v_amt,
             status = case when amount_paid + v_amt >= amount then 'paid' else 'open' end
       where id = r_inv.id;
      v_left := v_left - v_amt;
    end loop;
  end loop;
end $$;

-- Work out which lease a payment belongs to.
create or replace function public.match_payment(p_org uuid, p_bill_ref text, p_phone text)
returns table (lease_id uuid, matched_by text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_ref text := canon(p_bill_ref);
  v_prefix text;
  v_unit uuid;
  v_lease uuid;
  v_msisdn text := kenya_msisdn(p_phone);
  v_n int;
begin
  select account_prefix into v_prefix from organizations where id = p_org;

  -- 1. KAR-A1 / kar a1 / KARA1
  if v_ref like v_prefix || '%' and length(v_ref) > length(v_prefix) then
    select u.id into v_unit from units u
     where u.org_id = p_org and u.label_canon = substr(v_ref, length(v_prefix) + 1);
    if v_unit is not null then
      select l.id into v_lease from leases l where l.unit_id = v_unit and l.status = 'active';
      if v_lease is not null then
        return query select v_lease, 'account number'::text; return;
      end if;
      return query select null::uuid, 'no active lease'::text; return;
    end if;
  end if;

  -- 2. just the unit label: "A1"
  if v_ref <> '' then
    select l.id into v_lease
      from units u join leases l on l.unit_id = u.id and l.status = 'active'
     where u.org_id = p_org and u.label_canon = v_ref;
    if v_lease is not null then
      return query select v_lease, 'unit label'::text; return;
    end if;
  end if;

  -- 3. payer phone (plain or SHA-256 hashed) — only if it points at exactly one lease
  if coalesce(p_phone, '') <> '' then
    select count(*), min(l.id::text)::uuid into v_n, v_lease
      from tenants t join leases l on l.tenant_id = t.id and l.status = 'active'
     where t.org_id = p_org
       and (t.msisdn = v_msisdn or t.msisdn_hash = lower(p_phone));
    if v_n = 1 then
      return query select v_lease, 'phone number'::text; return;
    end if;
  end if;

  return query select null::uuid, 'no match'::text;
end $$;

-- Single entry point for every incoming payment. Idempotent on (org, source, ref).
create or replace function public._ingest_payment(
  p_org uuid, p_source text, p_ref text, p_amount bigint,
  p_payer_name text, p_payer_phone text, p_bill_ref text,
  p_received_at timestamptz, p_raw jsonb,
  p_lease uuid default null, p_actor uuid default null)
returns table (payment_id uuid, status text, receipt_no text, duplicate boolean, matched_by text, lease_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_lease uuid; v_how text; v_receipt text; v_status text;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if coalesce(trim(p_ref), '') = '' then raise exception 'payment reference required'; end if;

  -- duplicate?
  select py.id, py.status, py.receipt_no, py.matched_by, py.lease_id
    into v_id, v_status, v_receipt, v_how, v_lease
    from payments py
   where py.org_id = p_org and py.source = p_source and py.provider_ref = trim(p_ref);
  if v_id is not null then
    return query select v_id, v_status, v_receipt, true, v_how, v_lease; return;
  end if;

  if p_lease is not null then
    v_lease := p_lease; v_how := 'recorded manually';
  else
    select m.lease_id, m.matched_by into v_lease, v_how
      from match_payment(p_org, p_bill_ref, p_payer_phone) m;
  end if;

  if v_lease is not null then
    v_status := 'allocated';
    v_receipt := _next_receipt(p_org);
  else
    v_status := 'unmatched';
  end if;

  insert into payments (org_id, source, provider_ref, amount, payer_name, payer_phone, bill_ref,
                        received_at, status, lease_id, matched_by, receipt_no, recorded_by, raw)
  values (p_org, p_source, trim(p_ref), p_amount, p_payer_name, p_payer_phone, p_bill_ref,
          coalesce(p_received_at, now()), v_status, v_lease, v_how, v_receipt, p_actor, p_raw)
  on conflict (org_id, source, provider_ref) do nothing
  returning id into v_id;

  if v_id is null then  -- lost a race with an identical callback
    return query select py.id, py.status, py.receipt_no, true, py.matched_by, py.lease_id
      from payments py where py.org_id = p_org and py.source = p_source and py.provider_ref = trim(p_ref);
    return;
  end if;

  if v_lease is not null then perform _allocate_lease(v_lease); end if;
  insert into audit_log (org_id, actor, action, entity_id, data)
  values (p_org, p_actor, 'payment.received', v_id,
          jsonb_build_object('amount', p_amount, 'source', p_source, 'ref', p_ref, 'status', v_status));

  return query select v_id, v_status, v_receipt, false, v_how, v_lease;
end $$;

-- ─────────────────────────────────────────────────────────────
-- functions called by signed-in users
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_organization(p_name text, p_prefix text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into organizations (name, account_prefix)
  values (trim(p_name), upper(trim(p_prefix))) returning id into v_id;
  insert into memberships (org_id, user_id, role) values (v_id, auth.uid(), 'owner');
  perform _audit(v_id, 'org.created', v_id, jsonb_build_object('name', p_name));
  return v_id;
end $$;

create or replace function public.update_org_settings(p_org uuid, p_name text, p_paybill text, p_due_day int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(p_org, array['owner','admin']::member_role[]) then raise exception 'not allowed'; end if;
  update organizations
     set name = trim(p_name),
         rent_due_day = p_due_day,
         paybill_verified = case when paybill is not distinct from nullif(trim(p_paybill), '')
                                 then paybill_verified else false end,
         paybill = nullif(trim(p_paybill), '')
   where id = p_org;
  perform _audit(p_org, 'org.settings', p_org, jsonb_build_object('paybill', p_paybill, 'due_day', p_due_day));
end $$;

create or replace function public._generate_invoices(p_org uuid, p_period date)
returns int language plpgsql security definer set search_path = public as $$
declare v_due int; v_n int; r record;
begin
  p_period := date_trunc('month', p_period)::date;
  select rent_due_day into v_due from organizations where id = p_org;
  with ins as (
    insert into invoices (org_id, lease_id, period, amount, due_date)
    select l.org_id, l.id, p_period, l.rent, p_period + (v_due - 1)
      from leases l
     where l.org_id = p_org and l.status = 'active'
       and l.start_date <= (p_period + interval '1 month - 1 day')::date
       and (l.end_date is null or l.end_date >= p_period)
    on conflict (lease_id, period) do nothing
    returning lease_id
  )
  select count(*) into v_n from ins;
  -- apply any credit sitting on these leases
  for r in select id from leases where org_id = p_org and status = 'active' loop
    perform _allocate_lease(r.id);
  end loop;
  return v_n;
end $$;

create or replace function public.generate_invoices(p_org uuid, p_period date default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not has_role(p_org, array['owner','admin']::member_role[]) then raise exception 'not allowed'; end if;
  v_n := _generate_invoices(p_org, coalesce(p_period, nairobi_period()));
  perform _audit(p_org, 'invoices.generated', null, jsonb_build_object('period', p_period, 'count', v_n));
  return v_n;
end $$;

-- cron: every organisation, current Nairobi month
create or replace function public.generate_invoices_all(p_period date default null)
returns int language plpgsql security definer set search_path = public as $$
declare r record; v_total int := 0;
begin
  for r in select id from organizations loop
    v_total := v_total + _generate_invoices(r.id, coalesce(p_period, nairobi_period()));
  end loop;
  return v_total;
end $$;

create or replace function public.record_cash_payment(
  p_lease uuid, p_amount bigint, p_ref text default null, p_source text default 'cash',
  p_received_at timestamptz default null)
returns table (payment_id uuid, status text, receipt_no text, duplicate boolean, matched_by text, lease_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select l.org_id into v_org from leases l where l.id = p_lease;
  if v_org is null or not is_member(v_org) then raise exception 'not allowed'; end if;
  if p_source not in ('cash', 'bank') then raise exception 'invalid source'; end if;
  return query select * from _ingest_payment(
    v_org, p_source,
    coalesce(nullif(trim(p_ref), ''), upper(p_source) || '-' || gen_random_uuid()::text),
    p_amount, null, null, null, coalesce(p_received_at, now()), null, p_lease, auth.uid());
end $$;

create or replace function public.assign_payment(p_payment uuid, p_lease uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_status text; v_receipt text;
begin
  select org_id, status into v_org, v_status from payments where id = p_payment for update;
  if v_org is null or not is_member(v_org) then raise exception 'not allowed'; end if;
  if v_status <> 'unmatched' then raise exception 'payment is already assigned'; end if;
  if not exists (select 1 from leases where id = p_lease and org_id = v_org) then
    raise exception 'lease not found';
  end if;
  v_receipt := _next_receipt(v_org);
  update payments set status = 'allocated', lease_id = p_lease, matched_by = 'assigned manually',
                      receipt_no = v_receipt, recorded_by = auth.uid()
   where id = p_payment;
  perform _allocate_lease(p_lease);
  perform _audit(v_org, 'payment.assigned', p_payment, jsonb_build_object('lease', p_lease));
  return v_receipt;
end $$;

create or replace function public.reverse_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_lease uuid; r record;
begin
  select org_id, lease_id into v_org, v_lease from payments where id = p_payment and status <> 'reversed' for update;
  if v_org is null or not has_role(v_org, array['owner','admin']::member_role[]) then
    raise exception 'not allowed';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required'; end if;
  if v_lease is not null then perform 1 from leases where id = v_lease for update; end if;
  for r in select invoice_id, amount from allocations where payment_id = p_payment loop
    update invoices set amount_paid = amount_paid - r.amount,
                        status = case when status = 'void' then 'void' else 'open' end
     where id = r.invoice_id;
  end loop;
  delete from allocations where payment_id = p_payment;
  update payments set status = 'reversed', reversed_reason = trim(p_reason) where id = p_payment;
  if v_lease is not null then perform _allocate_lease(v_lease); end if;
  perform _audit(v_org, 'payment.reversed', p_payment, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.void_invoice(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_lease uuid; r record;
begin
  select org_id, lease_id into v_org, v_lease from invoices where id = p_invoice and status <> 'void' for update;
  if v_org is null or not has_role(v_org, array['owner','admin']::member_role[]) then
    raise exception 'not allowed';
  end if;
  perform 1 from leases where id = v_lease for update;
  delete from allocations where invoice_id = p_invoice;       -- money goes back to credit
  update invoices set status = 'void', amount_paid = 0 where id = p_invoice;
  perform _allocate_lease(v_lease);
  perform _audit(v_org, 'invoice.voided', p_invoice, null);
end $$;

-- public tenant pay page — exposes only what the tenant needs
create or replace function public.get_pay_info(p_token uuid)
returns table (org_name text, property_name text, unit_label text, tenant_first_name text,
               balance bigint, paybill text, account text)
language sql stable security definer set search_path = public as $$
  select o.name, p.name, u.label, split_part(t.full_name, ' ', 1),
         coalesce((select sum(i.amount - i.amount_paid) from invoices i
                    where i.lease_id = l.id and i.status = 'open'), 0),
         o.paybill, o.account_prefix || '-' || u.label
    from leases l
    join units u on u.id = l.unit_id
    join properties p on p.id = u.property_id
    join tenants t on t.id = l.tenant_id
    join organizations o on o.id = l.org_id
   where l.pay_token = p_token and l.status = 'active'
$$;

-- M-Pesa C2B routing: dedicated verified paybill first, otherwise the account prefix
create or replace function public.route_c2b(p_shortcode text, p_bill_ref text) returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from organizations where paybill = p_shortcode and paybill_verified limit 1),
    (select id from organizations
      where canon(p_bill_ref) like account_prefix || '%'
      order by length(account_prefix) desc limit 1))
$$;

create or replace function public.ingest_mpesa_c2b(
  p_shortcode text, p_trans_id text, p_amount bigint, p_bill_ref text,
  p_msisdn text, p_payer_name text, p_trans_time timestamptz, p_raw jsonb)
returns table (payment_id uuid, status text, receipt_no text, duplicate boolean, matched_by text, lease_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  v_org := route_c2b(p_shortcode, p_bill_ref);
  if v_org is null then
    if not exists (select 1 from mpesa_events
                    where trans_id = p_trans_id and error = 'no organisation for shortcode/account') then
      insert into mpesa_events (kind, shortcode, trans_id, payload, error)
      values ('c2b.confirmation', p_shortcode, p_trans_id, p_raw, 'no organisation for shortcode/account');
    end if;
    return;
  end if;
  return query select * from _ingest_payment(v_org, 'mpesa', p_trans_id, p_amount, p_payer_name,
                                             p_msisdn, p_bill_ref, p_trans_time, p_raw, null, null);
end $$;

-- After verifying a paybill, re-run callbacks that arrived before it could be routed.
create or replace function public.replay_unrouted_mpesa() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_n int := 0; v_pay uuid;
begin
  for r in select * from mpesa_events
            where error = 'no organisation for shortcode/account' and payment_id is null
            order by id for update skip locked loop
    select i.payment_id into v_pay from ingest_mpesa_c2b(
      r.shortcode, r.trans_id,
      round((r.payload->>'TransAmount')::numeric * 100)::bigint,
      coalesce(r.payload->>'BillRefNumber', ''), coalesce(r.payload->>'MSISDN', ''),
      trim(concat_ws(' ', r.payload->>'FirstName', r.payload->>'MiddleName', r.payload->>'LastName')),
      coalesce(to_timestamp(r.payload->>'TransTime', 'YYYYMMDDHH24MISS')::timestamp at time zone 'Africa/Nairobi', r.received_at),
      r.payload) i;
    if v_pay is not null then
      update mpesa_events set payment_id = v_pay, error = 'replayed' where id = r.id;
      v_n := v_n + 1;
    end if;
    v_pay := null;
  end loop;
  return v_n;
end $$;

-- ─────────────────────────────────────────────────────────────
-- row level security
-- ─────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;
alter table public.properties    enable row level security;
alter table public.units         enable row level security;
alter table public.tenants       enable row level security;
alter table public.leases        enable row level security;
alter table public.invoices      enable row level security;
alter table public.payments      enable row level security;
alter table public.allocations   enable row level security;
alter table public.audit_log     enable row level security;
alter table public.mpesa_events  enable row level security;   -- no policies: service role only

create policy org_read on public.organizations for select using (public.is_member(id));
create policy mem_read on public.memberships for select using (public.is_member(org_id));

create policy prop_all on public.properties for all
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy unit_all on public.units for all
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy tenant_all on public.tenants for all
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy lease_all on public.leases for all
  using (public.is_member(org_id)) with check (public.is_member(org_id));

-- money tables: read-only to members; writes happen through the functions above
create policy inv_read   on public.invoices    for select using (public.is_member(org_id));
create policy pay_read   on public.payments    for select using (public.is_member(org_id));
create policy alloc_read on public.allocations for select using (public.is_member(org_id));
create policy audit_read on public.audit_log   for select using (public.is_member(org_id));

-- ─────────────────────────────────────────────────────────────
-- grants
-- ─────────────────────────────────────────────────────────────
revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function public.canon(text), public.kenya_msisdn(text), public.nairobi_period(timestamptz)
  to anon, authenticated;
grant execute on function public.is_member(uuid), public.has_role(uuid, public.member_role[])
  to anon, authenticated;
grant execute on function
  public.create_organization(text, text),
  public.update_org_settings(uuid, text, text, int),
  public.generate_invoices(uuid, date),
  public.record_cash_payment(uuid, bigint, text, text, timestamptz),
  public.assign_payment(uuid, uuid),
  public.reverse_payment(uuid, text),
  public.void_invoice(uuid)
  to authenticated;
grant execute on function public.get_pay_info(uuid) to anon, authenticated;

grant execute on function
  public.generate_invoices_all(date),
  public.replay_unrouted_mpesa(),
  public.ingest_mpesa_c2b(text, text, bigint, text, text, text, timestamptz, jsonb)
  to service_role;

revoke insert, update, delete on public.invoices, public.payments, public.allocations,
  public.audit_log, public.organizations, public.memberships from anon, authenticated;
revoke all on public.mpesa_events from anon, authenticated;
