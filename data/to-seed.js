import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertCapital } from "./contract.js";

const root = dirname(fileURLToPath(import.meta.url));
const capitals = JSON.parse(readFileSync(join(root, "capitals.json"), "utf8"));
capitals.forEach((capital, index) => assertCapital(capital, index));

const q = (value) => (value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`);

const capitalRows = capitals.map((capital) =>
  `(${[q(capital.id), q(capital.city), q(capital.country), q(capital.iso2), q(capital.continent), capital.lat, capital.lng, q(capital.timezone), q(capital.image)].join(", ")})`,
);

const venues = capitals.filter((capital) => capital.venue);
const venueRows = venues.map((capital) => {
  const venue = capital.venue;
  return `(${[q(capital.id), q(venue.name), q(venue.address), q(venue.mapsUrl), q(venue.phone), q(venue.website), q(venue.source), q(venue.sourceChecked), q(venue.sourceNote), q(venue.status)].join(", ")})`;
});

const danceRows = venues.flatMap((capital) =>
  capital.venue.dances.map(
    (dance) => `((select id from public.venues where capital_id = ${q(capital.id)}), ${q(dance)})`,
  ),
);

const hourRows = venues.flatMap((capital) =>
  (capital.venue.hours ?? []).map(
    (row) =>
      `((select id from public.venues where capital_id = ${q(capital.id)}), ${row.weekday}, ${q(row.text)})`,
  ),
);

const sql = `-- Generated from data/capitals.json. Do not edit by hand.
-- Run after supabase/migrations/001_directory.sql.

begin;

insert into public.capitals (id, city, country, iso2, continent, lat, lng, timezone, image)
values
  ${capitalRows.join(",\n  ")};

insert into public.venues (
  capital_id, name, address, maps_url, phone, website, source, source_checked, source_note, status
)
values
  ${venueRows.join(",\n  ")};

insert into public.venue_dances (venue_id, dance)
values
  ${danceRows.join(",\n  ")};

insert into public.venue_hours (venue_id, weekday, hours_text)
values
  ${hourRows.join(",\n  ")};

commit;
`;

writeFileSync(join(root, "..", "supabase", "seed.sql"), sql);
console.log(`seed ${capitals.length} capitals, ${venues.length} venues, ${hourRows.length} hour rows`);
