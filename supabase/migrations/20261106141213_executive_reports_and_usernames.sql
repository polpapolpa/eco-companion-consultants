begin;
alter table public.ecc_visits
 add column scope text not null default '',
 add column decisions text not null default '',
 add column reviewer text not null default '',
 add column report_photos jsonb not null default '[]'::jsonb
  check(jsonb_typeof(report_photos)='array' and jsonb_array_length(report_photos)<=3 and octet_length(report_photos::text)<=16000);
create table public.ecc_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
 created_at timestamptz not null default now()
);
alter table public.ecc_accounts enable row level security;
revoke all on public.ecc_accounts from anon, authenticated;
grant select on public.ecc_accounts to authenticated;
grant all on public.ecc_accounts to service_role;
create policy account_read on public.ecc_accounts for select to authenticated
 using(user_id=(select auth.uid()) or (select ecc_private.is_admin()));
commit;
