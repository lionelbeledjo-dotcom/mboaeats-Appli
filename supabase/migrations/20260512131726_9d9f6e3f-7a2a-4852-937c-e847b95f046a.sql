
-- Référralisation
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own code" ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Code public lookup" ON public.referral_codes FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  bonus_amount integer NOT NULL DEFAULT 500,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own referrals" ON public.referrals FOR SELECT USING (auth.uid() IN (referrer_id, referred_user_id));
CREATE POLICY "User claims own referral" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_user_id);
CREATE POLICY "Admins manage referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Récompenses (catalogue + redemptions)
CREATE TABLE IF NOT EXISTS public.rewards_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  cost_points integer NOT NULL,
  type text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  min_tier text NOT NULL DEFAULT 'Pistache',
  is_active boolean NOT NULL DEFAULT true,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalog public read" ON public.rewards_catalog FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage catalog" ON public.rewards_catalog FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.rewards_catalog (code, name, cost_points, type, value, min_tier, icon) VALUES
('FREE_DELIVERY', 'Livraison offerte', 500, 'free_delivery', 0, 'Pistache', '🛵'),
('DISCOUNT_1000', 'Bon -1000 FCFA', 800, 'wallet_credit', 1000, 'Soya Boy', '💳'),
('DISCOUNT_3000', 'Bon -3000 FCFA', 2000, 'wallet_credit', 3000, 'Chef Ndolé', '🎁'),
('FREE_DISH', 'Plat signature offert', 4000, 'free_dish', 0, 'Roi du Mboa', '👑')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  reward_code text NOT NULL,
  cost_points integer NOT NULL,
  status text NOT NULL DEFAULT 'redeemed',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own redemptions" ON public.reward_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage redemptions" ON public.reward_redemptions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Génération automatique du code de parrainage à l'inscription
CREATE OR REPLACE FUNCTION public.gen_referral_code(_uid uuid) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE v_code text;
BEGIN
  v_code := 'MBOA-' || upper(substr(replace(_uid::text, '-', ''), 1, 6));
  RETURN v_code;
END $$;

CREATE OR REPLACE FUNCTION public.tg_create_referral_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, public.gen_referral_code(NEW.id))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_create_referral_code();

-- Backfill codes pour utilisateurs existants
INSERT INTO public.referral_codes (user_id, code)
SELECT id, public.gen_referral_code(id) FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Niveaux fidélité
CREATE OR REPLACE FUNCTION public.loyalty_tier(_pts integer) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _pts >= 6000 THEN 'Roi du Mboa'
    WHEN _pts >= 2500 THEN 'Chef Ndolé'
    WHEN _pts >= 800 THEN 'Soya Boy'
    ELSE 'Pistache'
  END
$$;

-- Attribution des points + bonus parrainage à la commande payée
CREATE OR REPLACE FUNCTION public.tg_award_loyalty_on_paid() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pts integer;
  v_new integer;
  v_first_paid boolean;
  v_ref RECORD;
BEGIN
  IF NEW.status::text = 'paid' AND (OLD.status IS NULL OR OLD.status::text <> 'paid') THEN
    -- 1 pt par tranche de 100 FCFA
    v_pts := GREATEST(1, NEW.subtotal / 100);
    INSERT INTO public.loyalty_points (user_id, points, level)
    VALUES (NEW.user_id, v_pts, 'Pistache')
    ON CONFLICT (user_id) DO UPDATE SET
      points = public.loyalty_points.points + v_pts,
      level = public.loyalty_tier(public.loyalty_points.points + v_pts),
      updated_at = now()
    RETURNING points INTO v_new;

    INSERT INTO public.notifications (user_id, type, title, body, link, data)
    VALUES (NEW.user_id, 'loyalty', '🎁 +' || v_pts || ' Mboa Points',
            'Vous avez gagné ' || v_pts || ' points sur votre commande ' || NEW.reference || '. Solde : ' || v_new || ' pts.',
            '/fidelite',
            jsonb_build_object('order_id', NEW.id, 'points_awarded', v_pts, 'new_balance', v_new));

    -- Bonus parrainage première commande payée
    SELECT NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE user_id = NEW.user_id AND id <> NEW.id AND paid_at IS NOT NULL
    ) INTO v_first_paid;

    IF v_first_paid THEN
      SELECT * INTO v_ref FROM public.referrals
      WHERE referred_user_id = NEW.user_id AND status = 'pending' LIMIT 1;
      IF v_ref.id IS NOT NULL THEN
        PERFORM public.wallet_apply(v_ref.referrer_id, v_ref.bonus_amount, 'bonus',
          'Bonus parrainage (' || v_ref.code || ')', NEW.reference, NEW.id, NULL);
        PERFORM public.wallet_apply(NEW.user_id, v_ref.bonus_amount, 'bonus',
          'Bonus de bienvenue parrainage', NEW.reference, NEW.id, NULL);
        UPDATE public.referrals SET status='rewarded', rewarded_at=now() WHERE id = v_ref.id;
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (v_ref.referrer_id, 'referral', '👥 Bonus parrainage reçu',
                v_ref.bonus_amount || ' FCFA crédités sur votre wallet (filleul a commandé).', '/parrainage');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS award_loyalty_on_paid ON public.orders;
CREATE TRIGGER award_loyalty_on_paid AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_award_loyalty_on_paid();

-- Application code parrain (RPC sécurisée)
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ref_uid uuid;
  v_has_orders boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = v_uid) THEN
    RAISE EXCEPTION 'already_referred';
  END IF;
  SELECT user_id INTO v_ref_uid FROM public.referral_codes WHERE code = upper(_code);
  IF v_ref_uid IS NULL THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF v_ref_uid = v_uid THEN RAISE EXCEPTION 'self_referral'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.orders WHERE user_id = v_uid AND paid_at IS NOT NULL) INTO v_has_orders;
  IF v_has_orders THEN RAISE EXCEPTION 'too_late'; END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id, code, status, bonus_amount)
  VALUES (v_ref_uid, v_uid, upper(_code), 'pending', 500);
  RETURN upper(_code);
END $$;

-- Récompense : redemption qui débite les points et crédite le wallet/livraison
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_r RECORD;
  v_pts integer;
  v_new integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_r FROM public.rewards_catalog WHERE code = _reward_code AND is_active;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'reward_not_found'; END IF;

  SELECT points INTO v_pts FROM public.loyalty_points WHERE user_id = v_uid;
  v_pts := COALESCE(v_pts, 0);
  IF v_pts < v_r.cost_points THEN RAISE EXCEPTION 'insufficient_points'; END IF;

  v_new := v_pts - v_r.cost_points;
  UPDATE public.loyalty_points SET points = v_new, level = public.loyalty_tier(v_new), updated_at = now()
  WHERE user_id = v_uid;

  INSERT INTO public.reward_redemptions (user_id, reward_id, reward_code, cost_points)
  VALUES (v_uid, v_r.id, v_r.code, v_r.cost_points);

  IF v_r.type = 'wallet_credit' AND v_r.value > 0 THEN
    PERFORM public.wallet_apply(v_uid, v_r.value, 'bonus', 'Récompense fidélité: ' || v_r.name, v_r.code, NULL, NULL);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (v_uid, 'loyalty', '🎉 Récompense débloquée', v_r.name || ' (-' || v_r.cost_points || ' pts).', '/fidelite');

  RETURN jsonb_build_object('reward', v_r.name, 'cost', v_r.cost_points, 'new_balance', v_new);
END $$;
