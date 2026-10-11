-- Verified bars since 009. Run this file once.
-- Do not re-run seed.sql.
-- Safe to run again: a capital that already has a bar is skipped.
-- Capitals with no verified bar are not in this file.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'brussels',
  'Salsa Bar Cartagena',
  'Rue du Marché au Charbon 70, 1000 Bruxelles, Belgium',
  'https://www.google.com/maps/place/Salsa+Bar+Cartagena/@50.8459791,4.3485548,17z/data=!3m1!4b1!4m6!3m5!1s0x47c3c47850ce2691:0x146ca8ec7c6d04f3!8m2!3d50.8459791!4d4.3485548!16s%2Fg%2F1tf39pxb?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+32 2 808 73 22',
  'https://www.privateaser.com/lieu/46623-cartagena-salsa-bar',
  'google_maps',
  '2026-09-30',
  'Bar. On Wednesday 30 Sep 2026, early morning Brussels time, the map said Closed, opening at 6 PM. Google says the business updated these hours 9 weeks ago. Review topics: salsa classes 10, bachata 9. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'brussels'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'brussels'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12–6 AM, 6 PM–12 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, '6 PM–12 AM'),
    (4::smallint, '12–4 AM, 6 PM–12 AM'),
    (5::smallint, '12–4 AM, 6 PM–12 AM'),
    (6::smallint, '12–6 AM, 6 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'brussels'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'vienna',
  'Danzon',
  'Johannesgasse 3, 1010 Wien, Austria',
  'https://www.google.com/maps/place/Danzon/@48.2053122,16.3715212,17z/data=!3m1!4b1!4m6!3m5!1s0x476d079e9e1f9257:0xc916a5de83235d6a!8m2!3d48.2053122!4d16.3715212!16s%2Fg%2F11b6vc6qhx?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+43 676 5505840',
  'https://www.danzon.club/',
  'google_maps',
  '2026-09-30',
  'Dance hall. On Wednesday 30 Sep 2026, early morning Vienna time, the map said Closed, opening at 6 PM. Review topics: salsa 38, bachata 3. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'vienna'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'vienna'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12–6 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, '6 PM–12 AM'),
    (4::smallint, '12–4 AM, 6 PM–12 AM'),
    (5::smallint, '12–4 AM, 6 PM–12 AM'),
    (6::smallint, '12–6 AM, 6 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'vienna'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'prague',
  'La Macumba Music Latino bar',
  'Štefánikova 230/7, 150 00 Praha 5-Anděl, Czechia',
  'https://www.google.com/maps/place/La+Macumba+Music+Latino+bar/@50.0728529,14.4037201,17z/data=!3m1!4b1!4m6!3m5!1s0x470b94f88213dae5:0xed494c91d0fd1632!8m2!3d50.0728529!4d14.4037201!16s%2Fg%2F1pp2x55tq?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+420 776 795 166',
  'http://www.lamacumba.cz/',
  'google_maps',
  '2026-09-30',
  'Dance club. On Wednesday 30 Sep 2026, about 2:45 AM Prague time, the map said it closes soon at 3 AM. Review topics: salsa 110, bachata 57, kizomba 22.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'prague'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'prague'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, 'Closed'),
    (1::smallint, '6 PM–3 AM'),
    (2::smallint, '6 PM–3 AM'),
    (3::smallint, '6 PM–3 AM'),
    (4::smallint, '6 PM–3 AM'),
    (5::smallint, '6 PM–4 AM'),
    (6::smallint, '6 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'prague'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'warsaw',
  'Dos Mundos',
  'Al. Jerozolimskie 123A, 02-017 Warszawa, Poland',
  'https://www.google.com/maps/place/Dos+Mundos/@52.2247441,20.9912153,17z/data=!3m1!4b1!4m6!3m5!1s0x471ecc912d0d95b9:0x146c911302a47633!8m2!3d52.2247441!4d20.9912153!16s%2Fg%2F11g8f7pqxx?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  null,
  'https://www.akademiatanca.com.pl/dos-mundos/',
  'google_maps',
  '2026-09-30',
  'Dance club. On Wednesday 30 Sep 2026 the map said Closed, opening at 10:15 PM Friday. Review topics: salsa 45, bachata 41, kizomba 32. Google has no phone number for this place.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'warsaw'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'warsaw'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, 'Closed'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, 'Closed'),
    (4::smallint, 'Closed'),
    (5::smallint, '10:15 PM–12 AM'),
    (6::smallint, '12:15–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'warsaw'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'budapest',
  'El Cañonazo de la Habana',
  'Budapest, Ó u. 24-26, 1066 Hungary',
  'https://www.google.com/maps/place/El+Ca%C3%B1onazo+de+la+Habana/@47.5041288,19.0579591,17z/data=!3m1!4b1!4m6!3m5!1s0x4741dc12c728282f:0x46e517b2bdbc423a!8m2!3d47.5041288!4d19.0579591!16s%2Fg%2F11gbk4_g3z?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+36 30 251 3733',
  null,
  'google_maps',
  '2026-09-30',
  'Cuban restaurant. On Wednesday 30 Sep 2026, early morning Budapest time, the map said Closed, opening at 5:30 PM. Review topics: salsa dancing 8, bachata dancing 3. No kizomba topic. Google has no website.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'budapest'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'budapest'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, 'Closed'),
    (1::smallint, 'Closed'),
    (2::smallint, '5:30 PM–12 AM'),
    (3::smallint, '5:30 PM–12 AM'),
    (4::smallint, '5:30 PM–12 AM'),
    (5::smallint, '5:30 PM–1 AM'),
    (6::smallint, '5:30 PM–1 AM')
) as h(weekday, hours_text)
where v.capital_id = 'budapest'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'athens',
  'FELICES AT TROPICANA LATIN BAR ATHENS',
  'Evelpidon 4, Athina 114 74, Greece',
  'https://www.google.com/maps/place/FELICES+AT+TROPICANA+LATIN+BAR+ATHENS/@37.9953353,23.7401563,17z/data=!3m1!4b1!4m6!3m5!1s0x14a1a330067f80c9:0xb809d30bd103e6a2!8m2!3d37.9953353!4d23.7401563!16s%2Fg%2F11t0vy7mn5?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+30 697 979 1065',
  'https://instagram.com/tropicanalatinbar?igshid=YmMyMTA2M2Y=',
  'google_maps',
  '2026-09-30',
  'Bar. On Wednesday 30 Sep 2026 the map said Closed, opening at 10:30 PM Saturday. Saturday the door is open. The other days the door stays shut. Review topics: bachata 12, salsa bachata party 4. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'athens'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'athens'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, 'Closed'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, 'Closed'),
    (4::smallint, 'Closed'),
    (5::smallint, 'Closed'),
    (6::smallint, '10:30 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'athens'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'singapore',
  'Cuba Libre Café & Bar',
  '3E River Valley Rd 01-03/04 @, Clarke Quay, The Circuit, Singapore 179024',
  'https://www.google.com/maps/place/Cuba+Libre+Caf%C3%A9+%26+Bar/@1.290247,103.8464495,17z/data=!3m1!4b1!4m6!3m5!1s0x31da19a0305e11af:0xa8ef9d178c8d9093!8m2!3d1.290247!4d103.8464495!16s%2Fg%2F1w10_qg6?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+65 8418 0203',
  'https://cubalibre.asia/',
  'google_maps',
  '2026-09-30',
  'Cuban restaurant. On Wednesday 30 Sep 2026 the map said Closed, opening at 5 PM. Review topics name bachata (6). No salsa or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'singapore'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance)) as d(dance)
where v.capital_id = 'singapore'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '5:30 PM–3 AM'),
    (1::smallint, '5 PM–3 AM'),
    (2::smallint, '5 PM–3 AM'),
    (3::smallint, '5 PM–3 AM'),
    (4::smallint, '5 PM–3 AM'),
    (5::smallint, '5 PM–3 AM'),
    (6::smallint, '5 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'singapore'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'santiago',
  'Club Orixas',
  'Tarapacá 755, 8330170 Santiago, Región Metropolitana, Chile',
  'https://www.google.com/maps/place/Club+Orixas/@-33.4464674,-70.6464441,17z/data=!3m1!4b1!4m6!3m5!1s0x9662c50ab878a0ff:0x1bbd01276b7ca702!8m2!3d-33.4464674!4d-70.6464441!16s%2Fg%2F1tkp0zzt?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+56 2 2638 0561',
  null,
  'google_maps',
  '2026-09-30',
  'Night club. On Tuesday night, 30 Sep 2026 Santiago time, the map said Open, closing at 2:30 AM. Review topics: bachata 119, cuban salsa 53, salsa club 16. No kizomba topic. Google has no website.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'santiago'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'santiago'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, 'Closed'),
    (1::smallint, 'Closed'),
    (2::smallint, '7:30 PM–2:30 AM'),
    (3::smallint, '7:30 PM–2:30 AM'),
    (4::smallint, '7 PM–3 AM'),
    (5::smallint, '7:30 PM–4 AM'),
    (6::smallint, '7:30 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'santiago'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'montevideo',
  'La Bodeguita del Sur',
  'Soriano 840, 11100 Montevideo, Departamento de Montevideo, Uruguay',
  'https://www.google.com/maps/place/La+Bodeguita+del+Sur/@-34.9084328,-56.198165,17z/data=!3m1!4b1!4m6!3m5!1s0x959f81d4a87a3921:0xb8c19665ac4aefe4!8m2!3d-34.9084328!4d-56.198165!16s%2Fg%2F1tcxkyq3?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+598 99 009 465',
  null,
  'google_maps',
  '2026-09-30',
  'Night club. On Tuesday night, 30 Sep 2026 Montevideo time, the map said Closed, opening at 11:30 PM Friday. Review topics: bachata 19, dancing salsa 9, salsa 3. No kizomba topic. Google has no website.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'montevideo'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'montevideo'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, 'Closed'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, 'Closed'),
    (4::smallint, 'Closed'),
    (5::smallint, '11:30 PM–4 AM'),
    (6::smallint, '10 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'montevideo'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'quito',
  'Lavoe Salsa Danceclub',
  '170135 Quito, Ecuador',
  'https://www.google.com/maps/place/Lavoe+Salsa+Danceclub/@-0.1747557,-78.48723,17z/data=!3m1!4b1!4m6!3m5!1s0x91d59a8fee42805d:0xd0d2dfb16a2a44bc!8m2!3d-0.1747557!4d-78.48723!16s%2Fg%2F1pp2x7px9?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+593 96 400 4478',
  'https://lavoe.ec/',
  'google_maps',
  '2026-09-30',
  'Disco club. On Tuesday evening, 30 Sep 2026 Quito time, the map said it closes soon at 9 PM and opens Wednesday at 6 PM. Review topics: bachata 103, salsa 95, kizomba dancing 11. Google''s address is the postal code only, with no street.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'quito'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'quito'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '3–8 PM'),
    (1::smallint, '6–9 PM'),
    (2::smallint, '6–9 PM'),
    (3::smallint, '6 PM–2 AM'),
    (4::smallint, '6 PM–2 AM'),
    (5::smallint, '9 PM–3 AM'),
    (6::smallint, '2–6 PM, 7 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'quito'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

commit;
