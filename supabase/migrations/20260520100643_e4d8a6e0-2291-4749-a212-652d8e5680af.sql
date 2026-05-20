-- Pack 7: Profil restaurant éditable
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS manually_closed boolean NOT NULL DEFAULT false;

-- opening_hours existe déjà (jsonb). On donne une valeur par défaut pour les futurs inserts
-- et on hydrate les lignes existantes qui ont {} ou NULL.
ALTER TABLE public.restaurants
  ALTER COLUMN opening_hours SET DEFAULT '{
    "lundi":    {"is_open": true, "open": "09:00", "close": "22:00"},
    "mardi":    {"is_open": true, "open": "09:00", "close": "22:00"},
    "mercredi": {"is_open": true, "open": "09:00", "close": "22:00"},
    "jeudi":    {"is_open": true, "open": "09:00", "close": "22:00"},
    "vendredi": {"is_open": true, "open": "09:00", "close": "22:00"},
    "samedi":   {"is_open": true, "open": "09:00", "close": "22:00"},
    "dimanche": {"is_open": true, "open": "09:00", "close": "22:00"}
  }'::jsonb;

UPDATE public.restaurants
SET opening_hours = '{
    "lundi":    {"is_open": true, "open": "09:00", "close": "22:00"},
    "mardi":    {"is_open": true, "open": "09:00", "close": "22:00"},
    "mercredi": {"is_open": true, "open": "09:00", "close": "22:00"},
    "jeudi":    {"is_open": true, "open": "09:00", "close": "22:00"},
    "vendredi": {"is_open": true, "open": "09:00", "close": "22:00"},
    "samedi":   {"is_open": true, "open": "09:00", "close": "22:00"},
    "dimanche": {"is_open": true, "open": "09:00", "close": "22:00"}
  }'::jsonb
WHERE opening_hours IS NULL OR opening_hours = '{}'::jsonb;

-- Storage bucket pour images de profil resto (cover + logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique
DROP POLICY IF EXISTS "Restaurant images public read" ON storage.objects;
CREATE POLICY "Restaurant images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-images');

-- Upload restreint aux authentifiés
DROP POLICY IF EXISTS "Restaurant images authenticated upload" ON storage.objects;
CREATE POLICY "Restaurant images authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'restaurant-images');

DROP POLICY IF EXISTS "Restaurant images authenticated update" ON storage.objects;
CREATE POLICY "Restaurant images authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'restaurant-images');

DROP POLICY IF EXISTS "Restaurant images authenticated delete" ON storage.objects;
CREATE POLICY "Restaurant images authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'restaurant-images');

-- Mise à jour RPC restaurant_page pour exposer les nouvelles colonnes
CREATE OR REPLACE FUNCTION public.restaurant_page(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  with
    r as (
      select id, slug, name, cuisine, city, neighborhood, address,
             image_url, cover_url, logo_url, phone, description,
             rating, reviews_count, eta_min, eta_max,
             delivery_fee, min_order, is_open, manually_closed,
             opening_hours, lat, lng
      from public.restaurants
      where slug = _slug
        and is_active = true
        and deleted_at is null
      limit 1
    ),
    cats as (
      select c.id, c.name, c.sort_order
      from public.menu_categories c
      where c.restaurant_id = (select id from r)
      order by c.sort_order
    ),
    d as (
      select id, category_id, name, description, price, image_url,
             is_popular, is_available, allergens, sort_order
      from public.dishes
      where restaurant_id = (select id from r)
        and deleted_at is null
      order by sort_order
    )
  select case when (select id from r) is null then null
    else jsonb_build_object(
      'resto', (select row_to_json(r.*) from r),
      'categories', coalesce((select jsonb_agg(row_to_json(cats)) from cats), '[]'::jsonb),
      'dishes', coalesce((select jsonb_agg(row_to_json(d)) from d), '[]'::jsonb)
    )
  end
$function$;