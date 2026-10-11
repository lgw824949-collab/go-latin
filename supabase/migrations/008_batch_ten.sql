-- First batch of 10 capitals. Run this file once.
-- Do not run 006 or 007. Do not re-run seed.sql.
-- Safe to run again: a capital that already has a bar is skipped.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
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
where not exists (
  select 1 from public.venues where capital_id = 'paris'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'paris'
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
    (2::smallint, '6:45 PM–1 AM'),
    (3::smallint, 'Closed'),
    (4::smallint, 'Closed'),
    (5::smallint, 'Closed'),
    (6::smallint, 'Closed')
) as h(weekday, hours_text)
where v.capital_id = 'paris'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

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
cross join (values ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
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
    (0::smallint, 'Closed'),
    (1::smallint, '6:30 PM–12 AM'),
    (2::smallint, '6:30 PM–12 AM'),
    (3::smallint, '6:30 PM–12 AM'),
    (4::smallint, '6:30 PM–12 AM'),
    (5::smallint, '6:30 PM–2 AM'),
    (6::smallint, '6:30 PM–2 AM')
) as h(weekday, hours_text)
where v.capital_id = 'dakar'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'mexico_city',
  'El Babalú',
  'C. Río Lerma 218, Cuauhtémoc, 06500 Ciudad de México, CDMX, Mexico',
  'https://www.google.com/maps/place/El+Babal%C3%BA/@19.4271905,-99.2064621,13z/data=!4m10!1m2!2m1!1ssalsa+nightclub+Mexico+City!3m6!1s0x85d1ff97ad161de9:0x988e98e55303b3e1!8m2!3d19.4271905!4d-99.1714432!15sChtzYWxzYSBuaWdodGNsdWIgTWV4aWNvIENpdHlaHSIbc2Fsc2EgbmlnaHRjbHViIG1leGljbyBjaXR5kgEKbmlnaHRfY2x1YpoBJENoZERTVWhOTUc5blMwVkpRMEZuU1VSNk5YRnlkMnRCUlJBQuABAPoBBAgTEDg!16s%2Fg%2F11gh6tlbny?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  '+52 55 7447 3610',
  null,
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check, about 8:40 AM Mexico City time, the map said Open, closing at 2 AM. Review topics name salsa and bachata. No kizomba topic. Google has no website.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'mexico_city'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'mexico_city'
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
    (2::smallint, '8 AM–2 AM'),
    (3::smallint, '7:30 AM–12 AM'),
    (4::smallint, '12:30–2 AM, 8:30 PM–3 AM'),
    (5::smallint, '8:30 PM–3 AM'),
    (6::smallint, '8:30 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'mexico_city'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'washington',
  'Cafe Citron',
  '1343 Connecticut Ave NW, Washington, DC 20036, United States',
  'https://www.google.com/maps/place/Cafe+Citron/@38.9084154,-78.1630423,8z/data=!4m10!1m2!2m1!1ssalsa+bachata+kizomba+Washington+DC!3m6!1s0x89b7b7c7a10f2947:0x213ff111dfaac0a2!8m2!3d38.9084154!4d-77.0424368!15sCiNzYWxzYSBiYWNoYXRhIGtpem9tYmEgV2FzaGluZ3RvbiBEQ1olIiNzYWxzYSBiYWNoYXRhIGtpem9tYmEgd2FzaGluZ3RvbiBkY5IBA2JhcpoBI0NoWkRTVWhOTUc5blMwVkpRMEZuU1VSVU1tSlhRMDlSRUFF4AEA-gEECBIQTA!16s%2Fg%2F1th0nsy6?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  '+1 202-422-3005',
  'http://www.cafecitrondc.com/',
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check, about 10:40 AM Washington time, the map said Closed, opening Wednesday at 7:30 PM. Sunday, Monday, and Tuesday the door stays shut. Google says the business updated the hours 11 weeks ago. Review topics name bachata and salsa classes. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'washington'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'washington'
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
    (3::smallint, '7:30 PM–2 AM'),
    (4::smallint, '7 PM–2 AM'),
    (5::smallint, '7 PM–3 AM'),
    (6::smallint, '6:30 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'washington'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'bogota',
  'Sandunguera The temple of classical salsa',
  'Cl. 64 #13-52, Chapinero, Bogotá, Cundinamarca, Colombia',
  'https://www.google.com/maps/place/Sandunguera+The+temple+of+classical+salsa/@4.6513286,-74.1338538,12z/data=!4m10!1m2!2m1!1ssalsa+bachata+kizomba+Bogot%C3%A1!3m6!1s0x8e3f9a2f4a932891:0x529a9865191c422!8m2!3d4.6513286!4d-74.063816!15sCh1zYWxzYSBiYWNoYXRhIGtpem9tYmEgQm9nb3TDoVofIh1zYWxzYSBiYWNoYXRhIGtpem9tYmEgYm9nb3TDoZIBBWRpc2NvmgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVU5hWnpkdE5HSlJFQUXgAQD6AQQIABBK!16s%2Fg%2F1ptz2vs_x?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  '+57 317 6392533',
  'http://sandunguera.epizy.com/',
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check the map said Closed, opening Thursday at 6 PM. Sunday, Monday, Tuesday, and Wednesday the door stays shut. Review topics name salsa. No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'bogota'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'bogota'
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
    (4::smallint, '6 PM–5 AM'),
    (5::smallint, '6 PM–5 AM'),
    (6::smallint, '6 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'bogota'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'buenos_aires',
  'La Salsera',
  'Yatay 961, C1184ADQ Cdad. Autónoma de Buenos Aires, Argentina',
  'https://www.google.com/maps/place/La+Salsera/@-34.6003721,-76.3578482,4z/data=!4m10!1m2!2m1!1ssalsa+nightclub+Buenos+Aires!3m6!1s0x95bcca7aaf1b5129:0xaa4bf7635851a4d0!8m2!3d-34.6003721!4d-58.4281607!15sChxzYWxzYSBuaWdodGNsdWIgQnVlbm9zIEFpcmVzWh4iHHNhbHNhIG5pZ2h0Y2x1YiBidWVub3MgYWlyZXOSAQ9kYW5jZV9wYXZpbGxpb26aASNDaFpEU1VoTk1HOW5TMFZKUTBGblNVUXhNa3g2Y0VkbkVBReABAPoBBAheEDI!16s%2Fg%2F1tdx0r41?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  '+54 11 3372-0000',
  'http://lasalsera.com/',
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check, about 11:40 AM Buenos Aires time, the map said Closed, opening at 8 PM. Review topics name salsa and bachata. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'buenos_aires'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'buenos_aires'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '8–11:30 PM'),
    (1::smallint, '8–10 PM'),
    (2::smallint, '8–10 PM'),
    (3::smallint, '8–10 PM'),
    (4::smallint, '8 PM–5 AM'),
    (5::smallint, '7 PM–4 AM'),
    (6::smallint, '8 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'buenos_aires'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'lima',
  'Son de Cuba',
  'Pje. San Ramón 277, Miraflores 15074, Peru',
  'https://www.google.com/maps/place/Son+de+Cuba/@-12.0672166,-77.0532155,12z/data=!4m10!1m2!2m1!1ssalsa+nightclub+Lima+Peru!3m6!1s0x9105c81858cdee95:0x2e5942645ff275ab!8m2!3d-12.1216667!4d-77.0316667!15sChlzYWxzYSBuaWdodGNsdWIgTGltYSBQZXJ1WhsiGXNhbHNhIG5pZ2h0Y2x1YiBsaW1hIHBlcnWSAQpkYW5jZV9jbHVimgEkQ2hkRFNVaE5NRzluUzBWSlEwRm5TVVF6TUV0MllYZDNSUkFC4AEA-gEECAAQPg!16s%2Fg%2F1tmbx5cd?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+51 1 3731916',
  'https://www.facebook.com/sondecubarestaurante',
  'google_maps',
  '2026-09-30',
  'On the Tuesday evening of that check, about 7 PM Lima time, the map said Open, closing at 2 AM. Google labels the place a dance club. Review topics name salsa. No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'lima'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'lima'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '5 PM–2 AM'),
    (1::smallint, '5 PM–2 AM'),
    (2::smallint, '5 PM–2 AM'),
    (3::smallint, '5 PM–2 AM'),
    (4::smallint, '5 PM–2 AM'),
    (5::smallint, '5 PM–4 AM'),
    (6::smallint, '5 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'lima'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

commit;
