begin;
alter table public.ecc_visits drop constraint ecc_visits_status_check;
alter table public.ecc_visits add constraint ecc_visits_status_check check(status in ('draft','published','automatic'));
alter table public.ecc_visits add column auto_update boolean not null default false, add column auto_source_hash text;
alter table public.ecc_sources add column auto_reports boolean not null default true;
alter policy read_published_visits on public.ecc_visits using(status in ('published','automatic') and ecc_private.can_read_project(project_id));

-- No customer can claim a sync lease or read provider synchronization metadata.
create table public.ecc_auto_sync (
 project_id uuid primary key references public.ecc_projects(id) on delete cascade,
 source_key text not null,
 next_offset integer not null default 0 check(next_offset>=0),
 lease_id uuid not null default gen_random_uuid(),
 locked_until timestamptz not null default now(),
 next_allowed_at timestamptz not null default now(),
 last_synced_at timestamptz
);
alter table public.ecc_auto_sync enable row level security;
revoke all on public.ecc_auto_sync from public, anon, authenticated;
grant select,insert,update,delete on public.ecc_auto_sync to service_role;
create policy service_sync_state on public.ecc_auto_sync for all to service_role using(true) with check(true);
create function public.ecc_claim_auto_sync(p_project_id uuid,p_source_key text) returns jsonb
language sql volatile security invoker set search_path='' as $$
 with claimed as (
  insert into public.ecc_auto_sync(project_id,source_key,locked_until)
  values(p_project_id,p_source_key,now()+interval '120 seconds')
  on conflict(project_id) do update set
   lease_id=gen_random_uuid(), locked_until=now()+interval '120 seconds',
   next_offset=case when ecc_auto_sync.source_key=excluded.source_key then ecc_auto_sync.next_offset else 0 end,
   source_key=excluded.source_key
  where ecc_auto_sync.locked_until<=now() and ecc_auto_sync.next_allowed_at<=now()
  returning *
 ) select to_jsonb(claimed) from claimed;
$$;
revoke all on function public.ecc_claim_auto_sync(uuid,text) from public,anon,authenticated;
grant execute on function public.ecc_claim_auto_sync(uuid,text) to service_role;
commit;
