begin;
create schema if not exists ecc_private;
revoke all on schema ecc_private from public;
grant usage on schema ecc_private to authenticated;

create table public.ecc_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.ecc_admins enable row level security;
revoke all on public.ecc_admins from anon, authenticated;
grant select on public.ecc_admins to authenticated;
create policy admin_self on public.ecc_admins for select to authenticated using (user_id = (select auth.uid()));

create function ecc_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ecc_admins where user_id=(select auth.uid()));
$$;
revoke all on function ecc_private.is_admin() from public;
grant execute on function ecc_private.is_admin() to authenticated;

create table public.ecc_clients (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 200), created_at timestamptz not null default now()
);
create table public.ecc_projects (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.ecc_clients(id),
 name text not null check(length(name) between 1 and 200), created_at timestamptz not null default now()
);
create index on public.ecc_projects(client_id);
create table public.ecc_members (
 project_id uuid not null references public.ecc_projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(project_id,user_id)
);
create index on public.ecc_members(user_id);
create function ecc_private.can_read_project(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select ecc_private.is_admin() or exists(select 1 from public.ecc_members where project_id=pid and user_id=(select auth.uid()));
$$;
revoke all on function ecc_private.can_read_project(uuid) from public;
grant execute on function ecc_private.can_read_project(uuid) to authenticated;

-- Sources and raw Kobo payloads are admin-only. Never expose these through a client view.
create table public.ecc_sources (
 project_id uuid primary key references public.ecc_projects(id) on delete cascade,
 asset_uid text not null check(asset_uid ~ '^[A-Za-z0-9_-]{10,80}$'),
 filter_field text, filter_value text, whole_asset boolean not null default false,
 check ((whole_asset and filter_field is null and filter_value is null) or
 (not whole_asset and length(filter_field)>0 and filter_value is not null))
);
create table public.ecc_imports (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.ecc_projects(id),
 asset_uid text not null, source_id text not null, raw jsonb not null,
 imported_at timestamptz not null default now(), unique(project_id,asset_uid,source_id)
);
create table public.ecc_visits (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.ecc_projects(id),
 import_id uuid unique references public.ecc_imports(id),
 title text not null check(length(title) between 1 and 300), survey_date date, plot text, assessor text,
 summary text not null default '', ecology text not null default '', social text not null default '',
 economics text not null default '', evidence text not null default '', recommendations text not null default '',
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.ecc_visits(project_id,status);

alter table public.ecc_clients enable row level security;
alter table public.ecc_projects enable row level security;
alter table public.ecc_members enable row level security;
alter table public.ecc_sources enable row level security;
alter table public.ecc_imports enable row level security;
alter table public.ecc_visits enable row level security;
revoke all on public.ecc_clients,public.ecc_projects,public.ecc_members,public.ecc_sources,public.ecc_imports,public.ecc_visits from anon,authenticated;
grant select,insert,update,delete on public.ecc_clients,public.ecc_projects,public.ecc_members,public.ecc_sources,public.ecc_imports,public.ecc_visits to authenticated;
grant all on public.ecc_admins,public.ecc_clients,public.ecc_projects,public.ecc_members,public.ecc_sources,public.ecc_imports,public.ecc_visits to service_role;

create policy admin_clients on public.ecc_clients for all to authenticated using((select ecc_private.is_admin())) with check((select ecc_private.is_admin()));
create policy read_clients on public.ecc_clients for select to authenticated using(exists(select 1 from public.ecc_projects p where p.client_id=ecc_clients.id and ecc_private.can_read_project(p.id)));
create policy admin_projects on public.ecc_projects for all to authenticated using((select ecc_private.is_admin())) with check((select ecc_private.is_admin()));
create policy read_projects on public.ecc_projects for select to authenticated using(ecc_private.can_read_project(id));
create policy admin_members on public.ecc_members for all to authenticated using((select ecc_private.is_admin())) with check((select ecc_private.is_admin()));
create policy read_members on public.ecc_members for select to authenticated using(user_id=(select auth.uid()));
create policy admin_sources on public.ecc_sources for all to authenticated using((select ecc_private.is_admin())) with check((select ecc_private.is_admin()));
create policy admin_imports on public.ecc_imports for all to authenticated using((select ecc_private.is_admin())) with check((select ecc_private.is_admin()));
create policy admin_visits on public.ecc_visits for all to authenticated using((select ecc_private.is_admin())) with check((select ecc_private.is_admin()));
create policy read_published_visits on public.ecc_visits for select to authenticated using(status='published' and ecc_private.can_read_project(project_id));

create function ecc_private.touch_visit() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;
revoke all on function ecc_private.touch_visit() from public;
create trigger touch_visit before update on public.ecc_visits for each row execute function ecc_private.touch_visit();
commit;
