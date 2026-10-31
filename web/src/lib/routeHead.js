import { DANCES } from "./filterCapitals.js";
import { httpUrl } from "./sources.js";

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CITY_PATH = /^\/c\/([a-z0-9_]+)\/?$/;
export const SITE_ORIGIN = "https://go-latin.vercel.app";

export function cityPath(pathname) {
  const match = CITY_PATH.exec(pathname ?? "");
  if (!match) return "";
  return `/c/${match[1]}`;
}

export function canonicalPath(href) {
  if (!href) return "";
  try {
    return cityPath(new URL(href, "https://local.invalid").pathname);
  } catch {
    return "";
  }
}

export function pageTitle(city) {
  return `${city} Latin bars | Go Latin`;
}

export function confirmedDanceNames(values) {
  const seen = new Set((values ?? []).map((value) => text(value).toLowerCase()).filter(Boolean));
  return DANCES.filter((dance) => seen.has(dance.id)).map((dance) => dance.name);
}

export function pageDescription(city, country, venues) {
  const names = venues.map((venue) => venue.name).join(", ");
  const dances = confirmedDanceNames(venues.flatMap((venue) => venue.dances ?? []));
  const everyBarHasDance = venues.length > 0 && venues.every((venue) => confirmedDanceNames(venue.dances).length > 0);
  if (dances.length > 0 && everyBarHasDance) {
    return `${dancePhrase(dances)} bars in ${city}, ${country}: ${names}.`;
  }
  const base = `Latin bars in ${city}, ${country}: ${names}.`;
  if (dances.length === 0) return base;
  return `${base} Confirmed: ${dancePhrase(dances)}.`;
}

export function socialTags({ title, description, url, image }) {
  const tags = [
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", url],
    ["property", "og:type", "website"],
  ];
  if (image) tags.push(["property", "og:image", image]);
  tags.push(
    ["name", "twitter:card", image ? "summary_large_image" : "summary"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
  );
  if (image) tags.push(["name", "twitter:image", image]);
  return tags;
}

export function headVenues(venues) {
  return (venues ?? [])
    .filter((venue) => venue?.status !== "permanently_closed" && text(venue?.name) !== "")
    .map((venue) => ({
      id: venue.id ?? "",
      name: text(venue.name),
      address: text(venue.address),
      phone: text(venue.phone),
      dances: confirmedDanceNames(venue.dances),
      website: text(venue.website),
      instagram: text(venue.instagram),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || String(a.id).localeCompare(String(b.id)));
}

export function cityCanonical(capitalId) {
  return `${SITE_ORIGIN}/c/${text(capitalId)}`;
}

export function cityJsonLd(capital, pageUrl, title) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: capital.venues.length,
    itemListElement: capital.venues.map((venue, index) => {
      const item = {
        "@type": "BarOrPub",
        name: venue.name,
      };
      const website = officialWebsite(venue.website, pageUrl);
      if (website) item.url = website;
      const instagram = instagramProfile(venue.instagram);
      if (instagram) item.sameAs = instagram;
      if (venue.address) item.address = venue.address;
      if (venue.phone) item.telephone = venue.phone;
      if (venue.dances?.length) {
        item.additionalProperty = venue.dances.map((dance) => ({
          "@type": "PropertyValue",
          name: "Dance type",
          value: dance,
        }));
      }
      return { "@type": "ListItem", position: index + 1, item };
    }),
  };
}

export function cityHead(capital) {
  const venues = headVenues(listedVenueRows(capital));
  if (venues.length === 0) {
    return { title: "Go Latin", description: "", canonical: "", robots: "noindex", jsonLd: null };
  }
  const title = pageTitle(capital.city);
  const canonical = cityCanonical(capital.id);
  return {
    title,
    description: pageDescription(capital.city, capital.country, venues),
    canonical,
    robots: "",
    image: httpUrl(capital.image),
    jsonLd: cityJsonLd({ venues }, canonical, title),
  };
}

export function cityRobots(venues) {
  return headVenues(venues).length === 0 ? "noindex" : "";
}

export function applyCityHead(capital) {
  const next = cityHead(capital);
  document.title = next.title;
  setMeta("description", next.description);
  setLink("canonical", next.canonical);
  setMeta("robots", next.robots);
  setSocial(next);
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove());
  if (!next.jsonLd) return;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(next.jsonLd).replaceAll("<", "\\u003c");
  document.head.appendChild(script);
}

function listedVenueRows(capital) {
  if (Array.isArray(capital?.venues) && capital.venues.length > 0) return capital.venues;
  if (capital?.venue) return [capital.venue];
  return [];
}

export function openingHoursSpecification(rows) {
  const byDay = new Map();
  for (const row of rows ?? []) {
    const weekday = weekdayNumber(row?.weekday);
    if (weekday == null) continue;
    const list = byDay.get(weekday) ?? [];
    list.push(row);
    byDay.set(weekday, list);
  }
  const specs = [];
  for (const [weekday, list] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    if (list.length !== 1) continue;
    const row = list[0];
    if (row.closed === true || row.is_closed === true) continue;
    const opens = clockTime(row.opens);
    const closes = clockTime(row.closes);
    if (!opens || !closes || opens === closes) continue;
    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY[weekday],
      opens,
      closes,
    });
  }
  return specs;
}

function weekdayNumber(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) return value;
  if (typeof value === "string" && /^[0-6]$/.test(value)) return Number(value);
  return null;
}

function clockTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value ?? "").trim());
  if (!match) return "";
  return `${match[1]}:${match[2]}`;
}

function officialWebsite(value, pageUrl) {
  const href = httpUrl(value);
  if (!href || instagramProfile(href) || isCityPage(href, pageUrl)) return "";
  return href;
}

function instagramProfile(value) {
  const href = httpUrl(value);
  if (!href) return "";
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    return host === "instagram.com" ? href : "";
  } catch {
    return "";
  }
}

function isCityPage(href, pageUrl) {
  try {
    const site = new URL(pageUrl);
    const candidate = new URL(href);
    const city = cityPath(site.pathname);
    if (!city) return false;
    return candidate.origin === site.origin && cityPath(candidate.pathname) === city;
  } catch {
    return false;
  }
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function dancePhrase(names) {
  if (names.length < 2) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function setSocial(next) {
  const tags = next.canonical
    ? socialTags({ title: next.title, description: next.description, url: next.canonical, image: next.image })
    : [];
  replaceNamed(tags, "property", 'meta[property^="og:"]', "property");
  replaceNamed(tags, "name", 'meta[name^="twitter:"]', "name");
}

function replaceNamed(tags, kind, selector, attribute) {
  const wanted = new Map(tags.filter(([tagKind]) => tagKind === kind).map(([, name, content]) => [name, content]));
  document.querySelectorAll(selector).forEach((node) => {
    if (!wanted.has(node.getAttribute(attribute))) node.remove();
  });
  for (const [name, content] of wanted) setAttributeMeta(attribute, name, content);
}

function setAttributeMeta(attribute, name, content) {
  const nodes = [...document.querySelectorAll(`meta[${attribute}="${name}"]`)];
  const [node, ...extra] = nodes;
  extra.forEach((item) => item.remove());
  if (node) {
    node.setAttribute("content", content);
    return;
  }
  const meta = document.createElement("meta");
  meta.setAttribute(attribute, name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function setMeta(name, content) {
  const nodes = [...document.querySelectorAll(`meta[name="${name}"]`)];
  if (!content) {
    nodes.forEach((node) => node.remove());
    return;
  }
  const [node, ...extra] = nodes;
  extra.forEach((item) => item.remove());
  if (node) {
    node.setAttribute("content", content);
    return;
  }
  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function setLink(rel, href) {
  const nodes = [...document.querySelectorAll(`link[rel="${rel}"]`)];
  if (!href) {
    nodes.forEach((node) => node.remove());
    return;
  }
  const [node, ...extra] = nodes;
  extra.forEach((item) => item.remove());
  if (node) {
    node.setAttribute("href", href);
    return;
  }
  const link = document.createElement("link");
  link.setAttribute("rel", rel);
  link.setAttribute("href", href);
  document.head.appendChild(link);
}

export function headAction(pathname, canonicalHref) {
  const here = cityPath(pathname);
  const current = canonicalPath(canonicalHref);
  if (here && current === here) return "keep";
  return "clear";
}
