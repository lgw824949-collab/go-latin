import { cityNowParts, isUpcomingParty } from "./quickPartyRules.js";
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

export const QUICK_PARTY_PAGE_SIZE = 50;

export async function loadQuickParties(city, now = new Date(), page = 0) {
  if (!Number.isSafeInteger(page) || page < 0) throw new Error("Invalid party page.");
  const selected = QUICK_CITIES.find((row) => row.id === city);
  if (!selected) throw new Error("Unsupported pilot city.");
  const { data, error } = await adminClient()
    .from("quick_party_submissions")
    .select("id, city_slug, status, event_date, start_time, dance_genres, venue_name, contact_sns")
    .eq("city_slug", selected.id)
    .eq("status", "approved")
    .gte("event_date", cityNowParts(city, now).date)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })
    .order("id", { ascending: true })
    .range(page * QUICK_PARTY_PAGE_SIZE, (page + 1) * QUICK_PARTY_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return {
    rows: (data ?? []).filter((party) => isUpcomingParty(party, city, now)),
    // Pagination is based on database rows, not rows filtered out as already started.
    hasMore: (data ?? []).length === QUICK_PARTY_PAGE_SIZE,
  };
}
