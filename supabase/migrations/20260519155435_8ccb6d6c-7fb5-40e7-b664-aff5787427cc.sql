
-- Seed the 5 standard MboaEats categories for any existing restaurant that misses some.
WITH std(name, sort_order) AS (
  VALUES ('Entrée',1),('Plat',2),('Dessert',3),('Boisson',4),('Accompagnement',5)
)
INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
SELECT r.id, s.name, s.sort_order
FROM public.restaurants r
CROSS JOIN std s
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_categories mc
  WHERE mc.restaurant_id = r.id AND mc.name = s.name
);

-- Storage policies: allow restaurant managers+ to upload/update/delete their dish images.
-- Path convention: '<restaurant_id>/<filename>'.
DROP POLICY IF EXISTS "Managers upload dish images" ON storage.objects;
CREATE POLICY "Managers upload dish images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dish-images'
  AND public.has_restaurant_membership(
    ((storage.foldername(name))[1])::uuid,
    'manager'::restaurant_role
  )
);

DROP POLICY IF EXISTS "Managers update dish images" ON storage.objects;
CREATE POLICY "Managers update dish images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dish-images'
  AND public.has_restaurant_membership(
    ((storage.foldername(name))[1])::uuid,
    'manager'::restaurant_role
  )
);

DROP POLICY IF EXISTS "Managers delete dish images" ON storage.objects;
CREATE POLICY "Managers delete dish images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dish-images'
  AND public.has_restaurant_membership(
    ((storage.foldername(name))[1])::uuid,
    'manager'::restaurant_role
  )
);
