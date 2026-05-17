
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.driver_application_status AS ENUM ('en_attente', 'valide', 'rejete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.driver_profiles (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL,
  phone text NOT NULL,
  city text,
  vehicle_type text,
  plate_number text,
  photo_url text,
  cni_url text,
  permis_url text,
  status public.driver_application_status NOT NULL DEFAULT 'en_attente',
  rejection_reason text,
  validated_at timestamptz,
  validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Driver profiles: owner select" ON public.driver_profiles;
CREATE POLICY "Driver profiles: owner select" ON public.driver_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Driver profiles: owner insert" ON public.driver_profiles;
CREATE POLICY "Driver profiles: owner insert" ON public.driver_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'en_attente');

DROP POLICY IF EXISTS "Driver profiles: owner update pending" ON public.driver_profiles;
CREATE POLICY "Driver profiles: owner update pending" ON public.driver_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'en_attente')
  WITH CHECK (auth.uid() = user_id AND status = 'en_attente');

DROP POLICY IF EXISTS "Driver profiles: admin all" ON public.driver_profiles;
CREATE POLICY "Driver profiles: admin all" ON public.driver_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_platform_admin())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_platform_admin());

CREATE OR REPLACE FUNCTION public.driver_profiles_set_updated()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_driver_profiles_updated ON public.driver_profiles;
CREATE TRIGGER trg_driver_profiles_updated BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW EXECUTE FUNCTION public.driver_profiles_set_updated();

-- Auto-grant livreur role on validation
CREATE OR REPLACE FUNCTION public.driver_profiles_on_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'valide' AND (OLD.status IS DISTINCT FROM 'valide') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'livreur'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    NEW.validated_at = COALESCE(NEW.validated_at, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_driver_profiles_validate ON public.driver_profiles;
CREATE TRIGGER trg_driver_profiles_validate BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW EXECUTE FUNCTION public.driver_profiles_on_validate();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-docs', 'driver-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "driver-docs: owner read" ON storage.objects;
CREATE POLICY "driver-docs: owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'driver-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "driver-docs: owner write" ON storage.objects;
CREATE POLICY "driver-docs: owner write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "driver-docs: owner update" ON storage.objects;
CREATE POLICY "driver-docs: owner update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'driver-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "driver-docs: admin all" ON storage.objects;
CREATE POLICY "driver-docs: admin all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'driver-docs' AND (has_role(auth.uid(), 'admin'::app_role) OR is_platform_admin()))
WITH CHECK (bucket_id = 'driver-docs' AND (has_role(auth.uid(), 'admin'::app_role) OR is_platform_admin()));
