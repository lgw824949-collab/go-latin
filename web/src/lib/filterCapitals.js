import { CONTINENTS, DANCES, filterCapitals } from "../../../data/contract.js";

export { CONTINENTS, DANCES, filterCapitals };

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
