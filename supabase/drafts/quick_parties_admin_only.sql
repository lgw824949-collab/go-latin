-- DRAFT ONLY, 2026-10-29. NOT APPLIED; requires explicit approval.
-- Standalone admin-only bootstrap OR follow-up to 025. Requires 015 prerequisites.
-- Kept outside migrations/ to prevent accidental automatic deployment.
-- Supabase CLI unavailable locally: promote using `supabase migration new`
-- only after review. Do NOT apply legacy 025 first: it permits anonymous submit.
-- Execute later as the trusted owner of simple_parties and submit_simple_party.
-- No existing party rows, poster objects, or public SELECT policies are changed.
-- Bucket settings change only future uploads; existing files remain readable.
-- UPDATE RPC is full replacement of editable fields, not a partial JSON patch.
-- DELETE RPC deletes a party row only WHEN CALLED; does not delete its poster.
-- This draft does NOT invoke any write RPC, upload, or delete any stored data.
-- No changes to parties, party_places, party_dances, BARs, or their policies.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local search_path = '';

-- Do not silently create unusable policies against a disabled Storage RLS setup.
-- Validate dependencies before creating any Quick Parties objects.
do $dependencies$
begin
  if to_regclass('storage.buckets') is null
    or to_regclass('storage.objects') is null
    or to_regprocedure('auth.uid()') is null
    or to_regprocedure('auth.jwt()') is null
    or to_regprocedure('pg_catalog.gen_random_uuid()') is null then
    raise exception 'Required Supabase Auth/Storage/PostgreSQL objects are missing';
  end if;
  if not exists (select 1 from pg_catalog.pg_class
    where oid = 'storage.objects'::regclass and relrowsecurity) then
    raise exception 'Storage objects RLS must already be enabled; inspect before applying';
  end if;
  -- INSERT/UPDATE privileges and BYPASSRLS do not authorize CREATE POLICY.
  -- Supabase also delegates policy-only DDL via supautils.policy_grants.
  -- Recognize that official grant without changing owners, roles or settings.
  if not exists (select 1 from pg_catalog.pg_roles where rolname = current_user and rolsuper)
    and not pg_catalog.pg_has_role(current_user,
      (select relowner from pg_catalog.pg_class where oid = 'storage.objects'::regclass), 'USAGE')
    and not coalesce(
      (coalesce(nullif(pg_catalog.current_setting('supautils.policy_grants', true), ''), '{}')::jsonb
        -> current_user::text) ? 'storage.objects', false) then
    raise exception 'Storage policy DDL requires owner rights or an existing supautils policy grant; table grants/BYPASSRLS are insufficient';
  end if;
  if exists (select 1 from pg_catalog.pg_roles
    where rolname in ('anon', 'authenticated') and (rolsuper or rolbypassrls))
    or (select count(*) from pg_catalog.pg_roles where rolname in ('anon', 'authenticated')) <> 2 then
    raise exception 'Expected non-bypass anon/authenticated roles are required';
  end if;
end;
$dependencies$;

-- Fresh installations use the same table contract as 025, without ever publishing
-- its anonymous submit RPC. Existing tables are preserved and checked below.
do $bootstrap$
begin
  if to_regclass('public.capitals') is null
    or to_regclass('public.venues') is null
    or to_regprocedure('public.is_go_latin_admin()') is null then
    raise exception 'Verify BAR tables and 015 admin authentication before applying';
  end if;
  if (select count(*) from public.capitals where id in ('seoul', 'bangkok', 'hanoi')) <> 3 then
    raise exception 'All three existing MVP capitals are required';
  end if;
  if to_regclass('public.simple_parties') is null then
    create table public.simple_parties (
      id uuid primary key default pg_catalog.gen_random_uuid(),
      capital_id text not null references public.capitals(id) on delete restrict,
      venue_id uuid references public.venues(id) on delete set null,
      venue_name text not null,
      sns_url text not null,
      poster_url text not null,
      starts_at timestamptz not null,
      genre text not null,
      created_at timestamptz not null default now(),
      constraint simple_parties_city check (capital_id in ('seoul', 'bangkok', 'hanoi')),
      constraint simple_parties_venue_name check (btrim(venue_name) <> ''),
      constraint simple_parties_genre check (genre in ('salsa', 'bachata', 'kizomba', 'mixed')),
      constraint simple_parties_sns_url check (sns_url ~* '^https?://[^[:space:]]+$'),
      constraint simple_parties_poster_url check (poster_url ~* '^https?://[^[:space:]]+$')
    );
    create index simple_parties_city_starts_at_idx on public.simple_parties(capital_id, starts_at);
    alter table public.simple_parties enable row level security;
    create policy "public read simple_parties" on public.simple_parties for select using (true);
    revoke all on table public.simple_parties from public, anon, authenticated;
  end if;
end;
$bootstrap$;

-- Never overwrite a pre-existing bucket's visibility/name in a bootstrap.
insert into storage.buckets (id, name, public)
values ('simple-party-posters', 'simple-party-posters', true)
on conflict (id) do nothing;

-- Fail closed on missing prerequisites, unexpected ownership or FORCE RLS.
do $preflight$
begin
  if to_regclass('public.simple_parties') is null
    or to_regprocedure('public.is_go_latin_admin()') is null then
    raise exception 'Missing Quick Parties prerequisites';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class c
    where c.oid = 'public.simple_parties'::regclass
      and c.relowner = (select r.oid from pg_catalog.pg_roles r where r.rolname = current_user)
      and not c.relforcerowsecurity
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = to_regprocedure('public.submit_simple_party(jsonb)')
      and p.proowner <> (select r.oid from pg_catalog.pg_roles r where r.rolname = current_user)
  ) then
    raise exception 'Apply only as the trusted table/RPC owner; review FORCE RLS separately';
  end if;
  if not exists (
    select 1 from storage.buckets b
    where b.id = 'simple-party-posters' and b.public is true
  ) then
    raise exception 'Expected existing public simple-party-posters bucket; inspect before applying';
  end if;
end;
$preflight$;

-- Keep RPC-only writes. Revoke both table and any column-level client grants.
alter table public.simple_parties enable row level security;
revoke insert, update, delete, truncate, references, trigger
  on table public.simple_parties from public, anon, authenticated;
grant select on table public.simple_parties to anon, authenticated;
do $columns$
declare col record;
begin
  for col in select a.attname from pg_catalog.pg_attribute a
    where a.attrelid = 'public.simple_parties'::regclass
      and a.attnum > 0 and not a.attisdropped
  loop
    execute format('revoke insert (%I), update (%I), references (%I) on public.simple_parties from public, anon, authenticated',
      col.attname, col.attname, col.attname);
  end loop;
end;
$columns$;

-- RESTRICTIVE guards remain effective even if old permissive policies remain.
-- The trusted table-owner DEFINER RPCs intentionally bypass these guards.
-- Keep all existing SELECT policies unchanged.
create policy qp_rpc_only_insert on public.simple_parties
  as restrictive for insert to public with check (false);
create policy qp_rpc_only_update on public.simple_parties
  as restrictive for update to public using (false) with check (false);
create policy qp_rpc_only_delete on public.simple_parties
  as restrictive for delete to public using (false);

-- Non-exposed helper. Reuse the existing admin predicate, never user_metadata.
-- Security-invoker helper performs validation only; it cannot write data.
create schema go_latin_qp_private;
revoke all on schema go_latin_qp_private from public, anon, authenticated;

create function go_latin_qp_private.validate_party(payload jsonb)
returns public.simple_parties
language plpgsql
security invoker
set search_path = ''
as $validate$
declare
  v public.simple_parties%rowtype;
  field text;
begin
  -- Defence in depth if a future wrapper accidentally omits its own check.
  if auth.uid() is null
    or (auth.jwt() ->> 'role') is distinct from 'authenticated'
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin'
    or coalesce(public.is_go_latin_admin(), false) is not true then
    raise exception 'Admin sign-in is required.' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'payload must be an object' using errcode = '22023';
  end if;
  foreach field in array array['capital_id', 'venue_name', 'sns_url', 'poster_url', 'starts_at', 'genre']
  loop
    if jsonb_typeof(payload -> field) is distinct from 'string' then
      raise exception 'Missing or invalid field: %', field using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_object_keys(payload) as k(name)
    where k.name not in ('capital_id', 'venue_id', 'venue_name', 'sns_url', 'poster_url', 'starts_at', 'genre')) then
    raise exception 'Unsupported party field' using errcode = '22023';
  end if;
  if payload ? 'venue_id' and jsonb_typeof(payload -> 'venue_id') not in ('null', 'string') then
    raise exception 'venue_id must be a UUID string or null' using errcode = '22023';
  end if;

  v.capital_id := btrim(payload ->> 'capital_id');
  v.genre := btrim(payload ->> 'genre');
  v.venue_name := regexp_replace(btrim(payload ->> 'venue_name'), '\s+', ' ', 'g');
  v.sns_url := btrim(payload ->> 'sns_url');
  v.poster_url := btrim(payload ->> 'poster_url');
  v.venue_id := nullif(btrim(payload ->> 'venue_id'), '')::uuid;
  v.starts_at := (payload ->> 'starts_at')::timestamptz;

  if v.capital_id not in ('seoul', 'bangkok', 'hanoi') then
    raise exception 'Unsupported city' using errcode = '23514';
  end if;
  if v.genre not in ('salsa', 'bachata', 'kizomba', 'mixed') then
    raise exception 'Unsupported genre' using errcode = '23514';
  end if;
  if v.venue_name = '' or char_length(v.venue_name) > 200 then
    raise exception 'Venue name must contain 1 to 200 characters' using errcode = '23514';
  end if;
  if v.sns_url !~* '^https?://[^[:space:]]+$' or char_length(v.sns_url) > 2048
    or v.poster_url !~* '^https?://[^[:space:]]+$' or char_length(v.poster_url) > 2048 then
    raise exception 'SNS and poster must be http/https URLs of at most 2048 characters' using errcode = '23514';
  end if;
  if v.starts_at is null or not isfinite(v.starts_at) then
    raise exception 'Finite start timestamp required' using errcode = '23514';
  end if;
  -- Serialize against venue deletion/reassignment while checking city membership.
  if v.venue_id is not null then
    perform 1 from public.venues as venue
      where venue.id = v.venue_id and venue.capital_id = v.capital_id
      for share;
    if not found then
      raise exception 'Venue must belong to the selected city' using errcode = '23514';
    end if;
  end if;
  -- Existing valid http/https poster URLs may be retained on edits.
  -- Do not accept/derive a privileged Storage deletion path from these URLs.
  return v;
end;
$validate$;
revoke all on function go_latin_qp_private.validate_party(jsonb) from public, anon, authenticated;

-- Preserve the existing insert RPC signature; authorization runs BEFORE parsing.
create or replace function public.submit_simple_party(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $submit$
declare v public.simple_parties%rowtype; saved_id uuid;
begin
  if auth.uid() is null
    or (auth.jwt() ->> 'role') is distinct from 'authenticated'
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin'
    or coalesce(public.is_go_latin_admin(), false) is not true then
    raise exception 'Admin sign-in is required.' using errcode = '42501';
  end if;
  v := go_latin_qp_private.validate_party(payload);
  insert into public.simple_parties
    (capital_id, venue_id, venue_name, sns_url, poster_url, starts_at, genre)
  values (v.capital_id, v.venue_id, v.venue_name, v.sns_url, v.poster_url, v.starts_at, v.genre)
  returning id into saved_id;
  return saved_id;
end;
$submit$;

create function public.update_simple_party(party_id uuid, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $update$
declare v public.simple_parties%rowtype; saved_id uuid;
begin
  if auth.uid() is null
    or (auth.jwt() ->> 'role') is distinct from 'authenticated'
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin'
    or coalesce(public.is_go_latin_admin(), false) is not true then
    raise exception 'Admin sign-in is required.' using errcode = '42501';
  end if;
  if party_id is null then
    raise exception 'party_id is required' using errcode = '22023';
  end if;
  v := go_latin_qp_private.validate_party(payload);
  update public.simple_parties as party set
    capital_id = v.capital_id, venue_id = v.venue_id, venue_name = v.venue_name,
    sns_url = v.sns_url, poster_url = v.poster_url, starts_at = v.starts_at, genre = v.genre
  where party.id = party_id
  returning party.id into saved_id;
  if not found then
    raise exception 'Party not found' using errcode = 'P0002';
  end if;
  return saved_id;
end;
$update$;

create function public.delete_simple_party(party_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $delete$
declare deleted_id uuid;
begin
  if auth.uid() is null
    or (auth.jwt() ->> 'role') is distinct from 'authenticated'
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin'
    or coalesce(public.is_go_latin_admin(), false) is not true then
    raise exception 'Admin sign-in is required.' using errcode = '42501';
  end if;
  if party_id is null then
    raise exception 'party_id is required' using errcode = '22023';
  end if;
  delete from public.simple_parties as party where party.id = party_id
    returning party.id into deleted_id;
  if not found then
    raise exception 'Party not found' using errcode = 'P0002';
  end if;
  return deleted_id;
end;
$delete$;

-- Remove default PUBLIC execute and client grants on ALL same-name overloads.
-- Unknown overloads are not granted back. No function definitions are dropped.
do $rpc_acl$
declare fn record;
begin
  for fn in select p.oid::regprocedure as signature from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('submit_simple_party', 'update_simple_party', 'delete_simple_party')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.signature);
  end loop;
end;
$rpc_acl$;
grant execute on function public.submit_simple_party(jsonb) to authenticated;
grant execute on function public.update_simple_party(uuid, jsonb) to authenticated;
grant execute on function public.delete_simple_party(uuid) to authenticated;

-- Bucket-level restrictions are enforced by Storage, not client MIME assertions.
-- Actual image decoding/content inspection is NOT provided by this SQL.
update storage.buckets set
  file_size_limit = 4194304,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'simple-party-posters';

-- Exact depth and UUIDv4 filename; no root files, nested folders or other cities.
-- Use JWT claims directly so an anon rejection does not require EXECUTE on the
-- authenticated-only is_go_latin_admin helper. Never trust user_metadata.
create policy qp_poster_admin_insert on storage.objects
  as permissive for insert to authenticated
  with check (
    bucket_id = 'simple-party-posters'
    and auth.uid() is not null
    and (auth.jwt() ->> 'role') = 'authenticated'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    and name ~ '^(seoul|bangkok|hanoi)/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

-- AND-combined guard prevents an older broad permissive INSERT/ALL policy
-- from opening this bucket. Other buckets' behavior remains unchanged.
create policy qp_poster_insert_guard on storage.objects
  as restrictive for insert to public
  with check (
    bucket_id <> 'simple-party-posters'
    or (
      auth.uid() is not null
      and (auth.jwt() ->> 'role') = 'authenticated'
      and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      and name ~ '^(seoul|bangkok|hanoi)/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );
create policy qp_poster_no_update on storage.objects
  as restrictive for update to public
  using (bucket_id <> 'simple-party-posters')
  with check (bucket_id <> 'simple-party-posters');
create policy qp_poster_no_delete on storage.objects
  as restrictive for delete to public
  using (bucket_id <> 'simple-party-posters');

-- No SELECT policy or bucket.public change: preserve existing poster URLs.
-- Cleanup is intentionally NOT granted to browsers, including admin browsers.
-- A separately approved trusted Storage API cleanup flow is needed for orphans.
-- A service_role/server secret bypasses RLS; never expose it to the frontend.

-- Abort on inherited ACL bypasses or other exposed DEFINER RPCs referencing
-- simple_parties. Static body detection is an audit aid, NOT a proof against
-- dynamic SQL, writable views, triggers or indirect helper chains.
do $audit$
declare role_name text; fn record; col record;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_table_privilege(role_name, 'public.simple_parties', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
      raise exception 'Unexpected inherited table write privilege for %', role_name;
    end if;
    for col in select a.attname from pg_catalog.pg_attribute a
      where a.attrelid = 'public.simple_parties'::regclass and a.attnum > 0 and not a.attisdropped
    loop
      if has_column_privilege(role_name, 'public.simple_parties', col.attname, 'INSERT,UPDATE,REFERENCES') then
        raise exception 'Unexpected inherited column write privilege for %', role_name;
      end if;
    end loop;
    for fn in select p.oid, n.nspname, p.proname,
      (n.nspname = 'public' and p.oid in (
        'public.submit_simple_party(jsonb)'::regprocedure,
        'public.update_simple_party(uuid,jsonb)'::regprocedure,
        'public.delete_simple_party(uuid)'::regprocedure
      )) as expected_rpc
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where p.prokind = 'f' and n.nspname not in ('pg_catalog', 'information_schema')
        and (p.proname in ('submit_simple_party', 'update_simple_party', 'delete_simple_party')
          or (p.prosecdef and p.prosrc ilike '%simple_parties%'))
    loop
      if has_function_privilege(role_name, fn.oid, 'EXECUTE')
        and not (role_name = 'authenticated' and fn.expected_rpc) then
        raise exception 'Unexpected client EXECUTE: %.% for %', fn.nspname, fn.proname, role_name;
      end if;
    end loop;
  end loop;
end;
$audit$;

-- PRE-APPLY REVIEW REQUIRED (not executed here):
-- * inspect live pg_policies, ACLs/role memberships, existing overloads, helper
--   definition/owner, triggers and writable views; the draft cannot infer them.
-- * confirm auth.uid + app_metadata admin claims; stale JWT role changes require
--   session refresh/revocation. SQL cannot defend against leaked service_role.
-- * test anon and ordinary authenticated denial for EVERY RPC and Storage API;
--   test admin CRUD, valid upload, all invalid paths/types/sizes and upsert denial.
-- * test SELECT and public poster URLs unchanged, including legacy filenames.
-- * update/delete concurrent edits use last writer wins; UI confirmation and
--   optional optimistic concurrency are a later frontend concern.
-- * test rollback on invalid payload, nonexistent IDs and cross-city venue IDs.
-- * confirm row counts/IDs and poster URLs before/after migration are unchanged.
-- * no automatic object deletion: avoid deleting shared/still-referenced posters;
--   failed uploads/RPCs may leave chargeable objects until approved cleanup.
-- * unknown existing policy/schema name collisions fail the transaction rather
--   than silently dropping policies. Do not retry with destructive DROP changes.
commit;
