-- 1) Colonnes rating sur driver_profiles si absentes
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

-- 2) Table reviews combinée
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  driver_id uuid,
  restaurant_rating integer CHECK (restaurant_rating BETWEEN 1 AND 5),
  restaurant_comment text,
  driver_rating integer CHECK (driver_rating BETWEEN 1 AND 5),
  driver_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON public.reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_driver ON public.reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
CREATE POLICY reviews_insert_own
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.user_id = auth.uid()
      AND o.status = 'delivered'::order_status
  )
);

DROP POLICY IF EXISTS reviews_read_public ON public.reviews;
CREATE POLICY reviews_read_public
ON public.reviews FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS reviews_admin_all ON public.reviews;
CREATE POLICY reviews_admin_all
ON public.reviews FOR ALL
TO authenticated
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- 3) Triggers d'agrégation
CREATE OR REPLACE FUNCTION public.update_restaurant_rating_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.restaurants
  SET rating = COALESCE((
        SELECT AVG(restaurant_rating)::numeric(3,2)
        FROM public.reviews
        WHERE restaurant_id = NEW.restaurant_id
          AND restaurant_rating IS NOT NULL
      ), 0),
      reviews_count = (
        SELECT COUNT(*) FROM public.reviews
        WHERE restaurant_id = NEW.restaurant_id
          AND restaurant_rating IS NOT NULL
      )
  WHERE id = NEW.restaurant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_update_restaurant ON public.reviews;
CREATE TRIGGER trg_review_update_restaurant
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_restaurant_rating_v2();

CREATE OR REPLACE FUNCTION public.update_driver_rating_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL THEN
    UPDATE public.driver_profiles
    SET rating = COALESCE((
          SELECT AVG(driver_rating)::numeric(3,2)
          FROM public.reviews
          WHERE driver_id = NEW.driver_id
            AND driver_rating IS NOT NULL
        ), 0),
        reviews_count = (
          SELECT COUNT(*) FROM public.reviews
          WHERE driver_id = NEW.driver_id
            AND driver_rating IS NOT NULL
        )
    WHERE user_id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_update_driver ON public.reviews;
CREATE TRIGGER trg_review_update_driver
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_driver_rating_v2();