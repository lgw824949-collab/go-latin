import assert from "node:assert/strict";
import test from "node:test";
import { buildHourRow } from "./admin.js";
import { hoursAreCurrent } from "./hoursFreshness.js";
import { assessDoor, assessVenue, cityCalendarDate, cityClock } from "./tonight.js";

const instant = new Date("2026-10-12T15:30:00Z");

test("an evening open and a close after midnight stay on the same row", () => {
  const row = buildHourRow({
    weekday: 1,
    closed: false,
    opens: "18:00",
    closes: "02:00",
    originalOpens: "",
    originalCloses: "",
    text: "",
  });
  assert.equal(row.is_closed, false);
  assert.equal(row.opens, "18:00");
  assert.equal(row.closes, "02:00");
  assert.equal(row.hours_text, "6 PM–2 AM");
});

test("an unchanged overnight note is kept when the clock fields are empty", () => {
  const row = buildHourRow({
    weekday: 1,
    closed: false,
    opens: "",
    closes: "",
    originalOpens: "",
    originalCloses: "",
    text: "7 PM–2 AM",
  });
  assert.equal(row.hours_text, "7 PM–2 AM");
  assert.equal(row.opens, null);
  assert.equal(row.closes, null);
  assert.equal(row.is_closed, false);
});

test("a closed day clears the clock and records Closed", () => {
  const row = buildHourRow({
    weekday: 2,
    closed: true,
    opens: "18:00",
    closes: "02:00",
    text: "6 PM–2 AM",
  });
  assert.deepEqual(
    { is_closed: row.is_closed, opens: row.opens, closes: row.closes, hours_text: row.hours_text },
    { is_closed: true, opens: null, closes: null, hours_text: "Closed" },
  );
});

test("clearing Closed without new hours leaves the day unconfirmed", () => {
  const row = buildHourRow({
    weekday: 2,
    closed: false,
    opens: "",
    closes: "",
    originalOpens: "",
    originalCloses: "",
    text: "Closed",
  });
  assert.equal(row.is_closed, false);
  assert.equal(row.hours_text, "");
  assert.equal(row.opens, null);
  assert.equal(row.closes, null);
});

test("structured overnight hours stay open after midnight", () => {
  const door = assessDoor(
    [{ weekday: 1, closed: false, opens: "19:00", closes: "02:00", text: "7 PM–2 AM" }],
    2,
    60,
  );
  assert.equal(door.kind, "open");
  assert.equal(door.sessionWeekday, 1);
  assert.ok(door.closes < door.opens);
});

test("overnight text is read the same way when clock fields are empty", () => {
  const door = assessDoor(
    [{ weekday: 1, closed: false, opens: null, closes: null, text: "7 PM–2 AM" }],
    2,
    60,
  );
  assert.equal(door.kind, "open");
  assert.equal(door.sessionWeekday, 1);
});

test("a closed flag is shut and a blank day is unconfirmed", () => {
  const closed = assessDoor([{ weekday: 3, closed: true, opens: null, closes: null, text: "7 PM–2 AM" }], 3, 12 * 60);
  const blank = assessDoor([{ weekday: 3, closed: false, opens: null, closes: null, text: "" }], 3, 12 * 60);
  const textClosed = assessDoor([{ weekday: 3, closed: false, opens: null, closes: null, text: "Closed" }], 3, 12 * 60);
  assert.equal(closed.kind, "shut");
  assert.equal(blank.kind, "unknown");
  assert.equal(textClosed.kind, "shut");
});

test("Tonight uses the city calendar for the same seven-day check as the city page", () => {
  const seoul = cityCalendarDate("Asia/Seoul", instant);
  const losAngeles = cityCalendarDate("America/Los_Angeles", instant);
  assert.equal(hoursAreCurrent("2026-10-05", seoul), false);
  assert.equal(hoursAreCurrent("2026-10-05", losAngeles), true);
  const clock = cityClock("Asia/Seoul", instant);
  const venue = {
    status: "operating",
    sourceChecked: "2026-10-05",
    hours: [{ weekday: clock.weekday, closed: false, opens: "19:00", closes: "02:00", text: "7 PM–2 AM" }],
    nightDances: [],
  };
  assert.equal(assessVenue(venue, clock).statusText, "Opening hours not confirmed");
});

test("a fresh closed day and a fresh blank day stay distinct on Tonight", () => {
  const clock = { weekday: 3, minutes: 20 * 60, year: 2026, month: 10, day: 12 };
  const closed = assessVenue({
    status: "operating",
    sourceChecked: "2026-10-11",
    hours: [{ weekday: 3, closed: true, text: "Closed" }],
    nightDances: [{ weekday: 3, dance: "salsa" }],
  }, clock);
  const blank = assessVenue({
    status: "operating",
    sourceChecked: "2026-10-11",
    hours: [{ weekday: 3, closed: false, opens: null, closes: null, text: "" }],
    nightDances: [],
  }, clock);
  assert.equal(closed.statusText, "Closed");
  assert.equal(closed.danceText, null);
  assert.equal(closed.danceConfirmed, false);
  assert.deepEqual(closed.dances, []);
  assert.equal(blank.statusText, "Opening hours not confirmed");
});

const mondayClock = { weekday: 1, minutes: 20 * 60, year: 2026, month: 10, day: 12 };
const mondayNight = {
  status: "operating",
  hours: [{ weekday: 1, closed: false, opens: "19:00", closes: "02:00", text: "7 PM–2 AM" }],
  nightDances: [{ weekday: 1, dance: "salsa" }],
};

test("a check within seven days can confirm that night's dance", () => {
  const card = assessVenue({ ...mondayNight, sourceChecked: "2026-10-05" }, mondayClock);
  assert.equal(card.danceConfirmed, true);
  assert.equal(card.danceText, "Salsa Tonight");
  assert.deepEqual(card.dances, ["salsa"]);
});

test("a check older than seven days does not confirm the stored night dance", () => {
  const card = assessVenue({ ...mondayNight, sourceChecked: "2026-10-04" }, mondayClock);
  assert.equal(card.statusText, "Opening hours not confirmed");
  assert.equal(card.danceConfirmed, false);
  assert.equal(card.danceText, "Dance schedule not confirmed");
  assert.deepEqual(card.dances, []);
});

test("a missing check date does not confirm the stored night dance", () => {
  const card = assessVenue({ ...mondayNight, sourceChecked: null }, mondayClock);
  assert.equal(card.statusText, "Opening hours not confirmed");
  assert.equal(card.danceConfirmed, false);
  assert.equal(card.danceText, "Dance schedule not confirmed");
  assert.deepEqual(card.dances, []);
});

test("overnight hours after midnight keep the previous night's dance when the check is current", () => {
  const card = assessVenue({
    status: "operating",
    sourceChecked: "2026-10-12",
    hours: [{ weekday: 1, closed: false, opens: "19:00", closes: "02:00", text: "7 PM–2 AM" }],
    nightDances: [{ weekday: 1, dance: "salsa" }],
  }, { weekday: 2, minutes: 60, year: 2026, month: 10, day: 13 });
  assert.equal(card.openNow, true);
  assert.equal(card.danceConfirmed, true);
  assert.equal(card.danceText, "Salsa Tonight");
  assert.deepEqual(card.dances, ["salsa"]);
});
