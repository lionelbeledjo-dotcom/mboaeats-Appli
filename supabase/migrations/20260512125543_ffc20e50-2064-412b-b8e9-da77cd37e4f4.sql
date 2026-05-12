
create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  sender_id uuid not null,
  sender_role text not null check (sender_role in ('client','driver')),
  body text not null check (length(trim(body)) > 0 and length(body) <= 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists order_messages_order_idx on public.order_messages(order_id, created_at);

alter table public.order_messages enable row level security;

create policy "Order participants read messages"
on public.order_messages for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
      and (o.user_id = auth.uid() or o.driver_id = auth.uid())
  )
  or has_role(auth.uid(), 'admin'::app_role)
);

create policy "Order participants send messages"
on public.order_messages for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
      and (
        (o.user_id = auth.uid() and sender_role = 'client')
        or (o.driver_id = auth.uid() and sender_role = 'driver')
      )
  )
);

create policy "Recipients mark read"
on public.order_messages for update
using (
  exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
      and (o.user_id = auth.uid() or o.driver_id = auth.uid())
  )
);

create policy "Admins manage messages"
on public.order_messages for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

alter publication supabase_realtime add table public.order_messages;
