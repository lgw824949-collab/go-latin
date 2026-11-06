import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, matchRoutes, MemoryRouter, Route, Routes } from "react-router-dom";
import { transformWithOxc } from "vite";
import { shapeCityCapital } from "./directory.js";
import { tonightBarPath, tonightPathForRoute } from "./barAnchor.js";
import { releaseFeatureEnabled } from "./releaseFeatures.js";

test("direct city party requests reach the disabled SPA route without broadening existing rewrites", () => {
  const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(config, {
    cleanUrls: true,
    trailingSlash: false,
    rewrites: [
      { source: "/country", destination: "/index" },
      { source: "/country/:slug", destination: "/index" },
      { source: "/c/:id/party", destination: "/index" },
      { source: "/admin", destination: "/index" },
      { source: "/admin/:id", destination: "/index" },
    ],
  });
  const app = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
  assert.match(app, /path="\/c\/:id\/party" element=\{releaseFeatureEnabled\("quickParties"\)[\s\S]*?<ComingSoon \/>/);
  assert.equal(releaseFeatureEnabled("quickParties"), false);
  const rewrite = config.rewrites.find(rule => rule.source === "/c/:id/party");
  for (const city of ["seoul", "bangkok", "hanoi"]) {
    const matched = matchRoutes([{ path: rewrite.source }], `/c/${city}/party`);
    assert.equal(matched[0].params.id, city);
    assert.equal(rewrite.destination, "/index");
  }
  for (const route of ["/", "/c/hanoi", "/tonight", "/admin", "/country/vietnam"]) {
    assert.equal(matchRoutes([{ path: rewrite.source }], route), null);
  }
});

// Full page composition with DB-shaped fixtures, not live DB or local BAR data.
// Effects do not run in SSR; every page data hook is explicitly replaced.
const require = createRequire(import.meta.url);
const asModule = code => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const directory = asModule(`
  export const useCapitals=()=>({status:globalThis.__frontend.status,capitals:globalThis.__frontend.cities,error:'Offline query failure'});
  export const useCapital=id=>({status:globalThis.__frontend.status,capital:globalThis.__frontend.cities.find(c=>c.id===id),error:'Offline query failure'});
  export const loadCapital=()=>{throw Error('Unexpected data request');};
`);
const now = asModule(`export const useLocalNow=()=>new Date(globalThis.__frontend.now);`);
const cache = new Map();
async function compile(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const pending = (async () => {
    let source = readFileSync(filename, "utf8");
    const name = path.basename(filename);
    if (["Home.jsx", "Country.jsx", "Tonight.jsx", "SimpleCityParties.jsx"].includes(name)) {
      const hooks = asModule(`
        import * as React from '${pathToFileURL(require.resolve("react")).href}';
        export const useEffect=React.useEffect, useMemo=React.useMemo;
        export function useState(init) {
          let value=typeof init==='function'?init():init;
          const f=globalThis.__frontend;
          if ('${name}'==='Home.jsx' || '${name}'==='Country.jsx') {if(value==='') value=f.query;}
          if ('${name}'==='Tonight.jsx' && value && typeof value==='object') {
            if('rows' in value) value={status:f.status,rows:f.cities,error:'Offline query failure'};
            else if('id' in value) value={id:value.id,status:f.status,row:f.cities.find(c=>c.id===value.id),error:'Offline query failure'};
          }
          if ('${name}'==='SimpleCityParties.jsx') {
            if(value==='loading') value=f.partyStatus;
            else if(Array.isArray(value)) value=f.parties.filter(party=>party.capitalId===f.activeCity);
            else if(value==='') value=f.partyStatus==='error'?'Offline party failure':'';
          }
          return React.useState(value);
        }
      `);
      source = source.replace(/from "react";/, `from "${hooks}";`);
    }
    const imports = [...source.matchAll(/from "(\.[^"]+)"/g)].map(match => match[1]);
    for (const specifier of new Set(imports)) {
      const resolved = path.resolve(path.dirname(filename), specifier);
      const replacement = path.basename(resolved) === "directory.js" ? directory
        : path.basename(resolved) === "useLocalNow.js" ? now
          : resolved.endsWith(".jsx") ? await compile(resolved) : pathToFileURL(resolved).href;
      source = source.replaceAll(`from "${specifier}"`, `from "${replacement}"`);
    }
    const transformed = await transformWithOxc(source, filename, { jsx: { runtime: "automatic" } });
    return asModule(transformed.code.replace(/from ["'](react(?:\/jsx-runtime)?|react-router-dom|lucide-react)["']/g,
      (_, specifier) => `from "${pathToFileURL(require.resolve(specifier)).href}"`));
  })();
  cache.set(filename, pending);
  return pending;
}
const pages = {};
for (const name of ["Home", "Country", "Capital", "Tonight"]) {
  pages[name] = (await import(await compile(fileURLToPath(new URL(`../pages/${name}.jsx`, import.meta.url))))).default;
}
const { HomeTonightPreviewView } = await import(await compile(fileURLToPath(new URL("../components/HomeTonightPreview.jsx", import.meta.url))));
function reset() {
  const cities = [["seoul", "Seoul", "South Korea", "Asia/Seoul"], ["bangkok", "Bangkok", "Thailand", "Asia/Bangkok"], ["hanoi", "Hanoi", "Vietnam", "Asia/Ho_Chi_Minh"]].map(([id, city, country, timezone]) => shapeCityCapital({
    id, city, country, timezone, continent: "asia", venues: [{
      id: `bar-${id}`, capital_id: id, name: `Fixture ${city}`, address: `Address ${city}`, status: "operating",
      maps_url: "https://example.com/map", website: "https://example.com", instagram_url: "https://example.com/instagram",
      source_checked: "2026-10-29", source_url: "https://example.com/source", source_note: "Offline fixture only",
      venue_dances: [{ dance: id === "bangkok" ? "salsa" : "bachata" }],
      venue_hours: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday,
        hours_text: id === "hanoi" && weekday === 1 ? "Not confirmed" : weekday === 2 ? "Closed" : "6 PM–2 AM" })),
      venue_night_dances: [{ weekday: 3, dance: "bachata" }],
      venue_sources: [{ kind: "website", url: "https://example.com/source", checked_at: "2026-10-29" }],
    }],
  }));
  globalThis.__frontend = { cities, status: "ready", query: "", now: "2026-10-29T12:00:00Z", partyStatus: "ready",
    parties: ["seoul", "bangkok", "hanoi"].map(capitalId => ({ id: `party-${capitalId}`, capitalId,
      venueName: "Fixture Party", startsAt: "2026-10-30T13:30:00Z",
      posterUrl: "https://example.com/poster.png", snsUrl: "https://example.com/social", genre: "bachata" })) };
  return globalThis.__frontend;
}
function render(name, route, pattern) {
  globalThis.__frontend.activeCity = /\/c\/([^?#]+)/.exec(typeof route === "string" ? route : route.pathname)?.[1] ?? "";
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [route] },
    createElement(Routes, null, createElement(Route, { path: pattern, element: createElement(pages[name]) }))));
}

test("home search and country city lists produce real BAR/detail route links for the three cities", () => {
  const f = reset();
  const home = render("Home", "/", "/");
  for (const id of ["seoul", "bangkok", "hanoi"]) assert.match(home, new RegExp(`href="/c/${id}"`));
  f.query = "Fixture Hanoi";
  assert.match(render("Home", "/?q=Fixture%20Hanoi", "/"), /href="\/c\/hanoi#bar-bar-hanoi"/);
  f.query = "";
  assert.match(render("Country", "/country/thailand", "/country/:slug"), /aria-pressed="false">Bangkok/);
  assert.match(render("Country", "/country/thailand?city=bangkok", "/country/:slug"), /href="\/c\/bangkok#bar-bar-bangkok"/);
});

test("city BAR lists stay compact and link the existing profiles without raw schedules or sources", () => {
  reset();
  for (const id of ["seoul", "bangkok", "hanoi"]) {
    const html = render("Capital", `/c/${id}`, "/c/:id");
    assert.match(html, new RegExp(`href="/c/${id}#bar-bar-${id}"`));
    assert.match(html, /class="bar-row-arrow" aria-hidden="true">→/);
    assert.doesNotMatch(html, /OPEN NOW|View details|No photo available|bar-list-media/);
    assert.doesNotMatch(html, /7-day opening hours|Recorded weekly dance schedule|Sources|Offline fixture only|Address /);
    assert.doesNotMatch(html, /Fixture Party|https:\/\/example.com\/social|No upcoming parties listed/);
    assert.doesNotMatch(html, /Register a party|Save party/);
    const profile = render("Capital", `/c/${id}#bar-bar-${id}`, "/c/:id");
    assert.match(profile, /class="bar-profile"/);
    assert.match(profile, /Good to Know|This Week/);
    assert.match(profile, /Offline fixture only/);
    assert.match(profile, /href="https:\/\/example.com\/source"/);
  }
});

test("compact whole-row links keep complete BAR names, real genres and existing URLs without photo or repeated action text", () => {
  const f = reset();
  for (const [slug, id] of [["south-korea", "seoul"], ["thailand", "bangkok"], ["vietnam", "hanoi"]]) {
    const venue = f.cities.find(city => city.id === id).venues[0];
    venue.name = "A Long Registered BAR Name That Must Remain Complete";
    const href = `/c/${id}#bar-${venue.id}`;
    const country = render("Country", `/country/${slug}?city=${id}`, "/country/:slug");
    assert.match(country, /A Long Registered BAR Name That Must Remain Complete/);
    assert.match(country, /class="bar-row-arrow" aria-hidden="true">→/);
    assert.doesNotMatch(country, /No photo available|bar-list-media|View details/);
    assert.equal((country.match(new RegExp(`href="${href}"`, "g")) ?? []).length, 1);
    assert.doesNotMatch(country, /<img/);
    assert.match(country, new RegExp(id === "bangkok" ? "Salsa" : "Bachata"));
    const city = render("Capital", `/c/${id}`, "/c/:id");
    assert.doesNotMatch(city, /No photo available|bar-list-media|View details/);
    assert.equal((city.match(new RegExp(`href="${href}"`, "g")) ?? []).length, 1);
  }
});

test("missing genres stay absent in compact rows and all-Seoul access follows the regional list", () => {
  const f = reset();
  f.cities.find(city => city.id === "seoul").venues[0].dances = [];
  const html = render("Country", "/country/south-korea?city=seoul", "/country/:slug");
  assert.doesNotMatch(html, /class="bar-list-genres"|Not available yet|View details|No photo available/);
  assert.ok(html.indexOf('class="country-all-bars"') > html.indexOf('class="country-bar-list"'));
  assert.equal((html.match(/href="\/c\/seoul#bar-/g) ?? []).length, 1);
});

test("mobile city overlays keep real routes and derive BAR counts from queried venues", () => {
  const f = reset();
  const home = render("Home", "/", "/");
  const mobile = home.match(/<section class="home-mobile-cities"[\s\S]*?<\/section>/)?.[0];
  assert.ok(mobile);
  assert.equal((mobile.match(/<img /g) ?? []).length, 3);
  for (const [id, city, country] of [["seoul", "Seoul", "South Korea"], ["bangkok", "Bangkok", "Thailand"], ["hanoi", "Hanoi", "Vietnam"]]) {
    assert.match(mobile, new RegExp(`href="/c/${id}"`));
    assert.match(mobile, new RegExp(`aria-label="${city}, ${country}"`));
    assert.match(mobile, new RegExp(`/cities/go-latin-017-${id}\\.png`));
  }
  for (const city of ["Seoul", "Bangkok", "Hanoi"]) assert.equal((mobile.match(new RegExp(`<strong>${city}</strong>`, "g")) ?? []).length, 1);
  assert.equal((mobile.match(/>1 bar</g) ?? []).length, 3);
  f.cities[0].venues.push(...[1,2,3,4].map(id => ({ id: `extra-${id}`, name: "Fixture" })));
  assert.match(render("Home", "/", "/"), />5 bars</);
  assert.equal((mobile.match(/alt=""/g) ?? []).length, 3);
  f.cities = f.cities.filter(city => city.id !== "hanoi");
  const remaining = render("Home", "/", "/").match(/<section class="home-mobile-cities"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(remaining, /href="\/c\/hanoi"/);
});

test("mobile home keeps country browsing and location below the approved city artwork", () => {
  reset();
  const html = render("Home", "/", "/");
  assert.match(html, /class="home-mobile-all-countries" href="\/country"[^>]*>Explore All Countries<\/a>/);
  assert.equal((html.match(/Use My Location/g) ?? []).length, 1);
  assert.match(html, /class="home-mobile-tonight" href="\/tonight"/);
  assert.match(html, /Explore by Continent/);
  assert.match(html, /Cities with listed bars/);
  const css = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");
  const hierarchy = css.slice(css.indexOf("/* Mobile home hierarchy;"));
  assert.match(hierarchy, /@media\(max-width:800px\)/);
  assert.match(hierarchy, /\.home-core\{display:contents\}/);
  assert.match(hierarchy, /\.browse,[^{]*\.desktop-popular-cities\{display:none\}/);
  for (const [selector, order] of [["home-search", 2], ["home-mobile-tonight", 4], ["home-mobile-cities", 5], ["home-mobile-all-countries", 6], ["locate", 7]]) {
    assert.ok(hierarchy.includes(selector + "{order:" + order));
  }
});

test("mobile B layout spans the last card without cropping original artwork or changing desktop rules", () => {
  const css = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");
  const mobile = css.slice(css.indexOf("/* DESIGN-IMPLEMENT-004:"), css.indexOf("/* MOBILE-HOME-008:"));
  assert.match(mobile, /@media\(max-width:800px\)/);
  assert.match(mobile, /grid-column:1\/-1;justify-self:stretch;width:100%/);
  assert.match(mobile, /height:clamp\(208px,60vw,240px\)/);
  assert.match(mobile, /img\{width:100%;height:100%;min-height:0;object-fit:contain\}/);
  assert.match(mobile, /min-height:48px;font-size:16px/);
  assert.doesNotMatch(mobile, /object-fit:cover|@media\(min-width:/);
  reset();
  const html = render("Home", "/", "/");
  assert.equal((html.match(/class="locate-btn"/g) ?? []).length, 1);
  for (const city of ["seoul", "bangkok", "hanoi"]) {
    assert.match(html, new RegExp('src="/cities/go-latin-017-' + city + '\\.png"'));
  }
});

test("home country choices use registered countries and preserve expansion without fabricating a city", () => {
  const f = reset();
  const home = render("Home", "/", "/");
  for (const [slug, label] of [["vietnam", "Vietnam"], ["thailand", "Thailand"], ["south-korea", "Korea"]]) {
    assert.match(home, new RegExp(`href="/country/${slug}"[^>]*>${label}</a>`));
  }
  const empty = render("Country", "/country/vietnam?city=ho-chi-minh-city", "/country/:slug");
  assert.match(empty, /Coming soon/);
  assert.doesNotMatch(empty, /href="\/c\/ho-chi-minh-city/);
  f.cities.push({ id: "registered-second-city", city: "Ho Chi Minh City", country: "Vietnam", venues: [{ id: "registered-bar", name: "Registered fixture", dances: ["salsa"] }] });
  const expanded = render("Country", "/country/vietnam?city=ho-chi-minh-city", "/country/:slug");
  assert.match(expanded, /href="\/c\/registered-second-city#bar-registered-bar"/);
  assert.doesNotMatch(expanded, /Coming soon/);
});

test("Vietnam city selection shows only the selected city's real BAR cards and keeps the profile return route", () => {
  reset();
  const home = render("Country", "/country/vietnam", "/country/:slug");
  for (const label of ["Hanoi", "Ho Chi Minh City", "Da Nang"]) assert.match(home, new RegExp(label));
  assert.doesNotMatch(home, /Fixture Hanoi/);
  const selected = render("Country", "/country/vietnam?city=hanoi", "/country/:slug");
  assert.match(selected, /aria-pressed="true">Hanoi/);
  assert.match(selected, /href="\/c\/hanoi#bar-bar-hanoi"/);
  assert.doesNotMatch(selected, /7-day opening|Sources|Offline fixture only|OPEN NOW/);
  for (const city of ["ho-chi-minh-city", "da-nang"]) {
    const html = render("Country", `/country/vietnam?city=${city}`, "/country/:slug");
    assert.match(html, /Coming soon/);
    assert.doesNotMatch(html, /Fixture Hanoi|#bar-/);
  }
  const profile = render("Capital", { pathname: "/c/hanoi", hash: "#bar-bar-hanoi", state: { from: "/country/vietnam?city=hanoi" } }, "/c/:id");
  assert.match(profile, /class="bar-profile-back" href="\/country\/vietnam\?city=hanoi"/);
});

test("shared country categories isolate BARs and preserve each selected country/city on profile return", () => {
  const f = reset();
  f.cities.push({ id: "abuja", city: "Abuja", country: "Nigeria", venues: [{ id: "abuja-bar", name: "Fixture Abuja", dances: ["salsa"] }] });
  f.cities.push({ id: "luanda", city: "Luanda", country: "Angola", venues: [] });
  for (const [slug, id, name] of [["vietnam", "hanoi", "Hanoi"], ["thailand", "bangkok", "Bangkok"], ["south-korea", "seoul", "Seoul"], ["nigeria", "abuja", "Abuja"]]) {
    const route = `/country/${slug}?city=${id}`;
    const country = render("Country", route, "/country/:slug");
    if (id === "seoul") {
      assert.match(country, /View all Seoul bars/);
      assert.match(country, /<h2>Seoul<\/h2>/);
    } else assert.match(country, new RegExp(`aria-pressed="true">${name}`));
    assert.match(country, new RegExp(`href="/c/${id}#bar-`));
    assert.doesNotMatch(country, /7-day opening|Sources|Offline fixture only/);
    const venue = f.cities.find(city => city.id === id).venues[0];
    const profile = render("Capital", { pathname: `/c/${id}`, hash: `#bar-${venue.id}`, state: { from: route } }, "/c/:id");
    assert.match(profile, new RegExp(`class="bar-profile-back" href="/country/${slug}\\?city=${id}"`));
  }
  assert.match(render("Country", "/country/angola?city=luanda", "/country/:slug"), /Coming soon/);
  const wrongCity = render("Country", "/country/thailand?city=seoul", "/country/:slug");
  assert.doesNotMatch(wrongCity, /Fixture Seoul|Fixture Bangkok|#bar-/);
});

test("Korean location cards show only address-supported area BARs and preserve area return links", () => {
  const f = reset();
  const seoul = f.cities.find(city => city.id === "seoul");
  seoul.venues = [
    { id: "gangnam", name: "Address-confirmed BAR", status: "operating", dances: ["salsa"], address: "Gangnam District, Seoul" },
    { id: "mapo", name: "Unclassified BAR", status: "operating", dances: ["bachata"], address: "Mapo-gu, Seoul" },
  ];
  const initial = render("Country", "/country/south-korea", "/country/:slug");
  for (const name of ["Hongdae", "Gangnam", "Busan"]) assert.match(initial, new RegExp(`aria-pressed="false">${name}`));
  assert.doesNotMatch(initial, /Address-confirmed BAR|Unclassified BAR/);
  const area = render("Country", "/country/south-korea?city=gangnam", "/country/:slug");
  assert.match(area, /Address-confirmed BAR/);
  assert.doesNotMatch(area, /Unclassified BAR|7-day opening|Sources/);
  for (const id of ["hongdae", "busan"]) {
    const empty = render("Country", `/country/south-korea?city=${id}`, "/country/:slug");
    assert.match(empty, /Coming soon/);
    assert.doesNotMatch(empty, /Address-confirmed BAR|Unclassified BAR/);
  }
  const all = render("Country", "/country/south-korea?city=seoul", "/country/:slug");
  assert.match(all, /Address-confirmed BAR/);
  assert.match(all, /Unclassified BAR/);
  const profile = render("Capital", { pathname: "/c/seoul", hash: "#bar-gangnam", state: { from: "/country/south-korea?city=gangnam" } }, "/c/:id");
  assert.match(profile, /class="bar-profile-back" href="\/country\/south-korea\?city=gangnam"/);
});

test("city detail genre query filters the actual page rather than only helper data", () => {
  reset();
  const html = render("Capital", "/c/bangkok?dance=bachata", "/c/:id");
  assert.match(html, /No Bachata floor listed/);
  assert.doesNotMatch(html, /<h2>Fixture Bangkok<\/h2>/);
});

test("Tonight page composes city timezone, overnight badge, seven-day schedule and genre filter", () => {
  reset();
  for (const [id, zone] of [["seoul", "Asia/Seoul"], ["bangkok", "Asia/Bangkok"], ["hanoi", "Asia/Ho_Chi_Minh"]]) {
    const html = render("Tonight", `/tonight?city=${id}`, "/tonight");
    assert.match(html, new RegExp(zone)); assert.match(html, /OPEN NOW/);
    assert.match(html, /18:00–02:00 \(\+1 day\)/);
    assert.equal((html.match(/<time /g) ?? []).length, 7);
  }
  const filtered = render("Tonight", "/tonight?city=bangkok&dance=bachata", "/tonight");
  assert.match(filtered, /No Bachata floor is listed in Bangkok/);
  assert.doesNotMatch(filtered, /OPEN NOW/);
});

test("Tonight separates registered genres from the local night's confirmed music", () => {
  const f = reset();
  const missing = render("Tonight", "/tonight?city=bangkok", "/tonight");
  assert.match(missing, /Registered genres: Salsa/);
  assert.match(missing, /Music tonight: Dance schedule not confirmed/);
  f.now = "2026-10-28T12:00:00Z";
  f.cities.find(city => city.id === "bangkok").venues[0].sourceChecked = "2026-10-28";
  const confirmed = render("Tonight", "/tonight?city=bangkok", "/tonight");
  assert.match(confirmed, /Music tonight: Bachata/);
  assert.match(confirmed, /Registered genres: Salsa/);
});

test("disabled public parties expose neither query errors nor empty party panels", () => {
  const f = reset(); f.parties = []; f.partyStatus = "error";
  const error = render("Capital", "/c/hanoi", "/c/:id");
  assert.doesNotMatch(error, /Offline party failure|No upcoming parties listed/);
  assert.match(error, /Fixture Hanoi/);
  f.partyStatus = "ready";
  const ready = render("Capital", "/c/hanoi", "/c/:id");
  assert.doesNotMatch(ready, /Offline party failure|No upcoming parties listed/);
  assert.match(ready, /Fixture Hanoi/);
});

test("page loading, query errors and unknown city remain distinct in composed pages", () => {
  const f = reset(); f.status = "loading";
  assert.match(render("Capital", "/c/hanoi", "/c/:id"), /Loading the directory/);
  assert.match(render("Tonight", "/tonight?city=hanoi", "/tonight"), /Loading tonight/);
  f.status = "error";
  for (const [name, route, pattern] of [["Home", "/", "/"], ["Capital", "/c/hanoi", "/c/:id"], ["Tonight", "/tonight?city=hanoi", "/tonight"]]) {
    assert.match(render(name, route, pattern), /Offline query failure/);
  }
  f.status = "ready";
  assert.match(render("Capital", "/c/missing", "/c/:id"), /Not on the list/);
  assert.match(render("Tonight", "/tonight?city=missing", "/tonight"), /This capital is not in the directory/);
});

test("Tonight without selection prompts for a city and future opening is not OPEN NOW", () => {
  const f = reset();
  assert.match(render("Tonight", "/tonight", "/tonight"), /Choose a city/);
  f.now = "2026-10-29T08:00:00Z";
  const html = render("Tonight", "/tonight?city=bangkok", "/tonight");
  assert.match(html, /OPEN TONIGHT/);
  assert.doesNotMatch(html, /OPEN NOW/);
});

test("search state is restored from direct home and country URLs", () => {
  reset();
  const home = render("Home", "/?q=Fixture%20Hanoi", "/");
  assert.match(home, /value="Fixture Hanoi"/);
  assert.match(home, /Search results/);
  assert.match(render("Country", "/country/thailand?q=Bangkok", "/country/:slug"), /value="Bangkok"/);
  const empty = render("Country", "/country/thailand?q=Seoul", "/country/:slug");
  assert.match(empty, /No match/);
  assert.doesNotMatch(empty, /href="\/c\/bangkok"/);
});

test("detail return links preserve the originating search or Tonight state after route reconstruction", () => {
  reset();
  for (const from of ["/?q=Fixture%20Hanoi", "/country/vietnam?q=Hanoi", "/tonight?city=hanoi&dance=bachata"]) {
    const html = render("Capital", { pathname: "/c/hanoi", search: "?dance=bachata", state: { from } }, "/c/:id");
    assert.ok(html.includes(`href="${from.replaceAll("&", "&amp;")}"`));
    assert.match(html, /Fixture Hanoi/);
  }
  assert.match(render("Capital", "/c/hanoi?dance=bachata", "/c/:id"), /class="back" href="\/"/);
});

test("Tonight-to-detail genre links and successive city URLs never render a prior city's BAR", () => {
  reset();
  const tonight = render("Tonight", "/tonight?city=bangkok&dance=salsa", "/tonight");
  assert.match(tonight, /href="\/c\/bangkok\?dance=salsa#bar-bar-bangkok"/);
  for (const id of ["seoul", "bangkok", "hanoi", "seoul"]) {
    const html = render("Capital", `/c/${id}`, "/c/:id");
    for (const [other, name] of [["seoul", "Seoul"], ["bangkok", "Bangkok"], ["hanoi", "Hanoi"]]) {
      assert.equal(new RegExp(`<h2>Fixture ${name}</h2>`).test(html), other === id);
    }
  }
});

test("router back/forward and reconstructed URLs retain city, dance and originating search", async () => {
  const router = createMemoryRouter([{ path: "*", element: null }], { initialEntries: ["/?q=Havana"] });
  try {
    await router.navigate("/c/bangkok?dance=salsa", { state: { from: "/?q=Havana" } });
    await router.navigate(tonightPathForRoute(router.state.location.pathname, router.state.location.search));
    const from = router.state.location.pathname + router.state.location.search;
    await router.navigate(tonightBarPath("bangkok", "fixture", "salsa"), { state: { from } });
    assert.equal(router.state.location.search, "?dance=salsa");
    assert.equal(router.state.location.hash, "#bar-fixture");
    assert.equal(router.state.location.state.from, "/tonight?city=bangkok&dance=salsa");
    await router.navigate(-1);
    assert.equal(router.state.location.search, "?city=bangkok&dance=salsa");
    await router.navigate(-1);
    assert.equal(router.state.location.state.from, "/?q=Havana");
    await router.navigate(-1);
    assert.equal(router.state.location.search, "?q=Havana");
    await router.navigate(1);
    assert.equal(router.state.location.pathname, "/c/bangkok");
    assert.equal(router.state.location.search, "?dance=salsa");
  } finally { router.dispose(); }
});

test("BAR anchor opens the individual profile and preserves its city/genre return link", () => {
  reset();
  const html = render("Capital", "/c/hanoi?dance=bachata#bar-bar-hanoi", "/c/:id");
  assert.match(html, /class="bar-profile"/);
  assert.match(html, /<h1>Fixture Hanoi<\/h1>/);
  assert.match(html, /href="\/c\/hanoi\?dance=bachata"/);
  assert.match(html, /Tonight/);
  assert.doesNotMatch(html, /class="detail-hero"|Fixture Party/);
  const otherGenre = render("Capital", "/c/hanoi?dance=salsa#bar-bar-hanoi", "/c/:id");
  assert.match(otherGenre, /<h1>Fixture Hanoi<\/h1>/);
  assert.match(otherGenre, /href="\/c\/hanoi\?dance=salsa"/);
});

test.after(() => { delete globalThis.__frontend; });

test("home Tonight preview distinguishes loading, empty, error and actual city/bar/time rows", () => {
  const f = reset();
  const view = state => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeTonightPreviewView, { state, now: new Date(f.now) })));
  assert.match(view({ status: "loading", cities: [] }), /불러오는 중/);
  const empty = view({ status: "ready", cities: [] });
  assert.match(empty, /오늘 등록된 곳이 아직 없어요/);
  const error = view({ status: "error", cities: [] });
  assert.match(error, /role="alert"/);
  assert.doesNotMatch(error, /오늘 등록된 곳/);
  for (const city of f.cities) for (const venue of city.venues) venue.nightDances.push({ weekday: 4, dance: "salsa" });
  const rows = view({ status: "ready", cities: f.cities });
  assert.equal((rows.match(/<li>/g) ?? []).length, 3);
  assert.match(rows, /Seoul \/ Fixture Seoul/);
  assert.match(rows, /18:00/);
  assert.match(rows, /현지 영업 시작/);
});
