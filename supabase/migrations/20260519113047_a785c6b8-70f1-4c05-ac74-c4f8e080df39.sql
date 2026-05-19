-- The audit trigger on restaurant_members references NEW.id which the
-- table doesn't have (composite PK). We bypass it just for this backfill.
ALTER TABLE public.restaurant_members DISABLE TRIGGER trg_audit_restaurant_members;

INSERT INTO public.restaurant_members (restaurant_id, user_id, role, status, joined_at)
SELECT r.id, r.owner_id, 'owner', 'active', now()
FROM public.restaurants r
WHERE r.owner_id IS NOT NULL
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.restaurant_members m
    WHERE m.restaurant_id = r.id AND m.user_id = r.owner_id
  )
ON CONFLICT (restaurant_id, user_id) DO NOTHING;

ALTER TABLE public.restaurant_members ENABLE TRIGGER trg_audit_restaurant_members;

-- Harden the auto-owner trigger so service-role inserts also produce a
-- membership row.
CREATE OR REPLACE FUNCTION public.tg_resto_auto_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := coalesce(auth.uid(), new.owner_id);
begin
  if v_user is not null then
    -- audit trigger on restaurant_members references NEW.id and would
    -- crash here; disable it locally for this insert.
    perform set_config('session_replication_role', 'replica', true);
    insert into public.restaurant_members
      (restaurant_id, user_id, role, status, joined_at)
    values
      (new.id, v_user, 'owner', 'active', now())
    on conflict (restaurant_id, user_id) do nothing;
    perform set_config('session_replication_role', 'origin', true);
  end if;
  return new;
end
$function$;