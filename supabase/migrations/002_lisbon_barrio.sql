-- Add the verified Lisbon bar. Capitals are already seeded.
-- Do not re-run seed.sql.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
values (
  'lisbon',
  'Barrio Latino',
  'Edifício 78, Santos, R. da Cintura do Porto de Lisboa Armazem i, 1200-109 Lisboa, Portugal',
  'https://www.google.com/maps/place/Barrio+Latino/@38.7057939,-9.1904156,13z/data=!4m10!1m2!2m1!1skizomba+salsa+Lisbon!3m6!1s0xd193484e7c86f7b:0x1463b7ecbacf51b!8m2!3d38.7057939!4d-9.1553967!15sChRraXpvbWJhIHNhbHNhIExpc2JvbloWIhRraXpvbWJhIHNhbHNhIGxpc2JvbpIBCmRhbmNlX2NsdWKaASNDaFpEU1VoTk1HOW5TMFZKUTBGblNVTXRlWFJZTFVsbkVBReABAPoBBAhPEDg!16s%2Fg%2F11bxb9qhyr?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  '+351 937 284 559',
  'https://www.facebook.com/BarrioLatinoPT/',
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check the map said Closed, opening Friday at 11 PM. Tuesday, Wednesday, and Thursday the door stays shut.',
  'operating'
);

insert into public.venue_dances (venue_id, dance)
values
  ((select id from public.venues where capital_id = 'lisbon'), 'bachata'),
  ((select id from public.venues where capital_id = 'lisbon'), 'kizomba'),
  ((select id from public.venues where capital_id = 'lisbon'), 'salsa');

insert into public.venue_hours (venue_id, weekday, hours_text)
values
  ((select id from public.venues where capital_id = 'lisbon'), 1, '12–6 AM'),
  ((select id from public.venues where capital_id = 'lisbon'), 2, 'Closed'),
  ((select id from public.venues where capital_id = 'lisbon'), 3, 'Closed'),
  ((select id from public.venues where capital_id = 'lisbon'), 4, 'Closed'),
  ((select id from public.venues where capital_id = 'lisbon'), 5, '11 PM–12 AM'),
  ((select id from public.venues where capital_id = 'lisbon'), 6, '12–6 AM, 11 PM–12 AM'),
  ((select id from public.venues where capital_id = 'lisbon'), 0, '12–6 AM, 11 PM–12 AM');

commit;
