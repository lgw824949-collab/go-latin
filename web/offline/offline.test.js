import assert from "node:assert/strict";
import test from "node:test";
import { createClient, resetPreview, setPreviewRole } from "./supabase.js";
import { installNetworkGuard } from "./networkGuard.js";
import { OFFLINE_CSP, offlineConfig } from "./config.mjs";
import { build } from "vite";
import { fileURLToPath } from "node:url";

test("offline config ignores env files and inherited VITE variables, substitutes the SDK and blocks external resources", () => {
  const config = offlineConfig("unused");
  assert.equal(config.envDir, false); assert.deepEqual(config.envPrefix, []);
  const env = Object.fromEntries(Object.entries(config.define).map(([key, value]) => [key.replace("import.meta.env.", ""), JSON.parse(value)]));
  assert.equal(env.VITE_SUPABASE_URL, "http://offline.invalid");
  assert.equal(env.VITE_SUPABASE_ANON_KEY, "offline-not-a-credential");
  assert.ok(config.resolve.alias[0].find.test("@supabase/supabase-js"));
  assert.match(OFFLINE_CSP, /connect-src 'self'/); assert.match(OFFLINE_CSP, /frame-src 'none'/);
});

test("three-city BAR, hours, source and party reads use memory even with a failing network transport", async () => {
  resetPreview();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw Error("No network allowed in mock tests"); };
  try {
    const client = createClient("ignored", "ignored");
    const result = await client.from("capitals").select().order("city");
    assert.equal(result.data.length, 3);
    for (const id of ["seoul", "bangkok", "hanoi"]) {
      const { data } = await client.from("capitals").select().eq("id", id).maybeSingle();
      assert.equal(data.venues[0].venue_hours.length, 7);
      assert.ok(data.venues[0].name.includes("MOCK"));
    }
    const { data } = await client.from("simple_parties").select().in("capital_id", ["seoul", "bangkok", "hanoi"]);
    assert.equal(data.length, 6);
    const hanoi = result.data.find(city => city.id === "hanoi");
    assert.equal(hanoi.venues[0].venue_hours[1].opens, null);
    assert.equal(hanoi.venues[0].venue_hours[1].hours_text, "Not confirmed");
  } finally { globalThis.fetch = originalFetch; }
});

test("mock auth rejects ordinary users; admin CRUD and uploads affect only resettable memory", async () => {
  resetPreview(); const client = createClient();
  const payload = { capital_id: "hanoi", venue_name: "Mock edit", starts_at: new Date().toISOString(), genre: "bachata" };
  setPreviewRole("viewer"); assert.ok((await client.rpc("submit_simple_party", { payload })).error);
  setPreviewRole("admin");
  const { data: id } = await client.rpc("submit_simple_party", { payload }); assert.match(id, /^[a-f0-9-]{36}$/);
  assert.equal((await client.rpc("update_simple_party", { party_id: id, payload: { ...payload, venue_name: "Updated" } })).data, id);
  const bucket = client.storage.from("simple-party-posters");
  assert.equal((await bucket.upload(`hanoi/${id}.png`, { type: "image/png", size: 20 }, { upsert: false })).error, null);
  assert.ok((await bucket.remove([id])).error);
  assert.equal((await client.rpc("delete_simple_party", { party_id: id })).data, id);
  assert.ok((await client.from("venues").delete()).error);
  resetPreview(); assert.equal((await client.auth.getSession()).data.session, null);
  assert.equal((await client.from("simple_parties").select()).data.length, 6);
});

test("guard refuses external fetch, XHR, sockets, beacons and links while allowing localhost assets", async () => {
  const calls = []; let click;
  class XHR { open(...args) { calls.push(args); } }
  const target = { location: { origin: "http://localhost:4188" }, navigator: {}, XMLHttpRequest: XHR,
    document: { addEventListener(event, callback) { assert.equal(event, "click"); click = callback; } },
    fetch: async url => { calls.push(url); return { ok: true }; } };
  installNetworkGuard(target);
  await assert.rejects(target.fetch("https://production.invalid/rest/v1/capitals"), /blocked/);
  assert.throws(() => new XHR().open("GET", "https://production.invalid"), /blocked/);
  assert.throws(() => new target.WebSocket("wss://production.invalid"), /blocks/);
  assert.throws(() => new target.EventSource("https://production.invalid"), /blocks/);
  assert.equal(target.navigator.sendBeacon("https://production.invalid"), false);
  assert.equal(calls.length, 0);
  let prevented = false;
  click({ target: { closest: () => ({ href: "https://production.invalid" }) }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  await target.fetch("/local.js"); assert.equal(calls.length, 1);
});

test("bundled production query adapters read offline fixtures without real credentials or network", async () => {
  const entry = "\0offline-runtime-probe";
  const resolve = relative => fileURLToPath(new URL(relative, import.meta.url)).replaceAll("\\", "/");
  const config = offlineConfig("unused");
  config.plugins.push({ name: "offline-runtime-probe", resolveId: id => id === entry ? entry : null,
    load: id => id === entry ? [
      `export {loadCapitals,loadCapital} from ${JSON.stringify(resolve("../src/lib/directory.js"))};`,
      `export {loadTonightCities} from ${JSON.stringify(resolve("../src/lib/tonightData.js"))};`,
      `export {loadSimpleParties} from ${JSON.stringify(resolve("../src/lib/simpleParty.js"))};`,
      `export {loadSimplePartyAdmin,saveSimplePartyAdmin,simplePartyEditForm,deleteSimplePartyAdmin} from ${JSON.stringify(resolve("../src/lib/simplePartyAdmin.js"))};`,
      `export {watchAdminSession} from ${JSON.stringify(resolve("../src/lib/admin.js"))};`,
      `export {searchDirectory} from ${JSON.stringify(resolve("../src/lib/countries.js"))};`,
      `export {filterCapitals} from ${JSON.stringify(resolve("../src/lib/filterCapitals.js"))};`,
      `export {tonightLocalTime,tonightHoursStatus,sevenDaySchedule} from ${JSON.stringify(resolve("../src/lib/tonight.js"))};`,
      `export {setPreviewRole,resetPreview} from ${JSON.stringify(resolve("./supabase.js"))};`,
    ].join("\n") : null });
  config.build = { write: false, minify: false, rollupOptions: { input: entry, preserveEntrySignatures: "strict", output: { format: "es", codeSplitting: false } } };
  const result = await build({ ...config, logLevel: "error" });
  const chunk = result.output.find(item => item.type === "chunk" && item.isEntry);
  const fetch = globalThis.fetch;
  globalThis.fetch = () => { throw Error("Real network must not be used."); };
  try {
    const api = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString("base64")}`);
    assert.equal((await api.loadCapitals()).length, 3);
    assert.equal((await api.loadTonightCities()).length, 3);
    for (const id of ["seoul", "bangkok", "hanoi"]) {
      const city = await api.loadCapital(id);
      assert.equal(city.venues.length, 1);
      assert.equal(city.venues[0].hours.length, 7);
      assert.equal((await api.loadSimpleParties(id)).length, 1);
      const hits = api.searchDirectory(await api.loadCapitals(), city.venues[0].name);
      assert.equal(hits.bars.length, 1);
      assert.equal(hits.bars[0].href, `/c/${id}#bar-${city.venues[0].id}`);
      assert.equal(api.filterCapitals([city], { dance: "salsa" }).length, 1);
      assert.ok(city.venues[0].sourceUrl);
      assert.ok(city.venues[0].sourceChecked);
      const clock = api.tonightLocalTime(city);
      const schedule = api.sevenDaySchedule(city.venues[0], clock);
      assert.equal(schedule.length, 7);
      assert.ok(schedule.some(day => day.hoursLabel === "Closed"));
      assert.ok(schedule.some(day => day.hoursLabel.includes("(+1 day)")));
      if (id === "hanoi") assert.ok(schedule.some(day => day.hoursLabel === "Not confirmed"));
      assert.equal(api.tonightHoursStatus(city.venues[0], { ...clock, weekday: 3, minutes: 19 * 60 }).badge, "OPEN NOW");
      assert.equal(api.tonightHoursStatus(city.venues[0], { ...clock, weekday: 3, minutes: 17 * 60 }).badge, "OPEN TONIGHT");
      // Local public date rollover filters stored fixtures again, without a DB.
      assert.equal((await api.loadSimpleParties(id, new Date(Date.now() + 3 * 86400000))).length, 0);
    }
    const access = [];
    const stopWatching = api.watchAdminSession(value => access.push(value));
    await Promise.resolve();
    assert.equal(access.at(-1), "signedOut");
    await assert.rejects(api.loadSimplePartyAdmin(), /Admin sign-in/);
    api.setPreviewRole("viewer");
    assert.equal(access.at(-1), "forbidden");
    await assert.rejects(api.loadSimplePartyAdmin(), /Admin sign-in/);
    api.setPreviewRole("admin");
    assert.equal(access.at(-1), "admin");
    assert.equal((await api.loadSimplePartyAdmin()).length, 6);
    for (const capitalId of ["seoul", "bangkok", "hanoi"]) {
      const existing = (await api.loadSimplePartyAdmin()).find(party => party.capitalId === capitalId);
      const form = { ...api.simplePartyEditForm(existing), id: "", venueName: "Offline integration create",
        posterFile: { type: "image/png", size: 32 } };
      const created = await api.saveSimplePartyAdmin(form);
      assert.match(created.posterUrl, /offline-poster\.svg/);
      assert.equal((await api.loadSimplePartyAdmin()).length, 7);
      const stored = (await api.loadSimplePartyAdmin()).find(party => party.id === created.id);
      const edited = await api.saveSimplePartyAdmin({ ...api.simplePartyEditForm(stored), venueName: "Offline integration edit" });
      assert.equal(edited.posterUrl, created.posterUrl);
      assert.equal((await api.loadSimplePartyAdmin()).find(party => party.id === created.id).venueName, "Offline integration edit");
      await api.deleteSimplePartyAdmin(created.id);
      assert.equal((await api.loadSimplePartyAdmin()).length, 6);
    }
    api.setPreviewRole(null);
    assert.equal(access.at(-1), "signedOut");
    await assert.rejects(api.loadSimplePartyAdmin(), /Admin sign-in/);
    stopWatching();
  } finally { globalThis.fetch = fetch; }
});
