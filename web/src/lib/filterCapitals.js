import { CONTINENTS, DANCES, filterCapitals } from "../../../data/contract.js";

export { CONTINENTS, DANCES, filterCapitals };

export function matchesCapitalQuery(capital, query) {
  const needle = searchText(query).trim();
  if (!needle) return true;
  return searchText(capital?.city).includes(needle) || searchText(capital?.country).includes(needle);
}

export function visibleCapitals(capitals, filters, query) {
  return filterCapitals(capitals, filters).filter((capital) => matchesCapitalQuery(capital, query));
}

const CONTINENT_WORDS = ["", "one", "two", "three", "four", "five", "six"];

export function homeResultLabel({ count, danceName, continentName, query, continentCount }) {
  const noun = danceName
    ? count === 1
      ? "floor"
      : "floors"
    : count === 1
      ? "capital"
      : "capitals";
  const what = danceName ? `${danceName} ${noun}` : noun;
  const trimmed = String(query ?? "").trim();
  if (trimmed) {
    const where = continentName ? ` in ${continentName}` : "";
    return `${count} ${what} matching "${trimmed}"${where}`;
  }
  const where = continentName ? `in ${continentName}` : continentSpan(continentCount);
  return where ? `${count} ${what} ${where}` : `${count} ${what}`;
}

function continentSpan(continentCount) {
  const count = Number(continentCount);
  if (count === 6) return "across six continents";
  if (count > 1 && count < 6) return `across ${CONTINENT_WORDS[count]} continents`;
  if (count === 1) return "across one continent";
  return "";
}

export function searchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function readFilters(params) {
  const dance = params.get("dance");
  const continent = params.get("continent");
  return {
    dance: DANCES.some((item) => item.id === dance) ? dance : null,
    continent: CONTINENTS.some((item) => item.id === continent) ? continent : null,
  };
}

export function writeFilters(current, key, value) {
  const next = new URLSearchParams(current);
  if (value) next.set(key, value);
  else next.delete(key);
  return next;
}

export function cityCardPath(capitalId, dance) {
  const city = `/c/${capitalId}`;
  return DANCES.some((item) => item.id === dance) ? `${city}?dance=${dance}` : city;
}

export function venuesForDance(venues, dance) {
  const list = venues ?? [];
  if (!DANCES.some((item) => item.id === dance)) return list;
  return list.filter((venue) => Array.isArray(venue?.dances) && venue.dances.includes(dance));
}
