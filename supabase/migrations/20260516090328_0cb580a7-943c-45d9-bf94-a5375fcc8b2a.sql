begin;

do $$ begin
  alter table public.payments add column if not exists user_id uuid;
exception when others then null; end $$;

create index if not exists idx_payments_user_status
  on public.payments (user_id, status) where deleted_at is null;

create index if not exists idx_payments_provider_tx
  on public.payments (provider_tx_id) where provider_tx_id is not null;

alter table public.payments enable row level security;

drop policy if exists "Payments: owner read"          on public.payments;
drop policy if exists "Payments: platform admin all"  on public.payments;

create policy "Payments: owner read"
  on public.payments for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Payments: platform admin all"
  on public.payments for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

do $$ begin
  alter table public.mboapass_subscriptions
    add column if not exists payment_reference text;
exception when others then null; end $$;

do $$ begin
  create unique index if not exists uniq_mboapass_payment_ref
    on public.mboapass_subscriptions (payment_reference)
    where payment_reference is not null;
exception when others then null; end $$;

alter table public.mboapass_subscriptions enable row level security;

drop policy if exists "MboaPass: owner read"          on public.mboapass_subscriptions;
drop policy if exists "MboaPass: platform admin all"  on public.mboapass_subscriptions;

create policy "MboaPass: owner read"
  on public.mboapass_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "MboaPass: platform admin all"
  on public.mboapass_subscriptions for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create table if not exists public.payment_webhook_events (
  id              bigserial primary key,
  received_at     timestamptz not null default now(),
  provider        text not null,
  external_ref    text not null,
  provider_tx_id  text,
  status          text not null,
  payload         jsonb,
  applied         boolean not null default false,
  applied_at      timestamptz
);

create unique index if not exists uniq_webhook_event
  on public.payment_webhook_events (provider, external_ref, provider_tx_id, status);

create index if not exists idx_webhook_events_pending
  on public.payment_webhook_events (received_at desc)
  where applied = false;

alter table public.payment_webhook_events enable row level security;

commit;