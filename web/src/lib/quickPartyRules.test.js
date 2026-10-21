import test from "node:test";
import assert from "node:assert/strict";
import { cityNowParts, isUpcomingParty, validateQuickParty, isValidDate, isValidTime } from "./quickPartyRules.js";

const now = new Date("2026-10-19T16:30:00Z");
test("city-local clocks cross midnight independently", () => {
  assert.deepEqual(cityNowParts("seoul", now), { date: "2026-10-20", time: "01:30" });
  assert.deepEqual(cityNowParts("bangkok", now), { date: "2026-10-19", time: "23:30" });
  assert.deepEqual(cityNowParts("hanoi", now), { date: "2026-10-19", time: "23:30" });
});
test("past today excluded and future local time included", () => {
  assert.equal(isUpcomingParty({city_slug:"seoul",event_date:"2026-10-20",status:"approved",start_time:"01:29:00"}, "seoul", now), false);
  assert.equal(isUpcomingParty({city_slug:"seoul",event_date:"2026-10-20",status:"approved",start_time:"01:31:00"}, "seoul", now), true);
});
test("other city and rejected party excluded", () => {
  assert.equal(isUpcomingParty({city_slug:"hanoi",event_date:"2026-10-21",start_time:"20:00"}, "seoul", now), false);
  assert.equal(isUpcomingParty({city_slug:"seoul",status:"rejected",event_date:"2026-10-21",start_time:"20:00"}, "seoul", now), false);
});
test("validation catches missing poster, venue and genres", () => {
  const errors = validateQuickParty({city:"seoul",date:"2026-10-21",time:"20:00",genres:[],venue:"",sns:""}, now);
  assert.ok(errors.length >= 3);
});
test("valid preview payload passes", () => {
  const errors = validateQuickParty({city:"bangkok",date:"2026-10-21",time:"20:00",genres:["bachata"],venue:"Dance Hall",sns:"@organizer",poster:{type:"image/png",size:1200}}, now);
  assert.deepEqual(errors, []);
});

test("unapproved or missing status is excluded", () => {
  for (const status of [undefined, "pending", "rejected", "cancelled"]) {
    assert.equal(isUpcomingParty({ city_slug:"seoul", status, event_date:"2026-10-21", start_time:"20:00" }, "seoul", now), false);
  }
});
test("invalid dates and times are rejected", () => {
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("2026-02-28"), true);
  assert.equal(isValidTime("25:10"), false);
  assert.equal(isValidTime("23:59"), true);
});

test("approved events with invalid calendar dates or times are hidden", () => {
  for (const [event_date, start_time] of [
    ["2026-02-30", "20:00:00"],
    ["2026-10-21", "24:00:00"],
    ["2026-10-21", "20:60:00"],
    ["2026-10-21", "20:00:60"],
  ]) {
    assert.equal(isUpcomingParty({city_slug:"seoul",status:"approved",event_date,start_time}, "seoul", now), false);
  }
});
test("database time with seconds is accepted and bad genre types return validation errors", () => {
  assert.equal(isValidTime("23:59:59"), true);
  assert.equal(isValidTime("23:59:60"), false);
  const errors = validateQuickParty({
    city:"seoul",date:"2026-10-21",time:"20:00",genres:[null],
    venue:"Dance Hall",sns:"@organizer",poster:{type:"image/png",size:1200},
  }, now);
  assert.ok(errors.includes("Choose at least one valid genre."));
});
