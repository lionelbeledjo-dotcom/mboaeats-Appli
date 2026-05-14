
-- Table 2FA réservée aux SUPER_ADMIN
CREATE TABLE public.superadmin_2fa (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  secret_ciphertext text,
  secret_iv text,
  secret_tag text,
  verified_at timestamp with time zone,
  backup_codes_hashed text[] NOT NULL DEFAULT '{}',
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.superadmin_2fa ENABLE ROW LEVEL SECURITY;

-- Seul l'utilisateur peut voir/écrire sa propre ligne, ou un superadmin existant
CREATE POLICY "Owner reads own 2fa"
  ON public.superadmin_2fa FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Owner inserts own 2fa"
  ON public.superadmin_2fa FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Owner updates own 2fa"
  ON public.superadmin_2fa FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Owner deletes own 2fa"
  ON public.superadmin_2fa FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_superadmin_2fa_updated
  BEFORE UPDATE ON public.superadmin_2fa
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Journal d'audit des tentatives 2FA
CREATE TABLE public.superadmin_2fa_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  success boolean NOT NULL,
  kind text NOT NULL DEFAULT 'totp',
  ip text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.superadmin_2fa_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own attempts"
  ON public.superadmin_2fa_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_sa2fa_attempts_user_created ON public.superadmin_2fa_attempts(user_id, created_at DESC);
