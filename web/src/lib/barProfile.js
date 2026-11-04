import { sevenDaySchedule, tonightLocalTime } from "./tonight.js";
import { DANCES } from "./filterCapitals.js";
import { httpUrl } from "./sources.js";

export const UNKNOWN = "아직 정보가 없어요";
export const MUSIC_DAYS = [1, 2, 3, 4, 5, 6, 0];
export const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export function checkedAge(value, clock) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!clock || !match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const checked = new Date(Date.UTC(year, month - 1, day));
  if (checked.getUTCFullYear() !== year || checked.getUTCMonth() !== month - 1 || checked.getUTCDate() !== day) return null;
  const age = Math.round((Date.UTC(clock.year, clock.month - 1, clock.day) - checked.getTime()) / 86400000);
  return age < 0 ? null : age;
}

export function profileModel(venue, capital, now = new Date()) {
  const clock = tonightLocalTime(capital, now);
  const hours = sevenDaySchedule(venue, clock);
  const week = MUSIC_DAYS.map(weekday => {
    const operatingDay = hours.find(day => new Date(`${day.date}T00:00:00Z`).getUTCDay() === weekday);
    const closed = operatingDay?.hoursLabel === "Closed";
    const dances = DANCES.filter(dance => (venue.nightDances ?? [])
      .some(row => row.weekday === weekday && row.dance === dance.id)).map(dance => dance.name);
    return { weekday, name: DAY_NAMES[weekday], today: clock?.weekday === weekday,
      closed, dances: closed ? [] : dances, hours: operatingDay?.hoursLabel ?? "Not confirmed" };
  });
  const mapsUrl = httpUrl(venue.mapsUrl) || (venue.address?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name ?? ""}, ${venue.address}`)}` : "");
  return { clock, week, today: week.find(day => day.today), mapsUrl,
    instagram: httpUrl(venue.instagram), age: checkedAge(venue.sourceChecked, clock) };
}
