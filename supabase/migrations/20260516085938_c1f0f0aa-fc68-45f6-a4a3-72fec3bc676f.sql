begin;

insert into public.restaurant_members (restaurant_id, user_id, role, status, joined_at)
select r.id, r.owner_id, 'owner', 'active', coalesce(r.created_at, now())
from public.restaurants r
where r.owner_id is not null
on conflict (restaurant_id, user_id) do update
  set role = 'owner',
      status = 'active',
      deleted_at = null,
      updated_at = now();

do $$
declare
  v_stale int;
begin
  select count(*) into v_stale
  from public.user_roles ur
  where ur.role::text = 'restaurateur'
    and not exists (
      select 1 from public.restaurant_members rm
      where rm.user_id = ur.user_id
        and rm.status = 'active'
        and rm.deleted_at is null
    );

  if v_stale > 0 then
    raise notice
      'Migration: % users ont user_roles.role=restaurateur mais aucun restaurant_members actif. À traiter manuellement.',
      v_stale;
  end if;
exception when others then
  -- enum sans 'restaurateur' : on ignore
  null;
end
$$;

create or replace view public.restaurant_owners as
select rm.restaurant_id,
       rm.user_id as owner_id,
       rm.joined_at,
       rm.updated_at
from public.restaurant_members rm
where rm.role = 'owner'
  and rm.status = 'active'
  and rm.deleted_at is null;

grant select on public.restaurant_owners to authenticated;

do $$
declare
  v_restos_without_owner int;
  v_orphan_members int;
begin
  select count(*) into v_restos_without_owner
  from public.restaurants r
  where r.deleted_at is null
    and not exists (
      select 1 from public.restaurant_members rm
      where rm.restaurant_id = r.id
        and rm.role = 'owner'
        and rm.status = 'active'
        and rm.deleted_at is null
    );

  if v_restos_without_owner > 0 then
    raise warning
      'Migration: % restaurants actifs sans owner — créez un membership manuel ou désactivez-les.',
      v_restos_without_owner;
  end if;

  select count(*) into v_orphan_members
  from public.restaurant_members rm
  left join auth.users u on u.id = rm.user_id
  where u.id is null;

  if v_orphan_members > 0 then
    raise warning
      'Migration: % memberships pointent vers un user supprimé — à nettoyer.',
      v_orphan_members;
  end if;
end
$$;

create or replace view public.tenant_health as
select
  r.id           as restaurant_id,
  r.slug,
  r.name,
  r.is_active,
  r.is_open,
  r.deleted_at,
  (select count(*) from public.restaurant_members m
     where m.restaurant_id = r.id and m.status = 'active' and m.deleted_at is null) as members_active,
  (select count(*) from public.restaurant_members m
     where m.restaurant_id = r.id and m.role = 'owner'
       and m.status = 'active' and m.deleted_at is null)                              as owners_active,
  (select count(*) from public.dishes d
     where d.restaurant_id = r.id and d.deleted_at is null)                           as dishes_count,
  (select count(*) from public.orders o
     where o.restaurant_id = r.id and o.created_at > now() - interval '7 days')      as orders_7d
from public.restaurants r;

revoke all on public.tenant_health from anon, authenticated;

commit;