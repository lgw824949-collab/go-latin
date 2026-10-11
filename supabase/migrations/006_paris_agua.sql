-- Add the verified Paris bar. Capitals are already seeded.
-- Do not re-run seed.sql. Do not run this twice.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
values (
  'paris',
  'AGUA Party Paris',
  'Peniche Concorde Atlantique, 23 Quai Anatole France, 75007 Paris, France',
  'https://www.google.com/maps/place/AGUA+Party+Paris/@48.8616939,2.2517063,12z/data=!4m10!1m2!2m1!1ssalsa+bachata+kizomba+Paris!3m6!1s0x47e66fee812046e1:0xda8e3adf1c529134!8m2!3d48.8616939!4d2.3217441!15sChtzYWxzYSBiYWNoYXRhIGtpem9tYmEgUGFyaXNaHSIbc2Fsc2EgYmFjaGF0YSBraXpvbWJhIHBhcmlzkgEJc2Fsc2FfYmFy4AEA!16s%2Fg%2F11mdck6181?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  null,
  'http://aguapartyparis.fr/',
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check, about 4:30 PM Paris time, the map said Closed, opening at 6:45 PM. Tuesday the door is open. The other days the door stays shut. Google has no phone number for this place.',
  'operating'
);

insert into public.venue_dances (venue_id, dance)
values
  ((select id from public.venues where capital_id = 'paris'), 'bachata'),
  ((select id from public.venues where capital_id = 'paris'), 'kizomba'),
  ((select id from public.venues where capital_id = 'paris'), 'salsa');

insert into public.venue_hours (venue_id, weekday, hours_text)
values
  ((select id from public.venues where capital_id = 'paris'), 0, 'Closed'),
  ((select id from public.venues where capital_id = 'paris'), 1, 'Closed'),
  ((select id from public.venues where capital_id = 'paris'), 2, '6:45 PM–1 AM'),
  ((select id from public.venues where capital_id = 'paris'), 3, 'Closed'),
  ((select id from public.venues where capital_id = 'paris'), 4, 'Closed'),
  ((select id from public.venues where capital_id = 'paris'), 5, 'Closed'),
  ((select id from public.venues where capital_id = 'paris'), 6, 'Closed');

commit;
