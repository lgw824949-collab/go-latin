-- Admin writes require app_metadata.role = admin.
-- Drops the permissive 014 policies. Those policies are OR-combined,
-- so leaving them would still allow every authenticated user to write.
-- Does not grant write privileges back to anon.
-- Does not change tables, rows, or public read policies.

begin;

create or replace function public.is_go_latin_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_go_latin_admin() from public;
grant execute on function public.is_go_latin_admin() to authenticated;

drop policy if exists "admin insert venues" on public.venues;
drop policy if exists "admin update venues" on public.venues;
drop policy if exists "admin update capitals" on public.capitals;
drop policy if exists "admin insert venue_dances" on public.venue_dances;
drop policy if exists "admin update venue_dances" on public.venue_dances;
drop policy if exists "admin delete venue_dances" on public.venue_dances;
drop policy if exists "admin insert venue_hours" on public.venue_hours;
drop policy if exists "admin update venue_hours" on public.venue_hours;
drop policy if exists "admin delete venue_hours" on public.venue_hours;
drop policy if exists "admin insert venue_night_dances" on public.venue_night_dances;
drop policy if exists "admin delete venue_night_dances" on public.venue_night_dances;
drop policy if exists "admin insert venue_sources" on public.venue_sources;
drop policy if exists "admin update venue_sources" on public.venue_sources;
drop policy if exists "admin delete venue_sources" on public.venue_sources;

create policy "admin insert venues"
  on public.venues for insert to authenticated
  with check (public.is_go_latin_admin());
create policy "admin update venues"
  on public.venues for update to authenticated
  using (public.is_go_latin_admin())
  with check (public.is_go_latin_admin());

create policy "admin update capitals"
  on public.capitals for update to authenticated
  using (public.is_go_latin_admin())
  with check (public.is_go_latin_admin());

create policy "admin insert venue_dances"
  on public.venue_dances for insert to authenticated
  with check (public.is_go_latin_admin());
create policy "admin update venue_dances"
  on public.venue_dances for update to authenticated
  using (public.is_go_latin_admin())
  with check (public.is_go_latin_admin());
create policy "admin delete venue_dances"
  on public.venue_dances for delete to authenticated
  using (public.is_go_latin_admin());

create policy "admin insert venue_hours"
  on public.venue_hours for insert to authenticated
  with check (public.is_go_latin_admin());
create policy "admin update venue_hours"
  on public.venue_hours for update to authenticated
  using (public.is_go_latin_admin())
  with check (public.is_go_latin_admin());
create policy "admin delete venue_hours"
  on public.venue_hours for delete to authenticated
  using (public.is_go_latin_admin());

create policy "admin insert venue_night_dances"
  on public.venue_night_dances for insert to authenticated
  with check (public.is_go_latin_admin());
create policy "admin delete venue_night_dances"
  on public.venue_night_dances for delete to authenticated
  using (public.is_go_latin_admin());

create policy "admin insert venue_sources"
  on public.venue_sources for insert to authenticated
  with check (public.is_go_latin_admin());
create policy "admin update venue_sources"
  on public.venue_sources for update to authenticated
  using (public.is_go_latin_admin())
  with check (public.is_go_latin_admin());
create policy "admin delete venue_sources"
  on public.venue_sources for delete to authenticated
  using (public.is_go_latin_admin());

revoke insert, update, delete on table
  public.capitals,
  public.venues,
  public.venue_dances,
  public.venue_hours,
  public.venue_night_dances,
  public.venue_sources,
  public.crowd_reports
from anon;

grant update on table public.capitals to authenticated;
grant insert, update on table public.venues to authenticated;
grant insert, update, delete on table public.venue_dances to authenticated;
grant insert, update, delete on table public.venue_hours to authenticated;
grant insert, delete on table public.venue_night_dances to authenticated;
grant insert, update, delete on table public.venue_sources to authenticated;

commit;
