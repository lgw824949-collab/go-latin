-- Blocks direct updates to capitals, including country.
-- Does not change stored rows and does not replace save_admin_bar.
-- Apply 018 first so a bar save no longer updates capitals.
-- Public read policies and the bar-table grants stay.

begin;

drop policy if exists "admin update capitals" on public.capitals;

revoke update on table public.capitals from authenticated;
revoke update on table public.capitals from anon;

commit;
