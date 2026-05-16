begin;

create table if not exists public.audit_logs (
  id            bigserial primary key,
  occurred_at   timestamptz not null default now(),
  actor_id      uuid,
  actor_role    text,
  action        text not null,
  target_table  text not null,
  target_id     uuid,
  restaurant_id uuid,
  before_data   jsonb,
  after_data    jsonb,
  metadata      jsonb default '{}'::jsonb,
  ip            inet,
  user_agent    text
);

create index if not exists idx_audit_logs_actor      on public.audit_logs (actor_id, occurred_at desc);
create index if not exists idx_audit_logs_restaurant on public.audit_logs (restaurant_id, occurred_at desc);
create index if not exists idx_audit_logs_target     on public.audit_logs (target_table, target_id);
create index if not exists idx_audit_logs_action     on public.audit_logs (action, occurred_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Audit logs: tenant managers read" on public.audit_logs;
create policy "Audit logs: tenant managers read"
  on public.audit_logs for select
  to authenticated
  using (
    restaurant_id is not null
    and public.has_restaurant_membership(restaurant_id, 'manager')
  );

drop policy if exists "Audit logs: platform admin read" on public.audit_logs;
create policy "Audit logs: platform admin read"
  on public.audit_logs for select
  to authenticated
  using (public.is_platform_admin());

create or replace function public.log_audit(
  _action         text,
  _target_table   text,
  _target_id      uuid,
  _restaurant_id  uuid default null,
  _before         jsonb default null,
  _after          jsonb default null,
  _metadata       jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    v_role := 'system';
  elsif public.is_platform_superadmin() then
    v_role := 'superadmin';
  elsif public.is_platform_admin() then
    v_role := 'admin';
  elsif _restaurant_id is not null
    and public.has_restaurant_membership(_restaurant_id, 'kitchen') then
    v_role := 'restaurant_member';
  else
    v_role := 'client';
  end if;

  insert into public.audit_logs (
    actor_id, actor_role, action, target_table, target_id,
    restaurant_id, before_data, after_data, metadata
  ) values (
    auth.uid(), v_role, _action, _target_table, _target_id,
    _restaurant_id, _before, _after, _metadata
  );
end
$$;
revoke all on function public.log_audit(text,text,uuid,uuid,jsonb,jsonb,jsonb) from public;

create or replace function public.tg_audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before jsonb;
  v_after  jsonb;
  v_target_id uuid;
  v_resto_id uuid;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_before := null;
    v_after  := to_jsonb(new);
    v_action := tg_table_name || '.created';
    v_target_id := (new.id)::uuid;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after  := to_jsonb(new);
    v_action := tg_table_name || '.updated';
    v_target_id := (new.id)::uuid;
  elsif tg_op = 'DELETE' then
    v_before := to_jsonb(old);
    v_after  := null;
    v_action := tg_table_name || '.deleted';
    v_target_id := (old.id)::uuid;
  end if;

  if tg_table_name = 'restaurants' then
    v_resto_id := v_target_id;
  else
    begin
      v_resto_id := coalesce(
        (v_after  ->> 'restaurant_id')::uuid,
        (v_before ->> 'restaurant_id')::uuid
      );
    exception when others then
      v_resto_id := null;
    end;
  end if;

  perform public.log_audit(
    v_action, tg_table_name, v_target_id, v_resto_id, v_before, v_after
  );
  return coalesce(new, old);
end
$$;

drop trigger if exists trg_audit_restaurants        on public.restaurants;
create trigger trg_audit_restaurants
  after insert or update or delete on public.restaurants
  for each row execute function public.tg_audit_row();

drop trigger if exists trg_audit_restaurant_members on public.restaurant_members;
create trigger trg_audit_restaurant_members
  after insert or update or delete on public.restaurant_members
  for each row execute function public.tg_audit_row();

drop trigger if exists trg_audit_orders             on public.orders;
create trigger trg_audit_orders
  after insert or update or delete on public.orders
  for each row execute function public.tg_audit_row();

drop trigger if exists trg_audit_user_roles         on public.user_roles;
create trigger trg_audit_user_roles
  after insert or update or delete on public.user_roles
  for each row execute function public.tg_audit_row();

drop trigger if exists trg_audit_payments           on public.payments;
create trigger trg_audit_payments
  after insert or update or delete on public.payments
  for each row execute function public.tg_audit_row();

alter table public.payments add column if not exists deleted_at timestamptz;

create index if not exists idx_restaurants_active_alive
  on public.restaurants (id) where deleted_at is null and is_active = true;
create index if not exists idx_dishes_alive
  on public.dishes (restaurant_id) where deleted_at is null;
create index if not exists idx_orders_alive
  on public.orders (user_id, created_at desc) where deleted_at is null;
create index if not exists idx_payments_alive
  on public.payments (reference) where deleted_at is null;

create or replace function public.soft_delete_restaurant(_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.has_restaurant_membership(_id, 'owner') or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;

  update public.restaurants
    set deleted_at = now(),
        is_active  = false,
        is_open    = false
    where id = _id
      and deleted_at is null;

  update public.restaurant_members
    set status = 'suspended',
        updated_at = now()
    where restaurant_id = _id
      and status = 'active';

  perform public.log_audit(
    'restaurant.soft_deleted', 'restaurants', _id, _id, null, null,
    jsonb_build_object('cascade', 'members_suspended')
  );
end
$$;
revoke all on function public.soft_delete_restaurant(uuid) from public;
grant execute on function public.soft_delete_restaurant(uuid) to authenticated;

create or replace function public.restore_restaurant(_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  update public.restaurants
    set deleted_at = null,
        is_active  = true
    where id = _id;

  perform public.log_audit(
    'restaurant.restored', 'restaurants', _id, _id, null, null, '{}'::jsonb
  );
end
$$;
revoke all on function public.restore_restaurant(uuid) from public;
grant execute on function public.restore_restaurant(uuid) to authenticated;

commit;