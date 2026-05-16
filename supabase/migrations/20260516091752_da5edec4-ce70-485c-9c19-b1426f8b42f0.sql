begin;

create index if not exists idx_restaurants_active_rating
  on public.restaurants (rating desc nulls last, reviews_count desc)
  where is_active = true and deleted_at is null;

create index if not exists idx_restaurants_city_active
  on public.restaurants (city, rating desc)
  where is_active = true and deleted_at is null;

create index if not exists idx_restaurants_cuisine_active
  on public.restaurants (cuisine, rating desc)
  where is_active = true and deleted_at is null;

create index if not exists idx_dishes_restaurant_sort
  on public.dishes (restaurant_id, sort_order)
  where deleted_at is null and is_available = true;

create index if not exists idx_orders_user_created
  on public.orders (user_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_orders_resto_status_created
  on public.orders (restaurant_id, status, created_at desc)
  where deleted_at is null;

create index if not exists idx_orders_driver
  on public.orders (driver_id, status, created_at desc)
  where driver_id is not null and deleted_at is null;

create extension if not exists pg_trgm;
create index if not exists idx_restaurants_name_trgm
  on public.restaurants using gin (name gin_trgm_ops)
  where is_active = true and deleted_at is null;

create or replace function public.home_data(
  _city text default null,
  _limit int default 12
)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with
    popular as (
      select
        id, slug, name, cuisine, city, neighborhood,
        image_url, rating, reviews_count, eta_min, eta_max,
        delivery_fee, min_order, is_open
      from public.restaurants
      where is_active = true
        and deleted_at is null
        and (_city is null or city = _city)
      order by rating desc nulls last, reviews_count desc
      limit _limit
    ),
    cuisines as (
      select distinct cuisine
      from public.restaurants
      where is_active = true
        and deleted_at is null
        and cuisine is not null
      order by cuisine
      limit 30
    ),
    promos as (
      select code, description, discount_type, discount_value, min_order
      from public.promos
      where is_active = true
        and is_public = true
        and (expires_at is null or expires_at > now())
        and (max_uses is null or coalesce(uses_count, 0) < max_uses)
      order by created_at desc
      limit 6
    )
  select jsonb_build_object(
    'popular', coalesce((select jsonb_agg(row_to_json(popular)) from popular), '[]'::jsonb),
    'cuisines', coalesce((select jsonb_agg(cuisine) from cuisines), '[]'::jsonb),
    'promos', coalesce((select jsonb_agg(row_to_json(promos)) from promos), '[]'::jsonb)
  )
$$;

grant execute on function public.home_data(text, int) to anon, authenticated;

create or replace function public.restaurant_page(_slug text)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with
    r as (
      select id, slug, name, cuisine, city, neighborhood, address,
             image_url, cover_url, rating, reviews_count, eta_min, eta_max,
             delivery_fee, min_order, is_open, opening_hours, lat, lng
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
$$;

grant execute on function public.restaurant_page(text) to anon, authenticated;

commit;