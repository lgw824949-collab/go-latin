import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distRoot = join(webRoot, "dist");

const ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local"];

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Seoul prerender failed.";
  console.error(message);
  process.exit(1);
});

async function main() {
  const env = await loadEnv();
  const origin = siteOrigin(required(env, "GO_LATIN_SITE_ORIGIN"));
  const supabaseUrl = required(env, "VITE_SUPABASE_URL").replace(/\/$/, "");
  const anonKey = required(env, "VITE_SUPABASE_ANON_KEY");
  const shell = await readFile(join(distRoot, "index.html"), "utf8");
  const assets = assetTags(shell);
  const seoul = await loadSeoul(supabaseUrl, anonKey);
  const pageUrl = `${origin}/c/seoul`;
  const title = `${seoul.city} Latin bars | Go Latin`;
  const description = `Latin bars in ${seoul.city}, ${seoul.country}: ${seoul.venues.map((venue) => venue.name).join(", ")}.`;

  const page = renderPage({ assets, seoul, pageUrl, title, description });
  await mkdir(join(distRoot, "c", "seoul"), { recursive: true });
  await writeFile(join(distRoot, "c", "seoul.html"), page, "utf8");
  await writeFile(join(distRoot, "c", "seoul", "index.html"), page, "utf8");
  await writeFile(join(distRoot, "robots.txt"), renderRobots(origin), "utf8");
  await writeFile(join(distRoot, "sitemap.xml"), renderSitemap(origin, pageUrl), "utf8");
  console.log(`Seoul prerender: ${seoul.venues.length} venues -> dist/c/seoul/index.html`);
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

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required to prerender Seoul.`);
  return value;
}

function siteOrigin(value) {
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

function assetTags(html) {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const scripts = html.match(/<script\b[^>]*\bsrc=(["'])[^"']+\1[^>]*>\s*<\/script>/gi) ?? [];
  if (scripts.length === 0) {
    throw new Error("dist/index.html has no built script tag.");
  }
  return { links, scripts };
}

async function loadSeoul(supabaseUrl, anonKey) {
  const endpoint = new URL("/rest/v1/capitals", supabaseUrl);
  endpoint.searchParams.set("id", "eq.seoul");
  endpoint.searchParams.set("select", "id,city,country,image,venues(id,name,address,phone,status)");

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
    throw new Error(`Seoul query failed: ${message}${code}`);
  }

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Seoul query failed: HTTP ${response.status} ${postgrestMessage(body)}`);
  }

  let rows;
  try {
    rows = JSON.parse(body);
  } catch {
    throw new Error("Seoul query failed: response was not JSON.");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Seoul query failed: no capital row.");
  }

  const row = rows.find((item) => item?.id === "seoul") ?? rows[0];
  const city = text(row.city);
  const country = text(row.country);
  if (!city || !country) throw new Error("Seoul query failed: city or country is empty.");

  const venues = venueList(row.venues)
    .filter((venue) => venue?.status !== "permanently_closed" && text(venue?.name) !== "")
    .map((venue) => ({
      id: venue.id ?? "",
      name: text(venue.name),
      address: text(venue.address),
      phone: text(venue.phone),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));

  if (venues.length === 0) throw new Error("Seoul query failed: no venues.");
  return { city, country, image: absoluteHttpUrl(row.image), venues };
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

function renderPage({ assets, seoul, pageUrl, title, description }) {
  const image = seoul.image
    ? `\n    <meta property="og:image" content="${escapeHtml(seoul.image)}" />`
    : "";
  const sections = seoul.venues.map((venue) => {
    const address = venue.address ? `\n      <p>${escapeHtml(venue.address)}</p>` : "";
    return `    <section>\n      <h2>${escapeHtml(venue.name)}</h2>${address}\n    </section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${assets.links.join("\n    ")}
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:type" content="website" />${image}
    <script type="application/ld+json">${jsonLd(seoul, pageUrl, title)}</script>
  </head>
  <body>
    <div id="root">
    <main>
      <h1>${escapeHtml(seoul.city)}</h1>
      <p>${escapeHtml(seoul.country)}</p>
${sections}
    </main>
    </div>
    ${assets.scripts.join("\n    ")}
  </body>
</html>
`;
}

function jsonLd(seoul, pageUrl, title) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: seoul.venues.length,
    itemListElement: seoul.venues.map((venue, index) => {
      const item = {
        "@type": "BarOrPub",
        name: venue.name,
        url: pageUrl,
      };
      if (venue.address) item.address = venue.address;
      if (venue.phone) item.telephone = venue.phone;
      return { "@type": "ListItem", position: index + 1, item };
    }),
  };
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

function renderRobots(origin) {
  return `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${origin}/sitemap.xml
`;
}

function renderSitemap(origin, pageUrl) {
  const urls = [`${origin}/`, pageUrl].map((loc) => `  <url><loc>${escapeHtml(loc)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
