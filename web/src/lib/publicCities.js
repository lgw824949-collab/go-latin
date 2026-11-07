// Explicit publication approval, independent of BAR operating status.
export const PUBLIC_CITY_IDS = Object.freeze(["seoul", "bangkok", "hanoi"]);
export const HOME_CITY_LIMIT = 6;
export function publicCities(capitals, ids = PUBLIC_CITY_IDS) {
 const rows = new Map((capitals ?? []).filter(city => city?.id).map(city => [city.id, city]));
 return [...new Set(ids)].map(id => rows.get(id)).filter(Boolean);
}
export function publicCityOverview(capitals, ids = PUBLIC_CITY_IDS) {
 const all = publicCities(capitals, ids);
 return { all, featured: all.slice(0, HOME_CITY_LIMIT), showAll: all.length > HOME_CITY_LIMIT };
}
