-- Run: psql -v ON_ERROR_STOP=1 -f this file (after stub + migration). Every block asserts.
\set ON_ERROR_STOP 1

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'eugene@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'other@example.com');

-- ── landlord A signs in and sets up ─────────────────────────
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

select create_organization('Karoki Properties', 'kar') as org_a \gset
insert into properties (org_id, name) values (:'org_a', 'Riverside Court') returning id as prop \gset
insert into units (org_id, property_id, label, default_rent) values
  (:'org_a', :'prop', 'B3', 2500000), (:'org_a', :'prop', 'K2', 650000),
  (:'org_a', :'prop', 'A4', 1500000), (:'org_a', :'prop', 'K3', 700000);
insert into tenants (org_id, full_name, phone) values
  (:'org_a', 'Fatuma Abdi', '0777 333 444'), (:'org_a', 'Hassan Omar', '0711 999 000'),
  (:'org_a', 'Mutiso Musyoka', '+254 744 777 888');
insert into leases (org_id, unit_id, tenant_id, rent, start_date)
select :'org_a', u.id, t.id, u.default_rent, '2026-07-01'
  from units u join tenants t on
   (u.label, t.full_name) in (('B3','Fatuma Abdi'),('K2','Hassan Omar'),('A4','Mutiso Musyoka'));

do $$ begin
  assert (select msisdn from tenants where full_name='Mutiso Musyoka') = '254744777888', 'msisdn normalise';
end $$;

-- duplicate unit label (different formatting) must fail
do $$ begin
  begin
    insert into units (org_id, property_id, label)
    select org_id, property_id, 'b-3' from units where label='B3';
    raise exception 'expected unique violation';
  exception when unique_violation then null; end;
end $$;

-- August invoices
select generate_invoices(:'org_a', '2026-08-15') as n \gset
do $$ begin assert (select count(*) from invoices) = 3, 'three invoices'; end $$;
select generate_invoices(:'org_a', '2026-08-01') as n2 \gset
do $$ begin assert (select count(*) from invoices) = 3, 'invoice run is idempotent'; end $$;

-- direct writes to money tables are blocked
do $$ begin
  begin
    update invoices set amount_paid = amount;
    raise exception 'expected permission error';
  exception when insufficient_privilege then null; end;
end $$;

reset role;

-- ── M-Pesa callbacks (service role) ─────────────────────────
set role service_role;
update organizations set paybill = '600000', paybill_verified = true where account_prefix = 'KAR';

-- 1. full payment with proper account
select * from ingest_mpesa_c2b('600000','TGJ7SP1L2M',2500000,'KAR-B3','254777333444','FATUMA',now(),'{}');
-- 2. Safaricom repeats it
select duplicate from ingest_mpesa_c2b('600000','TGJ7SP1L2M',2500000,'KAR-B3','254777333444','FATUMA',now(),'{}') \gset
do $$ begin
  assert (select count(*) from payments) = 1, 'duplicate ignored';
  assert (select i.status from invoices i join leases l on l.id=i.lease_id join units u on u.id=l.unit_id where u.label='B3') = 'paid';
end $$;
-- 3. sloppy account
select matched_by from ingest_mpesa_c2b('600000','TGK2QW8N4P',650000,'kar k2','254711999000','HASSAN',now(),'{}') \gset
\echo sloppy: :matched_by
-- 4. no account, match on phone (hashed, like newer C2B payloads)
select matched_by from ingest_mpesa_c2b('600000','TGL5RT3V7Q',900000,'',
  encode(extensions.digest('254744777888','sha256'),'hex'),'MUTISO',now(),'{}') \gset
\echo phone: :matched_by
-- 5. orphan
select status from ingest_mpesa_c2b('600000','TGM9YU1X6R',1200000,'RENT AUGUST','254700000111','X',now(),'{}') \gset
\echo orphan: :status
-- 6. overpay B3 → credit
select * from ingest_mpesa_c2b('600000','TGN4ZI8O2S',3000000,'KAR-B3','254777333444','FATUMA',now(),'{}');
-- 7. vacant unit K3 → parked
select matched_by from ingest_mpesa_c2b('600000','TGX1',700000,'KAR-K3','254700000222','Y',now(),'{}') \gset
\echo vacant: :matched_by
-- 8. unknown paybill but prefix still routes
select * from ingest_mpesa_c2b('999999','TGZ9',100,'ZZZ-1','','',now(),'{}');
reset role;

do $$ declare b record; begin
  assert (select matched_by from payments where provider_ref='TGK2QW8N4P') = 'account number', 'sloppy';
  assert (select matched_by from payments where provider_ref='TGL5RT3V7Q') = 'phone number', 'phone hash';
  assert (select status from payments where provider_ref='TGM9YU1X6R') = 'unmatched', 'orphan';
  assert (select matched_by from payments where provider_ref='TGX1') = 'no active lease', 'vacant';
  assert (select count(*) from mpesa_events where error is not null) = 1, 'unrouted logged';
  select * into b from lease_balances where unit_label='B3';
  assert b.arrears = 0 and b.credit = 3000000, format('B3 credit %s', b.credit);
  select * into b from lease_balances where unit_label='A4';
  assert b.arrears = 600000, format('A4 arrears %s', b.arrears);
  assert (select receipt_no from payments where provider_ref='TGJ7SP1L2M') = 'KAR-000001';
end $$;

-- ── September: credit is applied automatically ─────────────
set role service_role;
select generate_invoices_all('2026-09-01');
reset role;
do $$ declare b record; begin
  select * into b from lease_balances where unit_label='B3';
  assert b.arrears = 0 and b.credit = 500000, format('B3 after Sept: arrears %s credit %s', b.arrears, b.credit);
end $$;

-- ── landlord A: assign orphan, record cash, reverse, void ───
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select assign_payment(
  (select id from payments where provider_ref='TGM9YU1X6R'),
  (select l.id from leases l join units u on u.id=l.unit_id where u.label='A4')) as rcpt \gset
\echo assigned receipt :rcpt
select * from record_cash_payment((select l.id from leases l join units u on u.id=l.unit_id where u.label='K2'),
                                  650000, 'BOOK-17');
select duplicate from record_cash_payment((select l.id from leases l join units u on u.id=l.unit_id where u.label='K2'),
                                  650000, 'BOOK-17') \gset
\echo cash dup: :duplicate
do $$ declare b record; begin
  select * into b from lease_balances where unit_label='K2';
  assert b.arrears = 0, format('K2 arrears %s', b.arrears);
  -- A4: Aug 15000 + Sep 15000 = 30000 owed; paid 9000+12000 = 21000 → 9000 left
  select * into b from lease_balances where unit_label='A4';
  assert b.arrears = 900000, format('A4 arrears %s', b.arrears);
end $$;

select reverse_payment((select id from payments where provider_ref='TGM9YU1X6R'), 'wrong tenant');
do $$ begin
  assert (select arrears from lease_balances where unit_label='A4') = 2100000, 'reverse restores arrears';
end $$;

select void_invoice((select i.id from invoices i join leases l on l.id=i.lease_id join units u on u.id=l.unit_id
                      where u.label='B3' and i.period='2026-09-01'));
do $$ declare b record; begin
  select * into b from lease_balances where unit_label='B3';
  assert b.arrears = 0 and b.credit = 3000000, format('void returns credit: %s', b.credit);
  -- invariant: invoices.amount_paid == sum(allocations)
  assert not exists (
    select 1 from invoices i
     where i.amount_paid <> coalesce((select sum(amount) from allocations a where a.invoice_id=i.id),0)), 'amount_paid invariant';
end $$;

-- ── landlord B sees nothing of A ────────────────────────────
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select create_organization('Other Lettings', 'OTL') as org_b \gset
do $$ begin
  assert (select count(*) from units) = 0, 'B cannot see A units';
  assert (select count(*) from payments) = 0, 'B cannot see A payments';
  assert (select count(*) from lease_balances) = 0, 'B cannot see A balances';
  assert (select count(*) from organizations) = 1, 'B sees only own org';
end $$;
do $$ begin
  begin
    perform assign_payment((select id from payments limit 1), null);
  exception when others then null; end;
end $$;
-- B cannot plant a unit inside A's org
do $$ begin
  begin
    insert into units (org_id, property_id, label)
    values ((select org_id from memberships limit 1), gen_random_uuid(), 'X');  -- own org, foreign property
    raise exception 'expected FK failure';
  exception when foreign_key_violation then null; end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  begin
    perform record_cash_payment((select id from leases limit 1), 100);  -- sees none → null
    raise exception 'expected not allowed';
  exception when raise_exception then
    if sqlerrm <> 'not allowed' then raise; end if;
  end;
end $$;
reset role;

-- ── public pay page ─────────────────────────────────────────
select pay_token as tok from leases l join units u on u.id=l.unit_id where u.label='A4' \gset
set role anon;
select * from get_pay_info(:'tok');
do $$ begin
  assert (select count(*) from units) = 0, 'anon sees nothing';
end $$;
reset role;

-- ── replay after paybill verification ──────────────────────
set role service_role;
select * from ingest_mpesa_c2b('777777','TRP1',50000,'','254777333444','FATUMA',now(),
  '{"TransAmount":"500.00","TransTime":"20260926101500","MSISDN":"254777333444","FirstName":"FATUMA"}');
select * from ingest_mpesa_c2b('777777','TRP1',50000,'','254777333444','FATUMA',now(),'{}');
reset role;
do $$ begin assert (select count(*) from mpesa_events where trans_id='TRP1') = 1, 'unrouted logged once'; end $$;
update organizations set paybill='777777', paybill_verified=true where account_prefix='KAR';
do $$ begin
  begin
    update organizations set paybill='777777', paybill_verified=true where account_prefix='OTL';
    raise exception 'expected unique violation';
  exception when unique_violation then null; end;
end $$;
set role service_role;
select replay_unrouted_mpesa() as replayed \gset
reset role;
do $$ begin
  assert (select matched_by from payments where provider_ref='TRP1') = 'phone number', 'replayed + matched';
  assert (select received_at from payments where provider_ref='TRP1') = '2026-09-26 07:15:00+00', 'trans time kept';
end $$;

\echo ALL TESTS PASSED
