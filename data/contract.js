export const CONTINENTS = [
  { id: "asia", name: "Asia" },
  { id: "europe", name: "Europe" },
  { id: "africa", name: "Africa" },
  { id: "north_america", name: "North America" },
  { id: "south_america", name: "South America" },
  { id: "oceania", name: "Oceania" },
];

export const DANCES = [
  { id: "bachata", name: "Bachata" },
  { id: "kizomba", name: "Kizomba" },
  { id: "salsa", name: "Salsa" },
];

const CONTINENT_IDS = new Set(CONTINENTS.map((item) => item.id));
const DANCE_IDS = new Set(DANCES.map((item) => item.id));
const VENUE_STATUS = new Set(["planned", "operating", "permanently_closed"]);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG_RE = /^[a-z0-9_]+$/;

export function filterCapitals(capitals, { dance, continent } = {}) {
  return capitals.filter((capital) => {
    if (continent && capital.continent !== continent) return false;
    if (!dance) return true;
    return dancesOf(capital).includes(dance);
  });
}

function dancesOf(capital) {
  const dances = [];
  if (Array.isArray(capital.venues)) {
    for (const venue of capital.venues) {
      if (Array.isArray(venue?.dances)) dances.push(...venue.dances);
    }
  }
  if (Array.isArray(capital.venue?.dances)) dances.push(...capital.venue.dances);
  return dances;
}

export function assertCapital(capital, index = 0) {
  const where = capital?.id ?? `#${index}`;
  const fail = (message) => {
    throw new Error(`${where}: ${message}`);
  };

  if (!capital || typeof capital !== "object") fail("must be an object");
  if (!SLUG_RE.test(capital.id ?? "")) fail("id must be a lowercase slug");
  for (const key of ["city", "country", "timezone"]) {
    if (typeof capital[key] !== "string" || capital[key].trim() === "") {
      fail(`${key} is required`);
    }
  }
  if (typeof capital.iso2 !== "string" || !/^[A-Z]{2}$/.test(capital.iso2)) {
    fail("iso2 must be two uppercase letters");
  }
  if (!CONTINENT_IDS.has(capital.continent)) fail("unknown continent");
  if (typeof capital.lat !== "number" || capital.lat < -90 || capital.lat > 90) {
    fail("lat out of range");
  }
  if (typeof capital.lng !== "number" || capital.lng < -180 || capital.lng > 180) {
    fail("lng out of range");
  }
  if (typeof capital.image !== "string" || !capital.image.startsWith("https://")) {
    fail("image must be an https url");
  }
  if (capital.venue != null) assertVenue(capital.venue, fail);
}

function assertVenue(venue, fail) {
  if (typeof venue.name !== "string" || venue.name.trim() === "") fail("venue.name is required");
  if (!VENUE_STATUS.has(venue.status)) fail("venue.status is invalid");
  if (!Array.isArray(venue.dances) || venue.dances.length === 0) {
    fail("venue.dances needs at least one dance");
  }
  if (venue.dances.some((dance) => !DANCE_IDS.has(dance))) fail("unknown dance");
  if (new Set(venue.dances).size !== venue.dances.length) fail("duplicate dance");
  if (venue.nights != null) {
    if (!Array.isArray(venue.nights)) fail("venue.nights must be an array");
    for (const night of venue.nights) {
      if (!Number.isInteger(night.weekday) || night.weekday < 0 || night.weekday > 6) {
        fail("weekday must be 0-6");
      }
      if (!DANCE_IDS.has(night.dance)) fail("night dance is invalid");
      if (night.startsAt != null && !TIME_RE.test(night.startsAt)) fail("startsAt must be HH:MM");
    }
  }
  if (venue.hours != null) assertHours(venue.hours, fail);
  if (venue.sourceChecked != null && !/^\d{4}-\d{2}-\d{2}$/.test(venue.sourceChecked)) {
    fail("sourceChecked must be YYYY-MM-DD");
  }
  if (typeof venue.mapsUrl === "string" && !opensPlace(venue.mapsUrl)) {
    fail("mapsUrl does not open a place");
  }
}

function opensPlace(url) {
  return url.startsWith("https://www.google.com/maps/place/") && (url.includes("@") || url.includes("!3m1!4b1"));
}

function assertHours(hours, fail) {
  if (!Array.isArray(hours) || hours.length === 0) fail("hours must list the week");
  const days = new Set();
  for (const row of hours) {
    if (!Number.isInteger(row.weekday) || row.weekday < 0 || row.weekday > 6) {
      fail("hours weekday must be 0-6");
    }
    if (days.has(row.weekday)) fail("duplicate hours weekday");
    days.add(row.weekday);
    if (typeof row.text !== "string" || row.text.trim() === "") fail("hours text is required");
  }
}
