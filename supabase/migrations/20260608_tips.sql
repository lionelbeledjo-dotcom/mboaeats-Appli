CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tips_driver ON tips (driver_id);
CREATE INDEX IF NOT EXISTS idx_tips_order ON tips (order_id);
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_insert_own" ON tips FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tips_select_own" ON tips FOR SELECT USING (user_id = auth.uid() OR driver_id = auth.uid());
