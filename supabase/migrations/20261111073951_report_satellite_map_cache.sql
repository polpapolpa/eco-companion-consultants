create table public.ecc_report_maps (
 cache_key text primary key check (cache_key ~ '^[0-9a-f]{64}$'),
 visit_id uuid references public.ecc_visits(id) on delete cascade,
 result jsonb check (result is null or octet_length(result::text)<=3000000),
 lease_id uuid not null default gen_random_uuid(),
 retry_after timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index ecc_report_maps_visit_id_idx on public.ecc_report_maps(visit_id);
alter table public.ecc_report_maps enable row level security;
revoke all on public.ecc_report_maps from public, anon, authenticated;
grant select,insert,update,delete on public.ecc_report_maps to service_role;
create function public.ecc_claim_report_map(p_key text,p_visit_id uuid) returns jsonb
language sql volatile security invoker set search_path='' as $$
 with claimed as (
  insert into public.ecc_report_maps(cache_key,visit_id,retry_after)
  values(p_key,p_visit_id,now()+interval '120 seconds')
  on conflict(cache_key) do update set lease_id=gen_random_uuid(),retry_after=now()+interval '120 seconds'
  where ecc_report_maps.retry_after<=now() and coalesce(ecc_report_maps.result->>'status','')<>'ready'
  returning cache_key,lease_id
 ) select to_jsonb(claimed) from claimed;
$$;
revoke all on function public.ecc_claim_report_map(text,uuid) from public,anon,authenticated;
grant execute on function public.ecc_claim_report_map(text,uuid) to service_role;
