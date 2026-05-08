create or replace function public.user_exists_by_phone(_phone text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'auth'
as $$
  select exists (
    select 1 from auth.users
    where phone = regexp_replace(_phone, '\D', '', 'g')
       or phone = _phone
  )
$$;