-- Disputes table
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  user_id uuid not null,
  restaurant_id uuid,
  reason text not null,
  description text,
  amount integer not null default 0,
  priority text not null default 'medium',
  status text not null default 'open',
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.disputes enable row level security;

create policy "Users see own disputes"
  on public.disputes for select using (auth.uid() = user_id);

create policy "Users create own disputes"
  on public.disputes for insert with check (auth.uid() = user_id);

create policy "Resto sees its disputes"
  on public.disputes for select using (
    exists (select 1 from public.restaurants r where r.id = disputes.restaurant_id and r.owner_id = auth.uid())
  );

create policy "Admins manage disputes"
  on public.disputes for all using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

create index if not exists disputes_status_idx on public.disputes(status, created_at desc);

create trigger disputes_updated_at
  before update on public.disputes
  for each row execute function public.tg_set_updated_at();
