import { createClient } from "@supabase/supabase-js";
import { isIanaTimezone, zonedLocalToIso } from "./partyAdmin.js";
import { httpUrl } from "./sources.js";

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const SIMPLE_PARTY_CITIES = [
  { id: "seoul", city: "Seoul", country: "South Korea", timezone: "Asia/Seoul" },
  { id: "bangkok", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok" },
  { id: "hanoi", city: "Hanoi", country: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
];

export const SIMPLE_PARTY_GENRES = [
  { id: "salsa", name: "Salsa" },
  { id: "bachata", name: "Bachata" },
  { id: "kizomba", name: "Kizomba" },
  { id: "mixed", name: "Mixed" },
];

const CITY_IDS = new Set(SIMPLE_PARTY_CITIES.map((city) => city.id));
const GENRE_IDS = new Set(SIMPLE_PARTY_GENRES.map((genre) => genre.id));
const POSTER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const POSTER_MAX_BYTES = 4 * 1024 * 1024;

let supabase;

export function isSimplePartyCity(id) {
  return CITY_IDS.has(String(id ?? "").trim());
}

export function simplePartyCity(id) {
  return SIMPLE_PARTY_CITIES.find((city) => city.id === String(id ?? "").trim()) ?? null;
}

export function genreLabel(id) {
  return SIMPLE_PARTY_GENRES.find((genre) => genre.id === id)?.name ?? "";
}

export function partyDateKey(value, timeZone) {
  if (!isIanaTimezone(timeZone)) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone.trim(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isListedSimpleParty(party, now = new Date()) {
  const zone = simplePartyCity(party?.capitalId)?.timezone;
  const eventDay = partyDateKey(party?.startsAt, zone);
  const today = partyDateKey(now, zone);
  return Boolean(eventDay && today && eventDay >= today);
}

export function listedSimpleParties(parties, now = new Date()) {
  return (parties ?? [])
    .filter((party) => isListedSimpleParty(party, now))
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
}

export function reuseContacts(venues, priorParties = []) {
  const rows = [];
  const seen = new Set();
  function add(venueName, snsUrl, venueId = "") {
    const name = String(venueName ?? "").trim();
    const sns = httpUrl(snsUrl);
    if (!name || !sns) return;
    const key = `${fold(name)}\n${sns}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ venueName: name, snsUrl: sns, venueId: venueId || "" });
  }
  for (const venue of venues ?? []) {
    add(venue?.name, venue?.instagram || venue?.website, venue?.id);
  }
  for (const party of priorParties ?? []) {
    add(party?.venueName, party?.snsUrl, party?.venueId);
  }
  return rows;
}

export function validateSimpleParty(form, { allowExistingPoster = false } = {}) {
  const errors = [];
  if (!isSimplePartyCity(form?.capitalId)) errors.push("Choose Seoul, Bangkok, or Hanoi.");
  if (!form?.date) errors.push("Choose a date.");
  if (!form?.startTime) errors.push("Choose a start time.");
  if (!GENRE_IDS.has(form?.genre)) errors.push("Choose Salsa, Bachata, Kizomba, or Mixed.");
  if (!String(form?.venueName ?? "").trim()) errors.push("Enter a venue.");
  if (!httpUrl(form?.snsUrl)) errors.push("Inquiry SNS must be an http or https link.");
  const posterError = !form?.posterFile && allowExistingPoster && httpUrl(form?.posterUrl)
    ? "" : posterFileError(form?.posterFile);
  if (posterError) errors.push(posterError);
  return errors;
}

export function posterFileError(file) {
  if (!file) return "Add one poster image.";
  if (!POSTER_TYPES.has(file.type)) return "Poster must be a JPEG, PNG, or WebP image.";
  if (Number(file.size) > POSTER_MAX_BYTES) return "Poster must be 4 MB or smaller.";
  return "";
}

export function simplePartyStartsAt(form) {
  const city = simplePartyCity(form?.capitalId);
  if (!city) throw new Error("Choose Seoul, Bangkok, or Hanoi.");
  return zonedLocalToIso(`${form.date}T${form.startTime}`, city.timezone);
}

export function shapeSimpleParty(row) {
  if (!row?.id) return null;
  const capitalId = String(row.capital_id ?? "").trim();
  if (!isSimplePartyCity(capitalId)) return null;
  return {
    id: row.id,
    capitalId,
    venueId: row.venue_id ?? "",
    venueName: String(row.venue_name ?? "").trim(),
    snsUrl: httpUrl(row.sns_url),
    posterUrl: httpUrl(row.poster_url),
    startsAt: row.starts_at ?? "",
    genre: GENRE_IDS.has(row.genre) ? row.genre : "",
  };
}

export async function loadSimpleParties(capitalId, now = new Date()) {
  return loadSimplePartiesWith(client(), capitalId, now);
}

export async function loadSimplePartiesWith(supabaseClient, capitalId, now = new Date()) {
  const id = String(capitalId ?? "").trim();
  if (!isSimplePartyCity(id)) return [];
  const { data, error } = await supabaseClient
    .from("simple_parties")
    .select("id, capital_id, venue_id, venue_name, sns_url, poster_url, starts_at, genre")
    .eq("capital_id", id);
  if (error) throw simplePartyWriteError(error);
  if (!Array.isArray(data)) throw new Error("The party list could not be loaded.");
  return listedSimpleParties(
    data.map(shapeSimpleParty).filter((party) => party && party.capitalId === id),
    now,
  );
}

export async function submitSimpleParty() {
  throw new Error("Public registration is closed. Use Quick Parties admin.");
}

export async function submitSimplePartyWith() {
  throw new Error("Public registration is closed. Use Quick Parties admin.");
}

export function simplePartyWriteError(error) {
  const text = String(error?.message ?? error ?? "");
  if (/schema cache|does not exist|42P01|Could not find the function|Could not find the table/i.test(text)) {
    return new Error("Simple party storage is not applied on this database yet.");
  }
  return new Error(text || "The party could not be saved.");
}

export function simplePartySchedule(party) {
  const zone = simplePartyCity(party?.capitalId)?.timezone || "UTC";
  const start = new Date(party?.startsAt);
  if (Number.isNaN(start.getTime())) return { date: "", time: "", zone };
  return {
    date: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(start),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(start),
    zone,
  };
}

function client() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }
  if (!supabase) supabase = createClient(url, anonKey);
  return supabase;
}

function fold(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}
