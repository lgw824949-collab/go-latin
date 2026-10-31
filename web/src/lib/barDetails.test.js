import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformWithOxc } from "vite";
import { CITY_CAPITAL_SELECT, shapeCityCapital } from "./directory.js";

// Compile the isolated view in memory; no server, network, DB or output files.
const require = createRequire(import.meta.url);
const filename = fileURLToPath(new URL("../components/BarDetails.jsx", import.meta.url));
const source = readFileSync(filename, "utf8").replace(/from "(\.[^"]+)"/g,
  (_, specifier) => `from "${pathToFileURL(path.resolve(path.dirname(filename), specifier)).href}"`);
const transformed = await transformWithOxc(source, filename, { jsx: { runtime: "automatic" } });
const code = transformed.code.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,
  (_, specifier) => `from "${pathToFileURL(require.resolve(specifier)).href}"`);
const View = (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)).default;
const now = new Date("2026-10-29T12:00:00Z");
const base = { status: "operating", sourceChecked: "2026-10-29", hours: [], nightDances: [], sources: [] };
const render = extra => renderToStaticMarkup(createElement(View, {
  capital: { id: "hanoi", timezone: "Asia/Ho_Chi_Minh" }, venue: { ...base, ...extra }, now,
}));

test("seven local dates distinguish Closed, unknown Monday, and overnight hours", () => {
  const html = render({ hours: [
    { weekday: 1, text: "Not confirmed", opens: "18:00", closes: "02:00", closed: true },
    { weekday: 2, closed: true },
    { weekday: 3, text: "6 PM–2 AM" },
  ] });
  assert.equal((html.match(/<time /g) ?? []).length, 7);
  assert.match(html, /Monday[^<]*<\/time><\/dt><dd>Not confirmed/);
  assert.match(html, /Tuesday[^<]*<\/time><\/dt><dd>Closed/);
  assert.match(html, /Wednesday[^<]*<\/time><\/dt><dd>18:00–02:00 \(\+1 day\)/);
  assert.match(html, /Asia\/Ho_Chi_Minh/);
});

test("old or missing check dates never present recorded hours as current", () => {
  for (const sourceChecked of ["2026-09-30", null]) {
    const html = render({ sourceChecked, hours: [{ weekday: 4, text: "6 PM–2 AM" }] });
    assert.doesNotMatch(html, /18:00–02:00/);
  }
});

test("weekday dances are shown without inventing unsupported start or end times", () => {
  const html = render({ nightDances: [
    { weekday: 3, dance: "bachata" }, { weekday: 3, dance: "salsa" }, { weekday: 3, dance: "kizomba" },
    { weekday: 0, dance: "salsa" },
  ] });
  assert.match(html, /Wednesday<\/dt><dd>Bachata · Kizomba · Salsa/);
  assert.match(html, /Sunday<\/dt><dd>Salsa/);
  assert.match(html, /Start time: Not confirmed; end time: Not confirmed/);
  assert.doesNotMatch(html, /20:30|21:00/);
});

test("source links and individual dates survive the DB adapter; unsafe links stay unlinked", () => {
  assert.match(CITY_CAPITAL_SELECT, /source_url/);
  assert.match(CITY_CAPITAL_SELECT, /venue_sources \(kind, url, checked_at\)/);
  const venue = shapeCityCapital({ id: "hanoi", venues: [{ ...base,
    source: "website", source_url: "https://example.com/events", source_checked: "2026-10-29",
    venue_sources: [{ kind: "website", url: "https://example.com", checked_at: "2026-10-28" }],
  }] }).venues[0];
  const html = render(venue);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /href="https:\/\/example.com\/events"/);
  assert.match(html, /28 Oct 2026/);
  assert.match(html, /29 Oct 2026/);
  assert.match(html, /does not confirm every field or day/);
  assert.doesNotMatch(render({ sources: [{ kind: "website", url: "javascript:alert(1)" }] }), /href=/);
});
