import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { transformWithOxc } from "vite";
import { checkedAge, profileModel } from "./barProfile.js";

const now = new Date("2026-11-04T16:30:00Z");
const capital = { id: "hanoi", city: "Hanoi", country: "Vietnam" };
const venue = { id: "one", name: "One", status: "operating", sourceChecked: "2026-11-04", hours: [], nightDances: [], sources: [] };

test("BAR profile uses the city's local weekday and keeps Monday–Sunday order", () => {
  const seoul = profileModel(venue, { id: "seoul" }, now);
  const hanoi = profileModel(venue, capital, now);
  assert.equal(seoul.clock.weekday, 4);
  assert.equal(hanoi.clock.weekday, 3);
  assert.deepEqual(hanoi.week.map(row => row.weekday), [1, 2, 3, 4, 5, 6, 0]);
  assert.equal(hanoi.week.filter(row => row.today).length, 1);
  assert.equal(profileModel(venue, { id: "bangkok" }, now).clock.time, "23:30");
});

test("missing schedule is unknown; only fresh confirmed closure is a day off", () => {
  assert.equal(profileModel(venue, capital, now).today.closed, false);
  assert.deepEqual(profileModel(venue, capital, now).today.dances, []);
  const closed = { ...venue, hours: [{ weekday: 3, closed: true }] };
  assert.equal(profileModel(closed, capital, now).today.closed, true);
  assert.equal(profileModel({ ...closed, sourceChecked: "2026-09-01" }, capital, now).today.closed, false);
  assert.equal(profileModel({ ...closed, hours: [{ weekday: 3, text: "Not confirmed", closed: true, opens: "18:00", closes: "02:00" }] }, capital, now).today.closed, false);
});

test("multiple registered dances survive; opening hours never become music start times", () => {
  const model = profileModel({ ...venue, nightDances: ["salsa", "bachata", "kizomba"].map(dance => ({ weekday: 3, dance })), hours: [{ weekday: 3, opens: "18:00", closes: "02:00" }] }, capital, now);
  assert.deepEqual(model.today.dances, ["Bachata", "Kizomba", "Salsa"]);
  assert.equal(model.today.hours, "18:00–02:00 (+1 day)");
  assert.equal("startTime" in model.today, false);
});

test("verification ages use local calendar dates, reject invalid/future dates and distinguish 30/31 days", () => {
  const clock = profileModel(venue, capital, now).clock;
  assert.equal(checkedAge("2026-10-05", clock), 30);
  assert.equal(checkedAge("2026-10-04", clock), 31);
  for (const invalid of [null, "", "2026-02-30", "2026-11-05"]) assert.equal(checkedAge(invalid, clock), null);
  assert.equal(checkedAge("2026-11-04", profileModel(venue, { id: "seoul" }, now).clock), 1);
});

test("maps use recorded links or the actual address and never fabricate a venue location", () => {
  assert.equal(profileModel(venue, capital, now).mapsUrl, "");
  assert.equal(profileModel({ ...venue, mapsUrl: "https://example.com/map" }, capital, now).mapsUrl, "https://example.com/map");
  const model = profileModel({ ...venue, address: "81C Xuân Diệu", mapsUrl: "javascript:alert(1)", instagram: "javascript:alert(1)" }, capital, now);
  assert.equal(new URL(model.mapsUrl).searchParams.get("query"), "One, 81C Xuân Diệu");
  assert.equal(model.instagram, "");
});

const require = createRequire(import.meta.url);
const filename = fileURLToPath(new URL("../components/BarProfile.jsx", import.meta.url));
const source = readFileSync(filename, "utf8").replace(/from "(\.[^"]+)"/g, (_, specifier) => `from "${pathToFileURL(path.resolve(path.dirname(filename), specifier)).href}"`);
const transformed = await transformWithOxc(source, filename, { jsx: { runtime: "automatic" } });
const code = transformed.code.replace(/from ["'](react(?:\/jsx-runtime)?|react-router-dom)["']/g, (_, specifier) => `from "${pathToFileURL(require.resolve(specifier)).href}"`);
const View = (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)).default;
function render(extra = {}, venues = []) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(View, { venue: { ...venue, ...extra }, capital, venues, search: "?dance=salsa", now })));
}

test("profile preserves all eight sections and explicit placeholders without invented fields", () => {
  const html = render();
  const labels = ["현지어 이름", "오늘 밤", "길찾기", "이번 주 음악", "알아두면 좋은 것", "BAR 사진", "마지막 정보 확인", "Hanoi의 다른 BAR"];
  for (let i = 1; i < labels.length; i++) assert.ok(html.indexOf(labels[i - 1]) < html.indexOf(labels[i]));
  for (const label of ["입장료", "초보 레슨", "영어 소통", "주소"]) assert.match(html, new RegExp(`<dt>${label}</dt><dd>아직 정보가 없어요`));
  assert.equal((html.match(/사진 없음<\/div>/g) ?? []).length, 2);
  assert.match(html, /시작 시간 · 아직 정보가 없어요/);
  assert.doesNotMatch(html, /오늘은 쉬어요/);
  assert.match(html, /아직 등록된 다른 BAR가 없어요/);
});

test("city return keeps filters; other BAR links stay in the city and exclude self and closed venues", () => {
  const html = render({}, [venue, { id: "two", name: "Second", dances: ["salsa"], status: "operating" }, { id: "closed", name: "Removed", status: "permanently_closed" }]);
  assert.match(html, /href="\/c\/hanoi\?dance=salsa"/);
  assert.match(html, /href="\/c\/hanoi\?dance=salsa#bar-two"/);
  assert.doesNotMatch(html, /#bar-one|#bar-closed/);
});

test("stale verification exposes report entry while never rendering a submit request", () => {
  assert.doesNotMatch(render(), /정보가 틀려요/);
  const html = render({ sourceChecked: "2026-09-01" });
  assert.match(html, /is-stale/);
  assert.match(html, /64일 전/);
  assert.match(html, /정보가 틀려요/);
  assert.doesNotMatch(html, /<form|action=/);
});
