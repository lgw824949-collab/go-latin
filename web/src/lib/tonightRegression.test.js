import assert from "node:assert/strict";
import test from "node:test";
import { watchLocalClock } from "./useLocalNow.js";
import { sevenDaySchedule, tonightHoursStatus, tonightLocalTime } from "./tonight.js";

test("conflicting structured and text hours cannot advertise opening or spill into the next day", () => {
  for (const id of ["seoul", "bangkok", "hanoi"]) {
    const clock = tonightLocalTime({ id }, new Date("2026-10-26T12:00:00Z"));
    for (const text of ["Closed", "Open 24 hours", "7 PM–3 AM"]) {
      const venue = { status: "operating", sourceChecked: "2026-10-26", hours: [
        { weekday: 1, opens: "18:00", closes: "02:00", text },
      ] };
      for (const minutes of [17 * 60, 20 * 60]) {
        const status = tonightHoursStatus(venue, { ...clock, weekday: 1, minutes });
        assert.equal(status.badge, null);
        assert.equal(status.statusText, "Not confirmed");
      }
      assert.equal(sevenDaySchedule(venue, clock)[0].hoursLabel, "Not confirmed");
      assert.equal(tonightHoursStatus(venue, { ...clock, weekday: 2, minutes: 60 }).openNow, false);
    }
  }
});

test("explicit unknown overrides clock fields and closed flags before opening and during service", () => {
  for (const id of ["seoul", "bangkok", "hanoi"]) {
    for (const minutes of [17 * 60, 20 * 60]) {
      const clock = { ...tonightLocalTime({ id }, new Date("2026-10-26T12:00:00Z")), weekday: 1, minutes };
      for (const closed of [false, true]) {
        const venue = { status: "operating", sourceChecked: "2026-10-26", hours: [
          { weekday: 1, text: " Not confirmed ", opens: "18:00", closes: "02:00", closed },
        ] };
        assert.equal(tonightHoursStatus(venue, clock).badge, null);
        assert.equal(tonightHoursStatus(venue, clock).statusText, "Not confirmed");
        assert.equal(sevenDaySchedule(venue, clock)[0].hoursLabel, "Not confirmed");
      }
    }
  }
});

test("unknown previous night cannot spill into the following morning", () => {
  const clock = { ...tonightLocalTime({ id: "hanoi" }, new Date("2026-10-27T00:00:00Z")), weekday: 2, minutes: 60 };
  const venue = { status: "operating", sourceChecked: "2026-10-26", hours: [
    { weekday: 1, text: "Not confirmed", opens: "18:00", closes: "02:00" },
  ] };
  assert.equal(tonightHoursStatus(venue, clock).openNow, false);
});

test("overnight current and upcoming badges show following-day close, same-day badges do not", () => {
  const clock = tonightLocalTime({ id: "hanoi" }, new Date("2026-10-26T12:00:00Z"));
  const venue = { status: "operating", sourceChecked: "2026-10-26", hours: [
    { weekday: 1, opens: "18:00", closes: "02:00" },
  ] };
  for (const minutes of [17 * 60, 20 * 60]) {
    const status = tonightHoursStatus(venue, { ...clock, minutes });
    assert.equal(status.badge, minutes < 1080 ? "OPEN TONIGHT" : "OPEN NOW");
    assert.equal(status.hoursLabel, "18:00–02:00 (+1 day)");
  }
  assert.equal(tonightHoursStatus(venue, { ...clock, weekday: 2, minutes: 60 }).hoursLabel, "18:00–02:00 (+1 day)");
  venue.hours[0].closes = "23:00";
  assert.equal(tonightHoursStatus(venue, clock).hoursLabel, "18:00–23:00");
});

test("30-second tick and focus return advance local dates, seven-day schedule and freshness in all three cities", () => {
  for (const [id, midnight] of [["seoul", "2026-11-08T15:00:00Z"], ["bangkok", "2026-11-08T17:00:00Z"], ["hanoi", "2026-11-08T17:00:00Z"]]) {
    let time = new Date(Date.parse(midnight) - 1000);
    let shown = time;
    let tick, focus, cleared, removed;
    const target = {
      setInterval(fn, ms) { assert.equal(ms, 30000); tick = fn; return 42; },
      clearInterval(id) { cleared = id; },
      addEventListener(event, fn) { assert.equal(event, "focus"); focus = fn; },
      removeEventListener(event, fn) { assert.equal(event, "focus"); removed = fn; },
    };
    const stop = watchLocalClock(target, value => { shown = value; }, () => time);
    const venue = { status: "operating", sourceChecked: "2026-11-01", hours: [
      { weekday: 0, opens: "18:00", closes: "02:00" }, { weekday: 1, opens: "18:00", closes: "02:00" },
    ] };
    assert.equal(tonightLocalTime({ id }, shown).day, 8);
    assert.notEqual(sevenDaySchedule(venue, tonightLocalTime({ id }, shown))[0].hoursLabel, "Not confirmed");
    time = new Date(midnight); tick();
    assert.equal(tonightLocalTime({ id }, shown).day, 9);
    const schedule = sevenDaySchedule(venue, tonightLocalTime({ id }, shown));
    assert.equal(schedule.length, 7);
    assert.equal(schedule[0].date, "2026-11-09");
    assert.equal(schedule[0].hoursLabel, "Not confirmed");
    time = new Date(Date.parse(midnight) + 86400000); focus();
    assert.equal(tonightLocalTime({ id }, shown).day, 10);
    stop(); assert.equal(cleared, 42); assert.equal(removed, focus);
  }
});
