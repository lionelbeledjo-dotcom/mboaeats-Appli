CREATE OR REPLACE FUNCTION public.claim_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT count(*) INTO v_existing FROM public.user_roles WHERE role = 'superadmin';
  IF v_existing > 0 THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'superadmin');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'superadmin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;