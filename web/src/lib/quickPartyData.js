import { adminClient } from "./admin.js";

export const QUICK_CITIES = [
  { id: "seoul", label: "Seoul", timezone: "Asia/Seoul" },
  { id: "bangkok", label: "Bangkok", timezone: "Asia/Bangkok" },
  { id: "hanoi", label: "Hanoi", timezone: "Asia/Ho_Chi_Minh" },
];

// Compute the current date in the city's timezone, not the visitor's timezone.
export function localDate(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function loadQuickParties(city, now = new Date()) {
  const selected = QUICK_CITIES.find((row) => row.id === city);
  if (!selected) throw new Error("Unsupported pilot city.");
  const { data, error } = await adminClient()
    .from("quick_party_submissions")
    .select("id, city_slug, event_date, start_time, dance_genres, venue_name, contact_sns")
    .eq("city_slug", selected.id)
    .eq("status", "approved")
    .gte("event_date", localDate(selected.timezone, now))
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}
