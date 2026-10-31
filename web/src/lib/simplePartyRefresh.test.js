import assert from "node:assert/strict";
import test from "node:test";
import { watchSimpleParties } from "./simplePartyRefresh.js";

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(city, instant, load) {
  let now = new Date(instant);
  const states = [];
  let tick, focus, cleared, removed;
  const stop = watchSimpleParties(city, {
    setInterval(fn, ms) { assert.equal(ms, 30000); tick = fn; return 7; },
    clearInterval(id) { cleared = id; },
    addEventListener(event, fn) { assert.equal(event, "focus"); focus = fn; },
    removeEventListener(event, fn) { assert.equal(event, "focus"); removed = fn; },
  }, state => states.push(state), load, () => now);
  return { states, tick: () => tick(), focus: () => focus(), setTime: value => { now = new Date(value); },
    stop: () => { stop(); assert.equal(cleared, 7); assert.equal(removed, focus); } };
}

test("local midnight reloads all three cities and removes previous-date parties", async () => {
  for (const [city, midnight] of [["seoul", "2026-11-08T15:00:00Z"], ["bangkok", "2026-11-08T17:00:00Z"], ["hanoi", "2026-11-08T17:00:00Z"]]) {
    let calls = 0;
    const f = fixture(city, new Date(Date.parse(midnight) - 1000), async id => {
      calls++; assert.equal(id, city);
      return [{ id: "old", capitalId: city, startsAt: new Date(Date.parse(midnight) - 3600000).toISOString() }];
    });
    await flush(); assert.equal(f.states.at(-1).parties.length, 1);
    f.tick(); await flush(); assert.equal(calls, 1);
    f.setTime(midnight); f.tick(); await flush();
    assert.equal(calls, 2); assert.deepEqual(f.states.at(-1).parties, []);
    assert.equal(f.states.at(-1).status, "ready"); f.stop();
  }
});

test("focus reloads admin changes on the same date; failure differs from an empty list", async () => {
  let calls = 0;
  const f = fixture("seoul", "2026-11-08T12:00:00Z", async () => {
    calls++;
    if (calls === 3) throw new Error("Query denied");
    return calls === 1 ? [{ id: "deleted", capitalId: "seoul", startsAt: "2026-11-08T12:00:00Z" }] : [];
  });
  await flush(); assert.equal(f.states.at(-1).parties.length, 1);
  f.focus(); await flush(); assert.equal(calls, 2);
  assert.equal(f.states.at(-1).status, "ready"); assert.equal(f.states.at(-1).error, "");
  f.focus(); await flush(); assert.equal(f.states.at(-1).status, "error");
  assert.equal(f.states.at(-1).error, "Query denied"); f.stop();
});

test("late earlier requests and unmounted city requests cannot replace current results", async () => {
  const pending = [];
  const f = fixture("hanoi", "2026-11-08T12:00:00Z", () => new Promise(resolve => pending.push(resolve)));
  f.focus(); pending[1]([]); await flush();
  const count = f.states.length;
  pending[0]([{ id: "stale", capitalId: "hanoi", startsAt: "2026-11-08T12:00:00Z" }]);
  await flush(); assert.equal(f.states.length, count);
  f.focus(); const beforeStop = f.states.length; f.stop();
  pending[2]([]); await flush(); assert.equal(f.states.length, beforeStop);
});
