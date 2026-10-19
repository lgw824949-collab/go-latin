-- DRAFT ONLY. DO NOT RUN ON PRODUCTION.
-- Independent quick-party submissions; legacy public.parties and BAR tables unchanged.
create table if not exists public.quick_party_submissions (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null check (city_slug in ('seoul','bangkok','hanoi')),
  poster_path text not null,
  event_date date not null,
  start_time time without time zone not null,
  dance_genres text[] not null check (cardinality(dance_genres) between 1 and 4 and array_position(dance_genres, null) is null and dance_genres <@ array['salsa','bachata','kizomba','mixed']::text[]),
  venue_name text not null check (length(trim(venue_name)) between 1 and 160),
  contact_sns text not null check (length(trim(contact_sns)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  submitted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint poster_path_nonempty check (length(trim(poster_path)) > 0)
);
-- Only the guarded RPC may create submissions; no direct authenticated INSERT policy.
create index if not exists quick_party_public_lookup_idx on public.quick_party_submissions (city_slug, event_date, start_time) where status = 'approved';
create unique index if not exists quick_party_unique_poster_idx on public.quick_party_submissions (poster_path);
create index if not exists quick_party_owner_idx on public.quick_party_submissions (submitted_by, created_at desc);
alter table public.quick_party_submissions enable row level security;
-- Public can only view approved entries. No anonymous inserts.
create policy "public read approved quick parties" on public.quick_party_submissions
  for select to anon, authenticated using (status = 'approved');
-- No client-side UPDATE/DELETE or self-approval policies.
-- Approval/rejection must be implemented using a separate privileged admin workflow.
-- Poster storage: create a PRIVATE bucket and server-validated signed upload flow
-- BEFORE enabling actual submissions; never trust user-provided poster_path.
-- RPC quotas, moderation, file validation and organizer identity must be tested before launch.
