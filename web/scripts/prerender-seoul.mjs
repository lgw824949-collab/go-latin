import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { imageCreditHtml } from "../src/lib/capitalImageCredits.js";
import { cityJsonLd, confirmedDanceNames, pageDescription, pageTitle, socialTags } from "../src/lib/routeHead.js";

export { pageDescription, pageTitle };

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distRoot = join(webRoot, "dist");
const SLUG = /^[a-z0-9_]+$/;

const ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local"];

export function listedVenues(value) {
  return venueList(value)
    .filter((venue) => venue?.status !== "permanently_closed" && text(venue?.name) !== "")
    .map((venue) => ({
      id: venue.id ?? "",
      name: text(venue.name),
      address: text(venue.address),
      phone: text(venue.phone),
      website: text(venue.website),
      instagram: text(venue.instagram_url),
      dances: confirmedDanceNames(venueList(venue.venue_dances).map((row) => row?.dance)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || String(a.id).localeCompare(String(b.id)));
}

export function qualifyCapital(row) {
  const id = text(row?.id);
  if (!SLUG.test(id)) return { reason: "unsafe id" };
  const city = text(row?.city);
  const country = text(row?.country);
  if (!city || !country) return { reason: "empty city or country" };
  const venues = listedVenues(row?.venues);
  if (venues.length === 0) return { reason: "no listed venues" };
  return {
    page: {
      id,
      city,
      country,
      image: absoluteHttpUrl(row.image),
      venues,
    },
  };
}

export function selectPages(rows) {
  const pages = [];
  const unlisted = [];
  const problems = [];
  for (const row of rows ?? []) {
    const result = qualifyCapital(row);
    if (result.page) pages.push(result.page);
    else if (result.reason === "no listed venues") unlisted.push(text(row?.id));
    else problems.push({ id: text(row?.id) || "(missing id)", reason: result.reason });
  }
  pages.sort((a, b) => a.id.localeCompare(b.id));
  unlisted.sort((a, b) => a.localeCompare(b));
  return { pages, problems, empty: unlisted.length, unlisted };
}

export function capitalsFromResponse(status, body) {
  if (!status || status < 200 || status >= 300) {
    throw new Error(`Capital query failed: HTTP ${status} ${postgrestMessage(body)}`);
  }
  return parseCapitals(body);
}

export function parseCapitals(body) {
  let rows;
  try {
    rows = JSON.parse(body);
  } catch {
    throw new Error("Capital query failed: response was not JSON.");
  }
  if (!Array.isArray(rows)) throw new Error("Capital query failed: response was not a list.");
  if (rows.length === 0) throw new Error("Capital query failed: no capital rows.");
  if (rows.length >= 1000) {
    throw new Error("Capital query failed: response reached 1000 rows and may be truncated.");
  }
  return rows;
}

export function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required to prerender city pages.`);
  return value;
}

export function siteOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("GO_LATIN_SITE_ORIGIN must be an absolute URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("GO_LATIN_SITE_ORIGIN must use http or https.");
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("GO_LATIN_SITE_ORIGIN must be an origin without a path, query, or hash.");
  }
  return url.origin;
}

export const TONIGHT_TITLE = "Explore Latin Bars | GO LATIN";
export const TONIGHT_DESCRIPTION = "Explore Latin bars by city. Official website and Instagram links are included when they are stored.";

export function renderSitemap(origin, pages) {
  const locs = [
    `${origin}/`,
    `${origin}/tonight`,
    ...[...pages].sort((a, b) => a.id.localeCompare(b.id)).map((page) => `${origin}/c/${page.id}`),
  ];
  const urls = locs.map((loc) => `  <url><loc>${escapeHtml(loc)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function renderPage({ assets, capital, pageUrl, title, description }) {
  const social = socialTags({ title, description, url: pageUrl, image: capital.image })
    .map(([kind, name, content]) => `<meta ${kind}="${name}" content="${escapeHtml(content)}" />`)
    .join("\n    ");
  const creditHtml = imageCreditHtml(capital.id, capital.image);
  const creditBlock = creditHtml ? `\n      ${creditHtml}` : "";
  const sections = capital.venues.map((venue) => {
    const address = venue.address ? `\n      <p>${escapeHtml(venue.address)}</p>` : "";
    const dances = venue.dances?.length ? `\n      <p>${escapeHtml(venue.dances.join(" · "))}</p>` : "";
    const links = sourceLinks(venue, pageUrl);
    return `    <section>\n      <h2>${escapeHtml(venue.name)}</h2>${address}${dances}${links}\n    </section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${contentLinks(assets.links).join("\n    ")}
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    ${social}
    <script type="application/ld+json">${jsonLd(capital, pageUrl, title)}</script>
  </head>
  <body>
    <div id="root">
    <main>
      <h1>${escapeHtml(capital.city)}</h1>
      <p>${escapeHtml(capital.country)}</p>${creditBlock}
${sections}
    </main>
    </div>
    ${assets.scripts.join("\n    ")}
  </body>
</html>
`;
}

export function renderTonightPage({ assets, pageUrl }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${contentLinks(assets.links).join("\n    ")}
    <title>${escapeHtml(TONIGHT_TITLE)}</title>
    <meta name="description" content="${escapeHtml(TONIGHT_DESCRIPTION)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  </head>
  <body>
    <div id="root"></div>
    ${assets.scripts.join("\n    ")}
  </body>
</html>
`;
}

export function renderNoindexPage({ assets, creditHtml = "" }) {
  const credit = creditHtml ? `\n    ${creditHtml}\n    ` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${contentLinks(assets.links).join("\n    ")}
    <title>Go Latin</title>
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <div id="root">${credit}</div>
    ${assets.scripts.join("\n    ")}
  </body>
</html>
`;
}

if (isDirectRun()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "City prerender failed.";
    console.error(message);
    process.exit(1);
  });
}

async function main() {
  const env = await loadEnv();
  const origin = siteOrigin(required(env, "GO_LATIN_SITE_ORIGIN"));
  const supabaseUrl = required(env, "VITE_SUPABASE_URL").replace(/\/$/, "");
  const anonKey = required(env, "VITE_SUPABASE_ANON_KEY");
  const shell = await readFile(join(distRoot, "index.html"), "utf8");
  const assets = assetTags(shell);
  const loaded = await loadCapitals(supabaseUrl, anonKey);
  const { pages, problems, empty, unlisted } = selectPages(loaded);

  for (const problem of problems) console.error(`skip ${problem.id}: ${problem.reason}`);
  const tonightHtml = renderTonightPage({ assets, pageUrl: `${origin}/tonight` });
  await writeFile(join(distRoot, "tonight.html"), tonightHtml, "utf8");
  await mkdir(join(distRoot, "c"), { recursive: true });
  for (const page of pages) {
    const pageUrl = `${origin}/c/${page.id}`;
    const title = pageTitle(page.city);
    const description = pageDescription(page.city, page.country, page.venues);
    const html = renderPage({ assets, capital: page, pageUrl, title, description });
    await writeFile(join(distRoot, "c", `${page.id}.html`), html, "utf8");
  }
  const imageById = new Map(loaded.map((row) => [text(row?.id), absoluteHttpUrl(row?.image)]));
  for (const id of unlisted) {
    const creditHtml = imageCreditHtml(id, imageById.get(id) ?? "");
    await writeFile(join(distRoot, "c", `${id}.html`), renderNoindexPage({ assets, creditHtml }), "utf8");
  }
  await writeFile(join(distRoot, "robots.txt"), renderRobots(origin), "utf8");
  await writeFile(join(distRoot, "sitemap.xml"), renderSitemap(origin, pages), "utf8");
  const venueCount = pages.reduce((sum, page) => sum + page.venues.length, 0);
  console.log(`Prerender: ${pages.length} cities, ${venueCount} venues, ${empty} without listed venues`);
  if (pages.length > 0) console.log(pages.map((page) => page.id).join(", "));
}

async function loadCapitals(supabaseUrl, anonKey) {
  const endpoint = new URL("/rest/v1/capitals", supabaseUrl);
  endpoint.searchParams.set("select", "id,city,country,image,venues(id,name,address,phone,status,website,instagram_url,venue_dances(dance))");

  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    if (error?.cause?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" && !process.execArgv.includes("--use-system-ca")) {
      relaunchWithSystemCa();
    }
    const message = error instanceof Error ? error.message : "request failed";
    const code = error?.cause?.code ? ` (${error.cause.code})` : "";
    throw new Error(`Capital query failed: ${message}${code}`);
  }

  const body = await response.text();
  return capitalsFromResponse(response.status, body);
}

async function loadEnv() {
  const values = {};
  for (const name of ENV_FILES) {
    let text = "";
    try {
      text = await readFile(join(webRoot, name), "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    Object.assign(values, parseEnv(text));
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) values[key] = value;
  }
  return values;
}

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim().replace(/^\uFEFF/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;
    const body = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const eq = body.indexOf("=");
    if (eq < 1) continue;
    const key = body.slice(0, eq).trim();
    let value = body.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function contentLinks(links) {
  return (links ?? []).filter((tag) => !/\brel\s*=\s*(["'])canonical\1/i.test(tag));
}

function assetTags(html) {
  const links = contentLinks(html.match(/<link\b[^>]*>/gi) ?? []);
  const scripts = html.match(/<script\b[^>]*\bsrc=(["'])[^"']+\1[^>]*>\s*<\/script>/gi) ?? [];
  if (scripts.length === 0) {
    throw new Error("dist/index.html has no built script tag.");
  }
  return { links, scripts };
}

function postgrestMessage(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || "";
  } catch {
    return "";
  }
}

function venueList(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function absoluteHttpUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function jsonLd(capital, pageUrl, title) {
  return JSON.stringify(cityJsonLd(capital, pageUrl, title)).replaceAll("<", "\\u003c");
}

function renderRobots(origin) {
  return `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${origin}/sitemap.xml
`;
}

function relaunchWithSystemCa() {
  const child = spawnSync(
    process.execPath,
    ["--use-system-ca", fileURLToPath(import.meta.url)],
    { stdio: "inherit", env: process.env },
  );
  process.exit(child.status === null ? 1 : child.status);
}

function sourceLinks(venue, pageUrl) {
  const website = websiteHref(venue.website, pageUrl);
  const instagram = instagramHref(venue.instagram);
  return [website, instagram].filter(Boolean).map((href) => `\n      <p><a href="${escapeHtml(href)}">${escapeHtml(href)}</a></p>`).join("");
}

function websiteHref(value, pageUrl) {
  const href = httpHref(value);
  if (!href || instagramHref(href) || isCityPage(href, pageUrl)) return "";
  return href;
}

function instagramHref(value) {
  const href = httpHref(value);
  if (!href) return "";
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    return host === "instagram.com" ? href : "";
  } catch {
    return "";
  }
}

function httpHref(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return raw;
  } catch {
    return "";
  }
}

function isCityPage(href, pageUrl) {
  try {
    const site = new URL(pageUrl);
    const candidate = new URL(href);
    const city = citySlug(site.pathname);
    if (!city || candidate.origin !== site.origin) return false;
    return citySlug(candidate.pathname) === city;
  } catch {
    return false;
  }
}

function citySlug(pathname) {
  return /^\/c\/([a-z0-9_]+)\/?$/.exec(pathname)?.[1] ?? "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
}
