import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { find as findTimezone } from "geo-tz/all";

const root = dirname(fileURLToPath(import.meta.url));
const preferredCapital = {
  BO: "Sucre",
  LK: "Sri Jayawardenepura Kotte",
  PK: "Islamabad",
  SZ: "Mbabane",
  YE: "Sanaa",
  ZA: "Pretoria",
};

const continentOrder = ["asia", "europe", "africa", "north_america", "south_america", "oceania"];
const imageTitle = {
  AG: "St. John's, Antigua and Barbuda",
  CR: "San José, Costa Rica",
  JM: "Kingston, Jamaica",
  MC: "Monaco-Ville",
  SG: "Marina Bay, Singapore",
  VA: "Saint Peter's Square",
};
const cachePath = join(root, "capital-image-cache.json");
const imageCache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};

const countriesRes = await fetch("https://raw.githubusercontent.com/mledoze/countries/master/countries.json");
if (!countriesRes.ok) throw new Error("country list failed");
const countries = await countriesRes.json();

const query = `
SELECT ?iso ?capitalLabel ?lat ?lon WHERE {
  ?country wdt:P297 ?iso.
  ?country wdt:P36 ?capital.
  ?capital p:P625 ?statement.
  ?statement ps:P625 ?coord.
  FILTER NOT EXISTS { ?statement pq:P582 ?end. }
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;
const wikiRes = await fetch("https://query.wikidata.org/sparql?query=" + encodeURIComponent(query), {
  headers: {
    Accept: "application/sparql-results+json",
    "User-Agent": "GoLatinDirectory/1.0 (capital list)",
  },
});
if (!wikiRes.ok) throw new Error(await wikiRes.text());
const wiki = await wikiRes.json();
const coords = new Map();
for (const row of wiki.results.bindings) {
  const iso = row.iso.value;
  const hit = {
    capital: row.capitalLabel.value,
    lat: Number(row.lat.value),
    lng: Number(row.lon.value),
  };
  const list = coords.get(iso) ?? [];
  if (!list.some((item) => item.capital === hit.capital)) list.push(hit);
  coords.set(iso, list);
}

const existing = JSON.parse(readFileSync(join(root, "capitals.json"), "utf8"));
const existingByIso = new Map(existing.map((capital) => [capital.iso2, capital]));
const usedIds = new Set(existing.map((capital) => capital.id));

const selected = countries.filter((country) => country.independent === true || country.cca2 === "XK");
const built = [];

for (const country of selected) {
  const saved = existingByIso.get(country.cca2);
  if (saved) {
    built.push(saved);
    continue;
  }

  const hits = coords.get(country.cca2) ?? [];
  const preferred = preferredCapital[country.cca2];
  const hit = (preferred && hits.find((item) => item.capital === preferred)) || hits[0];
  if (!hit) throw new Error(`${country.cca2} has no capital coordinates`);

  const city = /^Q\d+$/.test(hit.capital) ? country.capital[0] : hit.capital;
  const continent = continentOf(country);
  if (!continent) throw new Error(`${country.cca2} has no continent (${country.region} / ${country.subregion})`);

  const zones = findTimezone(hit.lat, hit.lng);
  if (!zones[0]) throw new Error(`${hit.capital} has no timezone`);

  built.push({
    id: uniqueId(city, country.cca2),
    city,
    country: country.name.common,
    iso2: country.cca2,
    continent,
    lat: roundCoord(hit.lat),
    lng: roundCoord(hit.lng),
    timezone: zones[0],
    image: imageCache[country.cca2] ?? "",
    venue: null,
  });
}

let imageFailures = 0;
for (const capital of built) {
  if (capital.image) continue;
  const image = await cityImage(capital);
  if (!image) {
    imageFailures += 1;
    console.error("no image", capital.iso2, capital.city, capital.country);
    continue;
  }
  capital.image = image.url;
  imageCache[capital.iso2] = image.url;
  writeFileSync(cachePath, JSON.stringify(imageCache, null, 2));
  console.log("image", capital.iso2, capital.city, "—", image.description);
}

if (imageFailures > 0) throw new Error(`${imageFailures} capitals have no city photo`);

built.sort((a, b) => {
  const continent = continentOrder.indexOf(a.continent) - continentOrder.indexOf(b.continent);
  if (continent !== 0) return continent;
  return a.city.localeCompare(b.city);
});

writeFileSync(join(root, "capitals.json"), JSON.stringify(built, null, 2) + "\n");
writeFileSync(join(root, "..", "supabase", "migrations", "003_all_capitals.sql"), capitalInsert(built));

const counts = Object.fromEntries(continentOrder.map((id) => [id, built.filter((capital) => capital.continent === id).length]));
console.log("capitals", built.length, counts);

function continentOf(country) {
  if (country.region === "Americas") {
    return country.subregion === "South America" ? "south_america" : "north_america";
  }
  return {
    Asia: "asia",
    Europe: "europe",
    Africa: "africa",
    Oceania: "oceania",
  }[country.region];
}

function uniqueId(city, iso) {
  let base = slug(city) || iso.toLowerCase();
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  const alt = `${base}_${iso.toLowerCase()}`;
  usedIds.add(alt);
  return alt;
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['’ʻ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function roundCoord(value) {
  return Math.round(value * 10000) / 10000;
}

async function cityImage(capital) {
  const titles = [
    imageTitle[capital.iso2],
    capital.city,
    `${capital.city}, ${capital.country}`,
    `${capital.city} skyline`,
  ].filter(Boolean);
  for (const title of titles) {
    const page = await wikiPage(title);
    if (!page) continue;
    const text = `${page.title} ${page.description}`.toLowerCase();
    const aboutThisPlace =
      text.includes(capital.country.toLowerCase()) ||
      text.includes(capital.city.toLowerCase()) ||
      title === imageTitle[capital.iso2];
    if (!aboutThisPlace) continue;
    return page;
  }
  return null;
}

async function wikiPage(title) {
  await delay(250);
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("prop", "pageimages|description|pageprops");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "960");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, {
      headers: { "User-Agent": "GoLatinDirectory/1.0 (capital photos)" },
    });
    if (res.status === 429) {
      await delay(1500 * (attempt + 1));
      continue;
    }
    const raw = await res.text();
    if (!res.ok || raw.startsWith("You are making")) {
      await delay(2000 * (attempt + 1));
      continue;
    }
    const body = JSON.parse(raw);
    const page = body.query?.pages?.[0];
    if (!page || page.missing || page.pageprops?.disambiguation != null) return null;
    const description = page.description || "";
    const thumb = page.thumbnail?.source;
    if (!thumb?.startsWith("https://")) return null;
    const blob = `${description} ${thumb}`.toLowerCase();
    if (/\.svg|flag of|coat of arms|emblem|locator|location map|seal of/.test(blob)) return null;
    return { url: thumb, description, title: page.title };
  }
  return null;
}

function capitalInsert(capitals) {
  const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
  const rows = capitals.map(
    (capital) =>
      `  (${[q(capital.id), q(capital.city), q(capital.country), q(capital.iso2), q(capital.continent), capital.lat, capital.lng, q(capital.timezone), q(capital.image)].join(", ")})`,
  );
  return `-- Add every independent country's capital. Existing rows stay as they are.
-- Does not add or change bars.

insert into public.capitals (id, city, country, iso2, continent, lat, lng, timezone, image)
values
${rows.join(",\n")}
on conflict (id) do nothing;
`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
