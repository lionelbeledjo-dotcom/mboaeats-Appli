
-- Recalcul auto de restaurants.rating et reviews_count à chaque changement d'avis
CREATE OR REPLACE FUNCTION public.tg_recompute_restaurant_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid uuid := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  v_avg numeric;
  v_cnt integer;
BEGIN
  SELECT ROUND(AVG(rating)::numeric, 1), COUNT(*)
    INTO v_avg, v_cnt
    FROM public.restaurant_reviews
   WHERE restaurant_id = rid;

  UPDATE public.restaurants
     SET rating = COALESCE(v_avg, rating),
         reviews_count = COALESCE(v_cnt, 0)
   WHERE id = rid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurant_reviews_recompute ON public.restaurant_reviews;
CREATE TRIGGER trg_restaurant_reviews_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_restaurant_rating();

-- Backfill initial pour les avis déjà existants
UPDATE public.restaurants r
   SET rating = COALESCE(sub.avg_r, r.rating),
       reviews_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT restaurant_id, ROUND(AVG(rating)::numeric, 1) AS avg_r, COUNT(*) AS cnt
      FROM public.restaurant_reviews
     GROUP BY restaurant_id
  ) sub
 WHERE sub.restaurant_id = r.id;
