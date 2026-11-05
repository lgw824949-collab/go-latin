import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSitemap } from "../../scripts/prerender-seoul.mjs";
import { BROWSE_CONTINENTS, countryCityCategories, citiesForCountry, continentName, countriesInContinent, countryDocument, countryPlaceCounts, countrySearchTarget, countrySlug, listCountries, matchingCities, matchingCountries, popularListedCities, searchDirectory } from "./countries.js";
import { filterBars } from "./manage.js";
import { headAction } from "./routeHead.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const capitals = JSON.parse(readFileSync(join(root, "data/capitals.json"), "utf8"));

test("the 195 capitals stay one country each", () => {
  const countries = listCountries(capitals);
  assert.equal(countries.length, 195);
  assert.equal(new Set(countries.map((country) => country.slug)).size, 195);
  const korea = countries.find((country) => country.slug === "south-korea");
  assert.equal(korea.name, "South Korea");
  assert.deepEqual(korea.cities.map((city) => city.id), ["seoul"]);
  assert.equal(countrySlug("Türkiye"), "turkiye");
  assert.equal(countrySlug("São Tomé and Príncipe"), "sao-tome-and-principe");
});

test("country and city search keep the stored names", () => {
  const countries = listCountries([
    { id: "seoul", city: "Seoul", country: "South Korea" },
    { id: "hanoi", city: "Hanoi", country: "Vietnam" },
  ]);
  assert.deepEqual(matchingCountries(countries, "korea").map((country) => country.slug), ["south-korea"]);
  assert.deepEqual(matchingCountries(countries, "seoul").map((country) => country.slug), ["south-korea"]);
  assert.deepEqual(
    matchingCities(countries.find((country) => country.slug === "south-korea").cities, "seo").map((city) => city.id),
    ["seoul"],
  );
  assert.equal(matchingCountries(countries, "zzzz").length, 0);
});

test("a directory search separates country, city, and bar names", () => {
  const rows = [
    {
      id: "pyongyang",
      city: "Pyongyang",
      country: "North Korea",
      venues: [],
    },
    {
      id: "seoul",
      city: "Seoul",
      country: "South Korea",
      venues: [
        { id: "latin", name: "Latin" },
        { id: "bonita", name: "Latin Club Bonita" },
      ],
    },
    {
      id: "hanoi",
      city: "Hanoi",
      country: "Vietnam",
      venues: [{ id: "sala", name: "Sala" }],
    },
    {
      id: "north-jose",
      city: "San José",
      country: "Costa Rica",
      venues: [],
    },
    {
      id: "south-jose",
      city: "San José",
      country: "Uruguay",
      venues: [],
    },
  ];
  assert.deepEqual(searchDirectory(rows, "   "), { countries: [], cities: [], bars: [] });
  assert.deepEqual(searchDirectory(rows, "zzzz").countries, []);
  assert.deepEqual(searchDirectory(rows, "zzzz").cities, []);
  assert.deepEqual(searchDirectory(rows, "zzzz").bars, []);

  const korea = searchDirectory(rows, "KOREA");
  assert.deepEqual(korea.countries.map((country) => country.name), ["North Korea", "South Korea"]);
  assert.deepEqual(korea.cities.map((city) => city.id), []);
  assert.deepEqual(searchDirectory(rows, "South Korea").countries.map((country) => country.name), ["South Korea"]);

  const seoul = searchDirectory(rows, "seo");
  assert.deepEqual(seoul.cities.map((city) => city.city), ["Seoul"]);
  assert.equal(seoul.cities[0].showCountry, false);
  assert.deepEqual(seoul.countries, []);

  const exact = searchDirectory(rows, "Latin");
  assert.deepEqual(exact.bars.map((bar) => bar.name), ["Latin", "Latin Club Bonita"]);
  assert.equal(exact.bars[0].href, "/c/seoul#bar-latin");
  const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/Home.jsx"), "utf8");
  const barHeading = page.indexOf('title="BAR"');
  const cityHeading = page.indexOf('title="City"');
  const countryHeading = page.indexOf('title="Country"');
  assert.ok(barHeading !== -1 && barHeading < cityHeading && cityHeading < countryHeading);
  assert.equal(exact.bars[0].city, "Seoul");
  assert.equal(exact.bars[0].country, "South Korea");

  const shared = searchDirectory(rows, "san jose");
  assert.deepEqual(shared.cities.map((city) => [city.id, city.showCountry, city.country]), [
    ["north-jose", true, "Costa Rica"],
    ["south-jose", true, "Uruguay"],
  ]);
});

test("continent browse keeps the stored north and south America split", () => {
  const countries = listCountries(capitals);
  assert.deepEqual(BROWSE_CONTINENTS.map(continentName), [
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Africa",
    "Oceania",
  ]);
  const counts = Object.fromEntries(BROWSE_CONTINENTS.map((id) => [id, countriesInContinent(countries, id).length]));
  assert.deepEqual(counts, {
    asia: 46,
    europe: 46,
    north_america: 23,
    south_america: 12,
    africa: 54,
    oceania: 14,
  });
  assert.equal(countriesInContinent(countries, "americas").length, 0);
  const north = countriesInContinent(countries, "north_america").map((country) => country.name);
  const south = countriesInContinent(countries, "south_america").map((country) => country.name);
  for (const name of ["Mexico", "Panama", "Trinidad and Tobago", "Canada", "United States"]) {
    assert.equal(north.includes(name), true);
    assert.equal(south.includes(name), false);
  }
  for (const name of ["Colombia", "Brazil", "Argentina", "Guyana", "Suriname"]) {
    assert.equal(south.includes(name), true);
    assert.equal(north.includes(name), false);
  }
  const korea = countriesInContinent(countries, "asia").find((country) => country.slug === "south-korea");
  assert.deepEqual(countryPlaceCounts({
    cities: [{ venues: [{ id: "a" }, { id: "b" }] }, { venues: [] }],
  }), { cities: 2, bars: 2 });
  assert.equal(korea.cities[0].id, "seoul");
  assert.equal(korea.cities[0].continent, "asia");
});

test("a country name search opens that country's city list", () => {
  const countries = listCountries(capitals);
  assert.equal(countrySearchTarget(countries, "South Korea"), "/country/south-korea");
  assert.equal(countrySearchTarget(countries, "Vietnam"), "/country/vietnam");
  assert.equal(countrySearchTarget(countries, "Korea"), "");
  assert.equal(countrySearchTarget(countries, "Seoul"), "");
  assert.deepEqual(citiesForCountry(countries, "south-korea").map((city) => city.id), ["seoul"]);
  assert.equal(citiesForCountry(countries, "vietnam").some((city) => city.id === "seoul"), false);
});

test("an admin country filter keeps that country's bars", () => {
  const bars = [
    bar("seoul", "Seoul", "South Korea"),
    bar("hanoi", "Hanoi", "Vietnam"),
  ];
  const found = filterBars(bars, {
    query: "",
    country: "South Korea",
    city: "seoul",
    dance: "",
    status: "",
    verification: "",
  });
  assert.deepEqual(found.map((item) => item.capitalId), ["seoul"]);
  assert.equal(filterBars(bars, {
    query: "",
    country: "Vietnam",
    city: "seoul",
    dance: "",
    status: "",
    verification: "",
  }).length, 0);
});

function bar(capitalId, city, country) {
  return {
    name: city,
    city,
    country,
    capitalId,
    dances: [],
    status: "",
    nightDances: [],
    lastChecked: "",
  };
}

test("popular listed cities keep only cities that already have bars", () => {
  const rows = [
    { id: "a", city: "Alpha", country: "Aland", venues: [{ id: "1", name: "One" }] },
    { id: "b", city: "Beta", country: "Bland", venues: [{ id: "1", name: "One" }, { id: "2", name: "Two" }] },
    { id: "c", city: "Gamma", country: "Cland", venues: [] },
    { id: "d", city: "Delta", country: "Dland" },
  ];
  assert.deepEqual(popularListedCities(rows, 6), [
    { id: "b", city: "Beta", country: "Bland", bars: 2 },
    { id: "a", city: "Alpha", country: "Aland", bars: 1 },
  ]);
  assert.equal(popularListedCities(rows, 1).length, 1);
  assert.equal(popularListedCities(rows, 1)[0].id, "b");
  assert.deepEqual(popularListedCities([], 6), []);
});

test("country pages are noindex and stay out of the sitemap", () => {
  assert.deepEqual(countryDocument("/country"), {
    title: "Countries | Go Latin",
    robots: "noindex",
    canonical: "",
  });
  assert.equal(countryDocument("/country/south-korea").robots, "noindex");
  assert.equal(countryDocument("/country/south-korea").canonical, "");
  assert.equal(countryDocument("/country/south-korea/").robots, "noindex");
  assert.equal(countryDocument("/c/seoul"), null);
  assert.equal(headAction("/country/south-korea", "https://go-latin.vercel.app/c/seoul"), "clear");
  const sitemap = renderSitemap("https://go-latin.vercel.app", [{ id: "seoul" }]);
  assert.equal(sitemap.includes("/country"), false);
  assert.match(sitemap, /\/c\/seoul</);
});


test("shared city categories use registered records for every country and only approved Vietnam placeholders", () => {
  for (const country of listCountries(capitals)) {
    const categories = countryCityCategories(country);
    if (country.slug !== "vietnam") {
      assert.equal(categories.length, country.cities.length);
      assert.deepEqual(categories.map(category => category.id), country.cities.map(city => city.id));
      assert.ok(categories.every(category => country.cities.includes(category.registered)));
    } else {
      assert.deepEqual(categories.slice(0, 3).map(category => category.id), ["hanoi", "ho-chi-minh-city", "da-nang"]);
    }
  }
  const extra = { id: "actual-other-city", city: "Hai Phong", venues: [] };
  const options = countryCityCategories({ slug: "vietnam", cities: [extra] });
  assert.equal(options[3].registered, extra);
  assert.equal(options[3].id, extra.id);
  assert.deepEqual(countryCityCategories({ slug: "no-data", cities: [] }), []);
});
