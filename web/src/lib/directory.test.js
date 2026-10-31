import assert from "node:assert/strict";
import test from "node:test";
import { filterCapitals } from "./filterCapitals.js";
import {
  CITY_CAPITAL_SELECT,
  HOME_CAPITAL_SELECT,
  loadCached,
  readCapital,
  shapeCapitalList,
  shapeCityCapital,
  shapeHomeCapital,
} from "./directory.js";

test("the home query keeps card and dance fields", () => {
  assert.match(HOME_CAPITAL_SELECT, /iso2/);
  assert.equal(HOME_CAPITAL_SELECT.includes("lat"), false);
  assert.equal(HOME_CAPITAL_SELECT.includes("lng"), false);
  assert.match(HOME_CAPITAL_SELECT, /venue_dances \(dance\)/);
  assert.equal(HOME_CAPITAL_SELECT.includes("venue_hours"), false);
  assert.equal(HOME_CAPITAL_SELECT.includes("venue_night_dances"), false);
  assert.equal(HOME_CAPITAL_SELECT.includes("venue_sources"), false);
  assert.equal(HOME_CAPITAL_SELECT.includes("hours_text"), false);
  assert.equal(HOME_CAPITAL_SELECT.includes("source_checked"), false);
});

test("the city query keeps one city's bars, dances, hours, and sources", () => {
  assert.match(CITY_CAPITAL_SELECT, /venue_dances \(dance\)/);
  assert.match(CITY_CAPITAL_SELECT, /venue_hours \(weekday, hours_text, opens, closes, is_closed\)/);
  assert.match(CITY_CAPITAL_SELECT, /venue_night_dances \(weekday, dance\)/);
  assert.match(CITY_CAPITAL_SELECT, /venue_sources \(kind, url, checked_at\)/);
});

test("a city read asks for that id and returns null when it is missing", async () => {
  const calls = [];
  const result = await readCapital("missing", {
    eq(column, value) {
      calls.push([column, value]);
      return this;
    },
    async maybeSingle() {
      calls.push(["one"]);
      return { data: null, error: null };
    },
  });
  assert.equal(result, null);
  assert.deepEqual(calls, [["id", "missing"], ["one"]]);
});

test("home cities stay in continent order and a permanently closed bar is left out", () => {
  const capitals = shapeCapitalList([
    { id: "paris", city: "Paris", country: "France", continent: "europe", image: "https://example.com/paris.jpg", venues: [] },
    {
      id: "seoul",
      city: "Seoul",
      country: "South Korea",
      continent: "asia",
      image: "https://example.com/seoul.jpg",
      venues: {
        id: "closed",
        capital_id: "seoul",
        status: "permanently_closed",
        venue_dances: [{ dance: "salsa" }, { dance: "bachata" }],
      },
    },
    { id: "hanoi", city: "Hanoi", country: "Vietnam", continent: "asia", image: "https://example.com/hanoi.jpg", venues: [] },
  ]);
  assert.deepEqual(capitals.map((capital) => capital.id), ["hanoi", "seoul", "paris"]);
  assert.deepEqual(capitals[1].venues, []);
  assert.equal(capitals[1].venue, null);
  assert.deepEqual(filterCapitals(capitals, { dance: "salsa" }), []);
  assert.equal(capitals[0].venues.length, 0);
  assert.equal(capitals[0].venue, null);
});

test("a home city drops another city's bar", () => {
  const capital = shapeHomeCapital({
    id: "seoul",
    city: "Seoul",
    country: "South Korea",
    continent: "asia",
    image: "https://example.com/seoul.jpg",
    venues: [
      { id: "other", capital_id: "hanoi", status: "operating", venue_dances: [{ dance: "salsa" }] },
      { id: "here", capital_id: "seoul", status: "planned", venue_dances: [{ dance: "bachata" }] },
    ],
  });
  assert.equal(capital.iso2, "");
  assert.deepEqual(capital.venues, [{ id: "here", name: "", status: "planned", dances: ["bachata"] }]);
});

test("a city page keeps hours, schedule, and source kind in venue name order", () => {
  const capital = shapeCityCapital({
    id: "seoul",
    city: "Seoul",
    country: "South Korea",
    continent: "asia",
    timezone: "Asia/Seoul",
    image: "https://example.com/seoul.jpg",
    venues: [
      {
        id: "b",
        capital_id: "seoul",
        name: "Bravo",
        address: "2",
        phone: "",
        website: "https://bravo.example",
        instagram_url: "",
        maps_url: "https://maps.example/bravo",
        source: "google_maps",
        source_checked: "2026-10-01",
        source_note: "",
        status: "operating",
        venue_dances: [{ dance: "kizomba" }],
        venue_hours: [{ weekday: 5, hours_text: "9 PM–2 AM" }],
        venue_night_dances: [{ weekday: 5, dance: "kizomba" }],
        venue_sources: [{ kind: "website" }],
      },
      {
        id: "a",
        capital_id: "hanoi",
        name: "Away",
        status: "operating",
      },
      {
        id: "c",
        capital_id: "seoul",
        name: "Alpha",
        status: "operating",
        venue_dances: [],
        venue_hours: [{ weekday: 1, hours_text: "Closed" }],
        venue_night_dances: [],
        venue_sources: [{ kind: "google_maps" }],
      },
    ],
  });
  assert.deepEqual(capital.venues.map((venue) => venue.id), ["c", "b"]);
  assert.equal(capital.timezone, "Asia/Seoul");
  assert.deepEqual(capital.venues[0].hours, [{ weekday: 1, text: "Closed", opens: null, closes: null, closed: false }]);
  assert.deepEqual(capital.venues[0].sources, [{ kind: "google_maps" }]);
  assert.equal(capital.venues[1].website, "https://bravo.example");
  assert.equal(capital.venues[1].mapsUrl, "https://maps.example/bravo");
  assert.equal(capital.venues[1].sourceChecked, "2026-10-01");
  assert.deepEqual(capital.venues[1].nightDances, [{ weekday: 5, dance: "kizomba" }]);
});

test("an empty city has no venues", () => {
  const capital = shapeCityCapital({
    id: "ankara",
    city: "Ankara",
    country: "Turkey",
    continent: "asia",
    timezone: "Europe/Istanbul",
    image: "https://example.com/ankara.jpg",
    venues: [],
  });
  assert.deepEqual(capital.venues, []);
  assert.equal(capital.venue, null);
});

test("the same key reuses one request", async () => {
  const store = new Map();
  let calls = 0;
  const create = async () => {
    calls += 1;
    return "row";
  };
  const first = loadCached(store, "seoul", create);
  const second = loadCached(store, "seoul", create);
  assert.equal(first, second);
  assert.equal(await first, "row");
  assert.equal(await loadCached(store, "seoul", create), "row");
  assert.equal(calls, 1);
});

test("a failed request can be tried again", async () => {
  const store = new Map();
  let calls = 0;
  await assert.rejects(
    () => loadCached(store, "seoul", async () => {
      calls += 1;
      throw new Error("down");
    }),
    /down/,
  );
  assert.equal(store.size, 0);
  assert.equal(await loadCached(store, "seoul", async () => {
    calls += 1;
    return "ok";
  }), "ok");
  assert.equal(calls, 2);
});
