-- Saves one admin bar, its dances, hours, night schedule, and managed sources.
-- Does not change existing rows when applied. Does not delete venues.
-- A later statement failure rolls the whole call back.

create or replace function public.save_admin_bar(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_id uuid;
  v_is_new boolean;
  v_capital_id text;
  v_name text;
  v_address text;
  v_existing_capital text;
  v_existing_name text;
  v_existing_address text;
  v_status public.venue_status;
  v_confidence public.confidence;
  v_checked date;
  v_dances public.dance[] := '{}';
  v_item jsonb;
  v_text text;
  v_weekday smallint;
  v_dance public.dance;
  v_time time;
  v_probe_date date;
  v_count integer;
begin
  if coalesce(public.is_go_latin_admin(), false) is not true then
    raise exception 'Admin sign-in is required.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(payload) is distinct from 'object'
    or payload->>'venue_id' is null
    or payload->>'is_new' is null
    or nullif(btrim(coalesce(payload->>'capital_id', '')), '') is null
    or nullif(btrim(coalesce(payload->>'name', '')), '') is null
    or jsonb_typeof(payload->'dances') is distinct from 'array'
    or jsonb_typeof(payload->'hours') is distinct from 'array'
    or jsonb_typeof(payload->'schedule') is distinct from 'array'
    or jsonb_typeof(payload->'sources') is distinct from 'array'
    or jsonb_typeof(payload->'remove_source_kinds') is distinct from 'array'
  then
    raise exception 'The database did not apply the save.';
  end if;

  v_id := (payload->>'venue_id')::uuid;
  v_is_new := (payload->>'is_new')::boolean;
  v_capital_id := payload->>'capital_id';
  v_name := btrim(payload->>'name');
  v_address := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_status := (payload->>'status')::public.venue_status;
  v_confidence := nullif(payload->>'confidence', '')::public.confidence;
  v_checked := nullif(payload->>'source_checked', '')::date;

  select coalesce(array_agg(item.value::public.dance), '{}')
  into v_dances
  from jsonb_array_elements_text(payload->'dances') as item(value);

  for v_item in
    select value from jsonb_array_elements(payload->'hours')
  loop
    v_weekday := (v_item->>'weekday')::smallint;
    if v_weekday is null or v_weekday < 0 or v_weekday > 6 or v_item->>'hours_text' is null then
      raise exception 'The database did not apply the save.';
    end if;
    v_time := nullif(v_item->>'opens', '')::time;
    v_time := nullif(v_item->>'closes', '')::time;
  end loop;

  for v_item in
    select value from jsonb_array_elements(payload->'schedule')
  loop
    v_weekday := (v_item->>'weekday')::smallint;
    if v_weekday is null or v_weekday < 0 or v_weekday > 6 then
      raise exception 'The database did not apply the save.';
    end if;
    v_dance := (v_item->>'dance')::public.dance;
  end loop;

  for v_text in
    select value from jsonb_array_elements_text(payload->'remove_source_kinds')
  loop
    if v_text not in ('google_maps', 'website', 'instagram') then
      raise exception 'The database did not apply the save.';
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(payload->'sources')
  loop
    if v_item->>'kind' not in ('google_maps', 'website', 'instagram')
      or nullif(btrim(coalesce(v_item->>'url', '')), '') is null
    then
      raise exception 'The database did not apply the save.';
    end if;
    if left(v_item->>'url', 7) <> 'http://' and left(v_item->>'url', 8) <> 'https://' then
      raise exception 'The database did not apply the save.';
    end if;
    v_probe_date := nullif(v_item->>'checked_at', '')::date;
  end loop;

  if v_is_new then
    select existing.capital_id, existing.name, existing.address
    into v_existing_capital, v_existing_name, v_existing_address
    from public.venues as existing
    where existing.id = v_id;

    if found then
      if v_existing_capital is distinct from v_capital_id
        or v_existing_name is distinct from v_name
        or v_existing_address is distinct from v_address
      then
        raise exception 'duplicate key value violates unique constraint "venues_pkey"'
          using errcode = 'unique_violation';
      end if;
      v_is_new := false;
    end if;
  end if;

  if v_is_new then
    insert into public.venues (
      id, capital_id, name, address, phone, website, instagram_url, maps_url,
      source_url, source_checked, source_note, status, confidence
    ) values (
      v_id,
      v_capital_id,
      v_name,
      v_address,
      nullif(btrim(coalesce(payload->>'phone', '')), ''),
      nullif(btrim(coalesce(payload->>'website', '')), ''),
      nullif(btrim(coalesce(payload->>'instagram_url', '')), ''),
      nullif(btrim(coalesce(payload->>'maps_url', '')), ''),
      nullif(btrim(coalesce(payload->>'source_url', '')), ''),
      v_checked,
      nullif(btrim(coalesce(payload->>'source_note', '')), ''),
      v_status,
      v_confidence
    );
  else
    update public.venues
    set
      capital_id = v_capital_id,
      name = v_name,
      address = v_address,
      phone = nullif(btrim(coalesce(payload->>'phone', '')), ''),
      website = nullif(btrim(coalesce(payload->>'website', '')), ''),
      instagram_url = nullif(btrim(coalesce(payload->>'instagram_url', '')), ''),
      maps_url = nullif(btrim(coalesce(payload->>'maps_url', '')), ''),
      source_url = nullif(btrim(coalesce(payload->>'source_url', '')), ''),
      source_checked = v_checked,
      source_note = nullif(btrim(coalesce(payload->>'source_note', '')), ''),
      status = v_status,
      confidence = v_confidence
    where id = v_id;

    if not found then
      raise exception 'The database did not apply the save.';
    end if;
  end if;

  if btrim(coalesce(payload->>'country', '')) is distinct from payload->>'original_country' then
    update public.capitals
    set country = btrim(payload->>'country')
    where id = v_capital_id;
    get diagnostics v_count = row_count;
    if v_count <> 1 then
      raise exception 'The database did not apply the country.';
    end if;
  end if;

  delete from public.venue_dances
  where venue_id = v_id
    and not (dance = any (v_dances));

  insert into public.venue_dances (venue_id, dance)
  select v_id, incoming.dance
  from unnest(v_dances) as incoming(dance)
  where not exists (
    select 1
    from public.venue_dances as existing
    where existing.venue_id = v_id
      and existing.dance = incoming.dance
  );

  for v_item in
    select value from jsonb_array_elements(payload->'hours')
  loop
    insert into public.venue_hours (venue_id, weekday, hours_text, opens, closes, is_closed)
    values (
      v_id,
      (v_item->>'weekday')::smallint,
      v_item->>'hours_text',
      nullif(v_item->>'opens', '')::time,
      nullif(v_item->>'closes', '')::time,
      coalesce((v_item->>'is_closed')::boolean, false)
    )
    on conflict (venue_id, weekday) do update
    set
      hours_text = excluded.hours_text,
      opens = excluded.opens,
      closes = excluded.closes,
      is_closed = excluded.is_closed;
  end loop;

  delete from public.venue_night_dances
  where venue_id = v_id;

  for v_item in
    select value from jsonb_array_elements(payload->'schedule')
  loop
    insert into public.venue_night_dances (venue_id, weekday, dance)
    values (
      v_id,
      (v_item->>'weekday')::smallint,
      (v_item->>'dance')::public.dance
    );
  end loop;

  delete from public.venue_sources
  where venue_id = v_id
    and kind in (
      select item.value::public.source_kind
      from jsonb_array_elements_text(payload->'remove_source_kinds') as item(value)
    );

  for v_item in
    select value from jsonb_array_elements(payload->'sources')
  loop
    insert into public.venue_sources (venue_id, kind, url, checked_at)
    values (
      v_id,
      (v_item->>'kind')::public.source_kind,
      v_item->>'url',
      nullif(v_item->>'checked_at', '')::date
    )
    on conflict (venue_id, kind) do update
    set
      url = excluded.url,
      checked_at = excluded.checked_at;
  end loop;

  return v_id;
end;
$function$;

revoke all on function public.save_admin_bar(jsonb) from public;
revoke all on function public.save_admin_bar(jsonb) from anon;
grant execute on function public.save_admin_bar(jsonb) to authenticated;
