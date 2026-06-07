CREATE TABLE IF NOT EXISTS order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'restaurant', 'driver')),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages (order_id, created_at);

ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_participants" ON order_messages FOR SELECT USING (
  sender_id = auth.uid() OR
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND (orders.user_id = auth.uid() OR orders.restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())))
);

CREATE POLICY "messages_insert" ON order_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);

ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
