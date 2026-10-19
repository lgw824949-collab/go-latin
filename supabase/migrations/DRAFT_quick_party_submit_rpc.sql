-- DRAFT ONLY: run in an isolated Supabase test project AFTER the other quick-party drafts.
-- No production execution. Replaces direct client INSERT with a guarded RPC.
-- Important: the storage upload policy still needs anti-spam/orphan cleanup.
drop policy if exists "authenticated submit own pending quick parties"
  on public.quick_party_submissions;

create or replace function public.submit_quick_party(
  p_city_slug text,
  p_poster_path text,
  p_event_date date,
  p_start_time time without time zone,
  p_dance_genres text[],
  p_venue_name text,
  p_contact_sns text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_object_count integer;
  v_recent_count integer;
  v_city_today date;
begin
  if v_user is null then
    raise exception 'Organizer sign-in required' using errcode = '42501';
  end if;
  -- Serialize submissions by the same organizer to avoid concurrent quota bypass.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));

  v_city_today := (now() at time zone case p_city_slug
    when 'seoul' then 'Asia/Seoul'
    when 'bangkok' then 'Asia/Bangkok'
    when 'hanoi' then 'Asia/Ho_Chi_Minh'
    else 'UTC' end)::date;

  if p_city_slug is null or p_city_slug not in ('seoul','bangkok','hanoi')
    or p_event_date is null or p_start_time is null
    or p_event_date < v_city_today
    or p_event_date > v_city_today + 365
    or p_dance_genres is null or cardinality(p_dance_genres) not between 1 and 4
    or not (p_dance_genres <@ array['salsa','bachata','kizomba','mixed']::text[])
    or p_venue_name is null or length(btrim(p_venue_name)) not between 1 and 160
    or p_contact_sns is null or length(btrim(p_contact_sns)) not between 1 and 500
  then
    raise exception 'Invalid party details' using errcode = '22023';
  end if;

  -- Require an existing object under the authenticated user's folder.
  -- A storage.objects row alone does not validate file magic bytes; server-side
  -- scanning, quotas, signed delivery and orphan cleanup are still required.
  if p_poster_path is null
    or p_poster_path not like (v_user::text || '/%')
    or p_poster_path like '%..%'
    or length(p_poster_path) > 300
  then
    raise exception 'Invalid poster path' using errcode = '22023';
  end if;
  select count(*) into v_object_count
  from storage.objects
  where bucket_id = 'quick-party-posters'
    and name = p_poster_path
    and owner_id = v_user::text;
  if v_object_count <> 1 then
    raise exception 'Poster upload not found for organizer' using errcode = '22023';
  end if;

  -- Pilot quota: 5 submissions per rolling 24 hours per organizer.
  -- The organizer-scoped transaction lock serializes concurrent RPC calls.
  select count(*) into v_recent_count
  from public.quick_party_submissions
  where submitted_by = v_user
    and created_at >= now() - interval '24 hours';
  if v_recent_count >= 5 then
    raise exception 'Daily submission limit reached' using errcode = '22023';
  end if;

  insert into public.quick_party_submissions
    (city_slug, poster_path, event_date, start_time, dance_genres,
     venue_name, contact_sns, status, submitted_by)
  values
    (p_city_slug, p_poster_path, p_event_date, p_start_time, p_dance_genres,
     btrim(p_venue_name), btrim(p_contact_sns), 'pending', v_user)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_quick_party(
  text,text,date,time without time zone,text[],text,text
) from public, anon;
grant execute on function public.submit_quick_party(
  text,text,date,time without time zone,text[],text,text
) to authenticated;

-- SECURITY RELEASE GATES:
-- 1. Verify storage.objects owner_id behavior in the target Supabase version.
-- 2. Test anonymous, forged user, missing object, duplicate object, quota race,
--    invalid dates, malicious payload, and RLS bypass in isolated project.
-- 3. Add server-verified MIME/magic-byte checks, anti-spam and orphan cleanup.
-- 4. Prevent reuse of a poster_path across multiple submissions and verify
--    ownership policy under real storage API behavior.
-- 5. Do not grant browser INSERT access to the submissions table.
