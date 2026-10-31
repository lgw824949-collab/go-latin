const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MANAGED_SOURCE_KINDS = ["google_maps", "website", "instagram"];

export function httpUrl(value) {
  const text = value?.trim() ?? "";
  if (!text) return "";
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? text : "";
  } catch {
    return "";
  }
}

export function sourceCheckedLabel(iso) {
  if (!iso) return "";
  const [year, month, day] = String(iso).slice(0, 10).split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!year || !monthName || !day) return "";
  return `${Number(day)} ${monthName} ${year}`;
}

export function sourceLabel(venue) {
  const kinds = (venue?.sources ?? []).map((source) => source.kind);
  const labels = [
    kinds.includes("google_maps") || venue?.source === "google_maps" ? "Google Maps" : null,
    kinds.includes("website") || filled(venue?.website) ? "Website" : null,
    kinds.includes("instagram") || filled(venue?.instagram) ? "Instagram" : null,
  ].filter(Boolean);
  return labels.length > 0 ? `Source: ${labels.join(" · ")}` : "Source: not recorded";
}

export function staleHoursNote(venue) {
  const recorded = sourceLabel(venue);
  if (recorded === "Source: not recorded") {
    return "No source is recorded, so these door hours are not listed as tonight’s schedule.";
  }
  const name = recorded.replace(/^Source: /, "");
  const checked = sourceCheckedLabel(venue?.sourceChecked);
  if (!checked) {
    return `${name}. No check date is recorded, so these door hours are not listed as tonight’s schedule.`;
  }
  return `${name}, checked ${checked}. That check is old, so these door hours are not listed as tonight’s schedule.`;
}

export function venueSourceFields(form) {
  const website = blank(form.website);
  const instagram = blank(form.instagram);
  const mapsUrl = blank(form.mapsUrl);
  return {
    website,
    instagram_url: instagram,
    maps_url: mapsUrl,
    source_url: mapsUrl,
    source_checked: form.lastChecked || null,
  };
}

export function buildSourceRows({ mapsUrl, website, instagram, checked }) {
  const checkedAt = checked || null;
  return [
    ["google_maps", mapsUrl],
    ["website", website],
    ["instagram", instagram],
  ].flatMap(([kind, url]) => (url ? [{ kind, url, checked_at: checkedAt }] : []));
}

export function sourceKindsToRemove(rows) {
  const keep = new Set((rows ?? []).map((row) => row.kind));
  return MANAGED_SOURCE_KINDS.filter((kind) => !keep.has(kind));
}

function filled(value) {
  return Boolean(value?.trim());
}

function blank(value) {
  const text = value?.trim() ?? "";
  return text === "" ? null : text;
}
