-- NyumbaPay — co-owners (invitations) and platform super admin
-- Run after 20260926000000_init.sql

-- ─────────────────────────────────────────────────────────────
-- platform admins (super admin) — identified by confirmed email
-- ─────────────────────────────────────────────────────────────
create table public.platform_admins (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;   -- no policies: invisible to the app
insert into public.platform_admins (email) values ('biziirise@gmail.com');

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from platform_admins pa
    join auth.users u on lower(u.email) = pa.email
    where u.id = auth.uid() and u.email_confirmed_at is not null)
$$;

-- super admins act with owner rights inside every account
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where org_id = p_org and user_id = auth.uid())
      or is_platform_admin()
$$;

create or replace function public.has_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships
                 where org_id = p_org and user_id = auth.uid() and role = any(p_roles))
      or is_platform_admin()
$$;

-- ─────────────────────────────────────────────────────────────
-- co-owner invitations
-- ─────────────────────────────────────────────────────────────
create table public.org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token       uuid not null unique default gen_random_uuid(),
  role        public.member_role not null default 'owner',
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at  timestamptz
);
create unique index org_invites_one_pending
  on public.org_invites (org_id, email) where accepted_at is null and revoked_at is null;
alter table public.org_invites enable row level security;
create policy invite_read on public.org_invites for select using (public.is_member(org_id));

create or replace function public.invite_member(p_org uuid, p_email text)
returns table (invite_id uuid, token uuid)
language plpgsql security definer set search_path = public, auth as $$
declare v_email text := lower(trim(p_email)); v_id uuid; v_token uuid;
begin
  if not has_role(p_org, array['owner']::member_role[]) then raise exception 'not allowed'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'enter a valid email address'; end if;
  if exists (select 1 from memberships m join auth.users u on u.id = m.user_id
             where m.org_id = p_org and lower(u.email) = v_email) then
    raise exception 'that person already has access';
  end if;
  update org_invites set revoked_at = now()
   where org_id = p_org and email = v_email and accepted_at is null and revoked_at is null;
  insert into org_invites (org_id, email, invited_by) values (p_org, v_email, auth.uid())
  returning id, org_invites.token into v_id, v_token;
  perform _audit(p_org, 'member.invited', v_id, jsonb_build_object('email', v_email));
  return query select v_id, v_token;
end $$;

create or replace function public.get_invite(p_token uuid)
returns table (org_name text, email text, inviter_email text, status text)
language sql stable security definer set search_path = public, auth as $$
  select o.name, i.email, u.email,
         case when i.accepted_at is not null then 'accepted'
              when i.revoked_at is not null then 'revoked'
              when i.expires_at < now() then 'expired'
              else 'pending' end
    from org_invites i
    join organizations o on o.id = i.org_id
    left join auth.users u on u.id = i.invited_by
   where i.token = p_token
$$;

create or replace function public.accept_invite(p_token uuid) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare r org_invites; v_email text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into r from org_invites where token = p_token for update;
  if r.id is null then raise exception 'invitation not found'; end if;
  if r.revoked_at is not null then raise exception 'this invitation was cancelled'; end if;
  if r.accepted_at is not null then raise exception 'this invitation has already been used'; end if;
  if r.expires_at < now() then raise exception 'this invitation has expired — ask for a new one'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from r.email then
    raise exception 'this invitation was sent to %', r.email;
  end if;
  insert into memberships (org_id, user_id, role) values (r.org_id, auth.uid(), r.role)
  on conflict (org_id, user_id) do nothing;
  update org_invites set accepted_at = now(), accepted_by = auth.uid() where id = r.id;
  perform _audit(r.org_id, 'member.joined', r.id, jsonb_build_object('email', r.email));
  return r.org_id;
end $$;

create or replace function public.revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from org_invites where id = p_invite and accepted_at is null and revoked_at is null;
  if v_org is null or not has_role(v_org, array['owner']::member_role[]) then raise exception 'not allowed'; end if;
  update org_invites set revoked_at = now() where id = p_invite;
  perform _audit(v_org, 'member.invite_cancelled', p_invite, null);
end $$;

create or replace function public.org_members(p_org uuid)
returns table (user_id uuid, email text, role public.member_role, joined_at timestamptz, is_you boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_member(p_org) then raise exception 'not allowed'; end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at, m.user_id = auth.uid()
      from memberships m join auth.users u on u.id = m.user_id
     where m.org_id = p_org order by m.created_at;
end $$;

create or replace function public.remove_member(p_org uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_role member_role; v_owners int; v_email text;
begin
  if not (has_role(p_org, array['owner']::member_role[]) or p_user = auth.uid()) then
    raise exception 'not allowed';
  end if;
  select role into v_role from memberships where org_id = p_org and user_id = p_user for update;
  if v_role is null then raise exception 'not found'; end if;
  select count(*) into v_owners from memberships where org_id = p_org and role = 'owner';
  if v_role = 'owner' and v_owners <= 1 then
    raise exception 'an account must keep at least one owner';
  end if;
  select email into v_email from auth.users where id = p_user;
  delete from memberships where org_id = p_org and user_id = p_user;
  perform _audit(p_org, 'member.removed', p_user, jsonb_build_object('email', v_email));
end $$;

-- ─────────────────────────────────────────────────────────────
-- super admin read models & actions
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare v_period date := nairobi_period(); v jsonb;
begin
  if not is_platform_admin() then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'landlords',        (select count(*) from organizations),
    'landlords_7d',     (select count(*) from organizations where created_at > now() - interval '7 days'),
    'users',            (select count(*) from auth.users),
    'users_7d',         (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'properties',       (select count(*) from properties),
    'units',            (select count(*) from units),
    'occupied',         (select count(*) from leases where status = 'active'),
    'tenants',          (select count(distinct tenant_id) from leases where status = 'active'),
    'invoiced_month',   (select coalesce(sum(amount), 0) from invoices where period = v_period and status <> 'void'),
    'collected_month',  (select coalesce(sum(amount), 0) from payments where status = 'allocated'
                          and received_at >= (v_period::timestamp at time zone 'Africa/Nairobi')),
    'collected_all',    (select coalesce(sum(amount), 0) from payments where status = 'allocated'),
    'payments_month',   (select count(*) from payments where status = 'allocated'
                          and received_at >= (v_period::timestamp at time zone 'Africa/Nairobi')),
    'unmatched',        (select count(*) from payments where status = 'unmatched'),
    'paybills_pending', (select count(*) from organizations where paybill is not null and not paybill_verified),
    'unrouted',         (select count(*) from mpesa_events
                          where error = 'no organisation for shortcode/account' and payment_id is null)
  ) into v;
  return v;
end $$;

create or replace function public.admin_orgs(p_search text default null)
returns table (id uuid, name text, account_prefix text, paybill text, paybill_verified boolean, created_at timestamptz,
               owners text, members int, units int, occupied int, collected_month bigint, arrears bigint,
               unmatched int, last_activity timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
declare v_from timestamptz := nairobi_period()::timestamp at time zone 'Africa/Nairobi'; q text := '%' || lower(coalesce(trim(p_search), '')) || '%';
begin
  if not is_platform_admin() then raise exception 'not allowed'; end if;
  return query
  select o.id, o.name, o.account_prefix, o.paybill, o.paybill_verified, o.created_at,
         (select string_agg(u.email, ', ' order by m.created_at) from memberships m join auth.users u on u.id = m.user_id
           where m.org_id = o.id)::text,
         (select count(*)::int from memberships m where m.org_id = o.id),
         (select count(*)::int from units x where x.org_id = o.id),
         (select count(*)::int from leases l where l.org_id = o.id and l.status = 'active'),
         (select coalesce(sum(p.amount), 0)::bigint from payments p where p.org_id = o.id and p.status = 'allocated' and p.received_at >= v_from),
         (select coalesce(sum(i.amount - i.amount_paid), 0)::bigint from invoices i where i.org_id = o.id and i.status = 'open'),
         (select count(*)::int from payments p where p.org_id = o.id and p.status = 'unmatched'),
         (select max(a.at) from audit_log a where a.org_id = o.id)
    from organizations o
   where lower(o.name) like q or lower(o.account_prefix) like q or coalesce(o.paybill, '') like q
      or exists (select 1 from memberships m join auth.users u on u.id = m.user_id
                  where m.org_id = o.id and lower(u.email) like q)
   order by o.created_at desc;
end $$;

create or replace function public.admin_activity(p_org uuid default null, p_limit int default 60)
returns table (at timestamptz, org_id uuid, org_name text, actor_email text, by_admin boolean, action text, data jsonb)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_platform_admin() then raise exception 'not allowed'; end if;
  return query
  select a.at, a.org_id, o.name, u.email::text,
         exists (select 1 from platform_admins pa where pa.email = lower(u.email)),
         a.action, a.data
    from audit_log a
    join organizations o on o.id = a.org_id
    left join auth.users u on u.id = a.actor
   where p_org is null or a.org_id = p_org
   order by a.at desc
   limit least(greatest(p_limit, 1), 500);
end $$;

create or replace function public.admin_set_paybill_verified(p_org uuid, p_verified boolean) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int := 0;
begin
  if not is_platform_admin() then raise exception 'not allowed'; end if;
  update organizations set paybill_verified = p_verified where id = p_org and paybill is not null;
  if not found then raise exception 'this account has no paybill yet'; end if;
  perform _audit(p_org, case when p_verified then 'admin.paybill_verified' else 'admin.paybill_unverified' end, p_org, null);
  if p_verified then v_n := replay_unrouted_mpesa(); end if;
  return v_n;
end $$;

create or replace function public.admin_log_open(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'not allowed'; end if;
  perform _audit(p_org, 'admin.opened_account', p_org, null);
end $$;


-- super admin creates an account for a landlord and invites them as owner
create or replace function public.admin_create_org(p_name text, p_prefix text, p_owner_email text)
returns table (org_id uuid, token uuid)
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_token uuid; v_email text := lower(trim(p_owner_email));
begin
  if not is_platform_admin() then raise exception 'not allowed'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'enter a valid email address'; end if;
  insert into organizations (name, account_prefix) values (trim(p_name), upper(trim(p_prefix))) returning id into v_org;
  insert into org_invites (org_id, email, invited_by) values (v_org, v_email, auth.uid()) returning org_invites.token into v_token;
  perform _audit(v_org, 'admin.created_account', v_org, jsonb_build_object('owner_email', v_email));
  return query select v_org, v_token;
end $$;

-- activity trail for everyday edits (properties, units, tenants, leases)
create or replace function public._audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; v_label text; v_action text;
begin
  r := case when tg_op = 'DELETE' then old else new end;
  v_label := case tg_table_name
    when 'properties' then (to_jsonb(r)->>'name')
    when 'units'      then (to_jsonb(r)->>'label')
    when 'tenants'    then (to_jsonb(r)->>'full_name')
    when 'leases'     then (select u.label || ' · ' || t.full_name from units u, tenants t
                             where u.id = (to_jsonb(r)->>'unit_id')::uuid and t.id = (to_jsonb(r)->>'tenant_id')::uuid)
  end;
  v_action := (case tg_table_name when 'properties' then 'property' when 'units' then 'unit' when 'tenants' then 'tenant' else 'lease' end) || '.' || case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
  if tg_table_name = 'leases' and tg_op = 'UPDATE' and (to_jsonb(old)->>'status') = 'active' and (to_jsonb(new)->>'status') = 'ended' then
    v_action := 'lease.ended';
  end if;
  insert into audit_log (org_id, actor, action, entity_id, data)
  values (r.org_id, auth.uid(), v_action, r.id, jsonb_build_object('label', v_label));
  return null;
end $$;
create trigger audit_properties after insert or update or delete on public.properties for each row execute function public._audit_row();
create trigger audit_units      after insert or update or delete on public.units      for each row execute function public._audit_row();
create trigger audit_tenants    after insert or update or delete on public.tenants    for each row execute function public._audit_row();
create trigger audit_leases     after insert or update or delete on public.leases     for each row execute function public._audit_row();

-- ─────────────────────────────────────────────────────────────
-- grants
-- ─────────────────────────────────────────────────────────────
revoke all on function public.is_platform_admin(), public.invite_member(uuid, text), public.get_invite(uuid),
  public.accept_invite(uuid), public.revoke_invite(uuid), public.org_members(uuid), public.remove_member(uuid, uuid),
  public.admin_overview(), public.admin_orgs(text), public.admin_activity(uuid, int),
  public.admin_set_paybill_verified(uuid, boolean), public.admin_log_open(uuid), public.admin_create_org(text, text, text)
  from public, anon, authenticated;
grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.get_invite(uuid) to anon, authenticated;
grant execute on function public.invite_member(uuid, text), public.accept_invite(uuid), public.revoke_invite(uuid),
  public.org_members(uuid), public.remove_member(uuid, uuid),
  public.admin_overview(), public.admin_orgs(text), public.admin_activity(uuid, int),
  public.admin_set_paybill_verified(uuid, boolean), public.admin_log_open(uuid), public.admin_create_org(text, text, text)
  to authenticated;
revoke insert, update, delete on public.org_invites from anon, authenticated;
revoke all on public.platform_admins from anon, authenticated;
