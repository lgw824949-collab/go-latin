import { DANCES } from "./filterCapitals.js";
import { adminClient } from "./admin.js";
import { hoursAreCurrent } from "./hoursFreshness.js";

export const STATUS_FILTERS = [
  { id: "", name: "All" },
  { id: "operating", name: "Active" },
  { id: "temporarily_closed", name: "Temporarily Closed" },
  { id: "permanently_closed", name: "Closed" },
  { id: "unknown", name: "Unknown" },
];

export const VERIFICATION_FILTERS = [
  { id: "", name: "All" },
  { id: "recent", name: "Recently checked" },
  { id: "needs", name: "Needs verification" },
  { id: "not_confirmed", name: "Not confirmed" },
];

const STATUS_LABEL = {
  operating: "Active",
  temporarily_closed: "Temporarily Closed",
  permanently_closed: "Closed",
  unknown: "Unknown",
  planned: "Planned",
};

export function statusLabel(status) {
  return STATUS_LABEL[status] ?? status;
}

export function verificationOf(bar, today = new Date()) {
  const recent = hoursAreCurrent(bar.lastChecked, today);
  const notConfirmed = bar.nightDances.length === 0;
  return {
    recent,
    needs: !recent,
    notConfirmed,
    label: [recent ? "Recently checked" : "Needs verification", notConfirmed ? "Not confirmed" : null]
      .filter(Boolean)
      .join(" · "),
  };
}

export function filterBars(bars, filters, today = new Date()) {
  const query = filters.query.trim().toLowerCase();
  return bars.filter((bar) => {
    const name = (bar.name ?? "").toLowerCase();
    const city = (bar.city ?? "").toLowerCase();
    if (query && !name.includes(query) && !city.includes(query)) return false;
    if (filters.city && bar.capitalId !== filters.city) return false;
    if (filters.dance && !bar.dances.includes(filters.dance)) return false;
    if (filters.status && bar.status !== filters.status) return false;
    const check = verificationOf(bar, today);
    if (filters.verification === "recent" && !check.recent) return false;
    if (filters.verification === "needs" && !check.needs) return false;
    if (filters.verification === "not_confirmed" && !check.notConfirmed) return false;
    return true;
  });
}

export async function loadManagedBars() {
  const supabase = adminClient();
  const { data, error } = await supabase.from("venues").select(`
    id, name, status, confidence, source_checked, website, instagram_url, maps_url,
    capitals (id, city, country),
    venue_dances (dance),
    venue_night_dances (weekday, dance),
    venue_sources (kind, url, checked_at)
  `);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => {
      const city = Array.isArray(row.capitals) ? row.capitals[0] : row.capitals;
      return {
        id: row.id,
        capitalId: city?.id ?? "",
        city: city?.city ?? "",
        country: city?.country ?? "",
        name: row.name,
        status: row.status,
        confidence: row.confidence,
        lastChecked: row.source_checked,
        website: row.website,
        instagram: row.instagram_url,
        mapsUrl: row.maps_url,
        dances: (row.venue_dances ?? []).map((item) => item.dance),
        nightDances: row.venue_night_dances ?? [],
        sources: (row.venue_sources ?? []).map((item) => ({
          kind: item.kind,
          url: item.url,
          checkedAt: item.checked_at,
        })),
      };
    })
    .sort((a, b) => (a.city ?? "").localeCompare(b.city ?? "") || (a.name ?? "").localeCompare(b.name ?? ""));
}

export function danceNames(ids) {
  return ids
    .map((id) => DANCES.find((dance) => dance.id === id)?.name ?? id)
    .join(" · ");
}

const SOURCE_LABEL = {
  google_maps: "Google Maps",
  website: "Website",
  instagram: "Instagram",
  local: "Local source",
  friend: "Direct confirmation",
  other: "Other",
};

export function sourceSummary(sources) {
  return (sources ?? [])
    .map((source) => {
      const name = SOURCE_LABEL[source.kind] ?? source.kind;
      return source.checkedAt ? `${name} ${checkedLabel(source.checkedAt)}` : name;
    })
    .join(" · ");
}

export function checkedLabel(iso) {
  if (!iso) return "Not checked";
  const [year, month, day] = String(iso).slice(0, 10).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = months[Number(month) - 1];
  if (!year || !monthName || !day) return "Not checked";
  return `${Number(day)} ${monthName} ${year}`;
}

export { DANCES };
