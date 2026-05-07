
-- =========================================================
-- LOT 1 — Marketplace foundation
-- =========================================================

-- Roles enum: ajouter resto + livreur si pas déjà
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'restaurant', 'livreur', 'client');
  else
    begin alter type public.app_role add value if not exists 'restaurant'; exception when others then null; end;
    begin alter type public.app_role add value if not exists 'livreur'; exception when others then null; end;
    begin alter type public.app_role add value if not exists 'client'; exception when others then null; end;
  end if;
end$$;

-- Order status enum
do $$ begin
  create type public.order_status as enum (
    'draft','pending_payment','paid','accepted','preparing','ready','picked_up','delivering','delivered','cancelled','refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_offer_status as enum ('proposed','accepted','declined','expired');
exception when duplicate_object then null; end $$;

-- =========================================================
-- RESTAURANTS
-- =========================================================
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  slug text unique not null,
  name text not null,
  cuisine text not null,
  city text not null,
  neighborhood text,
  address text,
  lat double precision,
  lng double precision,
  image_url text,
  cover_url text,
  rating numeric(3,2) default 4.5,
  reviews_count int default 0,
  eta_min int default 20,
  eta_max int default 40,
  delivery_fee int default 800,
  min_order int default 0,
  is_open boolean default true,
  is_active boolean default true,
  opening_hours jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.restaurants enable row level security;
drop policy if exists "Restaurants public read" on public.restaurants;
create policy "Restaurants public read" on public.restaurants for select using (is_active = true or has_role(auth.uid(),'admin'));
drop policy if exists "Owners manage own resto" on public.restaurants;
create policy "Owners manage own resto" on public.restaurants for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Admins manage restaurants" on public.restaurants;
create policy "Admins manage restaurants" on public.restaurants for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create index if not exists idx_resto_city on public.restaurants(city);
create index if not exists idx_resto_cuisine on public.restaurants(cuisine);

-- =========================================================
-- MENU
-- =========================================================
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz not null default now()
);
alter table public.menu_categories enable row level security;
drop policy if exists "Categories public read" on public.menu_categories;
create policy "Categories public read" on public.menu_categories for select using (true);
drop policy if exists "Resto owner manages categories" on public.menu_categories;
create policy "Resto owner manages categories" on public.menu_categories for all
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));
drop policy if exists "Admins manage categories" on public.menu_categories;
create policy "Admins manage categories" on public.menu_categories for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price int not null,
  image_url text,
  allergens text[] default '{}',
  is_available boolean default true,
  is_popular boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dishes enable row level security;
drop policy if exists "Dishes public read" on public.dishes;
create policy "Dishes public read" on public.dishes for select using (true);
drop policy if exists "Resto owner manages dishes" on public.dishes;
create policy "Resto owner manages dishes" on public.dishes for all
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));
drop policy if exists "Admins manage dishes" on public.dishes;
create policy "Admins manage dishes" on public.dishes for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create index if not exists idx_dishes_resto on public.dishes(restaurant_id);

create table if not exists public.dish_options (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  name text not null,
  selection_type text not null default 'single', -- single | multi
  required boolean default false,
  sort_order int default 0
);
alter table public.dish_options enable row level security;
drop policy if exists "Dish options public read" on public.dish_options;
create policy "Dish options public read" on public.dish_options for select using (true);
drop policy if exists "Resto owner manages options" on public.dish_options;
create policy "Resto owner manages options" on public.dish_options for all
  using (exists (select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id where d.id = dish_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id where d.id = dish_id and r.owner_id = auth.uid()));

create table if not exists public.dish_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.dish_options(id) on delete cascade,
  label text not null,
  price_delta int not null default 0,
  sort_order int default 0
);
alter table public.dish_option_values enable row level security;
drop policy if exists "Dish option values public read" on public.dish_option_values;
create policy "Dish option values public read" on public.dish_option_values for select using (true);
drop policy if exists "Resto owner manages option values" on public.dish_option_values;
create policy "Resto owner manages option values" on public.dish_option_values for all
  using (exists (select 1 from public.dish_options o join public.dishes d on d.id = o.dish_id join public.restaurants r on r.id = d.restaurant_id where o.id = option_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.dish_options o join public.dishes d on d.id = o.dish_id join public.restaurants r on r.id = d.restaurant_id where o.id = option_id and r.owner_id = auth.uid()));

-- =========================================================
-- ADDRESSES
-- =========================================================
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null default 'Maison',
  line text not null,
  city text not null,
  neighborhood text,
  lat double precision,
  lng double precision,
  is_default boolean default false,
  created_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- PROMOS
-- =========================================================
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null default 'percent', -- percent | amount
  discount_value int not null,
  min_order int default 0,
  max_uses int,
  uses_count int default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz not null default now()
);
alter table public.promos enable row level security;
drop policy if exists "Active promos public read" on public.promos;
create policy "Active promos public read" on public.promos for select using (is_active = true);
drop policy if exists "Admins manage promos" on public.promos;
create policy "Admins manage promos" on public.promos for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- =========================================================
-- ORDERS
-- =========================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('MBE-' || lpad((floor(random()*1000000))::text, 6, '0')),
  user_id uuid not null,
  restaurant_id uuid not null references public.restaurants(id),
  driver_id uuid,
  address_id uuid references public.addresses(id),
  delivery_address jsonb,
  status public.order_status not null default 'draft',
  subtotal int not null default 0,
  delivery_fee int not null default 0,
  promo_code text,
  promo_discount int not null default 0,
  total int not null default 0,
  payment_id uuid,
  eta_minutes int,
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  accepted_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "Users see own orders" on public.orders;
create policy "Users see own orders" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "Users create own orders" on public.orders;
create policy "Users create own orders" on public.orders for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own draft" on public.orders;
create policy "Users update own draft" on public.orders for update using (auth.uid() = user_id and status in ('draft','pending_payment'));
drop policy if exists "Resto sees its orders" on public.orders;
create policy "Resto sees its orders" on public.orders for select
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));
drop policy if exists "Resto updates its orders" on public.orders;
create policy "Resto updates its orders" on public.orders for update
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));
drop policy if exists "Driver sees its orders" on public.orders;
create policy "Driver sees its orders" on public.orders for select using (auth.uid() = driver_id);
drop policy if exists "Driver updates its orders" on public.orders;
create policy "Driver updates its orders" on public.orders for update using (auth.uid() = driver_id);
drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_resto on public.orders(restaurant_id);
create index if not exists idx_orders_driver on public.orders(driver_id);
create index if not exists idx_orders_status on public.orders(status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dish_id uuid references public.dishes(id),
  name text not null,
  qty int not null default 1,
  unit_price int not null,
  options jsonb default '[]'::jsonb,
  line_total int not null
);
alter table public.order_items enable row level security;
drop policy if exists "Order items follow order access" on public.order_items;
create policy "Order items follow order access" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (
    o.user_id = auth.uid()
    or o.driver_id = auth.uid()
    or exists (select 1 from public.restaurants r where r.id = o.restaurant_id and r.owner_id = auth.uid())
    or has_role(auth.uid(),'admin')
  )));
drop policy if exists "Users insert items in own order" on public.order_items;
create policy "Users insert items in own order" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.order_events enable row level security;
drop policy if exists "Order events follow order access" on public.order_events;
create policy "Order events follow order access" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and (
    o.user_id = auth.uid()
    or o.driver_id = auth.uid()
    or exists (select 1 from public.restaurants r where r.id = o.restaurant_id and r.owner_id = auth.uid())
    or has_role(auth.uid(),'admin')
  )));
drop policy if exists "Authenticated insert order events" on public.order_events;
create policy "Authenticated insert order events" on public.order_events for insert
  with check (auth.uid() is not null and exists (select 1 from public.orders o where o.id = order_id and (
    o.user_id = auth.uid()
    or o.driver_id = auth.uid()
    or exists (select 1 from public.restaurants r where r.id = o.restaurant_id and r.owner_id = auth.uid())
    or has_role(auth.uid(),'admin')
  )));

-- =========================================================
-- LOYALTY
-- =========================================================
create table if not exists public.loyalty_points (
  user_id uuid primary key,
  points int not null default 0,
  level text not null default 'bronze',
  updated_at timestamptz not null default now()
);
alter table public.loyalty_points enable row level security;
drop policy if exists "Users see own points" on public.loyalty_points;
create policy "Users see own points" on public.loyalty_points for select using (auth.uid() = user_id);
drop policy if exists "Users insert own points" on public.loyalty_points;
create policy "Users insert own points" on public.loyalty_points for insert with check (auth.uid() = user_id);
drop policy if exists "Admins manage points" on public.loyalty_points;
create policy "Admins manage points" on public.loyalty_points for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- =========================================================
-- REVIEWS
-- =========================================================
create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.restaurant_reviews enable row level security;
drop policy if exists "Reviews public read" on public.restaurant_reviews;
create policy "Reviews public read" on public.restaurant_reviews for select using (true);
drop policy if exists "Users insert own review" on public.restaurant_reviews;
create policy "Users insert own review" on public.restaurant_reviews for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own review" on public.restaurant_reviews;
create policy "Users update own review" on public.restaurant_reviews for update using (auth.uid() = user_id);

-- =========================================================
-- DELIVERY OFFERS
-- =========================================================
create table if not exists public.delivery_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  driver_id uuid not null,
  status public.delivery_offer_status not null default 'proposed',
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 seconds')
);
alter table public.delivery_offers enable row level security;
drop policy if exists "Driver sees own offers" on public.delivery_offers;
create policy "Driver sees own offers" on public.delivery_offers for select using (auth.uid() = driver_id);
drop policy if exists "Driver responds own offer" on public.delivery_offers;
create policy "Driver responds own offer" on public.delivery_offers for update using (auth.uid() = driver_id);
drop policy if exists "Admins manage offers" on public.delivery_offers;
create policy "Admins manage offers" on public.delivery_offers for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- =========================================================
-- updated_at triggers
-- =========================================================
do $$ begin
  drop trigger if exists trg_resto_updated on public.restaurants;
  create trigger trg_resto_updated before update on public.restaurants for each row execute function public.tg_set_updated_at();
  drop trigger if exists trg_dishes_updated on public.dishes;
  create trigger trg_dishes_updated before update on public.dishes for each row execute function public.tg_set_updated_at();
  drop trigger if exists trg_orders_updated on public.orders;
  create trigger trg_orders_updated before update on public.orders for each row execute function public.tg_set_updated_at();
  drop trigger if exists trg_loyalty_updated on public.loyalty_points;
  create trigger trg_loyalty_updated before update on public.loyalty_points for each row execute function public.tg_set_updated_at();
end $$;

-- =========================================================
-- Realtime
-- =========================================================
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.order_events;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.delivery_offers;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.driver_locations;
exception when others then null; end $$;

alter table public.orders replica identity full;
alter table public.order_events replica identity full;
alter table public.delivery_offers replica identity full;

-- =========================================================
-- SEED minimal demo
-- =========================================================
insert into public.restaurants (slug, name, cuisine, city, neighborhood, image_url, rating, reviews_count, eta_min, eta_max, delivery_fee, min_order)
values
 ('chez-mama-douala','Chez Mama Douala','Camerounaise','Douala','Akwa','https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',4.8,312,20,35,800,2000),
 ('le-village-akwa','Le Village Akwa','Grillades','Douala','Akwa','https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',4.6,221,25,45,1000,3000),
 ('saga-africa','Saga Africa','Africaine','Douala','Bonapriso','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',4.7,189,30,50,1200,2500),
 ('pizza-bonanjo','Pizza Bonanjo','Pizza','Douala','Bonanjo','https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',4.4,402,15,30,700,3000),
 ('sushi-makossa','Sushi Makossa','Japonais','Douala','Bonapriso','https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',4.5,156,25,40,1500,5000),
 ('le-petit-paris','Le Petit Paris','Brasserie','Yaoundé','Bastos','https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',4.3,98,30,55,1500,4000)
on conflict (slug) do nothing;

insert into public.menu_categories (restaurant_id, name, sort_order)
select r.id, c.name, c.ord from public.restaurants r
cross join (values ('Entrées',1),('Plats',2),('Boissons',3),('Desserts',4)) as c(name, ord)
on conflict do nothing;

-- Quelques plats par resto
insert into public.dishes (restaurant_id, category_id, name, description, price, image_url, is_popular)
select r.id, mc.id, d.name, d.description, d.price, d.image_url, d.popular
from public.restaurants r
join public.menu_categories mc on mc.restaurant_id = r.id and mc.name = 'Plats'
cross join (values
 ('Ndolé royal','Ndolé crevettes & viande, plantain', 4500,'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', true),
 ('Poulet DG','Poulet sauté légumes & plantain', 4800,'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600', true),
 ('Poisson braisé','Bar braisé sauce piment, miondo', 5500,'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600', false),
 ('Eru','Eru waterfufu, viande fumée', 3800,'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', false)
) as d(name, description, price, image_url, popular)
on conflict do nothing;

insert into public.dishes (restaurant_id, category_id, name, description, price, image_url)
select r.id, mc.id, d.name, d.description, d.price, d.image_url
from public.restaurants r
join public.menu_categories mc on mc.restaurant_id = r.id and mc.name = 'Boissons'
cross join (values
 ('Jus de bissap','Bissap maison frais', 1000,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600'),
 ('Jus de gingembre','Gingembre épicé', 1200,'https://images.unsplash.com/photo-1607478900766-efe13248b125?w=600'),
 ('Eau minérale 50cl','Eau Tangui', 500,'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600')
) as d(name, description, price, image_url)
on conflict do nothing;

-- Promos
insert into public.promos (code, description, discount_type, discount_value, min_order, max_uses, expires_at)
values
 ('BIENVENUE','-15% sur ta première commande','percent',15,2000,1000, now() + interval '90 days'),
 ('MBOA10','-10% dès 5 000 FCFA','percent',10,5000,null, now() + interval '60 days'),
 ('LIVRAISON0','Livraison offerte','amount',1500,3000,null, now() + interval '30 days'),
 ('WEEKEND','-2 000 FCFA le week-end','amount',2000,8000,null, now() + interval '120 days'),
 ('FIDELE','-20% client fidèle','percent',20,3000,500, now() + interval '180 days')
on conflict (code) do nothing;

-- Zones de livraison de démo
insert into public.delivery_zones (city, neighborhood, base_fee, eta_minutes, active)
values
 ('Douala','Akwa',800,25,true),
 ('Douala','Bonanjo',900,30,true),
 ('Douala','Bonapriso',1000,35,true)
on conflict do nothing;
