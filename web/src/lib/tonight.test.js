import assert from "node:assert/strict";
import test from "node:test";
import { assessVenue, cityClock, sevenDaySchedule, tonightHoursStatus, tonightLocalTime } from "./tonight.js";

const venue = (hours = [], extra = {}) => ({
  status: "operating", sourceChecked: "2026-11-08", hours, nightDances: [], ...extra,
});
const boundary = new Date("2026-11-08T16:00:00Z");

test("Seoul uses Monday while Bangkok and Hanoi still use Sunday at the same instant", () => {
  for (const [id, zone, day, weekday, time] of [
    ["seoul", "Asia/Seoul", 9, 1, "01:00"],
    ["bangkok", "Asia/Bangkok", 8, 0, "23:00"],
    ["hanoi", "Asia/Ho_Chi_Minh", 8, 0, "23:00"],
  ]) {
    const clock = tonightLocalTime({ id, timezone: "UTC" }, boundary);
    assert.equal(clock.timeZone, zone);
    assert.equal(clock.day, day);
    assert.equal(clock.weekday, weekday);
    assert.equal(clock.time, time);
  }
});

test("each city's midnight rolls its calendar and seven-day schedule forward", () => {
  for (const [id, instant] of [
    ["seoul", "2026-11-08T15:00:00Z"],
    ["bangkok", "2026-11-08T17:00:00Z"],
    ["hanoi", "2026-11-08T17:00:00Z"],
  ]) {
    const before = tonightLocalTime({ id }, new Date(Date.parse(instant) - 1));
    const after = tonightLocalTime({ id }, new Date(instant));
    assert.equal(before.time, "23:59");
    assert.equal(after.time, "00:00");
    assert.equal(before.day, 8);
    assert.equal(after.day, 9);
    assert.equal(sevenDaySchedule(venue(), before)[0].date, "2026-11-08");
    assert.equal(sevenDaySchedule(venue(), after)[0].date, "2026-11-09");
  }
});

test("missing or invalid timezone is Not confirmed rather than the browser timezone", () => {
  assert.equal(tonightLocalTime({}, boundary), null);
  assert.equal(tonightLocalTime({ timezone: "invalid" }, boundary), null);
  assert.equal(tonightHoursStatus(venue(), null).statusText, "Not confirmed");
  assert.deepEqual(sevenDaySchedule(venue(), null), []);
});

test("previous evening remains open after midnight even when the new day is Closed", () => {
  const bar = venue([
    { weekday: 0, opens: "19:00", closes: "02:00" },
    { weekday: 1, closed: true },
  ], { nightDances: [{ weekday: 0, dance: "bachata" }] });
  const assessment = assessVenue(bar, cityClock("Asia/Seoul", boundary));
  assert.equal(assessment.badge, "OPEN NOW");
  assert.equal(assessment.hoursLabel, "19:00–02:00");
  assert.deepEqual(assessment.dances, ["bachata"]);
  assert.equal(tonightHoursStatus(bar, cityClock("Asia/Seoul", new Date("2026-11-08T17:00:00Z"))).statusText, "Closed");
});

test("text-based overnight hours work at opening, midnight, and exact closing", () => {
  const bar = venue([{ weekday: 0, text: "7 PM–2 AM" }, { weekday: 1, closed: true }]);
  const at = iso => tonightHoursStatus(bar, cityClock("Asia/Bangkok", new Date(iso)));
  assert.equal(at("2026-11-08T11:59:00Z").badge, "OPEN TONIGHT");
  assert.equal(at("2026-11-08T12:00:00Z").badge, "OPEN NOW");
  assert.equal(at("2026-11-08T17:00:00Z").badge, "OPEN NOW");
  assert.equal(at("2026-11-08T18:59:00Z").badge, "OPEN NOW");
  assert.equal(at("2026-11-08T19:00:00Z").statusText, "Closed");
});

test("seven dates start on the city's current day and distinguish Closed and missing data", () => {
  const clock = tonightLocalTime({ id: "seoul" }, boundary);
  const schedule = sevenDaySchedule(venue([
    { weekday: 1, closed: true },
    { weekday: 2, text: "7 PM–2 AM" },
    { weekday: 3, text: "unverified text" },
    { weekday: 4, text: "Open 24 hours" },
    { weekday: 5, opens: "18:30", closes: "23:45" },
    { weekday: 6, text: "Closed" },
  ]), clock);
  assert.equal(schedule.length, 7);
  assert.equal(schedule[0].date, "2026-11-09");
  assert.equal(schedule[6].date, "2026-11-15");
  assert.deepEqual(schedule.map(day => day.hoursLabel), [
    "Closed", "19:00–02:00 (+1 day)", "Not confirmed", "00:00–24:00",
    "18:30–23:45", "Closed", "Not confirmed",
  ]);
});

test("split shifts are both retained and mark only the overnight range", () => {
  const clock = tonightLocalTime({ id: "seoul" }, boundary);
  const schedule = sevenDaySchedule(venue([{ weekday: 1, text: "12 PM–3 PM, 7 PM–2 AM" }]), clock);
  assert.equal(schedule[0].hoursLabel, "12:00–15:00, 19:00–02:00 (+1 day)");
});

test("stale, future-dated, and missing verification dates never become confirmed hours", () => {
  const clock = tonightLocalTime({ id: "seoul" }, boundary);
  for (const sourceChecked of ["2026-09-29", "2026-11-10", null]) {
    const bar = venue([{ weekday: 1, text: "7 PM–2 AM" }], { sourceChecked });
    assert.equal(tonightHoursStatus(bar, clock).statusText, "Not confirmed");
    assert.ok(sevenDaySchedule(bar, clock).every(day => day.hoursLabel === "Not confirmed"));
  }
});

test("weekly freshness uses today's verification snapshot rather than aging future weekdays", () => {
  const clock = tonightLocalTime({ id: "seoul" }, boundary);
  const bar = venue([{ weekday: 0, text: "7 PM–2 AM" }], { sourceChecked: "2026-11-02" });
  assert.equal(sevenDaySchedule(bar, clock)[6].hoursLabel, "19:00–02:00 (+1 day)");
});

test("temporary closure is Closed and a planned or unknown venue is not confirmed", () => {
  const clock = tonightLocalTime({ id: "seoul" }, boundary);
  const closed = venue([], { status: "temporarily_closed", sourceChecked: null });
  assert.equal(tonightHoursStatus(closed, clock).statusText, "Closed");
  assert.ok(sevenDaySchedule(closed, clock).every(day => day.hoursLabel === "Closed"));
  for (const status of ["planned", "unknown"]) {
    assert.ok(sevenDaySchedule(venue([{ weekday: 1, text: "7 PM–2 AM" }], { status }), clock)
      .every(day => day.hoursLabel === "Not confirmed"));
  }
});

test("seven local calendar dates cross month, year, and leap-day boundaries", () => {
  for (const [instant, first, last] of [
    ["2026-12-30T16:00:00Z", "2026-12-31", "2027-01-06"],
    ["2028-02-27T16:00:00Z", "2028-02-28", "2028-03-05"],
  ]) {
    const days = sevenDaySchedule(venue(), tonightLocalTime({ id: "seoul" }, new Date(instant)));
    assert.equal(days[0].date, first);
    assert.equal(days[6].date, last);
    assert.equal(new Set(days.map(day => day.date)).size, 7);
  }
});
