export const PILOT_TIMEZONES = Object.freeze({
  seoul: "Asia/Seoul",
  bangkok: "Asia/Bangkok",
  hanoi: "Asia/Ho_Chi_Minh",
});
export const ALLOWED_GENRES = Object.freeze(["salsa", "bachata", "kizomba", "mixed"]);
export function cityNowParts(city, now = new Date()) {
  const timezone = PILOT_TIMEZONES[city];
  if (!timezone) throw new Error("Unsupported pilot city.");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
export function isUpcomingParty(party, city, now = new Date()) {
  if (party.city_slug !== city) return false;
  if (party.status && party.status !== "approved") return false;
  const clock = cityNowParts(city, now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(party.event_date ?? "") || !/^\d{2}:\d{2}/.test(party.start_time ?? "")) return false;
  return party.event_date > clock.date || (party.event_date === clock.date && party.start_time.slice(0, 5) >= clock.time);
}
export function validateQuickParty(form, now = new Date()) {
  const errors = [];
  if (!PILOT_TIMEZONES[form.city]) errors.push("Choose a supported city.");
  if (!form.poster || !["image/jpeg", "image/png", "image/webp"].includes(form.poster.type) || form.poster.size > 5 * 1024 * 1024 || form.poster.size <= 0) errors.push("Choose a JPG, PNG or WEBP poster up to 5 MB.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date ?? "") || !/^\d{2}:\d{2}$/.test(form.time ?? "")) errors.push("Enter a valid date and time.");
  else if (PILOT_TIMEZONES[form.city] && !isUpcomingParty({ city_slug: form.city, event_date: form.date, start_time: form.time }, form.city, now)) errors.push("Choose a future start time in the event city's timezone.");
  if (!Array.isArray(form.genres) || !form.genres.length || form.genres.some((genre) => !ALLOWED_GENRES.includes(genre.toLowerCase()))) errors.push("Choose at least one valid genre.");
  if (!form.venue?.trim() || form.venue.trim().length > 160) errors.push("Enter a venue name (up to 160 characters).");
  if (!form.sns?.trim() || form.sns.trim().length > 500) errors.push("Enter a contact SNS (up to 500 characters).");
  return errors;
}
