
-- Bug #1: allow multiple email_log rows per (template, related_id)
DROP INDEX IF EXISTS public.uq_email_log_template_related;

-- Bug #4: add manually_open override column
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS manually_open boolean NOT NULL DEFAULT false;

-- Bug #6: trigger to sync restaurant_members when restaurants.owner_id is set/changed
CREATE OR REPLACE FUNCTION public.sync_restaurant_owner_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.restaurant_members (restaurant_id, user_id, role, status, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner'::restaurant_role, 'active'::member_status, now())
    ON CONFLICT (restaurant_id, user_id) DO UPDATE
      SET role = 'owner'::restaurant_role,
          status = 'active'::member_status,
          deleted_at = NULL,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_restaurant_owner_member ON public.restaurants;
CREATE TRIGGER trg_sync_restaurant_owner_member
AFTER INSERT OR UPDATE OF owner_id ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.sync_restaurant_owner_member();

-- Backfill: every restaurant with owner_id but no matching owner member row
INSERT INTO public.restaurant_members (restaurant_id, user_id, role, status, joined_at)
SELECT r.id, r.owner_id, 'owner'::restaurant_role, 'active'::member_status, now()
FROM public.restaurants r
WHERE r.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.restaurant_members m
    WHERE m.restaurant_id = r.id AND m.user_id = r.owner_id
  )
ON CONFLICT (restaurant_id, user_id) DO NOTHING;
