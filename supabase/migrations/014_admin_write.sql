-- Lets the admin screen save a bar through the public key.
-- Does not change tables or existing rows.
-- Safe to run again.

begin;

drop policy if exists "admin insert venues" on public.venues;
create policy "admin insert venues" on public.venues for insert to anon, authenticated with check (true);
drop policy if exists "admin update venues" on public.venues;
create policy "admin update venues" on public.venues for update to anon, authenticated using (true) with check (true);

drop policy if exists "admin update capitals" on public.capitals;
create policy "admin update capitals" on public.capitals for update to anon, authenticated using (true) with check (true);

drop policy if exists "admin insert venue_dances" on public.venue_dances;
create policy "admin insert venue_dances" on public.venue_dances for insert to anon, authenticated with check (true);
drop policy if exists "admin update venue_dances" on public.venue_dances;
create policy "admin update venue_dances" on public.venue_dances for update to anon, authenticated using (true) with check (true);
drop policy if exists "admin delete venue_dances" on public.venue_dances;
create policy "admin delete venue_dances" on public.venue_dances for delete to anon, authenticated using (true);

drop policy if exists "admin insert venue_hours" on public.venue_hours;
create policy "admin insert venue_hours" on public.venue_hours for insert to anon, authenticated with check (true);
drop policy if exists "admin update venue_hours" on public.venue_hours;
create policy "admin update venue_hours" on public.venue_hours for update to anon, authenticated using (true) with check (true);
drop policy if exists "admin delete venue_hours" on public.venue_hours;
create policy "admin delete venue_hours" on public.venue_hours for delete to anon, authenticated using (true);

drop policy if exists "admin insert venue_night_dances" on public.venue_night_dances;
create policy "admin insert venue_night_dances" on public.venue_night_dances for insert to anon, authenticated with check (true);
drop policy if exists "admin delete venue_night_dances" on public.venue_night_dances;
create policy "admin delete venue_night_dances" on public.venue_night_dances for delete to anon, authenticated using (true);

drop policy if exists "admin insert venue_sources" on public.venue_sources;
create policy "admin insert venue_sources" on public.venue_sources for insert to anon, authenticated with check (true);
drop policy if exists "admin update venue_sources" on public.venue_sources;
create policy "admin update venue_sources" on public.venue_sources for update to anon, authenticated using (true) with check (true);
drop policy if exists "admin delete venue_sources" on public.venue_sources;
create policy "admin delete venue_sources" on public.venue_sources for delete to anon, authenticated using (true);

commit;
