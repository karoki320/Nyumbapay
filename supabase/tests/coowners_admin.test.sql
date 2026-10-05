\set ON_ERROR_STOP 1
-- users: A owns org, B is invited co-owner, C is a stranger, ADMIN is platform admin
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-00000000000a', 'owner@example.com'),
  ('10000000-0000-0000-0000-00000000000b', 'Co.Owner@Example.com'),
  ('10000000-0000-0000-0000-00000000000c', 'stranger@example.com'),
  ('10000000-0000-0000-0000-0000000000ad', 'biziirise@gmail.com');
insert into auth.users (id, email, email_confirmed_at) values ('10000000-0000-0000-0000-0000000000ee', 'BIZIIRISE@gmail.com', null);

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-00000000000a', false);
select create_organization('Shared Rentals', 'SHR') as org \gset
insert into properties (org_id, name) values (:'org', 'Kayole Flats');

-- invite B (email case-insensitive)
select token as tok, invite_id as inv from invite_member(:'org', '  co.owner@example.com ') \gset
do $$ begin assert (select count(*) from org_invites where accepted_at is null) = 1, 'one pending invite'; end $$;
-- re-inviting replaces the old pending invite
select token as tok2 from invite_member(:'org', 'co.owner@example.com') \gset
do $$ begin assert (select count(*) from org_invites where accepted_at is null and revoked_at is null) = 1, 'still one pending'; end $$;
-- self invite blocked
do $$ begin
  begin perform invite_member((select id from organizations limit 1), 'owner@example.com'); raise exception 'expected block';
  exception when raise_exception then if sqlerrm not like 'that person already has access%' then raise; end if; end;
end $$;

-- C (wrong email) cannot accept
select set_config('test.tok', :'tok2', false);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-00000000000c', false);
do $$ begin
  begin perform accept_invite(current_setting('test.tok')::uuid);
    raise exception 'expected wrong-email';
  exception when insufficient_privilege then raise exception 'C should be able to call but be rejected';
  when raise_exception then if sqlerrm not like 'this invitation was sent to%' then raise; end if; end;
end $$;
-- C cannot see the org
do $$ begin assert (select count(*) from properties) = 0, 'stranger sees nothing'; end $$;
-- old token is revoked
select status from get_invite(:'tok') \gset
\echo old token status: :status

-- B accepts
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-00000000000b', false);
select accept_invite(:'tok2') = :'org'::uuid as ok \gset
do $$ begin
  assert (select count(*) from properties) = 1, 'co-owner sees property';
  assert (select role from memberships where user_id = auth.uid()) = 'owner', 'co-owner is owner';
end $$;
-- reuse blocked
do $$ begin
  begin perform accept_invite((select token from org_invites where accepted_at is not null limit 1)); raise exception 'expected used';
  exception when raise_exception then if sqlerrm not like 'this invitation has already been used%' then raise; end if; end;
end $$;
select count(*) as members from org_members(:'org') \gset
\echo members: :members
-- B removes A, then cannot remove self (last owner)
select remove_member(:'org', '10000000-0000-0000-0000-00000000000a');
do $$ begin
  begin perform remove_member((select org_id from memberships limit 1), auth.uid()); raise exception 'expected last-owner block';
  exception when raise_exception then if sqlerrm not like 'an account must keep at least one owner%' then raise; end if; end;
end $$;
-- admin functions blocked for normal users
do $$ begin
  begin perform admin_overview(); raise exception 'expected not allowed';
  exception when raise_exception then if sqlerrm <> 'not allowed' then raise; end if; end;
end $$;

-- unconfirmed look-alike email is NOT admin
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000ee', false);
do $$ begin assert not is_platform_admin(), 'unconfirmed email must not be admin';
  assert (select count(*) from organizations) = 0, 'not admin sees nothing'; end $$;

-- platform admin sees and acts everywhere
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000ad', false);
do $$ begin
  assert is_platform_admin(), 'admin';
  assert (select count(*) from organizations) >= 1, 'admin sees orgs';
  assert (select (admin_overview()->>'landlords')::int) >= 1, 'overview';
  assert (select count(*) from admin_orgs('shared')) = 1, 'search by name';
  assert (select count(*) from admin_orgs('co.owner')) = 1, 'search by email';
end $$;
insert into units (org_id, property_id, label, default_rent)
select org_id, id, 'Z9', 500000 from properties where name = 'Kayole Flats';          -- admin can write on behalf
select admin_log_open(:'org');
select update_org_settings(:'org', 'Shared Rentals', '123456', 5);
select admin_set_paybill_verified(:'org', true);
do $$ begin
  assert (select paybill_verified from organizations where account_prefix = 'SHR'), 'verified';
  assert (select count(*) from admin_activity(null, 50) where by_admin) >= 2, 'admin actions flagged';
  assert (select count(*) from admin_activity(null, 50) where action = 'member.joined') = 1, 'join logged';
end $$;
-- admin can invite on behalf of owner
select token as t3 from invite_member(:'org', 'new@example.com') \gset
-- admin creates an account for a landlord who isn't tech savvy
select org_id as neworg, token as newtok from admin_create_org('Mama Njeri Homes', 'mnh', 'njeri@example.com') \gset
do $$ begin
  assert (select count(*) from memberships m join organizations o on o.id = m.org_id where o.account_prefix = 'MNH') = 0, 'admin not a member';
  assert (select count(*) from audit_log where action = 'unit.created') >= 1, 'unit trail';
  assert exists (select 1 from audit_log where action = 'property.created' and data->>'label' = 'Kayole Flats'), 'property trail label';
end $$;
reset role;
insert into auth.users (id, email) values ('10000000-0000-0000-0000-0000000000f1', 'njeri@example.com');
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000f1', false);
select accept_invite(:'newtok') = :'neworg'::uuid as joined \gset
\echo landlord joined: :joined
reset role;
\echo ALL CO-OWNER/ADMIN TESTS PASSED
