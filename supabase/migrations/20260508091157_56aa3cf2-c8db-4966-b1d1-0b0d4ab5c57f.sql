create table if not exists public.auth_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  method text not null default 'whatsapp',
  expires_at timestamptz not null,
  used boolean not null default false,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_codes_method_check check (method in ('sms', 'whatsapp'))
);

create index if not exists auth_codes_phone_method_idx on public.auth_codes(phone, method, created_at desc);
create index if not exists auth_codes_active_idx on public.auth_codes(phone, created_at desc) where used = false;

alter table public.auth_codes enable row level security;

drop policy if exists "Service role can manage auth codes" on public.auth_codes;
create policy "Service role can manage auth codes"
on public.auth_codes
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

alter table public.otp_codes
add column if not exists method text not null default 'sms';

alter table public.otp_codes
add column if not exists used boolean not null default false;

alter table public.otp_codes
add column if not exists used_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'otp_codes_method_check'
      and conrelid = 'public.otp_codes'::regclass
  ) then
    alter table public.otp_codes
    add constraint otp_codes_method_check check (method in ('sms', 'whatsapp'));
  end if;
end $$;

create index if not exists otp_codes_phone_method_idx on public.otp_codes(phone, method, created_at desc);