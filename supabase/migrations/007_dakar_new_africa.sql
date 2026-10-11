-- Add the verified Dakar bar. Capitals are already seeded.
-- Safe to run again: skips the row if Dakar already has a bar.
-- Do not re-run seed.sql.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'dakar',
  'Restaurant New Africa',
  '9794, Dakar 00000, Senegal',
  'https://www.google.com/maps/place/Restaurant+New+Africa/@14.7184625,-17.4673507,17z/data=!3m1!4b1!4m6!3m5!1s0xec172b1d3cf811d:0xeba4d80a66a59f96!8m2!3d14.7184625!4d-17.4673507!16s%2Fg%2F11b7hlqy_7?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  '+221 33 827 53 71',
  'http://www.newafricarestaurant.com/',
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check the map said Closed, opening at 6:30 PM. Google labels the place a restaurant. Review topics name salsa and kizomba. Karaoke is also a topic. No bachata topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'dakar'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('kizomba'), ('salsa')) as d(dance)
where v.capital_id = 'dakar'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0, 'Closed'),
    (1, '6:30 PM–12 AM'),
    (2, '6:30 PM–12 AM'),
    (3, '6:30 PM–12 AM'),
    (4, '6:30 PM–12 AM'),
    (5, '6:30 PM–2 AM'),
    (6, '6:30 PM–2 AM')
) as h(weekday, hours_text)
where v.capital_id = 'dakar'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

commit;
