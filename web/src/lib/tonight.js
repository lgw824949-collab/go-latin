import { HOURS_FRESH_DAYS } from "./hoursFreshness.js";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DANCE_NAMES = { bachata: "Bachata", kizomba: "Kizomba", salsa: "Salsa" };

export function cityClock(timeZone, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const weekday = WEEKDAY_INDEX[parts.weekday];
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    weekday,
    minutes: hour * 60 + Number(parts.minute),
    year,
    month,
    day,
    label: `${WEEKDAYS[weekday]} · ${day} ${MONTHS[month - 1]} ${year}`,
  };
}

export function assessVenue(venue, clock) {
  const statusText = statusLabel(venue?.status);
  if (statusText) {
    return { openNow: false, badge: null, hoursLabel: null, statusText, danceText: null, danceConfirmed: false, dances: [] };
  }
  if (!hoursCurrent(venue?.sourceChecked, clock)) {
    return { openNow: false, badge: null, hoursLabel: null, statusText: "Opening hours not confirmed", ...danceInfo(venue, clock.weekday, true) };
  }

  const door = assessDoor(venue?.hours, clock.weekday, clock.minutes);
  const dance = danceLine(venue, door.sessionWeekday);
  if (door.kind === "open" || door.kind === "tonight") {
    return {
      openNow: door.kind === "open",
      badge: door.kind === "open" ? "OPEN NOW" : "OPEN TONIGHT",
      hoursLabel: formatWindow(door.opens, door.closes),
      statusText: null,
      danceText: dance.text,
      danceConfirmed: dance.confirmed,
      dances: dance.dances,
    };
  }
  if (door.kind === "unknown") {
    return { openNow: false, badge: null, hoursLabel: null, statusText: "Opening hours not confirmed", ...danceInfo(venue, door.sessionWeekday, true) };
  }
  const keepDance = door.kind === "ended";
  return {
    openNow: false,
    badge: null,
    hoursLabel: formatWindow(door.opens, door.closes),
    statusText: "Closed",
    ...danceInfo(venue, door.sessionWeekday, keepDance),
  };
}

export function assessDoor(hours, weekday, minutes) {
  const previous = previousWeekday(weekday);
  const spill = spillWindow(dayHours(hours, previous), minutes);
  if (spill) {
    return { kind: "open", sessionWeekday: previous, opens: spill.opens, closes: spill.closes };
  }

  const today = dayHours(hours, weekday);
  if (!today.row) return { kind: "unknown", sessionWeekday: weekday, opens: null, closes: null };
  if (today.closed) return { kind: "shut", sessionWeekday: weekday, opens: null, closes: null };
  if (today.allDay) return { kind: "open", sessionWeekday: weekday, opens: 0, closes: 24 * 60 };
  if (today.windows.length === 0) return { kind: "unknown", sessionWeekday: weekday, opens: null, closes: null };

  const current = today.windows.find((window) => containsNow(window, minutes));
  if (current) return { kind: "open", sessionWeekday: weekday, opens: current.opens, closes: current.closes };

  const upcoming = today.windows
    .filter((window) => startsLater(window, minutes))
    .sort((a, b) => a.opens - b.opens)[0];
  if (upcoming) return { kind: "tonight", sessionWeekday: weekday, opens: upcoming.opens, closes: upcoming.closes };

  const finished = [...today.windows].sort((a, b) => b.opens - a.opens)[0];
  return { kind: "ended", sessionWeekday: weekday, opens: finished.opens, closes: finished.closes };
}

export function filterTonight(cards, dance) {
  if (!dance) return cards;
  return cards.filter((card) => card.dances.includes(dance));
}

function statusLabel(status) {
  if (status === "operating") return null;
  if (status === "temporarily_closed") return "Temporarily closed";
  if (status === "planned") return "Opening soon";
  if (status === "permanently_closed") return "Closed";
  return "Venue status not confirmed";
}

function danceInfo(venue, weekday, keep) {
  const dance = danceLine(venue, weekday);
  return {
    danceText: dance.confirmed ? dance.text.replace(/ Tonight$/, "") : dance.text,
    danceConfirmed: dance.confirmed,
    dances: keep ? dance.dances : [],
  };
}

function danceLine(venue, weekday) {
  const ids = [];
  for (const row of venue?.nightDances ?? []) {
    if (row.weekday === weekday && !ids.includes(row.dance)) ids.push(row.dance);
  }
  if (ids.length === 0) {
    return { confirmed: false, dances: [], text: "Dance schedule not confirmed" };
  }
  const names = ids.map((id) => DANCE_NAMES[id] ?? id);
  return { confirmed: true, dances: ids, text: `${names.join(" · ")} Tonight` };
}

function dayHours(hours, weekday) {
  const row = (hours ?? []).find((item) => item.weekday === weekday);
  if (!row) return { row: null, closed: false, allDay: false, windows: [] };
  if (row.closed) return { row, closed: true, allDay: false, windows: [] };
  const structured = clockWindow(row.opens, row.closes);
  if (structured) return { row, closed: false, allDay: false, windows: [structured] };
  const parsed = parseHoursText(row.text);
  if (!parsed) return { row, closed: false, allDay: false, windows: [] };
  if (parsed.closed) return { row, closed: true, allDay: false, windows: [] };
  if (parsed.allDay) return { row, closed: false, allDay: true, windows: [] };
  return { row, closed: false, allDay: false, windows: parsed.windows };
}

function spillWindow(day, minutes) {
  if (!day || day.closed || day.allDay) return null;
  return day.windows.find((window) => window.overnight && minutes < window.closes) ?? null;
}

function containsNow(window, minutes) {
  if (window.overnight) return minutes >= window.opens;
  return minutes >= window.opens && minutes < window.closes;
}

function startsLater(window, minutes) {
  return minutes < window.opens;
}

function clockWindow(opens, closes) {
  const openMinutes = toMinutes(opens);
  const closeMinutes = toMinutes(closes);
  if (openMinutes == null || closeMinutes == null || openMinutes === closeMinutes) return null;
  return { opens: openMinutes, closes: closeMinutes, overnight: closeMinutes < openMinutes };
}

function parseHoursText(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text === "Closed") return { closed: true };
  if (text === "Open 24 hours") return { allDay: true };
  const windows = [];
  for (const segment of text.split(",")) {
    const window = parseRange(segment.trim());
    if (!window) return null;
    windows.push(window);
  }
  return windows.length > 0 ? { windows } : null;
}

function parseRange(segment) {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(segment);
  if (!match) return null;
  let startMeridiem = match[3]?.toUpperCase() ?? "";
  const endMeridiem = match[6]?.toUpperCase() ?? "";
  if (!endMeridiem) return null;
  if (!startMeridiem && endMeridiem === "PM") {
    const asEvening = meridiemMinutes(match[1], match[2], "PM");
    const end = meridiemMinutes(match[4], match[5], "PM");
    if (asEvening == null || end == null || asEvening >= end) return null;
    startMeridiem = "PM";
  } else if (!startMeridiem) {
    return null;
  }
  const opens = meridiemMinutes(match[1], match[2], startMeridiem);
  const closes = meridiemMinutes(match[4], match[5], endMeridiem);
  if (opens == null || closes == null || opens === closes) return null;
  if (opens === 0 && closes > 0 && closes < 12 * 60) return null;
  return { opens, closes, overnight: closes < opens };
}

function meridiemMinutes(hourText, minuteText, meridiem) {
  const hour = Number(hourText);
  const minute = Number(minuteText ?? "0");
  if (hour < 1 || hour > 12 || minute > 59) return null;
  let clockHour = hour % 12;
  if (meridiem === "PM") clockHour += 12;
  return clockHour * 60 + minute;
}

function previousWeekday(weekday) {
  return (weekday + 6) % 7;
}

function toMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatWindow(opens, closes) {
  if (opens == null || closes == null) return null;
  return `${formatMinutes(opens)}–${formatMinutes(closes)}`;
}

function formatMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function hoursCurrent(iso, clock) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!match || !clock?.year) return false;
  const checked = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = Date.UTC(clock.year, clock.month - 1, clock.day);
  const days = Math.round((today - checked) / 86400000);
  return days >= 0 && days <= HOURS_FRESH_DAYS;
}
