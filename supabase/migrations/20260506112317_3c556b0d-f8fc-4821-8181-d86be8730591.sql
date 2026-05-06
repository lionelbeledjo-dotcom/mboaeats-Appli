-- Bootstrap function: the first signed-in user can claim admin.
-- After that, no one else can self-promote.
create or replace function public.claim_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select count(*) into v_existing from public.user_roles where role = 'admin';
  if v_existing > 0 then
    -- Already bootstrapped. Caller is admin only if they already are.
    return exists (select 1 from public.user_roles where user_id = v_uid and role = 'admin');
  end if;

  insert into public.user_roles (user_id, role) values (v_uid, 'admin')
  on conflict (user_id, role) do nothing;
  return true;
end;
$$;

revoke all on function public.claim_super_admin() from public;
grant execute on function public.claim_super_admin() to authenticated;