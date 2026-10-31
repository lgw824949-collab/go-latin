import { createClient } from "@supabase/supabase-js";
import { DANCES } from "./filterCapitals.js";
import { buildSourceRows, httpUrl, sourceKindsToRemove, venueSourceFields } from "./sources.js";

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

let client;

export function adminClient() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }
  if (!client) client = createClient(url, anonKey);
  return client;
}

export function watchAdminSession(onChange) {
  const { data } = adminClient().auth.onAuthStateChange((_event, session) => {
    onChange(adminAccess(session));
  });
  return () => data.subscription.unsubscribe();
}

export async function signInAdmin(email, password) {
  const { data, error } = await adminClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  const session = data.session ?? (data.user ? { user: data.user } : null);
  if (adminAccess(session) !== "admin") {
    await signOutAdmin();
    throw new Error(session?.user
      ? "This account cannot edit the directory."
      : "Admin sign-in is required.");
  }
  return data.session;
}

export async function signOutAdmin() {
  const { error } = await adminClient().auth.signOut();
  if (error) throw new Error(error.message);
}

export function adminAccess(session) {
  if (!session?.user) return "signedOut";
  if (session.user.app_metadata?.role === "admin") return "admin";
  return "forbidden";
}

export async function requireAdmin(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (adminAccess(data.session) !== "admin") throw new Error("Admin sign-in is required.");
}

export function countryForCapital(cities, capitalId) {
  const city = (cities ?? []).find((item) => item.id === capitalId);
  return city?.country ?? "";
}

export async function loadAdminCities() {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("capitals")
    .select("id, city, country")
    .order("city");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadAdminBar(capitalId) {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("capitals")
    .select(`
      id, city, country,
      venues (
        id, name, address, maps_url, phone, website, instagram_url,
        source_checked, source_note, status, confidence,
        venue_dances (dance),
        venue_hours (weekday, hours_text, opens, closes, is_closed),
        venue_night_dances (weekday, dance),
        venue_sources (kind, url, checked_at)
      )
    `)
    .eq("id", capitalId)
    .single();
  if (error) throw new Error(error.message);
  const venues = Array.isArray(data.venues) ? data.venues : data.venues ? [data.venues] : [];
  return {
    capitalId: data.id,
    city: data.city,
    country: data.country,
    bars: venues.map(toForm),
  };
}

export function validateBar(form) {
  const errors = [];
  if (!form.capitalId) errors.push("City is required.");
  if (!form.name?.trim()) errors.push("BAR name is required.");
  if (!form.country?.trim()) errors.push("Country is required.");
  for (const [label, value] of [
    ["Website", form.website],
    ["Instagram", form.instagram],
    ["Google Maps", form.mapsUrl],
  ]) {
    if (value?.trim() && !httpUrl(value)) errors.push(`${label} must be an http or https URL.`);
  }
  return errors;
}

export function classifyVenueDuplicates(form, rows) {
  const wantedName = normalizeVenue(form.name);
  const wantedAddress = normalizeVenue(form.address);
  const blocks = [];
  const warnings = [];
  for (const row of rows ?? []) {
    if (form.venueId && row.id === form.venueId) continue;
    if (row.capital_id && form.capitalId && row.capital_id !== form.capitalId) continue;
    const sameName = wantedName !== "" && normalizeVenue(row.name) === wantedName;
    const sameAddress = wantedAddress !== "" && normalizeVenue(row.address) === wantedAddress;
    const match = {
      id: row.id,
      name: row.name,
      city: venueCity(row),
      status: row.status,
    };
    if (sameName && wantedAddress === "") blocks.push({ ...match, reason: "missing-address" });
    else if (sameName && sameAddress) blocks.push({ ...match, reason: "same-name-address" });
    else if (sameAddress) warnings.push({ ...match, reason: "same-address" });
  }
  return { blocks, warnings };
}

export function venueDuplicateAction(classification, confirmDuplicate) {
  if (classification.blocks.length > 0) return { action: "block", match: classification.blocks[0] };
  if (classification.warnings.length > 0 && !confirmDuplicate) {
    return { action: "warn", match: classification.warnings[0] };
  }
  return { action: "allow", match: null };
}

let pendingNewVenue = null;

export async function findSimilarVenues(form) {
  return findSimilarVenuesWith(adminClient(), form);
}

async function findSimilarVenuesWith(supabase, form) {
  const { data, error } = await supabase
    .from("venues")
    .select("id, capital_id, name, address, status, capitals(city)")
    .eq("capital_id", form.capitalId);
  if (error) throw new Error(error.message);
  return classifyVenueDuplicates(form, data ?? []);
}

export async function saveAdminBar(form) {
  return saveAdminBarWith(adminClient(), form);
}

export async function saveAdminBarWith(supabase, form) {
  await requireAdmin(supabase);
  const errors = validateBar(form);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const decision = venueDuplicateAction(await findSimilarVenuesWith(supabase, form), form.confirmDuplicate);
  if (decision.action !== "allow") throw duplicateError(decision);
  const venue = venueIdForSave(form);
  const sources = venueSourceFields(form);
  const sourceRows = buildSourceRows({
    mapsUrl: sources.maps_url,
    website: sources.website,
    instagram: sources.instagram_url,
    checked: sources.source_checked,
  });
  const capitalCountry = form.country.trim();
  const payload = {
    venue_id: venue.id,
    is_new: venue.isNew,
    capital_id: form.capitalId,
    name: form.name.trim(),
    address: blankToNull(form.address),
    phone: blankToNull(form.phone),
    website: sources.website,
    instagram_url: sources.instagram_url,
    maps_url: sources.maps_url,
    source_url: sources.source_url,
    source_checked: sources.source_checked,
    source_note: blankToNull(form.notes),
    status: form.status,
    confidence: form.confidence || null,
    country: capitalCountry,
    original_country: capitalCountry,
    dances: form.dances,
    hours: form.hours.map((day) => buildHourRow(day)),
    schedule: form.schedule.flatMap((day) => day.dances.map((dance) => ({ weekday: day.weekday, dance }))),
    sources: sourceRows,
    remove_source_kinds: sourceKindsToRemove(sourceRows),
  };
  const { data, error } = await supabase.rpc("save_admin_bar", { payload });
  if (error) throw venueWriteError(error, form.name);
  if (!data) throw new Error("The database did not apply the save.");
  pendingNewVenue = null;
  return data;
}

function venueIdForSave(form) {
  if (form.venueId) {
    pendingNewVenue = null;
    return { id: form.venueId, isNew: false };
  }
  const key = `${form.capitalId}\0${normalizeVenue(form.name)}\0${normalizeVenue(form.address)}`;
  if (!pendingNewVenue || pendingNewVenue.key !== key) {
    pendingNewVenue = { key, id: crypto.randomUUID() };
  }
  return { id: pendingNewVenue.id, isNew: true };
}

function toForm(venue) {
  const byDay = new Map((venue.venue_hours ?? []).map((row) => [row.weekday, row]));
  const nights = venue.venue_night_dances ?? [];
  return {
    venueId: venue.id,
    name: venue.name ?? "",
    address: venue.address ?? "",
    phone: venue.phone ?? "",
    website: venue.website ?? "",
    instagram: venue.instagram_url ?? "",
    mapsUrl: venue.maps_url ?? "",
    dances: (venue.venue_dances ?? []).map((row) => row.dance),
    hours: DAY_ORDER.map((weekday) => {
      const row = byDay.get(weekday);
      return {
        weekday,
        closed: row ? row.is_closed === true || row.hours_text === "Closed" : false,
        opens: timeInput(row?.opens),
        closes: timeInput(row?.closes),
        originalOpens: timeInput(row?.opens),
        originalCloses: timeInput(row?.closes),
        text: row?.hours_text ?? "",
      };
    }),
    schedule: DAY_ORDER.map((weekday) => ({
      weekday,
      dances: nights.filter((row) => row.weekday === weekday).map((row) => row.dance),
    })),
    lastChecked: venue.source_checked ?? "",
    confidence: venue.confidence ?? "likely",
    status: venue.status ?? "operating",
    notes: venue.source_note ?? "",
    sources: venue.venue_sources ?? [],
  };
}

export function buildHourRow(day) {
  const closed = day.closed === true;
  return {
    weekday: day.weekday,
    is_closed: closed,
    opens: closed ? null : day.opens || null,
    closes: closed ? null : day.closes || null,
    hours_text: closed ? "Closed" : hoursText(day),
  };
}

function hoursText(day) {
  const unchanged = timeInput(day.opens) === timeInput(day.originalOpens)
    && timeInput(day.closes) === timeInput(day.originalCloses);
  const kept = day.text && day.text !== "Closed" ? day.text : "";
  if (kept && unchanged) return kept;
  if (!day.opens || !day.closes) return kept;
  return `${clock(day.opens)}–${clock(day.closes)}`;
}

function clock(value) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minuteLabel = minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`;
  return `${hour12}${minuteLabel} ${suffix}`;
}

function timeInput(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function blankToNull(value) {
  const text = value?.trim() ?? "";
  return text === "" ? null : text;
}

function venueCity(row) {
  if (row.city) return row.city;
  const capital = Array.isArray(row.capitals) ? row.capitals[0] : row.capitals;
  return capital?.city ?? "";
}

export function venueWriteError(error, name) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;
  const label = name?.trim() || "This venue";
  if (error?.code === "23505" && text.includes("venues_name_without_address_key")) {
    const blocked = new Error(`"${label}" already exists in this city. Enter a different address or keep the existing venue.`);
    blocked.code = "blocked";
    return blocked;
  }
  if (error?.code === "23505" && text.includes("venues_name_address_key")) {
    const blocked = new Error(`"${label}" already uses this name and address in this city.`);
    blocked.code = "blocked";
    return blocked;
  }
  return new Error(error?.message ?? "");
}

export function duplicateError(decision) {
  const name = decision.match.name;
  const city = decision.match.city || "this city";
  if (decision.action === "block" && decision.match.reason === "missing-address") {
    const error = new Error(`"${name}" already exists in ${city}. Enter a different address or keep the existing venue.`);
    error.code = "blocked";
    return error;
  }
  if (decision.action === "block") {
    const error = new Error(`"${name}" already uses this name and address in ${city}.`);
    error.code = "blocked";
    return error;
  }
  const error = new Error(`Another venue, "${name}", uses this address in ${city}.`);
  error.code = "duplicate";
  return error;
}

function normalizeVenue(value) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ");
}

export const ADMIN_DANCES = DANCES;
export const ADMIN_DAYS = DAY_ORDER;
