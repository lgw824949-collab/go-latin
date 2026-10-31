export function venueRows(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

export function venuesForCapital(capitalId, value) {
  return venueRows(value).filter((venue) => {
    if (!capitalId || venue?.capital_id == null || venue.capital_id === "") return true;
    return venue.capital_id === capitalId;
  });
}

export function byVenueName(a, b) {
  const name = String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "ko");
  if (name !== 0) return name;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

export function cityVenueList(capitalId, value) {
  return venuesForCapital(capitalId, value).sort(byVenueName);
}
