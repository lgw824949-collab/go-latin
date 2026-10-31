import { tonightBarPath } from "./barAnchor.js";
import { CONTINENTS, matchesCapitalQuery, searchText } from "./filterCapitals.js";

export function countrySlug(name) {
  return String(name ?? "")
    .replaceAll("ü", "u")
    .replaceAll("ã", "a")
    .replaceAll("é", "e")
    .replaceAll("í", "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listCountries(capitals) {
  const grouped = new Map();
  for (const capital of capitals ?? []) {
    const name = String(capital?.country ?? "").trim();
    const slug = countrySlug(name);
    if (!name || !slug || !capital?.id) continue;
    const country = grouped.get(slug) ?? { slug, name, cities: [] };
    country.cities.push(capital);
    grouped.set(slug, country);
  }
  return [...grouped.values()]
    .map((country) => ({
      ...country,
      cities: [...country.cities].sort((a, b) => String(a.city).localeCompare(String(b.city), "en")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function matchingCountries(countries, query) {
  const needle = String(query ?? "").trim();
  if (!needle) return countries ?? [];
  return (countries ?? []).filter((country) =>
    matchesCapitalQuery({ city: "", country: country.name }, needle)
    || country.cities.some((city) => matchesCapitalQuery(city, needle)),
  );
}

export function matchingCities(cities, query) {
  const needle = String(query ?? "").trim();
  if (!needle) return cities ?? [];
  return (cities ?? []).filter((city) => matchesCapitalQuery(city, needle));
}

export const BROWSE_CONTINENTS = [
  "asia",
  "europe",
  "north_america",
  "south_america",
  "africa",
  "oceania",
];

export function countriesInContinent(countries, continentId) {
  if (!BROWSE_CONTINENTS.includes(continentId)) return [];
  return (countries ?? []).flatMap((country) => {
    const cities = (country.cities ?? []).filter((city) => city.continent === continentId);
    if (cities.length === 0) return [];
    return [{ ...country, cities }];
  });
}

export function countryPlaceCounts(country) {
  const cities = country?.cities ?? [];
  const bars = cities.reduce((sum, city) => sum + (Array.isArray(city.venues) ? city.venues.length : 0), 0);
  return { cities: cities.length, bars };
}

export function continentName(id) {
  return CONTINENTS.find((item) => item.id === id)?.name ?? "";
}

export function popularListedCities(capitals, limit = 6) {
  const max = Number(limit);
  const size = Number.isFinite(max) && max > 0 ? Math.floor(max) : 6;
  return [...(capitals ?? [])]
    .filter((capital) => capital?.id && Array.isArray(capital.venues) && capital.venues.length > 0)
    .sort((a, b) =>
      b.venues.length - a.venues.length
      || String(a.city).localeCompare(String(b.city), "en")
      || String(a.country).localeCompare(String(b.country), "en"),
    )
    .slice(0, size)
    .map((capital) => ({
      id: capital.id,
      city: capital.city,
      country: capital.country,
      bars: capital.venues.length,
    }));
}

export function citiesForCountry(countries, slug) {
  return (countries ?? []).find((country) => country.slug === slug)?.cities ?? [];
}

export function searchDirectory(capitals, query) {
  const needle = searchText(query).trim();
  if (!needle) return { countries: [], cities: [], bars: [] };
  const rows = capitals ?? [];
  const cityCounts = new Map();
  for (const capital of rows) {
    const key = searchText(capital?.city).trim();
    if (!key) continue;
    cityCounts.set(key, (cityCounts.get(key) ?? 0) + 1);
  }
  const countries = listCountries(rows)
    .filter((country) => matchRank(country.name, needle) > 0)
    .sort((a, b) => compareMatch(a.name, b.name, needle))
    .map((country) => ({ slug: country.slug, name: country.name }));
  const cities = rows
    .filter((capital) => capital?.id && matchRank(capital.city, needle) > 0)
    .sort((a, b) => compareMatch(a.city, b.city, needle) || String(a.country).localeCompare(String(b.country), "en"))
    .map((capital) => ({
      id: capital.id,
      city: capital.city,
      country: capital.country,
      showCountry: (cityCounts.get(searchText(capital.city).trim()) ?? 0) > 1,
    }));
  const bars = [];
  for (const capital of rows) {
    for (const venue of capital?.venues ?? []) {
      const name = String(venue?.name ?? "").trim();
      if (!capital?.id || !venue?.id || !name || matchRank(name, needle) === 0) continue;
      bars.push({
        id: venue.id,
        name,
        cityId: capital.id,
        city: capital.city,
        country: capital.country,
        href: tonightBarPath(capital.id, venue.id),
      });
    }
  }
  bars.sort((a, b) => compareMatch(a.name, b.name, needle) || a.city.localeCompare(b.city, "en"));
  return { countries, cities, bars };
}

function matchRank(name, needle) {
  const folded = searchText(name).trim();
  if (!folded.includes(needle)) return 0;
  return folded === needle ? 2 : 1;
}

function compareMatch(left, right, needle) {
  const rank = matchRank(right, needle) - matchRank(left, needle);
  if (rank) return rank;
  return searchText(left).localeCompare(searchText(right), "en");
}

export function countrySearchTarget(countries, query) {
  const needle = String(query ?? "").trim();
  if (!needle) return "";
  const matches = (countries ?? []).filter((country) =>
    matchesCapitalQuery({ city: "", country: country.name }, needle),
  );
  if (matches.length !== 1) return "";
  return `/country/${matches[0].slug}`;
}

export function countryDocument(pathname) {
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/";
  if (path === "/country") {
    return { title: "Countries | Go Latin", robots: "noindex", canonical: "" };
  }
  if (/^\/country\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) {
    return { title: "", robots: "noindex", canonical: "" };
  }
  return null;
}
