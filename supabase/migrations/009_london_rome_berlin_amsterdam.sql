-- London, Rome, Berlin, Amsterdam. Run this file once.
-- Do not re-run seed.sql. Do not run 006 or 007.
-- Safe to run again: a capital that already has a bar is skipped.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'london',
  'La Pollera Colora',
  '4-6 London Bridge St, London SE1 9SG, United Kingdom',
  'https://www.google.com/maps/place/La+Pollera+Colora/@51.5054504,-0.0885496,17z/data=!3m1!4b1!4m6!3m5!1s0x48760350b056812d:0x3142c10788e6b66c!8m2!3d51.5054504!4d-0.0885496!16s%2Fg%2F1tdw7jcf?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+44 20 3355 3684',
  'http://www.lapolleracolora.com/',
  'google_maps',
  '2026-09-30',
  'Night club. On Wednesday 30 Sep 2026, early morning London time, the map said Closed, opening at 10 PM Thursday. Wednesday the door stays shut. Review topics: salsa dancing 22, bachata 9. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'london'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'london'
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
    (4::smallint, '10 PM–3 AM'),
    (5::smallint, '10 PM–3 AM'),
    (6::smallint, '10 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'london'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'rome',
  'Los Compadres',
  'Via degli Ausoni, 84, 00185 Roma RM, Italy',
  'https://www.google.com/maps/place/Los+Compadres/@41.8964955,12.5183979,17z/data=!3m1!4b1!4m6!3m5!1s0x132f61852bb4ac61:0x9e5993f2ee170f83!8m2!3d41.8964955!4d12.5183979!16s%2Fg%2F11css_znlm?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+39 339 666 1040',
  null,
  'google_maps',
  '2026-09-30',
  'Dance hall. On Wednesday 30 Sep 2026 the map said Closed, opening at 10 PM Friday. Friday and Saturday the door is open. Review topics name salsa (9). No bachata or kizomba topic. Google has no website.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'rome'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'rome'
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
    (5::smallint, '10 PM–4 AM'),
    (6::smallint, '11 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'rome'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'berlin',
  'Havanna',
  'Hauptstraße 30, 10827 Berlin-Bezirk Tempelhof-Schöneberg, Germany',
  'https://www.google.com/maps/place/Havanna/@52.485115,13.353549,17z/data=!3m1!4b1!4m6!3m5!1s0x47a85041b6302bc7:0x6493424658fe5283!8m2!3d52.485115!4d13.353549!16s%2Fg%2F1tg4kdx0?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+49 30 78899655',
  'https://www.havanna-berlin.de/',
  'google_maps',
  '2026-09-30',
  'Disco club. On Wednesday 30 Sep 2026, early morning Berlin time, the map said Closed, opening at 7 PM. Review topics: salsa 81, bachata 12. No kizomba. Saturday 3 Oct 2026 is German Unity Day, and Google says those hours might differ.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'berlin'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'berlin'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12–8 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, '7 PM–12 AM'),
    (4::smallint, 'Closed'),
    (5::smallint, '10 PM–12 AM'),
    (6::smallint, '12–7 AM, 10 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'berlin'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'amsterdam',
  'El Punto Latino',
  'Lange Leidsedwarsstraat 35, 1017 NG Amsterdam, Netherlands',
  'https://www.google.com/maps/place/El+Punto+Latino/@52.3641667,4.8844444,17z/data=!3m1!4b1!4m6!3m5!1s0x47c609e9016e06e3:0x15a1d4cb9cc165ed!8m2!3d52.3641667!4d4.8844444!16s%2Fg%2F1tfp1nky?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+31 6 15463516',
  'http://elpuntolatinoams.nl/',
  'google_maps',
  '2026-09-30',
  'Disco club. On Tuesday night, 30 Sep 2026, the map said Open, closing at 4 AM. Review topics name bachata (12). No salsa or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'amsterdam'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance)) as d(dance)
where v.capital_id = 'amsterdam'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '10 PM–4 AM'),
    (1::smallint, '10 PM–4 AM'),
    (2::smallint, '10 PM–4 AM'),
    (3::smallint, '10 PM–4 AM'),
    (4::smallint, '10 PM–4 AM'),
    (5::smallint, '10 PM–5 AM'),
    (6::smallint, '10 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'amsterdam'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

commit;
