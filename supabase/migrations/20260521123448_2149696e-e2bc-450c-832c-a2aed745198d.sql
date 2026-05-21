
-- Add UNIQUE constraint to commissions.category (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commissions_category_unique'
  ) THEN
    ALTER TABLE public.commissions ADD CONSTRAINT commissions_category_unique UNIQUE (category);
  END IF;
END $$;

-- Seed default global commission rate
INSERT INTO public.commissions (category, rate_pct, notes)
VALUES ('default', 18, 'Taux global par défaut, modifiable par superadmin')
ON CONFLICT (category) DO NOTHING;

-- Per-restaurant override
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);

-- Frozen commission columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_rate_applied numeric(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount integer,
  ADD COLUMN IF NOT EXISTS restaurant_payout integer;

-- Helper function: resolve effective commission rate for a restaurant
CREATE OR REPLACE FUNCTION public.get_commission_rate(p_restaurant_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  SELECT commission_rate INTO v_rate
  FROM public.restaurants WHERE id = p_restaurant_id;

  IF v_rate IS NULL THEN
    SELECT rate_pct INTO v_rate
    FROM public.commissions WHERE category = 'default';
  END IF;

  RETURN COALESCE(v_rate, 18);
END;
$$;

-- Backfill existing orders with frozen commission values
UPDATE public.orders o
SET commission_rate_applied = public.get_commission_rate(o.restaurant_id),
    commission_amount = ROUND(o.subtotal * public.get_commission_rate(o.restaurant_id) / 100)::integer,
    restaurant_payout = o.subtotal - ROUND(o.subtotal * public.get_commission_rate(o.restaurant_id) / 100)::integer
WHERE o.commission_rate_applied IS NULL;
