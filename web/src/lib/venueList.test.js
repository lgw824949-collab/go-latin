import assert from "node:assert/strict";
import test from "node:test";
import { assessVenue, filterTonight } from "./tonight.js";
import { cityVenueList, venueRows } from "./venueList.js";

const clock = { weekday: 1, minutes: 20 * 60, year: 2026, month: 10, day: 12 };

test("a city keeps every bar, including unconfirmed hours and every status", () => {
  const list = cityVenueList("seoul", [
    { id: "b", capital_id: "seoul", name: "Bravo", status: "unknown", hours: [] },
    { id: "a", capital_id: "seoul", name: "Alpha", status: "permanently_closed" },
    { id: "c", capital_id: "seoul", name: "Alpha", status: "planned" },
    { id: "h", capital_id: "hanoi", name: "Hanoi Bar", status: "operating" },
    { id: "d", capital_id: "seoul", name: "Delta", status: "temporarily_closed", hours: null },
  ]);
  assert.deepEqual(list.map((venue) => venue.id), ["a", "c", "b", "d"]);
});

test("one embedded venue object is still one bar", () => {
  const list = cityVenueList("hanoi", { id: "only", capital_id: "hanoi", name: "La Habanera" });
  assert.equal(list.length, 1);
  assert.equal(venueRows(null).length, 0);
});

test("a missing capital id is kept and a different capital is not", () => {
  const list = cityVenueList("seoul", [
    { id: "known", name: "Known" },
    { id: "other", capital_id: "tokyo", name: "Other" },
  ]);
  assert.deepEqual(list.map((venue) => venue.id), ["known"]);
});

test("a dance type without a night row is not tonight's schedule", () => {
  const venue = {
    status: "operating",
    sourceChecked: "2026-10-11",
    dances: ["salsa"],
    hours: [{ weekday: 1, closed: false, opens: "19:00", closes: "23:00", text: "7 PM–11 PM" }],
    nightDances: [],
  };
  const card = assessVenue(venue, clock);
  assert.equal(card.danceConfirmed, false);
  assert.equal(card.danceText, "Dance schedule not confirmed");
  assert.deepEqual(filterTonight([{ ...venue, ...card }], "salsa"), []);
});

test("only the weekday night dance is tonight's schedule", () => {
  const card = assessVenue({
    status: "operating",
    sourceChecked: "2026-10-11",
    dances: ["bachata"],
    hours: [{ weekday: 1, closed: false, opens: "19:00", closes: "23:00", text: "7 PM–11 PM" }],
    nightDances: [{ weekday: 2, dance: "bachata" }, { weekday: 1, dance: "salsa" }],
  }, clock);
  assert.equal(card.danceConfirmed, true);
  assert.equal(card.danceText, "Salsa Tonight");
  assert.deepEqual(card.dances, ["salsa"]);
});

test("a non-operating status keeps its label and does not invent a dance", () => {
  const closed = assessVenue({ status: "permanently_closed", nightDances: [{ weekday: 1, dance: "salsa" }] }, clock);
  const planned = assessVenue({ status: "planned", nightDances: [] }, clock);
  const paused = assessVenue({ status: "temporarily_closed", nightDances: [] }, clock);
  const unknown = assessVenue({ status: "unknown", nightDances: [] }, clock);
  assert.equal(closed.statusText, "Permanently closed");
  assert.equal(closed.danceText, null);
  assert.equal(closed.danceConfirmed, false);
  assert.deepEqual(closed.dances, []);
  assert.equal(planned.statusText, "Opening soon");
  assert.equal(paused.statusText, "Temporarily closed");
  assert.equal(unknown.statusText, "Venue status not confirmed");
});
