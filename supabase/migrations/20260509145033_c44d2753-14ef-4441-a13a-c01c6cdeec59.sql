CREATE TABLE public.dish_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dish_id, user_id)
);

CREATE INDEX idx_dish_reviews_dish ON public.dish_reviews(dish_id);
CREATE INDEX idx_dish_reviews_user ON public.dish_reviews(user_id);

ALTER TABLE public.dish_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dish reviews public read"
ON public.dish_reviews FOR SELECT
USING (true);

CREATE POLICY "Users insert own dish review"
ON public.dish_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dish review"
ON public.dish_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own dish review"
ON public.dish_reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_dish_reviews_updated_at
BEFORE UPDATE ON public.dish_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();