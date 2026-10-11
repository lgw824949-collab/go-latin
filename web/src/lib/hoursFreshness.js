// Shared window for door-hour freshness and the admin verification filter.
export const HOURS_FRESH_DAYS = 7;

export function hoursAreCurrent(iso, today = new Date()) {
  const days = daysSinceCheck(iso, today);
  return days != null && days >= 0 && days <= HOURS_FRESH_DAYS;
}

function daysSinceCheck(iso, today) {
  const checked = parseIsoDate(iso);
  if (!checked) return null;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const checkedUtc = Date.UTC(checked.year, checked.month - 1, checked.day);
  return Math.round((todayUtc - checkedUtc) / 86400000);
}

function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}
