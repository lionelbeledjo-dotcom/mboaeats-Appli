begin;

create table if not exists public.rate_limits (
  id           bigserial primary key,
  bucket_key   text       not null,
  ip           text,
  scope        text,
  occurred_at  timestamptz not null default now()
);

create index if not exists idx_rate_limits_bucket_time
  on public.rate_limits (bucket_key, occurred_at desc);

alter table public.rate_limits enable row level security;

create or replace function public.purge_old_rate_limits()
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.rate_limits
    where occurred_at < now() - interval '24 hours'
    returning 1
  )
  select count(*)::int from deleted
$$;

revoke all on function public.purge_old_rate_limits() from public;

commit;