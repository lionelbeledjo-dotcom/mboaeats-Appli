-- =============================================================================
-- MboaEats Audit Fixes Migration — 2026-06-13
-- Addresses: FK tips, CHECK constraints, indexes, audit_logs, loyalty trigger,
-- auto-refund cron, concurrent order limit
-- =============================================================================

-- 1. FOREIGN KEYS ON TIPS TABLE
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tips_order' AND table_name = 'tips'
  ) THEN
    ALTER TABLE public.tips
      ADD CONSTRAINT fk_tips_order
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tips_driver' AND table_name = 'tips'
  ) THEN
    ALTER TABLE public.tips
      ADD CONSTRAINT fk_tips_driver
      FOREIGN KEY (driver_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. MISSING INDEXES
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_restaurants_slug
  ON public.restaurants(slug);

CREATE INDEX IF NOT EXISTS idx_payments_reference
  ON public.payments(reference);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON public.wallet_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver
  ON public.driver_locations(driver_id);

CREATE INDEX IF NOT EXISTS idx_orders_reference
  ON public.orders(reference);

CREATE INDEX IF NOT EXISTS idx_order_events_order
  ON public.order_events(order_id, created_at DESC);

-- 3. AUDIT LOGS TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 4. LOYALTY POINTS ACCRUAL TRIGGER
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accrue_loyalty_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  points_earned INT;
  new_total INT;
  new_level TEXT;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    points_earned := GREATEST(1, FLOOR(NEW.total / 1000));

    INSERT INTO public.loyalty_points (user_id, points, level)
    VALUES (NEW.user_id, points_earned, 'bronze')
    ON CONFLICT (user_id)
    DO UPDATE SET
      points = loyalty_points.points + points_earned;

    SELECT points INTO new_total
    FROM public.loyalty_points WHERE user_id = NEW.user_id;

    new_level := CASE
      WHEN new_total >= 5000 THEN 'diamond'
      WHEN new_total >= 2000 THEN 'gold'
      WHEN new_total >= 500 THEN 'silver'
      ELSE 'bronze'
    END;

    UPDATE public.loyalty_points
    SET level = new_level
    WHERE user_id = NEW.user_id AND level != new_level;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_loyalty_on_delivery ON public.orders;
CREATE TRIGGER trg_loyalty_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
  EXECUTE FUNCTION public.accrue_loyalty_on_delivery();

-- 5. AUTO-REFUND OVERDUE DISPUTES (schedule hourly via pg_cron if available)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_refund_overdue_disputes()
RETURNS void AS $$
BEGIN
  INSERT INTO public.refunds (order_id, user_id, amount, reason, status, created_at)
  SELECT
    d.order_id,
    o.user_id,
    d.amount,
    'Auto-refund: dispute non résolue après 48h',
    'approved',
    now()
  FROM public.disputes d
  JOIN public.orders o ON o.id = d.order_id
  WHERE d.status = 'open'
    AND d.created_at < now() - INTERVAL '48 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.refunds r
      WHERE r.order_id = d.order_id AND r.status IN ('approved', 'pending')
    );

  UPDATE public.disputes
  SET status = 'resolved', resolved_at = now()
  WHERE status = 'open'
    AND created_at < now() - INTERVAL '48 hours'
    AND EXISTS (
      SELECT 1 FROM public.refunds r
      WHERE r.order_id = disputes.order_id AND r.status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule auto-refund (pg_cron — will silently fail if extension not enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto_refund_disputes');
    PERFORM cron.schedule('auto_refund_disputes', '0 * * * *', 'SELECT public.auto_refund_overdue_disputes()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — auto_refund_overdue_disputes must be called externally';
END $$;

-- 6. CONCURRENT ORDER LIMIT FUNCTION
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_concurrent_orders_limit()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INT;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM public.orders
  WHERE user_id = NEW.user_id
    AND status IN ('draft', 'pending_payment', 'paid', 'accepted', 'preparing')
    AND deleted_at IS NULL;

  IF pending_count >= 5 THEN
    RAISE EXCEPTION 'Maximum concurrent orders limit reached (5)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_concurrent_orders ON public.orders;
CREATE TRIGGER trg_check_concurrent_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_concurrent_orders_limit();

-- 7. AUDIT LOG HELPER FUNCTION (for server-side usage)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _actor_id UUID,
  _action TEXT,
  _entity_type TEXT,
  _entity_id UUID DEFAULT NULL,
  _details JSONB DEFAULT '{}',
  _ip TEXT DEFAULT NULL,
  _ua TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details, ip_address, user_agent)
  VALUES (_actor_id, _action, _entity_type, _entity_id, _details, _ip, _ua)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
