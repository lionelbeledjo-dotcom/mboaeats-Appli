
-- Pack Sécurité MVP : verrouillage de connexion + tracking
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address inet,
  success boolean NOT NULL,
  user_agent text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts(email, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at
  ON public.login_attempts(attempted_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Seuls les superadmin/admin peuvent consulter
DROP POLICY IF EXISTS "Admins read login_attempts" ON public.login_attempts;
CREATE POLICY "Admins read login_attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- Personne ne peut insérer/modifier via API publique : seules les SECURITY DEFINER RPC
-- (pas de policy INSERT/UPDATE/DELETE -> verrouillé en client direct)

-- Fonction : un compte est-il verrouillé ?
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_failures int;
BEGIN
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.login_attempts
  WHERE email = lower(p_email)
    AND success = false
    AND attempted_at > now() - interval '5 minutes';
  RETURN v_recent_failures >= 5;
END;
$$;

-- Fonction : enregistrer une tentative
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_success boolean,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, ip_address, user_agent)
  VALUES (
    lower(p_email),
    p_success,
    NULLIF(p_ip, '')::inet,
    p_user_agent
  );
END;
$$;

-- Fonction : déverrouiller manuellement (superadmin uniquement)
CREATE OR REPLACE FUNCTION public.unlock_account(p_email text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  WITH deleted AS (
    DELETE FROM public.login_attempts
    WHERE email = lower(p_email)
      AND success = false
      AND attempted_at > now() - interval '5 minutes'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM deleted;
  PERFORM public.log_audit(
    'security.account_unlocked', 'login_attempts', NULL, NULL, NULL, NULL,
    jsonb_build_object('email', lower(p_email), 'deleted', v_deleted)
  );
  RETURN v_deleted;
END;
$$;

-- Fonction : purge des vieilles tentatives (>30j)
CREATE OR REPLACE FUNCTION public.purge_old_login_attempts()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.login_attempts
    WHERE attempted_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*)::int FROM deleted;
$$;
