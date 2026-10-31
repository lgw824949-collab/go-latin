import { createClient } from "@supabase/supabase-js";
import { DANCES } from "./filterCapitals.js";
import { httpUrl } from "./sources.js";

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const DANCE_IDS = new Set(DANCES.map((dance) => dance.id));

const PARTY_SELECT = `
  id, place_id, name, venue_name, starts_at, ends_at, official_url, poster_url,
  party_dances (dance),
  party_places (
    id, capital_id, city, country, timezone,
    capitals (city, country, timezone)
  )
`;

const PLACE_SELECT = `
  id, capital_id, city, admin_area, country, timezone,
  capitals (city, country, timezone)
`;

let supabase;

export function partyHead(title = "Parties | Go Latin") {
  return { title, robots: "noindex", canonical: "" };
}

export function shapeParty(row) {
  if (!row?.id) return null;
  const place = one(row.party_places);
  const capital = place?.capital_id ? one(place.capitals) : null;
  return {
    id: row.id,
    placeId: row.place_id ?? place?.id ?? "",
    capitalId: place?.capital_id ?? "",
    name: text(row.name),
    venueName: text(row.venue_name),
    startsAt: row.starts_at ?? "",
    endsAt: row.ends_at ?? "",
    officialUrl: httpUrl(row.official_url) || "",
    posterUrl: httpUrl(row.poster_url) || "",
    city: text(capital?.city ?? place?.city),
    country: text(capital?.country ?? place?.country),
    timezone: text(capital?.timezone ?? place?.timezone),
    dances: DANCE_IDS.size
      ? DANCES.map((dance) => dance.id).filter((id) => danceIds(row.party_dances).includes(id))
      : [],
  };
}

export function isUpcoming(party, now = new Date()) {
  const end = Date.parse(party?.endsAt);
  return Number.isFinite(end) && end > now.getTime();
}

export function upcomingParties(parties, now = new Date()) {
  return (parties ?? []).filter((party) => isUpcoming(party, now));
}

export function filterParties(parties, { city = "", country = "", dance = "" } = {}) {
  const cityQuery = fold(city);
  const countryQuery = fold(country);
  return (parties ?? []).filter((party) => {
    if (cityQuery && !fold(party.city).includes(cityQuery)) return false;
    if (countryQuery && !fold(party.country).includes(countryQuery)) return false;
    if (dance && !(party.dances ?? []).includes(dance)) return false;
    return true;
  });
}

export function partySchedule(party) {
  const zone = iana(party?.timezone) ? party.timezone : "UTC";
  const start = new Date(party?.startsAt);
  const end = new Date(party?.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { date: "", time: "", zone };
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const startDate = dateFormat.format(start);
  const endDate = dateFormat.format(end);
  return {
    date: startDate === endDate ? startDate : `${startDate} – ${endDate}`,
    time: `${timeFormat.format(start)}–${timeFormat.format(end)}`,
    zone,
  };
}

export function danceLabel(ids) {
  const names = DANCES.filter((dance) => (ids ?? []).includes(dance.id)).map((dance) => dance.name);
  return names.join(" · ");
}

export function applyPartyHead(title) {
  const head = partyHead(title);
  document.title = head.title;
  const robots = document.querySelector('meta[name="robots"]') ?? document.head.appendChild(document.createElement("meta"));
  robots.setAttribute("name", "robots");
  robots.setAttribute("content", head.robots);
  document.querySelector('meta[name="description"]')?.remove();
  document.querySelectorAll('link[rel="canonical"]').forEach((node) => node.remove());
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove());
}

export async function loadPublicParties(now = new Date()) {
  return loadPublicPartiesWith(client(), now);
}

export async function loadPublicPartiesWith(supabase, now = new Date()) {
  const { data, error } = await supabase.from("parties").select(PARTY_SELECT);
  if (error || !Array.isArray(data)) return [];
  return upcomingParties(data.map(shapeParty).filter(Boolean), now);
}

export function shapePlace(row) {
  if (!row?.id) return null;
  const capital = row.capital_id ? one(row.capitals) : null;
  return {
    id: row.id,
    capitalId: row.capital_id ?? "",
    city: text(capital?.city ?? row.city),
    adminArea: text(row.admin_area),
    country: text(capital?.country ?? row.country),
    timezone: text(capital?.timezone ?? row.timezone),
  };
}

export function placePath(placeId) {
  const id = text(placeId);
  return id ? `/p/${id}` : "";
}

export async function loadCapitalParties(capitalId, now = new Date()) {
  return loadCapitalPartiesWith(client(), capitalId, now);
}

export async function loadCapitalPartiesWith(supabase, capitalId, now = new Date()) {
  const id = text(capitalId);
  if (!id) return [];
  const place = await supabase.from("party_places").select("id, capital_id").eq("capital_id", id).maybeSingle();
  if (place.error || !place.data?.id || place.data.capital_id !== id) return [];
  const parties = await supabase.from("parties").select(PARTY_SELECT).eq("place_id", place.data.id);
  if (parties.error || !Array.isArray(parties.data)) return [];
  return byStart(upcomingParties(
    parties.data.map(shapeParty).filter((party) => party && party.placeId === place.data.id),
    now,
  ));
}

export async function loadPlaceParties(placeId, now = new Date()) {
  return loadPlacePartiesWith(client(), placeId, now);
}

export async function loadPlacePartiesWith(supabase, placeId, now = new Date()) {
  const id = text(placeId);
  if (!id) return { place: null, parties: [] };
  const place = await supabase.from("party_places").select(PLACE_SELECT).eq("id", id).maybeSingle();
  if (place.error || !place.data) return { place: null, parties: [] };
  const shaped = shapePlace(place.data);
  if (!shaped || shaped.id !== id) return { place: null, parties: [] };
  const parties = await supabase.from("parties").select(PARTY_SELECT).eq("place_id", id);
  if (parties.error || !Array.isArray(parties.data)) return { place: shaped, parties: [] };
  return {
    place: shaped,
    parties: byStart(upcomingParties(
      parties.data.map(shapeParty).filter((party) => party && party.placeId === id),
      now,
    )),
  };
}

export async function loadPublicParty(id) {
  return loadPublicPartyWith(client(), id);
}

export async function loadPublicPartyWith(supabase, id) {
  if (!id) return null;
  const { data, error } = await supabase.from("parties").select(PARTY_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return shapeParty(data);
}

function client() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }
  if (!supabase) supabase = createClient(url, anonKey);
  return supabase;
}

function byStart(parties) {
  return [...parties].sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
}

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

function danceIds(rows) {
  return (rows ?? []).map((row) => row?.dance).filter((id) => DANCE_IDS.has(id));
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function fold(value) {
  return text(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function iana(value) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
