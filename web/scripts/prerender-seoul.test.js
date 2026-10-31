import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { imageCreditHtml } from "../src/lib/capitalImageCredits.js";
import {
  capitalsFromResponse,
  listedVenues,
  pageDescription,
  pageTitle,
  renderNoindexPage,
  renderPage,
  renderSitemap,
  renderTonightPage,
  required,
  selectPages,
  siteOrigin,
  TONIGHT_DESCRIPTION,
  TONIGHT_TITLE,
} from "./prerender-seoul.mjs";

const SEOUL_DESCRIPTION = "Latin bars in Seoul, South Korea: 강남 라틴, 강턴 Turn Salsa, 홍대 보니따 Bonita, 홍턴 Hongturn Latin Club, Top Salsa Bar.";

const seoulVenues = [
  { id: "top", name: "Top Salsa Bar", address: "616-2 Sinsa-dong, Gangnam District, Seoul", phone: "010-6719-9001", status: "operating" },
  { id: "gangnam", name: "강남 라틴", address: "9 Teheran-ro 6-gil, Yeoksam-dong, Gangnam District, Seoul, South Korea", phone: "", status: "operating" },
  { id: "turn", name: "강턴 Turn Salsa", address: "B1, 17 Yeoksam-ro 3-gil, Gangnam-gu, Seoul 06242, South Korea", phone: "02-557-2228", status: "operating" },
  { id: "bonita", name: "홍대 보니따 Bonita", address: "B1, 191 Donggyo-ro, Mapo-gu, Seoul, South Korea", phone: "010-9218-3132", status: "temporarily_closed" },
  { id: "hong", name: "홍턴 Hongturn Latin Club", address: "서울특별시 마포구 동교로 207 현우빌딩", phone: "010-3075-2813", status: "operating" },
  { id: "closed", name: "Closed Floor", address: "Nowhere", phone: "0", status: "permanently_closed" },
];

test("Seoul keeps its title, description, canonical, and venue order", () => {
  const venues = listedVenues(seoulVenues);
  assert.equal(pageTitle("Seoul"), "Seoul Latin bars | Go Latin");
  assert.equal(pageDescription("Seoul", "South Korea", venues), SEOUL_DESCRIPTION);
  const html = renderPage({
    assets: { links: [], scripts: ["<script></script>"] },
    capital: {
      id: "seoul",
      city: "Seoul",
      country: "South Korea",
      image: "https://example.com/seoul.jpg",
      venues,
    },
    pageUrl: "https://go-latin.vercel.app/c/seoul",
    title: pageTitle("Seoul"),
    description: pageDescription("Seoul", "South Korea", venues),
  });
  assert.match(html, /<title>Seoul Latin bars \| Go Latin<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/go-latin\.vercel\.app\/c\/seoul" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/go-latin\.vercel\.app\/c\/seoul" \/>/);
  assert.match(html, /<meta property="og:title" content="Seoul Latin bars \| Go Latin" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(html, /<meta name="twitter:title" content="Seoul Latin bars \| Go Latin" \/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/example.com\/seoul.jpg" \/>/);
  assert.match(html, /"name":"강남 라틴".*"name":"강턴 Turn Salsa".*"name":"홍대 보니따 Bonita".*"name":"홍턴 Hongturn Latin Club".*"name":"Top Salsa Bar"/s);
  assert.equal(html.includes("Closed Floor"), false);
  assert.equal(html.includes("/c/hanoi"), false);
  assert.equal(html.includes("noindex"), false);
});

test("cities without a listed bar are left out of the sitemap", () => {
  const { pages, problems, empty, unlisted } = selectPages([
    { id: "ankara", city: "Ankara", country: "Turkey", venues: [] },
    { id: "canberra", city: "Canberra", country: "Australia", venues: [{ id: "x", name: "Old Bar", status: "permanently_closed" }] },
    { id: "bad", city: "", country: "France", venues: [{ id: "y", name: "Bar", status: "operating" }] },
    { id: "../seoul", city: "Seoul", country: "South Korea", venues: [{ id: "z", name: "Bar", status: "operating" }] },
    { id: "hanoi", city: "Hanoi", country: "Vietnam", venues: [{ id: "h", name: "La Habanera", address: "1", phone: "", status: "operating" }] },
    { id: "seoul", city: "Seoul", country: "South Korea", venues: seoulVenues },
  ]);
  assert.deepEqual(pages.map((page) => page.id), ["hanoi", "seoul"]);
  assert.equal(empty, 2);
  assert.deepEqual(unlisted, ["ankara", "canberra"]);
  assert.deepEqual(problems.map((problem) => problem.reason), ["empty city or country", "unsafe id"]);
  const sitemap = renderSitemap("https://go-latin.vercel.app", pages);
  assert.match(sitemap, /https:\/\/go-latin\.vercel\.app\/</);
  assert.match(sitemap, /https:\/\/go-latin\.vercel\.app\/tonight</);
  assert.match(sitemap, /https:\/\/go-latin\.vercel\.app\/c\/hanoi</);
  assert.match(sitemap, /https:\/\/go-latin\.vercel\.app\/c\/seoul</);
  assert.equal(sitemap.includes("/c/ankara"), false);
  assert.equal(sitemap.includes("/c/canberra"), false);
});

test("a city description and page include only stored dance types", () => {
  const venues = listedVenues([
    {
      id: "both",
      name: "Both Floor",
      address: "1 Main",
      phone: "",
      status: "operating",
      venue_dances: [{ dance: "salsa" }, { dance: "bachata" }, { dance: "tango" }],
    },
    {
      id: "plain",
      name: "Plain Bar",
      address: "2 Main",
      phone: "",
      status: "operating",
      venue_dances: [],
    },
    {
      id: "closed",
      name: "Closed Floor",
      address: "Nowhere",
      phone: "",
      status: "permanently_closed",
      venue_dances: [{ dance: "kizomba" }],
    },
  ]);
  assert.deepEqual(venues.map((venue) => venue.dances), [["Bachata", "Salsa"], []]);
  assert.equal(
    pageDescription("Amman", "Jordan", venues),
    "Latin bars in Amman, Jordan: Both Floor, Plain Bar. Confirmed: Bachata and Salsa.",
  );
  const html = renderPage({
    assets: { links: [], scripts: ["<script></script>"] },
    capital: { id: "amman", city: "Amman", country: "Jordan", image: "", venues },
    pageUrl: "https://go-latin.vercel.app/c/amman",
    title: pageTitle("Amman"),
    description: pageDescription("Amman", "Jordan", venues),
  });
  assert.match(html, /<h2>Both Floor<\/h2>\n      <p>1 Main<\/p>\n      <p>Bachata · Salsa<\/p>/);
  assert.match(html, /<h2>Plain Bar<\/h2>\n      <p>2 Main<\/p>\n    <\/section>/);
  assert.equal(html.includes("Kizomba"), false);
  assert.equal(html.includes("tango"), false);
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(data.itemListElement[0].item.additionalProperty, [
    { "@type": "PropertyValue", name: "Dance type", value: "Bachata" },
    { "@type": "PropertyValue", name: "Dance type", value: "Salsa" },
  ]);
  assert.equal(Object.hasOwn(data.itemListElement[1].item, "additionalProperty"), false);
  assert.equal(typeof data.itemListElement[0].item.address, "string");
});

test("a bar json-ld document uses a confirmed website and instagram without opening hours", () => {
  const venues = listedVenues([
    {
      id: "floor",
      name: "Both Floor",
      address: "1 Main, Amman, Jordan",
      phone: "06-000",
      status: "operating",
      website: "https://both.example/night",
      instagram_url: "https://www.instagram.com/both_floor/",
      venue_dances: [{ dance: "salsa" }, { dance: "bachata" }],
      venue_hours: [
        { weekday: 5, opens: "21:00:00", closes: "02:00:00", is_closed: false },
        { weekday: 1, opens: "18:00", closes: "18:00", is_closed: false },
        { weekday: 2, hours_text: "9 PM–2 AM", is_closed: false },
        { weekday: 0, opens: "20:00", closes: "01:00", is_closed: true },
      ],
    },
    {
      id: "plain",
      name: "Plain Bar",
      address: "2 Main",
      phone: "",
      status: "operating",
      website: "https://go-latin.vercel.app/c/amman",
      instagram_url: "https://example.com/not-instagram",
      venue_dances: [],
      venue_hours: [{ weekday: 3, opens: "19:00", closes: "23:00", is_closed: false }],
    },
  ]);
  const html = renderPage({
    assets: { links: [], scripts: ["<script></script>"] },
    capital: { id: "amman", city: "Amman", country: "Jordan", image: "", venues },
    pageUrl: "https://go-latin.vercel.app/c/amman",
    title: pageTitle("Amman"),
    description: pageDescription("Amman", "Jordan", venues),
  });
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data["@type"], "ItemList");
  const floor = data.itemListElement[0].item;
  assert.equal(floor["@type"], "BarOrPub");
  assert.equal(floor.url, "https://both.example/night");
  assert.equal(floor.sameAs, "https://www.instagram.com/both_floor/");
  assert.equal(floor.address, "1 Main, Amman, Jordan");
  assert.equal(floor.telephone, "06-000");
  assert.equal(Object.hasOwn(floor, "openingHoursSpecification"), false);
  assert.deepEqual(floor.additionalProperty, [
    { "@type": "PropertyValue", name: "Dance type", value: "Bachata" },
    { "@type": "PropertyValue", name: "Dance type", value: "Salsa" },
  ]);
  const plain = data.itemListElement[1].item;
  assert.equal(Object.hasOwn(plain, "url"), false);
  assert.equal(Object.hasOwn(plain, "sameAs"), false);
  assert.equal(plain.address, "2 Main");
  assert.equal(Object.hasOwn(plain, "openingHoursSpecification"), false);
  assert.match(html, /<a href="https:\/\/both\.example\/night">https:\/\/both\.example\/night<\/a>/);
  assert.match(html, /<a href="https:\/\/www\.instagram\.com\/both_floor\/">https:\/\/www\.instagram\.com\/both_floor\/<\/a>/);
  assert.match(html, /<h2>Plain Bar<\/h2>\n      <p>2 Main<\/p>\n    <\/section>/);
  assert.equal(html.includes("openingHoursSpecification"), false);
  assert.equal(html.includes("Closed Floor"), false);
});

test("Tonight is a static page and a city without a listed bar is noindex", () => {
  const assets = { links: [], scripts: ["<script></script>"] };
  const tonight = renderTonightPage({ assets, pageUrl: "https://go-latin.vercel.app/tonight" });
  assert.equal(tonight.includes(`<title>${TONIGHT_TITLE}</title>`), true);
  assert.equal(tonight.includes(`name="description" content="${TONIGHT_DESCRIPTION}"`), true);
  assert.equal(tonight.includes('rel="canonical" href="https://go-latin.vercel.app/tonight"'), true);
  assert.match(tonight, /<div id="root"><\/div>/);
  assert.equal(tonight.includes("noindex"), false);
  assert.equal(tonight.includes("application/ld+json"), false);
  const hidden = renderNoindexPage({ assets });
  assert.match(hidden, /name="robots" content="noindex"/);
  assert.equal(hidden.includes("canonical"), false);
  assert.equal(hidden.includes("Latin bars"), false);
  assert.equal(hidden.includes("application/ld+json"), false);
});

test("the home canonical stays off city pages and sitemap urls stay extensionless", () => {
  const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const home = readFileSync(join(webRoot, "index.html"), "utf8");
  const hosting = JSON.parse(readFileSync(join(webRoot, "vercel.json"), "utf8"));
  assert.match(home, /<link rel="canonical" href="https:\/\/go-latin\.vercel\.app\/" \/>/);
  assert.equal(hosting.cleanUrls, true);
  assert.equal(hosting.trailingSlash, false);
  for (const source of ["/country", "/country/:slug", "/admin", "/admin/:id"]) {
    assert.ok(hosting.rewrites.some(rule => rule.source === source && rule.destination === "/index"));
  }
  assert.ok(!hosting.rewrites.some(rule => rule.source === "/:path*"));
  const html = renderPage({
    assets: {
      links: [
        '<link rel="canonical" href="https://go-latin.vercel.app/" />',
        '<link rel="icon" href="/favicon.svg" />',
      ],
      scripts: ["<script></script>"],
    },
    capital: {
      id: "seoul",
      city: "Seoul",
      country: "South Korea",
      image: "",
      venues: [{ id: "top", name: "Top Salsa Bar", address: "", phone: "", dances: ["Salsa"] }],
    },
    pageUrl: "https://go-latin.vercel.app/c/seoul",
    title: pageTitle("Seoul"),
    description: pageDescription("Seoul", "South Korea", [{ name: "Top Salsa Bar", dances: ["Salsa"] }]),
  });
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
  assert.match(html, /rel="canonical" href="https:\/\/go-latin\.vercel\.app\/c\/seoul" \/>/);
  const hidden = renderNoindexPage({
    assets: { links: ['<link rel="canonical" href="https://go-latin.vercel.app/" />'], scripts: ["<script></script>"] },
  });
  assert.equal(hidden.includes("canonical"), false);
  const sitemap = renderSitemap("https://go-latin.vercel.app", [{ id: "seoul" }]);
  assert.equal(sitemap.includes("/c/seoul.html"), false);
  assert.equal(sitemap.includes("/c/seoul/"), false);
  assert.match(sitemap, /https:\/\/go-latin\.vercel\.app\/c\/seoul</);
});

test("a capital query failure stops the prerender", () => {
  assert.throws(() => required({}, "GO_LATIN_SITE_ORIGIN"), /GO_LATIN_SITE_ORIGIN is required/);
  assert.throws(() => siteOrigin("https://go-latin.vercel.app/c/seoul"), /without a path/);
  assert.throws(() => capitalsFromResponse(500, "{\"message\":\"db\"}"), /HTTP 500/);
  assert.throws(() => capitalsFromResponse(200, "nope"), /not JSON/);
  assert.throws(() => capitalsFromResponse(200, "{\"id\":\"seoul\"}"), /not a list/);
  assert.throws(() => capitalsFromResponse(200, "[]"), /no capital rows/);
  assert.throws(() => capitalsFromResponse(200, JSON.stringify(Array.from({ length: 1000 }, (_, index) => ({ id: `c${index}` })))), /1000/);
});

const WARSAW_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/2/2b/Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg";
const WARSAW_PREVIOUS = "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Pa%C5%82ac_Kultury_i_Nauki_2019.jpg/960px-Pa%C5%82ac_Kultury_i_Nauki_2019.jpg";
const OUAGADOUGOU_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/2/2f/Cathedrale_Ouagadougou.jpg";

test("static html includes a photo credit only when the city image url matches", () => {
  const assets = { links: [], scripts: ["<script></script>"] };
  const warsaw = {
    id: "warsaw",
    city: "Warsaw",
    country: "Poland",
    venues: [{ id: "dos", name: "Dos Mundos", address: "Al. Jerozolimskie 123A", phone: "", dances: ["Salsa"] }],
  };
  const previous = renderPage({
    assets,
    capital: { ...warsaw, image: WARSAW_PREVIOUS },
    pageUrl: "https://go-latin.vercel.app/c/warsaw",
    title: pageTitle("Warsaw"),
    description: pageDescription("Warsaw", "Poland", warsaw.venues),
  });
  assert.equal(previous.includes("Photo:"), false);
  assert.equal(previous.includes("noindex"), false);
  assert.match(previous, /rel="canonical" href="https:\/\/go-latin\.vercel\.app\/c\/warsaw"/);

  const next = renderPage({
    assets,
    capital: { ...warsaw, image: WARSAW_IMAGE },
    pageUrl: "https://go-latin.vercel.app/c/warsaw",
    title: pageTitle("Warsaw"),
    description: pageDescription("Warsaw", "Poland", warsaw.venues),
  });
  assert.match(next, /Photo: A\.Savin, <a href="https:\/\/creativecommons\.org\/licenses\/by-sa\/3\.0\/">CC BY-SA 3\.0<\/a>\. <a href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science\.jpg">Wikimedia Commons<\/a>/);
  assert.equal(next.includes("noindex"), false);

  const credited = renderNoindexPage({ assets, creditHtml: imageCreditHtml("ouagadougou", OUAGADOUGOU_IMAGE) });
  assert.match(credited, /name="robots" content="noindex"/);
  assert.equal(credited.includes("canonical"), false);
  assert.match(credited, /Photo: Sputniktilt, <a href="https:\/\/creativecommons\.org\/licenses\/by-sa\/3\.0\/">CC BY-SA 3\.0<\/a>\. <a href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Cathedrale_Ouagadougou\.jpg">Wikimedia Commons<\/a>/);

  const hidden = renderNoindexPage({ assets, creditHtml: imageCreditHtml("ouagadougou", WARSAW_IMAGE) });
  assert.match(hidden, /<div id="root"><\/div>/);
  assert.equal(hidden.includes("Photo:"), false);

  const { pages, unlisted } = selectPages([
    { id: "ouagadougou", city: "Ouagadougou", country: "Burkina Faso", image: OUAGADOUGOU_IMAGE, venues: [] },
    { id: "warsaw", city: "Warsaw", country: "Poland", image: WARSAW_IMAGE, venues: warsaw.venues.map((venue) => ({ ...venue, status: "operating" })) },
  ]);
  assert.deepEqual(pages.map((page) => page.id), ["warsaw"]);
  assert.deepEqual(unlisted, ["ouagadougou"]);
  const sitemap = renderSitemap("https://go-latin.vercel.app", pages);
  assert.equal(sitemap.includes("/c/ouagadougou"), false);
  assert.match(sitemap, /\/c\/warsaw</);
});
