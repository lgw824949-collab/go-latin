import assert from "node:assert/strict";
import test from "node:test";
import { homeTonightItems, loadHomeTonight } from "./homeTonight.js";
const now = new Date("2026-11-06T12:00:00Z");
const venue = (id = "a") => ({ id, name: "Test bar", status: "operating", sourceChecked: "2026-11-06", hours: [{ weekday: 5, opens: "18:00", closes: "02:00", closed: false }], nightDances: [{ weekday: 5, dance: "salsa" }] });
const city = (id = "seoul", bars = [venue()]) => ({ id, city: id, venues: bars });

test("home Tonight reuses confirmed local sessions and caps actual results at three", () => {
  const rows = homeTonightItems([city("seoul", [venue("a"), venue("b"), venue("c"), venue("d")])], now);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].start, "18:00");
  assert.equal(rows[0].name, "Test bar");
});
test("home Tonight never replaces a failed city request with an empty successful list", async () => {
  const requested = [];
  await assert.rejects(loadHomeTonight(async id => { requested.push(id); if (id === "bangkok") throw Error("network"); return city(id); }), /network/);
  assert.deepEqual(requested, ["seoul", "bangkok", "hanoi"]);
  assert.deepEqual(await loadHomeTonight(async () => null), [null,null,null]);
});
test("home Tonight keeps missing hours, closed, stale and unconfirmed schedules empty", () => {
  for (const change of [{ hours: [] }, { status: "permanently_closed" }, { sourceChecked: "2020-01-01" }, { nightDances: [] }, { hours: [{ weekday: 5, text: "Not confirmed", opens: "18:00", closes: "02:00" }] }]) {
    assert.deepEqual(homeTonightItems([city("hanoi", [{ ...venue(), ...change }])], now), []);
  }
});
test("home Tonight retains previous-night dances after midnight and removes ended sessions", () => {
  assert.equal(homeTonightItems([city()], new Date("2026-11-06T16:00:00Z")).length, 1);
  assert.equal(homeTonightItems([city()], new Date("2026-11-06T18:00:00Z")).length, 0);
});
test("home Tonight uses the cities' actual local calendar instead of UTC weekday", () => {
  const date = new Date("2026-11-06T15:30:00Z");
  const bar = { ...venue(), hours: [{ weekday: 6, opens: "00:00", closes: "02:00" }], nightDances: [{ weekday: 6, dance: "salsa" }] };
  const rows = homeTonightItems([city("seoul", [bar]), city("bangkok", [bar]), city("hanoi", [bar])], date);
  assert.deepEqual(rows.map(row => row.cityId), ["seoul"]);
});
