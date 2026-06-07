
-- 1) Notifications: prevent restaurant owners from inserting notifications targeting arbitrary users.
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Payments: drop legacy policy that leaks ownerless rows.
DROP POLICY IF EXISTS "users see own payments" ON public.payments;
-- "Payments: owner read" and "Payments: platform admin all" remain in place.

-- 3) Referral codes: remove blanket public SELECT exposing user_id.
-- Public lookup happens through the SECURITY DEFINER function apply_referral_code().
DROP POLICY IF EXISTS "Code public lookup" ON public.referral_codes;

-- 4) Storage: scope UPDATE/DELETE on restaurant-images to restaurant managers.
DROP POLICY IF EXISTS "Restaurant images authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant images authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant images authenticated upload" ON storage.objects;

CREATE POLICY "Restaurant images manager upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-images'
  AND public.has_restaurant_membership(
    ((storage.foldername(name))[1])::uuid,
    'manager'::restaurant_role
  )
);

CREATE POLICY "Restaurant images manager update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND public.has_restaurant_membership(
    ((storage.foldername(name))[1])::uuid,
    'manager'::restaurant_role
  )
)
WITH CHECK (
  bucket_id = 'restaurant-images'
  AND public.has_restaurant_membership(
    ((storage.foldername(name))[1])::uuid,
    'manager'::restaurant_role
  )
);

CREATE POLICY "Restaurant images manager delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND public.has_restaurant_membership(
    ((storage.foldername(name))[1])::uuid,
    'manager'::restaurant_role
  )
);
