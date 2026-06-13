
DROP POLICY IF EXISTS "Commissions are readable by all" ON public.commissions;
CREATE POLICY "Commissions readable by authenticated"
  ON public.commissions FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.payments FROM authenticated;
GRANT SELECT (
  id, user_id, provider, reference, amount_fcfa, purpose,
  status, provider_tx_id, created_at, updated_at, deleted_at
) ON public.payments TO authenticated;

DROP POLICY IF EXISTS "Owner reads own 2fa" ON public.superadmin_2fa;
CREATE POLICY "Owner reads own 2fa"
  ON public.superadmin_2fa FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated realtime access" ON realtime.messages;
CREATE POLICY "Authenticated realtime access"
  ON realtime.messages FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated realtime publish" ON realtime.messages;
CREATE POLICY "Authenticated realtime publish"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
