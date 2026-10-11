-- City → bar → dance → weekly hours → source → last verified.
-- Keeps the 195 capitals and the bars already loaded.
-- A capital may have more than one bar.
-- Safe to run again. Do not run seed.sql.

alter type public.venue_status add value if not exists 'temporarily_closed';
alter type public.venue_status add value if not exists 'unknown';

do $$ begin
  create type public.confidence as enum ('confirmed', 'likely', 'unconfirmed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.source_kind as enum (
    'google_maps', 'instagram', 'website', 'local', 'friend', 'other'
  );
exception
  when duplicate_object then null;
end $$;

begin;

alter table public.venues drop constraint if exists venues_capital_id_key;

create index if not exists venues_capital_id_idx on public.venues (capital_id);

alter table public.venues add column if not exists instagram_url text;
alter table public.venues add column if not exists latitude double precision;
alter table public.venues add column if not exists longitude double precision;
alter table public.venues add column if not exists source_url text;
alter table public.venues add column if not exists confidence public.confidence;

alter table public.venues drop constraint if exists venues_latitude;
alter table public.venues
  add constraint venues_latitude check (latitude is null or latitude between -90 and 90);

alter table public.venues drop constraint if exists venues_longitude;
alter table public.venues
  add constraint venues_longitude check (longitude is null or longitude between -180 and 180);

alter table public.venue_hours add column if not exists opens time;
alter table public.venue_hours add column if not exists closes time;
alter table public.venue_hours add column if not exists is_closed boolean;

comment on column public.venue_hours.closes is
  'Close time on the same row. 02:00 after an evening open is overnight, not the next weekday.';

create table if not exists public.venue_night_dances (
  venue_id uuid not null references public.venues (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  dance public.dance not null,
  primary key (venue_id, weekday, dance)
);

create table if not exists public.venue_sources (
  venue_id uuid not null references public.venues (id) on delete cascade,
  kind public.source_kind not null,
  url text,
  checked_at date,
  primary key (venue_id, kind)
);

alter table public.venue_night_dances enable row level security;
alter table public.venue_sources enable row level security;

drop policy if exists "public read venue_night_dances" on public.venue_night_dances;
create policy "public read venue_night_dances"
  on public.venue_night_dances for select
  using (true);

drop policy if exists "public read venue_sources" on public.venue_sources;
create policy "public read venue_sources"
  on public.venue_sources for select
  using (true);

-- Hanoi test: La Habanera. Place point from the map panel.
-- Dance is bachata. Google does not say which night, so no night-dance rows.
update public.venues
set
  latitude = 21.0676142,
  longitude = 105.8260132,
  source_url = maps_url,
  confidence = 'likely'
where capital_id = 'hanoi';

update public.venue_hours
set
  opens = time '18:00',
  closes = time '02:00',
  is_closed = false
where venue_id = (select id from public.venues where capital_id = 'hanoi')
  and hours_text = '6 PM–2 AM';

insert into public.venue_sources (venue_id, kind, url, checked_at)
select id, 'google_maps'::public.source_kind, maps_url, source_checked
from public.venues
where capital_id = 'hanoi'
on conflict (venue_id, kind) do update
set url = excluded.url, checked_at = excluded.checked_at;

insert into public.venue_sources (venue_id, kind, url, checked_at)
select id, 'website'::public.source_kind, website, source_checked
from public.venues
where capital_id = 'hanoi'
  and website is not null
on conflict (venue_id, kind) do update
set url = excluded.url, checked_at = excluded.checked_at;

commit;
