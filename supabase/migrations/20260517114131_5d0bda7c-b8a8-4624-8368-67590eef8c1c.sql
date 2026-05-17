ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

DROP POLICY IF EXISTS "Admins manage profile suspensions" ON public.profiles;
CREATE POLICY "Admins manage profile suspensions"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_platform_admin());