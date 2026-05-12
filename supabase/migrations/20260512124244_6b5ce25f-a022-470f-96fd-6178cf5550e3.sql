-- ─── 1. Wallets table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY,
  balance_fcfa integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XAF',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallets_balance_nonneg CHECK (balance_fcfa >= 0)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage wallets" ON public.wallets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER wallets_set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ─── 2. Wallet transactions (historique) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('topup','order_payment','refund','bonus','adjustment')),
  amount_fcfa integer NOT NULL,
  balance_after integer NOT NULL,
  reference text,
  order_id uuid,
  payment_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_tx_user_created_idx
  ON public.wallet_transactions(user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own wallet tx" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage wallet tx" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─── 3. Atomic wallet operation function ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.wallet_apply(
  _user_id uuid,
  _delta integer,           -- positif = crédit, négatif = débit
  _type text,
  _description text DEFAULT NULL,
  _reference text DEFAULT NULL,
  _order_id uuid DEFAULT NULL,
  _payment_id uuid DEFAULT NULL
) RETURNS TABLE(new_balance integer, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_tx_id uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'delta must not be zero'; END IF;
  IF _type NOT IN ('topup','order_payment','refund','bonus','adjustment') THEN
    RAISE EXCEPTION 'invalid type: %', _type;
  END IF;

  -- Crée le wallet à la volée
  INSERT INTO public.wallets (user_id, balance_fcfa)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update atomique avec verrou de ligne
  UPDATE public.wallets
     SET balance_fcfa = balance_fcfa + _delta,
         updated_at = now()
   WHERE user_id = _user_id
   RETURNING balance_fcfa INTO v_balance;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'wallet not found for user %', _user_id;
  END IF;

  IF v_balance < 0 THEN
    -- Annule la modif via exception (transaction rollback)
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  INSERT INTO public.wallet_transactions
    (user_id, type, amount_fcfa, balance_after, reference, order_id, payment_id, description)
  VALUES
    (_user_id, _type, _delta, v_balance, _reference, _order_id, _payment_id, _description)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_balance, v_tx_id;
END;
$$;

-- ─── 4. Refund eligibility & execution ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.refund_order_to_wallet(_order_id uuid)
RETURNS TABLE(refunded_amount integer, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_caller uuid := auth.uid();
  v_balance integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'order_not_found'; END IF;

  -- Seuls le propriétaire de la commande ou un admin
  IF v_caller IS NULL OR (v_caller <> v_order.user_id AND NOT has_role(v_caller, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Doit être payée
  IF v_order.status::text <> 'paid' OR v_order.paid_at IS NULL THEN
    RAISE EXCEPTION 'order_not_refundable';
  END IF;

  -- Fenêtre 5 min après paiement (sauf admin)
  IF NOT has_role(v_caller, 'admin'::app_role)
     AND v_order.paid_at < (now() - interval '5 minutes') THEN
    RAISE EXCEPTION 'refund_window_expired';
  END IF;

  -- Déjà annulée ?
  IF v_order.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'order_already_cancelled';
  END IF;

  -- Crédit du wallet
  SELECT (wa.new_balance) INTO v_balance
  FROM public.wallet_apply(
    v_order.user_id,
    v_order.total,
    'refund',
    'Remboursement commande ' || v_order.reference,
    v_order.reference,
    v_order.id,
    NULL
  ) AS wa;

  -- Annule la commande
  UPDATE public.orders
     SET status = 'cancelled',
         cancelled_at = now()
   WHERE id = _order_id;

  INSERT INTO public.order_events (order_id, event_type, payload, created_by)
  VALUES (_order_id, 'refunded',
          jsonb_build_object('amount', v_order.total, 'method', 'wallet'),
          v_caller);

  RETURN QUERY SELECT v_order.total::integer, v_balance;
END;
$$;

-- ─── 5. Track payment method on orders ───────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text;

-- ─── 6. Notification trigger for refunds ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'refund' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, data)
    VALUES (
      NEW.user_id, 'wallet',
      '💰 Remboursement crédité',
      'Votre solde a été crédité de ' || NEW.amount_fcfa || ' FCFA.',
      '/profil',
      jsonb_build_object('tx_id', NEW.id, 'amount', NEW.amount_fcfa, 'reference', NEW.reference)
    );
  ELSIF NEW.type = 'topup' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, data)
    VALUES (
      NEW.user_id, 'wallet',
      '✅ Recharge réussie',
      'Votre wallet a été rechargé de ' || NEW.amount_fcfa || ' FCFA.',
      '/profil',
      jsonb_build_object('tx_id', NEW.id, 'amount', NEW.amount_fcfa)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_tx_notify ON public.wallet_transactions;
CREATE TRIGGER wallet_tx_notify
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_refund();