CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'percent')),
  value INTEGER NOT NULL,
  min_order INTEGER DEFAULT 0,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes (code);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_read_active" ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "promo_admin_all" ON promo_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);
