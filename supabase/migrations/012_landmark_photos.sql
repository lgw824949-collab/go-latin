-- Landmark photos for seven capitals whose picture was a street, a hotel, a document, or an unnamed snapshot.
-- Run this file once. Do not run 004_landmark_images.sql. Do not re-run seed.sql.
-- Safe to run again: each row is set to the same photo.

begin;

update public.capitals set image = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Gaddafi_mosque_Dodoma.jpg/960px-Gaddafi_mosque_Dodoma.jpg' where id = 'dodoma';
update public.capitals set image = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Nationalhelden-Denkmal_%2840153835081%29.jpg/960px-Nationalhelden-Denkmal_%2840153835081%29.jpg' where id = 'harare';
update public.capitals set image = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Grand_Masonic_Temple_in_Monrovia.jpg/960px-Grand_Masonic_Temple_in_Monrovia.jpg' where id = 'monrovia';
update public.capitals set image = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Basseterre_-_Memorial_Clocktower.jpg/960px-Basseterre_-_Memorial_Clocktower.jpg' where id = 'basseterre';
update public.capitals set image = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Panama_City_Skyline_1.jpg/960px-Panama_City_Skyline_1.jpg' where id = 'panama_city';
update public.capitals set image = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Iron_Market%2C_Haiti.jpg/960px-Iron_Market%2C_Haiti.jpg' where id = 'port_au_prince';
update public.capitals set image = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Townscape_of_St_George%27s_and_Fort_George_C_IMG_0531.JPG/960px-Townscape_of_St_George%27s_and_Fort_George_C_IMG_0531.JPG' where id = 'st_georges';

commit;
