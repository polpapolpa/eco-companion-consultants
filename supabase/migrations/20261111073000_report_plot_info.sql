-- Only allowlisted plot facts are copied here; raw Kobo imports remain admin-only.
alter table public.ecc_visits add column plot_info jsonb not null default '{}'::jsonb
 check (jsonb_typeof(plot_info) = 'object');
