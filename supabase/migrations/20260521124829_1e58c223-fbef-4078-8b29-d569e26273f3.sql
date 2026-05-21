ALTER TABLE public.restaurant_members DISABLE TRIGGER USER;
ALTER TABLE public.restaurants DISABLE TRIGGER USER;

UPDATE public.restaurants
SET owner_id = '394b91da-8532-4cf4-b72b-f94b05447298'
WHERE id = '91fcc67b-6200-4d36-a460-68fb602496a3';

INSERT INTO public.restaurant_members (
  restaurant_id, user_id, role, status, joined_at, created_at, updated_at
) VALUES (
  '91fcc67b-6200-4d36-a460-68fb602496a3',
  '394b91da-8532-4cf4-b72b-f94b05447298',
  'owner', 'active', now(), now(), now()
) ON CONFLICT (restaurant_id, user_id) DO NOTHING;

ALTER TABLE public.restaurant_members ENABLE TRIGGER USER;
ALTER TABLE public.restaurants ENABLE TRIGGER USER;