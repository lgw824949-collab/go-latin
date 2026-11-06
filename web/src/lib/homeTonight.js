import { tonightHoursStatus, tonightLocalTime } from "./tonight.js";

export async function loadHomeTonight(loadCity) {
  return Promise.all(["seoul", "bangkok", "hanoi"].map(id => loadCity(id)));
}

export function homeTonightItems(cities, now) {
  return cities.flatMap(city => {
    if (!city) return [];
    const clock = tonightLocalTime(city, now);
    return (city.venues ?? []).flatMap(venue => {
      const status = tonightHoursStatus(venue, clock);
      if (!status.badge || !status.danceConfirmed) return [];
      const start = status.hoursLabel?.match(/^\d{2}:\d{2}/)?.[0];
      if (!start) return [];
      return [{ cityId: city.id, city: city.city, id: venue.id, name: venue.name, start }];
    });
  }).slice(0, 3);
}
