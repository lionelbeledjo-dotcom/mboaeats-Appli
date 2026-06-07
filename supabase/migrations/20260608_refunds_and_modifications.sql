-- Modifications de commande demandées par le client
CREATE TABLE IF NOT EXISTS order_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  items_snapshot JSONB NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_modifications_order ON order_modifications (order_id);
ALTER TABLE order_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modifications_owner" ON order_modifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "modifications_insert_owner" ON order_modifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "modifications_restaurant" ON order_modifications FOR ALL USING (
  EXISTS (SELECT 1 FROM orders o JOIN restaurants r ON o.restaurant_id = r.id WHERE o.id = order_id AND r.owner_id = auth.uid())
);

-- Remboursements
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  method TEXT DEFAULT 'wallet' CHECK (method IN ('wallet', 'mobile_money', 'original')),
  processed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds (order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds (user_id);
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refunds_owner_read" ON refunds FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "refunds_admin_all" ON refunds FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Auto-refund: si litige ouvert > 48h sans reponse, remboursement auto
CREATE OR REPLACE FUNCTION auto_refund_overdue_disputes()
RETURNS void AS $$
BEGIN
  INSERT INTO refunds (order_id, user_id, amount, reason, status, method)
  SELECT
    d.order_id,
    o.user_id,
    o.total,
    'Remboursement automatique - litige non resolu sous 48h',
    'approved',
    'wallet'
  FROM order_disputes d
  JOIN orders o ON o.id = d.order_id
  WHERE d.status = 'open'
    AND d.created_at < NOW() - INTERVAL '48 hours'
    AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = d.order_id);

  UPDATE order_disputes
  SET status = 'resolved', resolved_at = NOW()
  WHERE status = 'open'
    AND created_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
