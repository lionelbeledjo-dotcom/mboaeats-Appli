-- ============================================================================
-- PACK POLISH FINAL
-- 1. Fonction is_restaurant_open_now (TZ Africa/Douala, jours en français)
-- 2. Restriction RLS sur INSERT payments
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. is_restaurant_open_now(restaurant_id)
-- ---------------------------------------------------------------------------
-- Règle hiérarchique :
--   1. manually_closed = TRUE  → FERMÉ
--   2. manually_open   = TRUE  → OUVERT (override existant, déjà utilisé en UI)
--   3. sinon comparaison opening_hours en heure locale Africa/Douala (UTC+1)
--   4. gère les horaires qui passent minuit (ex: 18:00 → 02:00)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_restaurant_open_now(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manually_closed boolean;
  v_manually_open   boolean;
  v_hours           jsonb;
  v_local           timestamp;
  v_day_key         text;
  v_day             jsonb;
  v_time            time;
  v_open            time;
  v_close           time;
BEGIN
  SELECT manually_closed, manually_open, opening_hours
    INTO v_manually_closed, v_manually_open, v_hours
    FROM public.restaurants WHERE id = p_restaurant_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF COALESCE(v_manually_closed, false) THEN RETURN false; END IF;
  IF COALESCE(v_manually_open,   false) THEN RETURN true;  END IF;
  IF v_hours IS NULL THEN RETURN true; END IF;

  v_local := (now() AT TIME ZONE 'Africa/Douala');

  v_day_key := CASE EXTRACT(ISODOW FROM v_local)::int
    WHEN 1 THEN 'lundi'
    WHEN 2 THEN 'mardi'
    WHEN 3 THEN 'mercredi'
    WHEN 4 THEN 'jeudi'
    WHEN 5 THEN 'vendredi'
    WHEN 6 THEN 'samedi'
    WHEN 7 THEN 'dimanche'
  END;

  v_day := v_hours -> v_day_key;
  IF v_day IS NULL THEN RETURN false; END IF;
  IF NOT COALESCE((v_day ->> 'is_open')::boolean, false) THEN RETURN false; END IF;

  BEGIN
    v_open  := (v_day ->> 'open')::time;
    v_close := (v_day ->> 'close')::time;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  v_time := v_local::time;

  IF v_close <= v_open THEN
    -- passe minuit
    RETURN v_time >= v_open OR v_time <= v_close;
  END IF;
  RETURN v_time >= v_open AND v_time <= v_close;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_restaurant_open_now(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Restreindre la policy INSERT sur payments
-- ---------------------------------------------------------------------------
-- Avant : "anyone create payment" → with_check = true (n'importe qui)
-- Après : seul un utilisateur authentifié qui s'attribue son propre user_id
--         peut INSERT, et le montant doit être > 0.
-- Service role bypass RLS donc le flow serveur (supabaseAdmin) reste intact.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone create payment" ON public.payments;

CREATE POLICY "Payments: authenticated owner insert"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND amount_fcfa > 0
  );