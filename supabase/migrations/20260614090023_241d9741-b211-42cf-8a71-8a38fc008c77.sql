
-- 1) Commissions: only platform admins can read
DROP POLICY IF EXISTS "Commissions readable by authenticated" ON public.commissions;
DROP POLICY IF EXISTS "Commissions: admin read" ON public.commissions;
CREATE POLICY "Commissions: admin read"
  ON public.commissions FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 2) MboaPass subscriptions: remove user self-update; only admins/service role mutate
DROP POLICY IF EXISTS "users update own subs" ON public.mboapass_subscriptions;

-- 3) Hardened explicit policies (service_role only) for sensitive infra tables.
-- Even though Supabase RLS denies by default with no policy, explicit deny policies
-- make the intent obvious and resilient to accidental future grants.

-- otp_codes
DROP POLICY IF EXISTS "otp_codes: service only" ON public.otp_codes;
CREATE POLICY "otp_codes: service only"
  ON public.otp_codes FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- phone_users
DROP POLICY IF EXISTS "phone_users: service only" ON public.phone_users;
CREATE POLICY "phone_users: service only"
  ON public.phone_users FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- payment_webhook_events
DROP POLICY IF EXISTS "payment_webhook_events: admin read" ON public.payment_webhook_events;
CREATE POLICY "payment_webhook_events: admin read"
  ON public.payment_webhook_events FOR SELECT TO authenticated
  USING (public.is_platform_admin());
DROP POLICY IF EXISTS "payment_webhook_events: deny writes" ON public.payment_webhook_events;
CREATE POLICY "payment_webhook_events: deny writes"
  ON public.payment_webhook_events FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- rate_limits
DROP POLICY IF EXISTS "rate_limits: service only" ON public.rate_limits;
CREATE POLICY "rate_limits: service only"
  ON public.rate_limits FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
