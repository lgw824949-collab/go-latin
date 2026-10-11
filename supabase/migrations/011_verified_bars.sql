-- Verified bars since 010. Run this file once.
-- Do not re-run seed.sql.
-- Safe to run again: a capital that already has a bar is skipped.
-- Capitals with no verified bar are not in this file.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'wellington',
  'El Barrio',
  '35 Dixon Street, Te Aro, Wellington 6011, New Zealand',
  'https://www.google.com/maps/place/El+Barrio/@-41.2921237,174.777502,17z/data=!3m1!4b1!4m6!3m5!1s0x6d38af2bf91b96a5:0xff7466a7ff60f930!8m2!3d-41.2921237!4d174.777502!16s%2Fg%2F11flbry4jb?hl=en',
  '+64 4 333 0261',
  'https://www.elbarrio.nz/',
  'google_maps',
  '2026-09-30',
  'Topic bachata 2. A review mentions Tuesday salsa, which is not a topic chip. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'wellington'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance)) as d(dance)
where v.capital_id = 'wellington'
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
    (2::smallint, '5 PM–1 AM'),
    (3::smallint, '5 PM–1 AM'),
    (4::smallint, '5 PM–1 AM'),
    (5::smallint, '5 PM–4 AM'),
    (6::smallint, '5 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'wellington'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'caracas',
  'Bar de Morales',
  '1010, Distrito Capital, Venezuela',
  'https://www.google.com/maps/place/Bar+de+Morales/@10.5156213,-66.9247842,17z/data=!3m1!4b1!4m6!3m5!1s0x8c2a5fc14c572a6b:0xe0d557fce2c5c69c!8m2!3d10.5156213!4d-66.9247842!16s%2Fg%2F11hzy6vl_m?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  null,
  null,
  'google_maps',
  '2026-09-30',
  'Google category is Salsa bar. Phone and website not listed. No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'caracas'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'caracas'
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
    (1::smallint, '12–6 AM'),
    (2::smallint, 'Closed'),
    (3::smallint, 'Closed'),
    (4::smallint, '6 PM–12 AM'),
    (5::smallint, '12–6 AM, 6 PM–12 AM'),
    (6::smallint, '12–6 AM, 6 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'caracas'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'santo_domingo',
  'El Sartén',
  'C. Hostos 153, Santo Domingo 10210, Dominican Republic',
  'https://www.google.com/maps/place/El+Sart%C3%A9n/@18.4625,-69.9361,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Santo+Domingo!3m6!1s0x8eaf883da28934a5:0x162417444e81c0d6!8m2!3d18.4728605!4d-69.8851418!15sChdzYWxzYSBiYXIgU2FudG8gRG9taW5nb1oZIhdzYWxzYSBiYXIgc2FudG8gZG9taW5nb5IBA2JhcpoBI0NoWkRTVWhOTUc5blMwVkpRMEZuVFVSM09FeFFUbEJSRUFF4AEA-gEECAAQKg!16s%2Fg%2F1tn028p9?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+1 829-763-6888',
  'https://www.facebook.com/elsartenRD',
  'google_maps',
  '2026-09-30',
  'Bar. Topic bachata 15. Merengue is not listed. A review mentions salsa, which is not a topic chip.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'santo_domingo'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance)) as d(dance)
where v.capital_id = 'santo_domingo'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '6 PM–2 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, '7 PM–2 AM'),
    (4::smallint, '7 PM–2 AM'),
    (5::smallint, '7 PM–3 AM'),
    (6::smallint, '7 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'santo_domingo'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'san_jose',
  'Salsa 54',
  'Calle 3 Avenida, San José, El Carmen, 10101, Costa Rica',
  'https://www.google.com/maps/place/Salsa+54/@9.9327,-84.0796,12z/data=!3m1!5s0x8fa0e3611bbc59fb:0xf6a931d5836fb463!4m10!1m2!2m1!1ssalsa+bar+San+Jos%C3%A9+Costa+Rica!3m6!1s0x8fa0e3a59dd37fbd:0x620235059976bb5b!8m2!3d9.9352922!4d-84.077202!15sCh5zYWxzYSBiYXIgU2FuIEpvc8OpIENvc3RhIFJpY2FaICIec2Fsc2EgYmFyIHNhbiBqb3PDqSBjb3N0YSByaWNhkgEJc2Fsc2FfYmFymgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVVJLYWkxaGRHRm5FQUXgAQD6AQQIABAX!16s%2Fg%2F11hzyh6tsz?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+506 2233 3814',
  'https://www.facebook.com/Salsa54discotheque',
  'google_maps',
  '2026-09-30',
  'Google category is Salsa bar. Topics are dance and place to dance. No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'san_jose'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'san_jose'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '2 PM–5 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, 'Closed'),
    (4::smallint, '5 PM–5 AM'),
    (5::smallint, '5 PM–5 AM'),
    (6::smallint, '5 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'san_jose'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'ottawa',
  'RAHIM SALSA FRIDAY',
  '275 Elgin St, Ottawa, ON K2P 0H8, Canada',
  'https://www.google.com/maps/place/RAHIM+SALSA+FRIDAY/@45.4247,-75.695,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Ottawa!3m6!1s0x4cce05a940f8a083:0xc16c7d1c1ed79263!8m2!3d45.4177003!4d-75.6897964!15sChBzYWxzYSBiYXIgT3R0YXdhWhIiEHNhbHNhIGJhciBvdHRhd2GSAQpkYW5jZV9oYWxsmgEkQ2hkRFNVaE5NRzluUzBWSmNXOXljamRZZG5RMmREaFJSUkFC4AEA-gEECAAQRA!16s%2Fg%2F11b6hsq3hy?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+1 613-295-5038',
  'https://www.rahimsalsa.com/',
  'google_maps',
  '2026-09-30',
  'Dance hall. Topics salsa dancing 14, bachata 8. Wednesday is National Day for Truth and Reconciliation and Google says hours might differ. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'ottawa'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'ottawa'
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
    (3::smallint, '7 PM–11 PM'),
    (4::smallint, 'Closed'),
    (5::smallint, '7:30 PM–12:30 AM'),
    (6::smallint, 'Closed')
) as h(weekday, hours_text)
where v.capital_id = 'ottawa'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'managua',
  'Swing Latino''s',
  '5Q29+Q6J, Managua 11012, Nicaragua',
  'https://www.google.com/maps/place/Swing+Latino''s/@12.1547,-86.2737,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Managua!3m6!1s0x8f73fd6b83317c85:0xd37f70a1b5859e79!8m2!3d12.1519718!4d-86.2319859!15sChFzYWxzYSBiYXIgTWFuYWd1YZIBBWRpc2Nv4AEA!16s%2Fg%2F11fqzmj58m?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  null,
  null,
  'google_maps',
  '2026-09-30',
  'Disco club. Topic salsa 2. No bachata or kizomba topic. Phone and website not listed.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'managua'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'managua'
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
    (4::smallint, '8:30 PM–12 AM'),
    (5::smallint, '8 PM–12 AM'),
    (6::smallint, '8 AM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'managua'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'kingston',
  'Club Cubana',
  '75 Hope Rd, Kingston, Jamaica',
  'https://www.google.com/maps/place/Club+Cubana/@17.9714,-76.7931,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Kingston+Jamaica!3m6!1s0x8edb3f0a265a5bdd:0xeb8f4c15a1b788b7!8m2!3d18.0195879!4d-76.7775369!15sChpzYWxzYSBiYXIgS2luZ3N0b24gSmFtYWljYVocIhpzYWxzYSBiYXIga2luZ3N0b24gamFtYWljYZIBA2JhcpoBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQyMUdNMWRWZEhaUlZsSnFURlZvVjA5Rk5ETk9SRlpZVXpKMFZsTXlZeEFC4AEA-gEECAAQNg!16s%2Fg%2F11t1b5h833?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+1 876-631-7777',
  null,
  'google_maps',
  '2026-09-30',
  'Bar. Topic salsa dancing 9. Salsa lessons chip is not a dance. No bachata or kizomba topic. Website not listed.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'kingston'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'kingston'
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
    (2::smallint, '11 AM–12 AM'),
    (3::smallint, '11 AM–12 AM'),
    (4::smallint, '11 AM–12 AM'),
    (5::smallint, '11 AM–2:30 AM'),
    (6::smallint, '7 PM–2:30 AM')
) as h(weekday, hours_text)
where v.capital_id = 'kingston'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'sao_tome',
  'Discoteca Kizomba',
  '8PVF+958, Rua Padre Martinho Pinto da Rocha, Rua do Padre Martinho Pinto da Rocha, São Tomé, Rua do Padre Martinho Pinto da Rocha, São Tomé, São Tomé & Príncipe',
  'https://www.google.com/maps/place/Discoteca+Kizomba/@0.3375,6.7283,13z/data=!4m6!3m5!1s0x10766a5ca6a1bad5:0x2a0f5573562d9b6a!8m2!3d0.3434195!4d6.7229558!16s%2Fg%2F11dd_r6cgv?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  null,
  null,
  'google_maps',
  '2026-09-30',
  'Disco club. Topic kizomba 2. No salsa or bachata topic. Phone and website not listed.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'sao_tome'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('kizomba'::public.dance)) as d(dance)
where v.capital_id = 'sao_tome'
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
    (3::smallint, 'Open 24 hours'),
    (4::smallint, 'Closed'),
    (5::smallint, 'Open 24 hours'),
    (6::smallint, 'Open 24 hours')
) as h(weekday, hours_text)
where v.capital_id = 'sao_tome'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'porto_novo',
  'BAR LE ZOUGLOU',
  'Bd Tokpota 2, Porto-Novo, Benin',
  'https://www.google.com/maps/place/BAR+LE+ZOUGLOU/@6.4891201,2.5249429,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Porto-Novo!3m6!1s0x103b517b01485b1d:0xe6eabd74957a72d9!8m2!3d6.4891201!4d2.6011606!15sChRzYWxzYSBiYXIgUG9ydG8tTm92b1oWIhRzYWxzYSBiYXIgcG9ydG8gbm92b5IBCXNhbHNhX2JhcuABAA!16s%2Fg%2F11j9pshnwn?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+229 97079066',
  null,
  'google_maps',
  '2026-09-30',
  'Google category is Salsa bar. Open 24 hours. No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'porto_novo'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'porto_novo'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, 'Open 24 hours'),
    (1::smallint, 'Open 24 hours'),
    (2::smallint, 'Open 24 hours'),
    (3::smallint, 'Open 24 hours'),
    (4::smallint, 'Open 24 hours'),
    (5::smallint, 'Open 24 hours'),
    (6::smallint, 'Open 24 hours')
) as h(weekday, hours_text)
where v.capital_id = 'porto_novo'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'kigali',
  'Chillax Lounge',
  'KG 13 Ave, Kigali, Rwanda',
  'https://www.google.com/maps/place/Chillax+Lounge/@-1.9430715,30.0235738,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Kigali!3m6!1s0x19dca6e8609a702b:0x694f886bf92052f!8m2!3d-1.9430715!4d30.0997915!15sChBzYWxzYSBiYXIgS2lnYWxpWhIiEHNhbHNhIGJhciBraWdhbGmSAQZsb3VuZ2WaASRDaGREU1VoTk1HOW5TMFZKUTBGblNVUjRhbGxxVFd4blJSQULgAQD6AQQIABAn!16s%2Fg%2F11cmyzrn5w?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+250 738 858 888',
  null,
  'google_maps',
  '2026-09-30',
  'Lounge bar. Review topics name salsa night (2). No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'kigali'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'kigali'
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
    (1::smallint, 'Closed'),
    (2::smallint, '5 PM–1 AM'),
    (3::smallint, '5 PM–1 AM'),
    (4::smallint, '5 PM–1 AM'),
    (5::smallint, '5 PM–1 AM'),
    (6::smallint, '5 PM–2 AM')
) as h(weekday, hours_text)
where v.capital_id = 'kigali'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'abuja',
  'Barracuda Resto Pub',
  '111 Adetokunbo Ademola Cres, Wuse, Abuja 904101, Federal Capital Territory, Nigeria',
  'https://www.google.com/maps/place/Barracuda+Resto+Pub/@9.0726035,7.32325,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Abuja!3m6!1s0x104e0ba40485c389:0x3c0ca2b0325e45f7!8m2!3d9.0726035!4d7.4756853!15sCg9zYWxzYSBiYXIgQWJ1amFaESIPc2Fsc2EgYmFyIGFidWphkgEDYmFymgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVVF0TTBsRFVscFJFQUXgAQD6AQQIABBA!16s%2Fg%2F11qqx80k2x?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+234 912 235 6336',
  null,
  'google_maps',
  '2026-09-30',
  'Bar in Wuse, Abuja. Review topics name salsa (67) and salsa nights (7). No bachata or kizomba topic. Thursday is Nigerian Independence Day and Google says hours might differ.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'abuja'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'abuja'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12 PM–12 AM'),
    (1::smallint, '10 AM–12 AM'),
    (2::smallint, '10 AM–12 AM'),
    (3::smallint, '10 AM–12 AM'),
    (4::smallint, '10 AM–12 AM'),
    (5::smallint, '10 AM–12 AM'),
    (6::smallint, '10 AM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'abuja'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'zagreb',
  'Beleza bar',
  'Ulica Grge Tuškana 37, 10000, Zagreb, Croatia',
  'https://www.google.com/maps/place/Beleza+bar/@45.81,15.98,14z/data=!4m6!3m5!1s0x4765d64d42756631:0x3016be8bf6937a3f!8m2!3d45.8100675!4d15.9983785!16s%2Fg%2F1trrbzwy?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+385 1 4660 365',
  null,
  'google_maps',
  '2026-09-30',
  'Bar. Review topics name a bachata event (3). No salsa or kizomba topic. Buena Vista Club has no dance topics and Google says Add hours.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'zagreb'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance)) as d(dance)
where v.capital_id = 'zagreb'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '9 AM–10 PM'),
    (1::smallint, '7:30 AM–10 PM'),
    (2::smallint, '7:30 AM–10 PM'),
    (3::smallint, '7:30 AM–10 PM'),
    (4::smallint, '7:30 AM–10 PM'),
    (5::smallint, '7:30 AM–10 PM'),
    (6::smallint, '9 AM–10 PM')
) as h(weekday, hours_text)
where v.capital_id = 'zagreb'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'vilnius',
  'Mojitos Casa de Cuba Bar',
  'Totorių g. 11, Vilnius, 01121 Vilniaus m. sav., Lithuania',
  'https://www.google.com/maps/place/Mojitos+Casa+de+Cuba+Bar/@54.69,25.28,15z/data=!4m6!3m5!1s0x46dd941111cee607:0x14ec0d621464659!8m2!3d54.684909!4d25.2822145!16s%2Fg%2F11bccm0951?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+370 654 77575',
  null,
  'google_maps',
  '2026-09-30',
  'Bar. Review topics: salsa 14, bachata 5. No kizomba topic. Pabo Latino topics are latino music only.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'vilnius'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'vilnius'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12–5 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, 'Closed'),
    (4::smallint, '9 PM–12 AM'),
    (5::smallint, '10 PM–12 AM'),
    (6::smallint, '12–6 AM, 10 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'vilnius'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'tirana',
  'The Bar Velvet',
  '8RC8+9FW, Rruga Vaso Pasha, Tiranë, Albania',
  'https://www.google.com/maps/place/The+Bar+Velvet/@41.33,19.82,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Tirana!3m6!1s0x135031628b8379cd:0x78de22837592b509!8m2!3d41.3209909!4d19.8162007!15sChBzYWxzYSBiYXIgVGlyYW5hWhIiEHNhbHNhIGJhciB0aXJhbmGSAQpuaWdodF9jbHVimgEkQ2hkRFNVaE5NRzluUzBWSllrNTZjMnBSZFY5VVRXaFJSUkFC4AEA-gEECEgQNA!16s%2Fg%2F11hzc8dkf8?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+355 69 991 1753',
  'https://thevelvetbar.lovable.app/',
  'google_maps',
  '2026-09-30',
  'Night club. Review topics: bachata 9, salsa 8. A review mentions kizomba, but kizomba is not a topic chip. Google says Add hours.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'tirana'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'tirana'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'sofia',
  'club *MIXTAPE 5*',
  'Podlez @ Vitamin B, bul. Galeriya, Blvd. "Cherni vrah", 1142 Sofia, Bulgaria',
  'https://www.google.com/maps/place/club+*MIXTAPE+5*/@42.7,23.32,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Sofia!3m6!1s0x40aa8505c2e4228d:0xf07f33a1c892df52!8m2!3d42.6831049!4d23.3210966!15sCg9zYWxzYSBiYXIgU29maWFaESIPc2Fsc2EgYmFyIHNvZmlhkgEFZGlzY2-aAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMnRTWVZWSE1XaE5ibFpUVjBVNE1tVnRPWEZOVmpsU1VXMTRjbUpHUlJBQuABAPoBBAgAEBs!16s%2Fg%2F1vn9ml9c?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+359 87 929 5965',
  'https://www.facebook.com/mixtape5',
  'google_maps',
  '2026-09-30',
  'Disco club. Review topics name salsa parties (29). A review mentions bachata, but bachata is not a topic chip. Google lists no weekly hours.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'sofia'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'sofia'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'riga',
  'Cuba Cafe',
  'Jauniela 15, Centra rajons, Rīga, LV-1050, Latvia',
  'https://www.google.com/maps/place/Cuba+Cafe/@56.95,24.11,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Riga!3m6!1s0x46eecfd73c7ec7ef:0x54c0e0af867ebdf9!8m2!3d56.948923!4d24.1060217!15sCg5zYWxzYSBiYXIgUmlnYVoQIg5zYWxzYSBiYXIgcmlnYZIBDGNvY2t0YWlsX2JhcpoBJENoZERTVWhOTUc5blMwVkpRMEZuU1VSd2NFeHRjelJSUlJBQuABAPoBBAgAEBA!16s%2Fg%2F11dxj0flyp?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+371 67 224 362',
  'http://www.cubacaferiga.com/',
  'google_maps',
  '2026-09-30',
  'Cocktail bar. Review topics name salsa (12). No bachata or kizomba topic. A separate 4–6 PM hour line was ignored.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'riga'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'riga'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12 PM–12 AM'),
    (1::smallint, '12 PM–12 AM'),
    (2::smallint, '12 PM–2 AM'),
    (3::smallint, '12 PM–1 AM'),
    (4::smallint, '12 PM–2 AM'),
    (5::smallint, '12 PM–3 AM'),
    (6::smallint, '12 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'riga'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'oslo',
  'Cafe Sør',
  'Torggata 11, 0181 Oslo, Norway',
  'https://www.google.com/maps/place/Cafe+S%C3%B8r/@59.91,10.75,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Oslo!3m6!1s0x46416e6244d6a8f9:0xdae2b2f8dc6eb06e!8m2!3d59.9141819!4d10.7483536!15sCg5zYWxzYSBiYXIgT3Nsb1oQIg5zYWxzYSBiYXIgb3Nsb5IBC2NvZmZlZV9zaG9wmgEkQ2hkRFNVaE5NRzluUzBWSlEwRm5TVVJHTWpSbWJESjNSUkFC4AEA-gEECAAQPw!16s%2Fg%2F1tggm6yx?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  null,
  'http://www.cafesor.no/',
  'google_maps',
  '2026-09-30',
  'Bar. Review topics name kizomba (9). A review mentions Tuesday salsa and bachata, but those are not topic chips.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'oslo'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('kizomba'::public.dance)) as d(dance)
where v.capital_id = 'oslo'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12 PM–1:30 AM'),
    (1::smallint, '12 PM–1:30 AM'),
    (2::smallint, '12 PM–2:30 AM'),
    (3::smallint, '12 PM–2:30 AM'),
    (4::smallint, '12 PM–2:30 AM'),
    (5::smallint, '12 PM–3:30 AM'),
    (6::smallint, '12 PM–3:30 AM')
) as h(weekday, hours_text)
where v.capital_id = 'oslo'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'moscow',
  'Club Liberty',
  'Slavyanskaya Square, 2/5/4 стр.3, Moscow, Russia, 109074',
  'https://www.google.com/maps/place/Club+Liberty/@55.75,37.62,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Moscow!3m6!1s0x46b54af6391ab319:0x7ab621136bac2665!8m2!3d55.753052!4d37.635141!15sChBzYWxzYSBiYXIgTW9zY293WhIiEHNhbHNhIGJhciBtb3Njb3eSAQ5saXZlX211c2ljX2JhcuABAA!16s%2Fg%2F11cjk88gl6?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+7 985 883-81-85',
  'http://clubliberty.ru/',
  'google_maps',
  '2026-09-30',
  'Live music bar. Review topics: salsa 30, bachata 8. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'moscow'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'moscow'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '12–6 AM, 5 PM–12 AM'),
    (1::smallint, '12 PM–11 PM'),
    (2::smallint, '12 PM–11 PM'),
    (3::smallint, '12 PM–11 PM'),
    (4::smallint, '12 PM–11 PM'),
    (5::smallint, '12 PM–12 AM'),
    (6::smallint, '12–6 AM, 5 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'moscow'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'luxembourg',
  'Brasserie de l''Arrêt (Cubana Café)',
  '365 Rte de Longwy, 1941 Märel Luxembourg',
  'https://www.google.com/maps/place/Brasserie+de+l%27Arr%C3%AAt+(Cubana+Caf%C3%A9)/@49.6033866,6.0158315,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Luxembourg!3m6!1s0x479549500e6e94c7:0x58ffdbcf60b3aff6!8m2!3d49.6033866!4d6.0920492!15sChRzYWxzYSBiYXIgTHV4ZW1ib3VyZ1oWIhRzYWxzYSBiYXIgbHV4ZW1ib3VyZ5IBCnJlc3RhdXJhbnSaASRDaGREU1VoTk1HOW5TMFZKUTBGblNVTnNOWEpQV1hkQlJSQULgAQD6AQQIABBJ!16s%2Fg%2F1tgx0yyw?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+352 26 45 84 59',
  'https://m.facebook.com/profile.php?id=168350416558392',
  'google_maps',
  '2026-09-30',
  'Restaurant in Märel, Luxembourg City. Review topics: salsa night 6, bachata 4. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'luxembourg'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'luxembourg'
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
    (2::smallint, '6 PM–12 AM'),
    (3::smallint, '6 PM–12 AM'),
    (4::smallint, '6 PM–12 AM'),
    (5::smallint, '6 PM–3 AM'),
    (6::smallint, '6 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'luxembourg'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'kyiv',
  'Buena Vista',
  'Velyka Zhytomyrska St, 8/14, Kyiv, Ukraine, 01025',
  'https://www.google.com/maps/place/Buena+Vista/@50.45,30.52,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Kyiv!3m6!1s0x40d4cf20ec3a948f:0x69a9e87605c78366!8m2!3d50.4556007!4d30.5164642!15sCg5zYWxzYSBiYXIgS3lpdloQIg5zYWxzYSBiYXIga3lpdpIBEGN1YmFuX3Jlc3RhdXJhbnSaASRDaGREU1VoTk1HOW5TMFZKUTBGblNVTmFjazE2ZFc1UlJSQULgAQD6AQQIABAa!16s%2Fg%2F11bt_jdxn1?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+380 50 344 4812',
  'https://m.facebook.com/buenavista.kyiv',
  'google_maps',
  '2026-09-30',
  'Bar. Review topics name bachata (9). A review mentions Tuesday salsa, but salsa is not a topic chip. Thursday is Ukraine Defender Day and Google says hours might differ.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'kyiv'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance)) as d(dance)
where v.capital_id = 'kyiv'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '9 AM–10 PM'),
    (1::smallint, '8 AM–10 PM'),
    (2::smallint, '8 AM–10 PM'),
    (3::smallint, '8 AM–10 PM'),
    (4::smallint, '8 AM–10 PM'),
    (5::smallint, '8 AM–10 PM'),
    (6::smallint, '9 AM–10 PM')
) as h(weekday, hours_text)
where v.capital_id = 'kyiv'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'copenhagen',
  'Club Mambo',
  'Vester Voldgade 85, 1552 København, Denmark',
  'https://www.google.com/maps/place/Club+Mambo/@55.68,12.57,13z/data=!3m1!5s0x4652531baabb548f:0xd5154a9c20d82706!4m10!1m2!2m1!1ssalsa+bar+Copenhagen!3m6!1s0x46525312368e9b1b:0x608fee50191fe01a!8m2!3d55.6750278!4d12.5722614!15sChRzYWxzYSBiYXIgQ29wZW5oYWdlbloWIhRzYWxzYSBiYXIgY29wZW5oYWdlbpIBCm5pZ2h0X2NsdWKaASNDaFpEU1VoTk1HOW5TMFZKUTBGblNVUlNhR0pVTVVKM0VBReABAPoBBAgAEEg!16s%2Fg%2F1q6j8f7kx?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+45 33 11 97 66',
  null,
  'google_maps',
  '2026-09-30',
  'Night club. On Wednesday 30 Sep 2026 the map said Closed, opening Friday at 10 PM. Review topics name salsa dancing (8). No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'copenhagen'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'copenhagen'
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
    (5::smallint, '10 PM–5 AM'),
    (6::smallint, '10 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'copenhagen'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'chisinau',
  'Salsa House Club Café',
  'Strada Alexandru cel Bun 83, Chișinău, Moldova',
  'https://www.google.com/maps/place/Salsa+House+Club+Caf%C3%A9/@47.02,28.83,13z/data=!4m6!3m5!1s0x40c97c359b61d34f:0xfdd7450cb0144461!8m2!3d47.0278318!4d28.8359401!16s%2Fg%2F11c70cmdfm?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+373 760 00 111',
  'https://instagram.com/salsahousecafe',
  'google_maps',
  '2026-09-30',
  'Cafe in Chișinău. Review topics: salsa 4, bachata 4, kizomba 6. Door hours are daytime except Friday night.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'chisinau'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'chisinau'
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
    (1::smallint, '10 AM–4 PM'),
    (2::smallint, '10 AM–4 PM'),
    (3::smallint, '10 AM–4 PM'),
    (4::smallint, '10 AM–4 PM'),
    (5::smallint, '10 AM–12 AM'),
    (6::smallint, 'Closed')
) as h(weekday, hours_text)
where v.capital_id = 'chisinau'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'bucharest',
  'Rio Club Bucharest',
  'Strada Bărăției 31, 030167 București, Romania',
  'https://www.google.com/maps/place/Rio+Club+Bucharest/@44.43,26.1,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Bucharest!3m6!1s0x40b1ff4f32939cc1:0x54b7821c99dc3ed1!8m2!3d44.430558!4d26.104537!15sChNzYWxzYSBiYXIgQnVjaGFyZXN0WhUiE3NhbHNhIGJhciBidWNoYXJlc3SSAQpkYW5jZV9jbHVimgEkQ2hkRFNVaE5NRzluUzBWSlEwRm5TVVJDZDNaUGFsOW5SUkFC4AEA-gEECAAQRw!16s%2Fg%2F11j8630j7v?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+40 760 876 008',
  'https://rioclub.ro/',
  'google_maps',
  '2026-09-30',
  'Dance club. On Wednesday 30 Sep 2026 the map said Closed, opening Friday at 10 PM. Review topics: salsa 30, bachata 29, kizomba 20.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'bucharest'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'bucharest'
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
    (6::smallint, '10 PM–4 AM')
) as h(weekday, hours_text)
where v.capital_id = 'bucharest'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'bratislava',
  'Casa del Havana',
  'Michalská 1484/26, 811 03 Staré Mesto, Slovakia',
  'https://www.google.com/maps/place/Casa+del+Havana/@48.15,17.11,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Bratislava!3m6!1s0x476c895cbe2a9f4d:0x194a19ba046fef5d!8m2!3d48.1452126!4d17.1067847!15sChRzYWxzYSBiYXIgQnJhdGlzbGF2YVoWIhRzYWxzYSBiYXIgYnJhdGlzbGF2YZIBDmxpdmVfbXVzaWNfYmFymgEkQ2hkRFNVaE5NRzluUzBWSlEwRm5TVVE1TlUxbGR6WlJSUkFC4AEA-gEECA0QOA!16s%2Fg%2F1tg_vwzc?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+421 910 797 222',
  'http://www.havanacafe.sk/',
  'google_maps',
  '2026-09-30',
  'Live music bar in Stare Mesto. On Wednesday 30 Sep 2026 the map said Closed, opening at 4 PM. Review topics name salsa (11). No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'bratislava'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'bratislava'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '4–10 PM'),
    (1::smallint, '4–10 PM'),
    (2::smallint, '4–10 PM'),
    (3::smallint, '4 PM–12 AM'),
    (4::smallint, '4 PM–2 AM'),
    (5::smallint, '4 PM–3 AM'),
    (6::smallint, '4 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'bratislava'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'belgrade',
  'Barrio Latino',
  'Dobračina 30a, Beograd, Serbia',
  'https://www.google.com/maps/place/Barrio+Latino/@44.81,20.46,12z/data=!3m1!5s0x475a7ab467af3251:0xb9753d622993d18b!4m10!1m2!2m1!1ssalsa+bar+Belgrade!3m6!1s0x475a7ab47031d657:0x6224ee677bac8579!8m2!3d44.8193477!4d20.4625647!15sChJzYWxzYSBiYXIgQmVsZ3JhZGVaFCISc2Fsc2EgYmFyIGJlbGdyYWRlkgEDYmFymgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVVJDTVdFM1UxSlJFQUXgAQD6AQQIABAu!16s%2Fg%2F11hbsjrh46?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+381 60 4538580',
  'https://www.instagram.com/barrio_latino_belgrade/',
  'google_maps',
  '2026-09-30',
  'Bar. On Wednesday 30 Sep 2026 the map said Closed, opening Friday at 10 PM. Review topics: salsa 12, bachata 4. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'belgrade'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'belgrade'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '8 PM–2 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, 'Closed'),
    (3::smallint, 'Closed'),
    (4::smallint, 'Closed'),
    (5::smallint, '10 PM–3 AM'),
    (6::smallint, '10 PM–3 AM')
) as h(weekday, hours_text)
where v.capital_id = 'belgrade'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'yerevan',
  'Las Noches Dance & Bar',
  '128 Nalbandyan St, Yerevan, Armenia',
  'https://www.google.com/maps/place/Las+Noches+Dance+%26+Bar/@40.18,44.51,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Yerevan!3m6!1s0x406abd507b386dd1:0x272d5b0bc2b5fa7b!8m2!3d40.1833199!4d44.525213!15sChFzYWxzYSBiYXIgWWVyZXZhbloTIhFzYWxzYSBiYXIgeWVyZXZhbpIBCmRhbmNlX2NsdWKaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMnhzVTFOWWNGZE9NRnBZV2xoYVJGWnFhRzVQV0dSU1VXNXdOazFZWXhBQuABAPoBBAgAEDk!16s%2Fg%2F11vlt_80gm?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+374 77 971007',
  null,
  'google_maps',
  '2026-09-30',
  'Dance club. On Wednesday 30 Sep 2026 the map said Closed, opening at 10 PM. Review topics: bachata 3, salsa 2, kizomba 2.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'yerevan'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('kizomba'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'yerevan'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '10 PM–5 AM'),
    (1::smallint, '10 PM–5 AM'),
    (2::smallint, '10 PM–5 AM'),
    (3::smallint, '10 PM–5 AM'),
    (4::smallint, '10 PM–5 AM'),
    (5::smallint, '10 PM–5 AM'),
    (6::smallint, '10 PM–5 AM')
) as h(weekday, hours_text)
where v.capital_id = 'yerevan'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'vientiane',
  'The Blues Box Vientiane',
  'Rue Pangkham, Vientiane, Laos',
  'https://www.google.com/maps/place/The+Blues+Box+Vientiane/@17.9647287,102.5321914,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Vientiane!3m6!1s0x312469006929ff1f:0x4956cd15034ca13b!8m2!3d17.9647287!4d102.6084091!15sChNzYWxzYSBiYXIgVmllbnRpYW5lWhUiE3NhbHNhIGJhciB2aWVudGlhbmWSAQZsb3VuZ2WaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMjFPYmxGNmJEUlZiWEJTV2pBd01VNXVhM1JhZWxKellrTXhTRlpIWXhBQuABAPoBBAgAEDY!16s%2Fg%2F11vsw8v8qf?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+856 30 51 65 340',
  null,
  'google_maps',
  '2026-09-30',
  'Lounge bar. On Wednesday 30 Sep 2026 the map said Closed, opening at 5 PM. Review topics name salsa night (2). No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'vientiane'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'vientiane'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '5 PM–12 AM'),
    (1::smallint, 'Closed'),
    (2::smallint, '5 PM–12 AM'),
    (3::smallint, '5 PM–12 AM'),
    (4::smallint, '5 PM–12 AM'),
    (5::smallint, '5 PM–12 AM'),
    (6::smallint, '5 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'vientiane'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'phnom_penh',
  'CanCan, Restaurant, Dancing, Live-Music & DJs',
  '14C Street 308, Phnom Penh 12301, Cambodia',
  'https://www.google.com/maps/place/CanCan,+Restaurant,+Dancing,+Live-Music+%26+DJs/@11.56,104.92,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Phnom+Penh!3m6!1s0x310951d8db962975:0x5520992fb9b99d97!8m2!3d11.553169!4d104.9300925!15sChRzYWxzYSBiYXIgUGhub20gUGVuaFoWIhRzYWxzYSBiYXIgcGhub20gcGVuaJIBCm5pZ2h0X2NsdWKaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMjFHUW1FemFIcFpiVTUyVkVjMWRtUnVWbmRQU0VJeVZHNUNNbUpIWXhBQuABAPoBBAgSEDI!16s%2Fg%2F11q40b4jhb?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+855 88 277 7907',
  'https://bassacstreet.com/cancan/',
  'google_maps',
  '2026-09-30',
  'Night club. On Wednesday 30 Sep 2026 the map said Closed, opening at 5 PM. Review topics: salsa dancing night 5, bachata 3. No kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'phnom_penh'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance), ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'phnom_penh'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '5 PM–1 AM'),
    (1::smallint, '5 PM–1 AM'),
    (2::smallint, '5 PM–1 AM'),
    (3::smallint, '5 PM–1 AM'),
    (4::smallint, '5 PM–1 AM'),
    (5::smallint, '5 PM–1 AM'),
    (6::smallint, '5 PM–1 AM')
) as h(weekday, hours_text)
where v.capital_id = 'phnom_penh'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'manama',
  'Iguana Lounge',
  'Bahrain, Juffair, Juffair Boulevard, ground floor, Bahrain',
  'https://www.google.com/maps/place/Iguana+Lounge/@26.22,50.58,13z/data=!4m10!1m2!2m1!1ssalsa+bar+Manama!3m6!1s0x3e49a9e2c65ab6e3:0xcaa70d6e84f73017!8m2!3d26.218642!4d50.6071375!15sChBzYWxzYSBiYXIgTWFuYW1hWhIiEHNhbHNhIGJhciBtYW5hbWGSAQZsb3VuZ2WaASNDaFpEU1VoTk1HOW5TMFZKUTBGblNVUm9iVGRMWTBGUkVBReABAPoBBAgiEEw!16s%2Fg%2F11rw6hmhb4?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+973 3352 3522',
  'https://www.instagram.com/iguana.bh',
  'google_maps',
  '2026-09-30',
  'Lounge bar in Juffair, Manama. On Wednesday 30 Sep 2026, morning Bahrain time, the map said Closed, opening at 6 PM. Review topics name salsa night (7). No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'manama'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'manama'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '6 PM–2:30 AM'),
    (1::smallint, '6 PM–2:30 AM'),
    (2::smallint, '6 PM–2:30 AM'),
    (3::smallint, '6 PM–2:30 AM'),
    (4::smallint, '6 PM–2:30 AM'),
    (5::smallint, '6 PM–2:30 AM'),
    (6::smallint, '6 PM–2:30 AM')
) as h(weekday, hours_text)
where v.capital_id = 'manama'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'hanoi',
  'La Habanera “Casa del Ron”',
  '81C Đ. Xuân Diệu, Tây Hồ, Hà Nội, Vietnam',
  'https://www.google.com/maps/place/La+Habanera+%E2%80%9CCasa+del+Ron%E2%80%9D/@21.0676142,105.6735779,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Hanoi!3m6!1s0x3135ab183732c8bf:0x8c58739f3750a828!8m2!3d21.0676142!4d105.8260132!15sCg9zYWxzYSBiYXIgSGFub2laESIPc2Fsc2EgYmFyIGhhbm9pkgEDcHVimgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVU0zYTNWNWMwdEJFQUXgAQD6AQQIABBC!16s%2Fg%2F11jh8tvw10?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+84 353 207 220',
  'https://lahabanerahanoi.com/',
  'google_maps',
  '2026-09-30',
  'Pub in Tay Ho, Hanoi. On Wednesday 30 Sep 2026, morning Hanoi time, the map said Closed, opening at 6 PM. Review topics name bachata (5). No salsa or kizomba topic. Dancing and latin music were not counted.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'hanoi'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('bachata'::public.dance)) as d(dance)
where v.capital_id = 'hanoi'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '6 PM–2 AM'),
    (1::smallint, '6 PM–2 AM'),
    (2::smallint, '6 PM–2 AM'),
    (3::smallint, '6 PM–2 AM'),
    (4::smallint, '6 PM–2 AM'),
    (5::smallint, '6 PM–2 AM'),
    (6::smallint, '6 PM–2 AM')
) as h(weekday, hours_text)
where v.capital_id = 'hanoi'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'doha',
  'La Vista 55',
  'InterContinental Doha The City, Off Al Wahda Road, Doha, Qatar',
  'https://www.google.com/maps/place/La+Vista+55/@25.29,51.53,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Doha!3m6!1s0x3e45c5eb03278d4d:0xb793d08386467ab6!8m2!3d25.3266689!4d51.5248777!15sCg5zYWxzYSBiYXIgRG9oYVoQIg5zYWxzYSBiYXIgZG9oYZIBA2JhcpoBJENoZERTVWhOTUc5blMwVkpRMEZuVFVSdmFrOWhVbnBSUlJBQuABAPoBBAgAEDo!16s%2Fg%2F11gxr37pw_?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+974 7021 8765',
  'http://bit.ly/LaVistaDoha',
  'google_maps',
  '2026-09-30',
  'Bar at InterContinental Doha The City. On Wednesday 30 Sep 2026, morning Doha time, the map said Closed, opening at 5 PM. Review topics name salsa dancing (2). No bachata or kizomba topic.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'doha'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'doha'
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
    (5::smallint, '5 PM–2 AM'),
    (6::smallint, '5 PM–2 AM')
) as h(weekday, hours_text)
where v.capital_id = 'doha'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'amman',
  'Scappa Lounge',
  'Al-Kuroum St. 25, Amman, Jordan',
  'https://www.google.com/maps/place/Scappa+Lounge/@31.9577742,35.7545742,12z/data=!4m10!1m2!2m1!1ssalsa+bar+Amman!3m6!1s0x151ca12ce9a93a1d:0x476867ab4703e54b!8m2!3d31.9577742!4d35.9070095!15sCg9zYWxzYSBiYXIgQW1tYW5aESIPc2Fsc2EgYmFyIGFtbWFukgEGbG91bmdlmgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDJwb2JGWnVTa3RWVmtKNFZVY3hUbUZGWkV0VGJscERUa1UxUWsxV1JSQULgAQD6AQQIABBI!16s%2Fg%2F11y97p3j0s?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+962 7 9055 5919',
  'https://www.instagram.com/scappa.amman',
  'google_maps',
  '2026-09-30',
  'Lounge bar. On Wednesday 30 Sep 2026, early morning Amman time, the map said Closed, opening at 4 PM. Review topics name salsa night (4). No bachata or kizomba topic. Dancing and dance floor were not counted.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'amman'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'amman'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '4 PM–12 AM'),
    (1::smallint, '4 PM–12 AM'),
    (2::smallint, '12 AM–12 PM, 4 PM–12 AM'),
    (3::smallint, '4 PM–12 AM'),
    (4::smallint, '4 PM–12 AM'),
    (5::smallint, '4 PM–12 AM'),
    (6::smallint, '4 PM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'amman'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
select
  'jakarta',
  'Amigos Bar & Cantina Kemang',
  'Kemang Club Villas, Jl. Kemang Selatan I, RT.8/RW.3, Bangka, Mampang Prapatan, South Jakarta City, Jakarta 12730, Indonesia',
  'https://www.google.com/maps/place/Amigos+Bar+%26+Cantina+Kemang/@-6.2653227,106.8203703,17z/data=!3m1!4b1!4m6!3m5!1s0x2e69f340b95fec27:0x921852f1d6b22a7d!8m2!3d-6.2653227!4d106.8203703!16s%2Fg%2F1thlqcpp?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
  '+62 822-9782-9855',
  'http://www.amigos-resto.com/',
  'google_maps',
  '2026-09-30',
  'Tex-Mex restaurant in South Jakarta. On Wednesday 30 Sep 2026, morning Jakarta time, the map said Closed, opening at 10 AM. Review topics name salsa night (39). No bachata or kizomba topic. Live music, latin music, and dance music were not counted.',
  'operating'
where not exists (
  select 1 from public.venues where capital_id = 'jakarta'
);

insert into public.venue_dances (venue_id, dance)
select v.id, d.dance
from public.venues v
cross join (values ('salsa'::public.dance)) as d(dance)
where v.capital_id = 'jakarta'
  and not exists (
    select 1 from public.venue_dances existing
    where existing.venue_id = v.id and existing.dance = d.dance
  );

insert into public.venue_hours (venue_id, weekday, hours_text)
select v.id, h.weekday, h.hours_text
from public.venues v
cross join (
  values
    (0::smallint, '10 AM–10 PM'),
    (1::smallint, '10 AM–12 AM'),
    (2::smallint, '10 AM–10 PM'),
    (3::smallint, '10 AM–10 PM'),
    (4::smallint, '10 AM–10 PM'),
    (5::smallint, '10 AM–12 AM'),
    (6::smallint, '10 AM–12 AM')
) as h(weekday, hours_text)
where v.capital_id = 'jakarta'
  and not exists (
    select 1 from public.venue_hours existing
    where existing.venue_id = v.id and existing.weekday = h.weekday
  );

commit;
