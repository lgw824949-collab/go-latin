-- Add the verified Tokyo bar. Capitals are already seeded.
-- Do not re-run seed.sql. Do not run this twice.

begin;

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
values (
  'tokyo',
  'Las Risas - Ginza Latin Bar',
  'Japan, 〒104-0061 Tokyo, Chuo City, Ginza, 8 Chome−12−6 小野里小野商ビル ｢小野里小野商ビル/B1F ｣',
  'https://www.google.com/maps/place/Las+Risas+-+Ginza+Latin+Bar/@35.6673558,139.7629019,17z/data=!3m2!4b1!5s0x60188be7e0de49dd:0x438a5e21c94ac0dd!4m14!1m7!3m6!1s0x60188d1f0455d9ed:0x48765bc3609c9439!2sLatin+Club+Leon!8m2!3d35.6930362!4d139.7058494!16s%2Fg%2F11tjcwypmg!3m5!1s0x60188be7e1246bdb:0x5ef006c39fdd2e7d!8m2!3d35.6673558!4d139.7629019!16s%2Fg%2F1hm1tvnsn?hl=en&entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
  '+81 3-3541-3303',
  'http://www.lasrisas.com/',
  'google_maps',
  '2026-09-29',
  'On the Tuesday of that check, about 10:20 PM, the map said Open, closing at 11:30 PM. Google labels the place a salsa bar. The address line says B1F, and a separate line says Floor 1.',
  'operating'
);

insert into public.venue_dances (venue_id, dance)
values
  ((select id from public.venues where capital_id = 'tokyo'), 'salsa');

insert into public.venue_hours (venue_id, weekday, hours_text)
values
  ((select id from public.venues where capital_id = 'tokyo'), 0, '1–11:30 PM'),
  ((select id from public.venues where capital_id = 'tokyo'), 1, '7–11:30 PM'),
  ((select id from public.venues where capital_id = 'tokyo'), 2, '1–11:30 PM'),
  ((select id from public.venues where capital_id = 'tokyo'), 3, '7–11:30 PM'),
  ((select id from public.venues where capital_id = 'tokyo'), 4, '7–11:30 PM'),
  ((select id from public.venues where capital_id = 'tokyo'), 5, '7–11:30 PM'),
  ((select id from public.venues where capital_id = 'tokyo'), 6, '7–11:30 PM');

commit;
