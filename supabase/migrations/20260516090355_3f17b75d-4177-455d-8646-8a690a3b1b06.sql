begin;

create table if not exists public.phone_users (
  phone       text primary key,
  user_id     uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_phone_users_user on public.phone_users (user_id);

alter table public.phone_users enable row level security;

create or replace function public.tg_sync_phone_users()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.phone_users where user_id = old.id;
    return old;
  end if;

  if new.phone is not null and new.phone <> '' then
    insert into public.phone_users (phone, user_id)
    values (
      case when new.phone like '+%' then new.phone else '+' || new.phone end,
      new.id
    )
    on conflict (phone) do update
      set user_id = excluded.user_id,
          updated_at = now();
  end if;

  if tg_op = 'UPDATE' and (old.phone is distinct from new.phone) and old.phone is not null then
    delete from public.phone_users
      where phone = case when old.phone like '+%' then old.phone else '+' || old.phone end
        and user_id = new.id;
  end if;

  return new;
end
$$;

drop trigger if exists trg_sync_phone_users on auth.users;
create trigger trg_sync_phone_users
  after insert or update of phone or delete on auth.users
  for each row execute function public.tg_sync_phone_users();

insert into public.phone_users (phone, user_id)
select
  case when u.phone like '+%' then u.phone else '+' || u.phone end as phone,
  u.id
from auth.users u
where u.phone is not null and u.phone <> ''
on conflict (phone) do nothing;

create or replace function public.admin_find_user_id_by_email(_email text)
returns uuid
language sql
security definer
set search_path = auth, pg_temp
as $$
  select id from auth.users where lower(email) = lower(_email) limit 1
$$;

revoke all on function public.admin_find_user_id_by_email(text) from public;

commit;