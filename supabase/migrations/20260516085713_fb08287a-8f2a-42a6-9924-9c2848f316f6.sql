-- =========================================================================
-- MboaEats — Lot A · Fichier 1
-- Fondations multi-tenant : enums, restaurant_members, fonctions helpers
-- =========================================================================
begin;

do $$ begin
  create type public.restaurant_role as enum ('owner', 'manager', 'staff', 'kitchen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('active', 'invited', 'suspended');
exception when duplicate_object then null; end $$;

create table if not exists public.restaurant_members (
  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,
  user_id       uuid not null,
  role          public.restaurant_role  not null default 'staff',
  status        public.member_status    not null default 'active',
  invited_by    uuid,
  invited_at    timestamptz,
  joined_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  primary key (restaurant_id, user_id)
);

drop trigger if exists trg_restaurant_members_updated on public.restaurant_members;
create trigger trg_restaurant_members_updated
  before update on public.restaurant_members
  for each row execute function public.tg_set_updated_at();

create index if not exists idx_resto_members_user_active
  on public.restaurant_members (user_id)
  where status = 'active' and deleted_at is null;

create index if not exists idx_resto_members_restaurant_active
  on public.restaurant_members (restaurant_id)
  where status = 'active' and deleted_at is null;

create index if not exists idx_resto_members_user_role
  on public.restaurant_members (user_id, role)
  where status = 'active' and deleted_at is null;

alter table public.restaurant_members enable row level security;

create or replace function public.restaurant_role_weight(_role public.restaurant_role)
returns int
language sql
immutable
parallel safe
as $$
  select case _role
    when 'owner'   then 4
    when 'manager' then 3
    when 'staff'   then 2
    when 'kitchen' then 1
  end
$$;
revoke all on function public.restaurant_role_weight(public.restaurant_role) from public;
grant execute on function public.restaurant_role_weight(public.restaurant_role) to anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'superadmin')
  )
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.is_platform_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'superadmin'
  )
$$;
revoke all on function public.is_platform_superadmin() from public;
grant execute on function public.is_platform_superadmin() to authenticated;

create or replace function public.has_restaurant_membership(
  _restaurant_id uuid,
  _min_role public.restaurant_role default 'kitchen'
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null then false
    else exists (
      select 1
      from public.restaurant_members rm
      where rm.restaurant_id = _restaurant_id
        and rm.user_id = auth.uid()
        and rm.status = 'active'
        and rm.deleted_at is null
        and public.restaurant_role_weight(rm.role)
          >= public.restaurant_role_weight(_min_role)
    )
  end
$$;
revoke all on function public.has_restaurant_membership(uuid, public.restaurant_role) from public;
grant execute on function public.has_restaurant_membership(uuid, public.restaurant_role)
  to authenticated;

create or replace function public.current_user_restaurant_ids(
  _min_role public.restaurant_role default 'kitchen'
)
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rm.restaurant_id
  from public.restaurant_members rm
  where rm.user_id = auth.uid()
    and rm.status = 'active'
    and rm.deleted_at is null
    and public.restaurant_role_weight(rm.role)
      >= public.restaurant_role_weight(_min_role)
$$;
revoke all on function public.current_user_restaurant_ids(public.restaurant_role) from public;
grant execute on function public.current_user_restaurant_ids(public.restaurant_role)
  to authenticated;

create or replace function public.tg_ensure_at_least_one_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_resto_deleted boolean;
  v_remaining_owners int;
  v_resto_id uuid;
begin
  if (tg_op = 'DELETE') then
    v_resto_id := old.restaurant_id;
  else
    v_resto_id := new.restaurant_id;
  end if;

  select (deleted_at is not null) into v_resto_deleted
  from public.restaurants
  where id = v_resto_id;

  if v_resto_deleted then
    return coalesce(new, old);
  end if;

  select count(*) into v_remaining_owners
  from public.restaurant_members rm
  where rm.restaurant_id = v_resto_id
    and rm.role = 'owner'
    and rm.status = 'active'
    and rm.deleted_at is null
    and not (tg_op in ('DELETE','UPDATE') and rm.user_id = old.user_id);

  if tg_op = 'UPDATE'
    and new.role = 'owner'
    and new.status = 'active'
    and new.deleted_at is null
  then
    v_remaining_owners := v_remaining_owners + 1;
  end if;

  if v_remaining_owners = 0 then
    raise exception 'Un restaurant doit conserver au moins un propriétaire actif.'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end
$$;

drop trigger if exists trg_resto_members_owner_guard on public.restaurant_members;
create constraint trigger trg_resto_members_owner_guard
  after update or delete on public.restaurant_members
  deferrable initially deferred
  for each row execute function public.tg_ensure_at_least_one_owner();

drop policy if exists "Members: self read" on public.restaurant_members;
create policy "Members: self read"
  on public.restaurant_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Members: co-members read" on public.restaurant_members;
create policy "Members: co-members read"
  on public.restaurant_members for select
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'staff'));

drop policy if exists "Members: platform admin read" on public.restaurant_members;
create policy "Members: platform admin read"
  on public.restaurant_members for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Members: owner manages" on public.restaurant_members;
create policy "Members: owner manages"
  on public.restaurant_members for all
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'owner'))
  with check (public.has_restaurant_membership(restaurant_id, 'owner'));

drop policy if exists "Members: platform admin manages" on public.restaurant_members;
create policy "Members: platform admin manages"
  on public.restaurant_members for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

commit;