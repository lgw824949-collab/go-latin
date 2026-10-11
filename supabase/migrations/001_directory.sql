-- Go Latin directory. Apply in P3.
-- Seed stays in data/capitals.json until then.
-- crowd_reports exists so the contract is fixed. Do not write it before P4.

create type public.continent as enum (
  'asia',
  'europe',
  'africa',
  'north_america',
  'south_america',
  'oceania'
);

create type public.dance as enum ('bachata', 'kizomba', 'salsa');

create type public.venue_status as enum ('planned', 'operating', 'permanently_closed');

create table public.capitals (
  id text primary key,
  city text not null,
  country text not null,
  iso2 char(2) not null,
  continent public.continent not null,
  lat double precision not null,
  lng double precision not null,
  timezone text not null,
  image text not null,
  constraint capitals_lat check (lat between -90 and 90),
  constraint capitals_lng check (lng between -180 and 180),
  constraint capitals_id_slug check (id ~ '^[a-z0-9_]+$'),
  constraint capitals_iso2 check (iso2 ~ '^[A-Z]{2}$')
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  capital_id text not null unique references public.capitals (id),
  name text not null,
  address text,
  maps_url text,
  phone text,
  website text,
  source text,
  source_checked date,
  source_note text,
  status public.venue_status not null default 'planned'
);

create table public.venue_dances (
  venue_id uuid not null references public.venues (id) on delete cascade,
  dance public.dance not null,
  primary key (venue_id, dance)
);

create table public.venue_hours (
  venue_id uuid not null references public.venues (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  hours_text text not null,
  primary key (venue_id, weekday)
);

create table public.crowd_reports (
  venue_id uuid primary key references public.venues (id) on delete cascade,
  headcount integer not null check (headcount >= 0),
  reported_at timestamptz not null default now()
);

alter table public.capitals enable row level security;
alter table public.venues enable row level security;
alter table public.venue_dances enable row level security;
alter table public.venue_hours enable row level security;
alter table public.crowd_reports enable row level security;

create policy "public read capitals"
  on public.capitals for select
  using (true);

create policy "public read venues"
  on public.venues for select
  using (true);

create policy "public read venue_dances"
  on public.venue_dances for select
  using (true);

create policy "public read venue_hours"
  on public.venue_hours for select
  using (true);

create policy "public read crowd"
  on public.crowd_reports for select
  using (true);

create index capitals_continent_idx on public.capitals (continent);
