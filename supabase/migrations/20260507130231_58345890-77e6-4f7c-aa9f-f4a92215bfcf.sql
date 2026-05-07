
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_phone_idx on public.otp_codes(phone, created_at desc);
alter table public.otp_codes enable row level security;
