\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-00000000000a', 'rep-owner@example.com'),
  ('20000000-0000-0000-0000-00000000000b', 'rep-other@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-00000000000a', false);
select create_organization('Report Homes', 'RPT') as org \gset
insert into properties (org_id, name) values (:'org', 'Hill View') returning id as prop \gset
insert into units (org_id, property_id, label, default_rent) values
  (:'org', :'prop', 'A1', 1000000), (:'org', :'prop', 'B3', 2000000), (:'org', :'prop', 'K2', 500000), (:'org', :'prop', 'K3', 700000);
insert into tenants (org_id, full_name, phone) values
  (:'org', 'Paid Tenant', '0711000001'), (:'org', 'Partial Tenant', '0711000002'), (:'org', 'Late Tenant', '0711000003');
insert into leases (org_id, unit_id, tenant_id, rent, start_date)
select :'org', u.id, t.id, u.default_rent, '2026-08-01' from units u join tenants t on
  (u.label, t.full_name) in (('A1','Paid Tenant'),('B3','Partial Tenant'),('K2','Late Tenant')) where u.org_id = :'org';
select generate_invoices(:'org', '2026-09-01');
select generate_invoices(:'org', '2026-10-01');
select * from record_cash_payment((select l.id from leases l join units u on u.id = l.unit_id where u.label='A1' and u.org_id = :'org'), 2000000, 'R-1') \gset
select * from record_cash_payment((select l.id from leases l join units u on u.id = l.unit_id where u.label='B3' and u.org_id = :'org'), 3000000, 'R-2') \gset

do $$ declare r record; begin
  for r in select * from report_units((select id from organizations where account_prefix='RPT'), '2026-10-01') loop
    raise notice '% % paid=% bal=% arrears=% months=%', r.unit_label, r.status, r.paid, r.balance, r.arrears, r.months_owing;
  end loop;
  assert (select status from report_units((select id from organizations where account_prefix='RPT'), '2026-10-01') where unit_label='A1') = 'paid';
  assert (select status from report_units((select id from organizations where account_prefix='RPT'), '2026-10-01') where unit_label='B3') = 'partial';
  assert (select status from report_units((select id from organizations where account_prefix='RPT'), '2026-10-01') where unit_label='K2') = 'unpaid';
  assert (select status from report_units((select id from organizations where account_prefix='RPT'), '2026-10-01') where unit_label='K3') = 'vacant';
  assert (select arrears from report_units((select id from organizations where account_prefix='RPT'), null) where unit_label='K2') = 1000000, 'K2 two months';
  assert (select months_owing from report_units((select id from organizations where account_prefix='RPT'), null) where unit_label='K2') = 2;
  assert (select oldest_unpaid from report_units((select id from organizations where account_prefix='RPT'), null) where unit_label='K2') = '2026-09-01';
end $$;

-- send-now list for this org: B3 (partial) and K2 (unpaid), not A1
do $$ begin
  assert (select count(*) from reminders_due_for((select id from organizations where account_prefix='RPT'))) = 2, 'two owe';
  assert (select phone from reminders_due_for((select id from organizations where account_prefix='RPT')) where unit_label='K2') = '254711000003';
end $$;
select log_reminder((select l.id from leases l join units u on u.id=l.unit_id where u.label='K2' and u.org_id = :'org'),
                    'whatsapp', '254711000003', 1000000, 'sent', null, 'wamid.1');
do $$ begin
  assert (select count(*) from reminders_due_for((select id from organizations where account_prefix='RPT'))) = 1, 'K2 not twice in a day';
  assert (select count(*) from reminders) = 1;
end $$;
-- cron-only function is closed to normal users
do $$ begin
  begin perform reminders_due_all(); raise exception 'expected denial';
  exception when insufficient_privilege then null; end;
end $$;
select update_reminder_settings(:'org', true, extract(day from (now() at time zone 'Africa/Nairobi'))::int);

-- other landlord sees nothing and can't log
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-00000000000b', false);
do $$ begin
  begin perform report_units((select org_id from leases limit 1)); raise exception 'x';
  exception when raise_exception then if sqlerrm <> 'not allowed' and sqlerrm <> 'x' then raise; end if; end;
  assert (select count(*) from reminders) = 0, 'stranger sees no reminders';
end $$;
reset role;

-- cron (service role): today's day matches → B3 due (K2 already reminded today)
set role service_role;
do $$ begin
  assert (select count(*) from reminders_due_all() where org_name = 'Report Homes') = 1, 'cron picks B3';
end $$;
select _log_reminder((select lease_id from reminders_due_all() where org_name='Report Homes'), 'auto', 'sms', '254711000002', 1000000, 'sent', null, 'ATX', null);
do $$ begin assert (select count(*) from reminders_due_all() where org_name = 'Report Homes') = 0, 'all done today'; end $$;
reset role;
\echo ALL REPORT/REMINDER TESTS PASSED
