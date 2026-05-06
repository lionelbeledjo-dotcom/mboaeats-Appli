-- MboaPass subscriptions
CREATE TABLE public.mboapass_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('month','year')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  amount_fcfa INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mboapass_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own subs" ON public.mboapass_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own subs" ON public.mboapass_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own subs" ON public.mboapass_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage subs" ON public.mboapass_subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.mboapass_subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_subs_user_active ON public.mboapass_subscriptions(user_id, status, ends_at);

-- Payments (transactions MoMo/Orange)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  provider TEXT NOT NULL CHECK (provider IN ('momo','orange')),
  reference TEXT NOT NULL UNIQUE,
  msisdn TEXT NOT NULL,
  amount_fcfa INTEGER NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'order',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','otp_required','succeeded','failed','expired')),
  otp_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "anyone create payment" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins manage payments" ON public.payments FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_payments_ref ON public.payments(reference);