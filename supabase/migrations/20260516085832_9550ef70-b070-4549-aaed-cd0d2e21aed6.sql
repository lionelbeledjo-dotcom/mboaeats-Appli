-- Migration 002 — RLS rewrite (full content from zip)
begin;

-- 1. RESTAURANTS
drop policy if exists "Restaurants public read"         on public.restaurants;
drop policy if exists "Owners manage own resto"         on public.restaurants;
drop policy if exists "Admins manage restaurants"       on public.restaurants;

-- restaurants.deleted_at must exist before the policy references it
alter table public.restaurants add column if not exists deleted_at timestamptz;

create policy "Restaurants: public read"
  on public.restaurants for select
  to anon, authenticated
  using (is_active = true and deleted_at is null);

create policy "Restaurants: members read"
  on public.restaurants for select
  to authenticated
  using (public.has_restaurant_membership(id, 'kitchen'));

create policy "Restaurants: managers update"
  on public.restaurants for update
  to authenticated
  using (public.has_restaurant_membership(id, 'manager'))
  with check (public.has_restaurant_membership(id, 'manager'));

create policy "Restaurants: authenticated create"
  on public.restaurants for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Restaurants: owner soft-delete"
  on public.restaurants for update
  to authenticated
  using (public.has_restaurant_membership(id, 'owner'))
  with check (public.has_restaurant_membership(id, 'owner'));

create policy "Restaurants: platform admin all"
  on public.restaurants for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- 2. AUTO OWNER MEMBERSHIP
create or replace function public.tg_resto_auto_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    insert into public.restaurant_members
      (restaurant_id, user_id, role, status, joined_at)
    values
      (new.id, auth.uid(), 'owner', 'active', now())
    on conflict (restaurant_id, user_id) do nothing;
  end if;
  return new;
end
$$;

drop trigger if exists trg_resto_auto_owner on public.restaurants;
create trigger trg_resto_auto_owner
  after insert on public.restaurants
  for each row execute function public.tg_resto_auto_owner_membership();

-- 3. MENU_CATEGORIES
drop policy if exists "Categories public read"          on public.menu_categories;
drop policy if exists "Resto owner manages categories"  on public.menu_categories;
drop policy if exists "Admins manage categories"        on public.menu_categories;

create policy "Categories: public read"
  on public.menu_categories for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and r.is_active = true
        and r.deleted_at is null
    )
  );

create policy "Categories: members read"
  on public.menu_categories for select
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'kitchen'));

create policy "Categories: managers write"
  on public.menu_categories for all
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'manager'))
  with check (public.has_restaurant_membership(restaurant_id, 'manager'));

create policy "Categories: platform admin all"
  on public.menu_categories for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- 4. DISHES
alter table public.dishes add column if not exists deleted_at timestamptz;

drop policy if exists "Dishes public read"        on public.dishes;
drop policy if exists "Resto owner manages dishes" on public.dishes;
drop policy if exists "Admins manage dishes"      on public.dishes;

create policy "Dishes: public read"
  on public.dishes for select
  to anon, authenticated
  using (
    is_available = true
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and r.is_active = true
        and r.deleted_at is null
    )
  );

create policy "Dishes: members read"
  on public.dishes for select
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'kitchen'));

create policy "Dishes: managers write"
  on public.dishes for all
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'manager'))
  with check (public.has_restaurant_membership(restaurant_id, 'manager'));

create policy "Dishes: platform admin all"
  on public.dishes for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create index if not exists idx_dishes_restaurant_avail
  on public.dishes (restaurant_id, is_available);

-- 5. DISH_OPTIONS / VALUES
create index if not exists idx_dish_options_dish on public.dish_options (dish_id);
create index if not exists idx_dish_option_values_option on public.dish_option_values (option_id);

drop policy if exists "Dish options public read"            on public.dish_options;
drop policy if exists "Resto owner manages options"         on public.dish_options;
drop policy if exists "Dish option values public read"      on public.dish_option_values;
drop policy if exists "Resto owner manages option values"   on public.dish_option_values;

create policy "Dish options: public read"
  on public.dish_options for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.dishes d
      join public.restaurants r on r.id = d.restaurant_id
      where d.id = dish_id
        and d.is_available = true
        and r.is_active = true
        and r.deleted_at is null
    )
  );

create policy "Dish options: managers write"
  on public.dish_options for all
  to authenticated
  using (
    exists (
      select 1 from public.dishes d
      where d.id = dish_id
        and public.has_restaurant_membership(d.restaurant_id, 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.dishes d
      where d.id = dish_id
        and public.has_restaurant_membership(d.restaurant_id, 'manager')
    )
  );

create policy "Dish options: platform admin"
  on public.dish_options for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Dish option values: public read"
  on public.dish_option_values for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.dish_options o
      join public.dishes d on d.id = o.dish_id
      join public.restaurants r on r.id = d.restaurant_id
      where o.id = option_id
        and d.is_available = true
        and r.is_active = true
        and r.deleted_at is null
    )
  );

create policy "Dish option values: managers write"
  on public.dish_option_values for all
  to authenticated
  using (
    exists (
      select 1 from public.dish_options o
      join public.dishes d on d.id = o.dish_id
      where o.id = option_id
        and public.has_restaurant_membership(d.restaurant_id, 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.dish_options o
      join public.dishes d on d.id = o.dish_id
      where o.id = option_id
        and public.has_restaurant_membership(d.restaurant_id, 'manager')
    )
  );

create policy "Dish option values: platform admin"
  on public.dish_option_values for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- 6. ORDERS
alter table public.orders add column if not exists deleted_at timestamptz;

drop policy if exists "Users see own orders"   on public.orders;
drop policy if exists "Users create own orders" on public.orders;
drop policy if exists "Users update own draft" on public.orders;
drop policy if exists "Resto sees its orders"  on public.orders;
drop policy if exists "Resto updates its orders" on public.orders;
drop policy if exists "Driver sees its orders" on public.orders;
drop policy if exists "Driver updates its orders" on public.orders;
drop policy if exists "Admins manage orders"   on public.orders;

create policy "Orders: client read own"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Orders: client create"
  on public.orders for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status in ('draft', 'pending_payment')
  );

create policy "Orders: client update before payment"
  on public.orders for update
  to authenticated
  using (
    auth.uid() = user_id
    and status in ('draft', 'pending_payment')
  )
  with check (
    auth.uid() = user_id
    and status in ('draft', 'pending_payment', 'cancelled')
  );

create policy "Orders: resto members read"
  on public.orders for select
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'kitchen'));

create policy "Orders: resto staff update"
  on public.orders for update
  to authenticated
  using (public.has_restaurant_membership(restaurant_id, 'staff'))
  with check (public.has_restaurant_membership(restaurant_id, 'staff'));

create policy "Orders: driver read assigned"
  on public.orders for select
  to authenticated
  using (
    auth.uid() = driver_id
    and public.has_role(auth.uid(), 'livreur')
  );

create policy "Orders: driver update assigned"
  on public.orders for update
  to authenticated
  using (
    auth.uid() = driver_id
    and public.has_role(auth.uid(), 'livreur')
  )
  with check (
    auth.uid() = driver_id
  );

create policy "Orders: platform admin all"
  on public.orders for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- 7. ORDER_ITEMS
drop policy if exists "Order items follow order access"  on public.order_items;
drop policy if exists "Users insert items in own order"  on public.order_items;

create policy "Order items: read via order access"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or o.driver_id = auth.uid()
          or public.has_restaurant_membership(o.restaurant_id, 'kitchen')
          or public.is_platform_admin()
        )
    )
  );

create policy "Order items: client insert in own draft"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
        and o.status in ('draft', 'pending_payment')
    )
  );

create policy "Order items: platform admin all"
  on public.order_items for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create index if not exists idx_order_items_order on public.order_items (order_id);

-- 8. ORDER_EVENTS
drop policy if exists "Order events follow order access" on public.order_events;
drop policy if exists "Authenticated insert order events" on public.order_events;

create policy "Order events: read via order access"
  on public.order_events for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or o.driver_id = auth.uid()
          or public.has_restaurant_membership(o.restaurant_id, 'kitchen')
          or public.is_platform_admin()
        )
    )
  );

create policy "Order events: actors insert"
  on public.order_events for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or o.driver_id = auth.uid()
          or public.has_restaurant_membership(o.restaurant_id, 'staff')
          or public.is_platform_admin()
        )
    )
  );

create index if not exists idx_order_events_order_created
  on public.order_events (order_id, created_at desc);

-- 9. DELIVERY_OFFERS
drop policy if exists "Driver sees own offers"      on public.delivery_offers;
drop policy if exists "Driver responds own offer"   on public.delivery_offers;
drop policy if exists "Admins manage offers"        on public.delivery_offers;

create policy "Offers: driver read own"
  on public.delivery_offers for select
  to authenticated
  using (
    auth.uid() = driver_id
    and public.has_role(auth.uid(), 'livreur')
  );

create policy "Offers: driver respond own"
  on public.delivery_offers for update
  to authenticated
  using (
    auth.uid() = driver_id
    and public.has_role(auth.uid(), 'livreur')
    and status = 'proposed'
  )
  with check (
    auth.uid() = driver_id
    and status in ('accepted', 'declined')
  );

create policy "Offers: resto read own"
  on public.delivery_offers for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_restaurant_membership(o.restaurant_id, 'staff')
    )
  );

create policy "Offers: platform admin all"
  on public.delivery_offers for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create index if not exists idx_delivery_offers_driver_status
  on public.delivery_offers (driver_id, status);

-- 10. DRIVER_LOCATIONS
drop policy if exists "Driver positions readable by all" on public.driver_locations;
drop policy if exists "Drivers update own position"      on public.driver_locations;
drop policy if exists "Drivers modify own position"      on public.driver_locations;

create policy "Driver locations: driver self read"
  on public.driver_locations for select
  to authenticated
  using (auth.uid() = driver_id);

create policy "Driver locations: order parties read"
  on public.driver_locations for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.driver_id = driver_locations.driver_id
        and o.status in ('accepted','preparing','ready','picked_up','delivering')
        and (
          o.user_id = auth.uid()
          or public.has_restaurant_membership(o.restaurant_id, 'kitchen')
        )
    )
  );

create policy "Driver locations: platform admin read"
  on public.driver_locations for select
  to authenticated
  using (public.is_platform_admin());

create policy "Driver locations: driver insert own"
  on public.driver_locations for insert
  to authenticated
  with check (
    auth.uid() = driver_id
    and public.has_role(auth.uid(), 'livreur')
  );

create policy "Driver locations: driver update own"
  on public.driver_locations for update
  to authenticated
  using (
    auth.uid() = driver_id
    and public.has_role(auth.uid(), 'livreur')
  )
  with check (auth.uid() = driver_id);

-- 11. ADDRESSES
drop policy if exists "Users manage own addresses" on public.addresses;

create policy "Addresses: owner all"
  on public.addresses for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_addresses_user on public.addresses (user_id);

-- 12. PROMOS
do $$ begin
  alter table public.promos add column if not exists is_public boolean not null default true;
exception when others then null; end $$;

drop policy if exists "Active promos public read" on public.promos;
drop policy if exists "Admins manage promos"      on public.promos;

create policy "Promos: public read of public codes"
  on public.promos for select
  to anon, authenticated
  using (is_active = true and is_public = true);

create policy "Promos: platform admin all"
  on public.promos for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- 13. RESTAURANT_REVIEWS
drop policy if exists "Reviews public read"        on public.restaurant_reviews;
drop policy if exists "Users insert own review"    on public.restaurant_reviews;
drop policy if exists "Users update own review"    on public.restaurant_reviews;

create policy "Reviews: public read"
  on public.restaurant_reviews for select
  to anon, authenticated
  using (true);

create policy "Reviews: client insert if delivered"
  on public.restaurant_reviews for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
        and o.restaurant_id = restaurant_reviews.restaurant_id
        and o.status = 'delivered'
    )
  );

create policy "Reviews: client update own"
  on public.restaurant_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Reviews: platform admin all"
  on public.restaurant_reviews for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create index if not exists idx_reviews_resto_created
  on public.restaurant_reviews (restaurant_id, created_at desc);

-- 14. user_roles
drop policy if exists "Users can view their roles" on public.user_roles;
drop policy if exists "Admins manage roles"        on public.user_roles;

create policy "User roles: self read"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "User roles: admin read"
  on public.user_roles for select
  to authenticated
  using (public.is_platform_admin());

create policy "User roles: superadmin write"
  on public.user_roles for all
  to authenticated
  using (public.is_platform_superadmin())
  with check (public.is_platform_superadmin());

create index if not exists idx_user_roles_user on public.user_roles (user_id);

commit;