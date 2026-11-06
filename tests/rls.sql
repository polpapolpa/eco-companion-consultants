-- Synthetic authorization fixtures are always rolled back. No real client records are used.
begin;
select set_config('test.a',gen_random_uuid()::text,true),set_config('test.b',gen_random_uuid()::text,true),set_config('test.admin',gen_random_uuid()::text,true),set_config('test.pa',gen_random_uuid()::text,true),set_config('test.pb',gen_random_uuid()::text,true),set_config('test.ca',gen_random_uuid()::text,true),set_config('test.cb',gen_random_uuid()::text,true);
insert into auth.users(id,email) values
 (current_setting('test.a')::uuid,'rls-a@example.invalid'),(current_setting('test.b')::uuid,'rls-b@example.invalid'),(current_setting('test.admin')::uuid,'rls-admin@example.invalid');
insert into public.ecc_admins values(current_setting('test.admin')::uuid);
insert into public.ecc_clients(id,name) values(current_setting('test.ca')::uuid,'TEST A'),(current_setting('test.cb')::uuid,'TEST B');
insert into public.ecc_projects(id,client_id,name) values(current_setting('test.pa')::uuid,current_setting('test.ca')::uuid,'TEST A'),(current_setting('test.pb')::uuid,current_setting('test.cb')::uuid,'TEST B');
insert into public.ecc_members values(current_setting('test.pa')::uuid,current_setting('test.a')::uuid),(current_setting('test.pb')::uuid,current_setting('test.b')::uuid);
insert into public.ecc_visits(project_id,title,status) values(current_setting('test.pa')::uuid,'TEST PUBLISHED A','published'),(current_setting('test.pa')::uuid,'TEST DRAFT A','draft'),(current_setting('test.pb')::uuid,'TEST PUBLISHED B','published');
insert into public.ecc_imports(project_id,asset_uid,source_id,raw) values(current_setting('test.pa')::uuid,'test_asset_uid','test_record','{"private":"must never be readable by clients"}');

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$ begin
 if (select count(*) from public.ecc_clients)<>1 then raise exception 'client isolation failed';end if;
 if (select count(*) from public.ecc_projects)<>1 then raise exception 'project isolation failed';end if;
 if (select count(*) from public.ecc_visits)<>1 then raise exception 'draft or cross-client report leaked';end if;
 if (select title from public.ecc_visits)<>'TEST PUBLISHED A' then raise exception 'wrong report';end if;
 if exists(select 1 from public.ecc_imports) then raise exception 'raw Kobo leaked';end if;
 if exists(select 1 from public.ecc_admins) then raise exception 'admin role leaked';end if;
 if (select count(*) from public.ecc_members)<>1 then raise exception 'membership leaked';end if;
 begin
  insert into public.ecc_admins values(current_setting('test.a')::uuid);
  raise exception 'self promotion succeeded';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.ecc_visits(project_id,title) values(current_setting('test.pa')::uuid,'unauthorized write');
  raise exception 'client write succeeded';
 exception when insufficient_privilege then null; end;
 update public.ecc_visits set title='unauthorized edit';
 if found then raise exception 'client update succeeded';end if;
 delete from public.ecc_visits;
 if found then raise exception 'client delete succeeded';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
do $$ begin
 if (select count(*) from public.ecc_visits)<>1 or (select title from public.ecc_visits)<>'TEST PUBLISHED B' then raise exception 'client B isolation failed';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
do $$ begin
 if not ecc_private.is_admin() then raise exception 'admin missing';end if;
 if (select count(*) from public.ecc_visits where title like 'TEST %')<>3 then raise exception 'admin cannot review drafts';end if;
 delete from public.ecc_members where user_id=current_setting('test.a')::uuid;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$ begin
 if exists(select 1 from public.ecc_visits) or exists(select 1 from public.ecc_projects) or exists(select 1 from public.ecc_clients) then raise exception 'revoked user retains access';end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.ecc_visits;
  raise exception 'anonymous query allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: anonymous denied; clients A/B isolated; drafts and raw data hidden; writes and self-promotion denied; admin review allowed; revocation effective' as authorization_tests;
rollback;
