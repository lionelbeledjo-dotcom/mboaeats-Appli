CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_before jsonb;
  v_after  jsonb;
  v_target_id uuid;
  v_resto_id uuid;
  v_action text;
  v_has_id boolean;
  v_row jsonb;
begin
  if tg_op = 'INSERT' then
    v_before := null;
    v_after  := to_jsonb(new);
    v_action := tg_table_name || '.created';
    v_row := v_after;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after  := to_jsonb(new);
    v_action := tg_table_name || '.updated';
    v_row := v_after;
  elsif tg_op = 'DELETE' then
    v_before := to_jsonb(old);
    v_after  := null;
    v_action := tg_table_name || '.deleted';
    v_row := v_before;
  end if;

  -- Resolve target id safely (some tables have composite PKs and no `id` column)
  select exists (
    select 1 from information_schema.columns
    where table_schema = tg_table_schema
      and table_name = tg_table_name
      and column_name = 'id'
  ) into v_has_id;

  if v_has_id then
    begin
      v_target_id := (v_row ->> 'id')::uuid;
    exception when others then
      v_target_id := null;
    end;
  else
    v_target_id := null;
  end if;

  if tg_table_name = 'restaurants' then
    v_resto_id := v_target_id;
  else
    begin
      v_resto_id := coalesce(
        (v_after  ->> 'restaurant_id')::uuid,
        (v_before ->> 'restaurant_id')::uuid
      );
    exception when others then
      v_resto_id := null;
    end;
  end if;

  perform public.log_audit(
    v_action, tg_table_name, v_target_id, v_resto_id, v_before, v_after
  );
  return coalesce(new, old);
end
$function$;