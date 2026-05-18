begin;

alter table public.restaurants
  add column if not exists validation_status text not null default 'pending'
    check (validation_status in ('pending', 'approved', 'rejected')),
  add column if not exists validation_note text,
  add column if not exists validated_by uuid references auth.users(id) on delete set null,
  add column if not exists validated_at timestamptz;

comment on column public.restaurants.validation_status is
  'État de la modération : pending (en attente), approved (validé, visible), rejected (refusé)';
comment on column public.restaurants.validation_note is
  'Raison du refus ou note interne admin (visible par le restaurateur si rejected)';
comment on column public.restaurants.validated_by is
  'UUID de l''admin qui a validé/refusé. NULL tant que pending.';
comment on column public.restaurants.validated_at is
  'Horodatage de la décision admin. NULL tant que pending.';

create index if not exists idx_restaurants_validation_pending
  on public.restaurants (created_at desc)
  where validation_status = 'pending' and deleted_at is null;

update public.restaurants
set
  validation_status = 'approved',
  validated_at = now(),
  validated_by = null
where validation_status = 'pending' or validation_status is null;

drop policy if exists "Restaurants public read" on public.restaurants;

create policy "Restaurants public read"
  on public.restaurants
  for select
  using (
    (is_active = true and validation_status = 'approved' and deleted_at is null)
    or has_role(auth.uid(), 'admin')
    or has_role(auth.uid(), 'superadmin')
  );

comment on policy "Restaurants public read" on public.restaurants is
  'Lecture publique restreinte aux restaurants validés et actifs. Admin/superadmin voient tout.';

create or replace function public.moderate_restaurant(
  p_restaurant_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_admin_id uuid := auth.uid();
  v_old_status text;
begin
  if v_admin_id is null then
    raise exception 'Non authentifié' using errcode = '42501';
  end if;
  if not (has_role(v_admin_id, 'admin') or has_role(v_admin_id, 'superadmin')) then
    raise exception 'Permission refusée : rôle admin requis' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Décision invalide. Attendu : approved ou rejected.' using errcode = '22023';
  end if;

  select validation_status into v_old_status
  from public.restaurants
  where id = p_restaurant_id and deleted_at is null;

  if v_old_status is null then
    raise exception 'Restaurant introuvable' using errcode = '02000';
  end if;

  update public.restaurants
  set
    validation_status = p_decision,
    validation_note = p_note,
    validated_by = v_admin_id,
    validated_at = now(),
    is_active = (p_decision = 'approved')
  where id = p_restaurant_id;

  insert into public.audit_logs (
    action, target_table, target_id, actor_id, actor_role, metadata
  ) values (
    'restaurant.' || p_decision,
    'restaurants',
    p_restaurant_id,
    v_admin_id,
    'admin',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', p_decision,
      'note', p_note
    )
  );

  return jsonb_build_object(
    'ok', true,
    'restaurant_id', p_restaurant_id,
    'new_status', p_decision
  );
end;
$$;

comment on function public.moderate_restaurant(uuid, text, text) is
  'Valide ou refuse un restaurant. Réservé aux rôles admin/superadmin. Logge automatiquement dans audit_logs.';

revoke all on function public.moderate_restaurant(uuid, text, text) from public, anon;
grant execute on function public.moderate_restaurant(uuid, text, text) to authenticated;

commit;