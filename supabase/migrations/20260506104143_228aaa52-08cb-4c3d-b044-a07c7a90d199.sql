-- ============ ROLES ============
create type public.app_role as enum ('admin', 'restaurateur', 'livreur', 'client');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text,
  phone text,
  city text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ DELIVERY ZONES ============
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  neighborhood text not null,
  base_fee int not null default 800,
  eta_minutes int not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.delivery_zones enable row level security;

create policy "Zones are public-readable"
  on public.delivery_zones for select
  to anon, authenticated
  using (true);

create policy "Admins manage zones"
  on public.delivery_zones for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ COMMISSIONS ============
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  category text not null unique, -- 'restaurant', 'livreur', 'plateforme'
  rate_pct numeric(5,2) not null check (rate_pct >= 0 and rate_pct <= 100),
  notes text,
  updated_at timestamptz not null default now()
);
alter table public.commissions enable row level security;

create policy "Commissions are readable by all"
  on public.commissions for select
  to anon, authenticated
  using (true);

create policy "Admins manage commissions"
  on public.commissions for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ PLATFORM SETTINGS (prices) ============
create table public.platform_settings (
  key text primary key,
  value_int int,
  value_text text,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

create policy "Settings readable by all"
  on public.platform_settings for select
  to anon, authenticated
  using (true);

create policy "Admins manage settings"
  on public.platform_settings for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ LIVREUR LIVE POSITIONS (realtime) ============
create table public.driver_locations (
  driver_id uuid primary key,
  lat double precision not null,
  lng double precision not null,
  heading numeric,
  speed numeric,
  status text not null default 'available',
  updated_at timestamptz not null default now()
);
alter table public.driver_locations enable row level security;

create policy "Driver positions readable by all"
  on public.driver_locations for select
  to anon, authenticated
  using (true);

create policy "Drivers update own position"
  on public.driver_locations for insert
  to authenticated
  with check (auth.uid() = driver_id and public.has_role(auth.uid(), 'livreur'));

create policy "Drivers modify own position"
  on public.driver_locations for update
  to authenticated
  using (auth.uid() = driver_id);

-- enable realtime for driver tracking
alter publication supabase_realtime add table public.driver_locations;

-- ============ DEFAULT DATA ============
insert into public.delivery_zones (city, neighborhood, base_fee, eta_minutes) values
  ('Douala', 'Akwa', 800, 25),
  ('Douala', 'Bonapriso', 1000, 30),
  ('Douala', 'Bonanjo', 900, 28),
  ('Douala', 'Deido', 1200, 35),
  ('Yaoundé', 'Bastos', 900, 28),
  ('Yaoundé', 'Omnisports', 1100, 32),
  ('Yaoundé', 'Mvog-Mbi', 1000, 30);

insert into public.commissions (category, rate_pct, notes) values
  ('restaurant', 18.00, 'Commission par défaut sur chaque commande'),
  ('livreur', 12.00, 'Reversé sur les frais de livraison'),
  ('plateforme', 5.00, 'Frais de service MboaEats');

insert into public.platform_settings (key, value_int, description) values
  ('min_order_fcfa', 1500, 'Montant minimum de commande'),
  ('service_fee_fcfa', 200, 'Frais de service par commande'),
  ('free_delivery_threshold_fcfa', 10000, 'Livraison offerte au-dessus de ce montant'),
  ('momo_fee_pct', 1, 'Frais opérateur Mobile Money (%)');

-- trigger to keep updated_at fresh
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger zones_updated before update on public.delivery_zones
  for each row execute function public.tg_set_updated_at();
create trigger commissions_updated before update on public.commissions
  for each row execute function public.tg_set_updated_at();
create trigger settings_updated before update on public.platform_settings
  for each row execute function public.tg_set_updated_at();