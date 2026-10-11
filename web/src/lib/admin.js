import { createClient } from "@supabase/supabase-js";
import { DANCES } from "./filterCapitals.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

function adminAccess(session) {
  if (!session?.user) return "signedOut";
  if (session.user.app_metadata?.role === "admin") return "admin";
  return "forbidden";
}

async function requireAdmin() {
  const { data, error } = await adminClient().auth.getSession();
  if (error) throw new Error(error.message);
  if (adminAccess(data.session) !== "admin") throw new Error("Admin sign-in is required.");
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
    if (value?.trim() && !isHttpUrl(value.trim())) errors.push(`${label} must be an http or https URL.`);
  }
  return errors;
}

export async function findSimilarVenues(form) {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id, name, address, status, capitals(city)")
    .eq("capital_id", form.capitalId);
  if (error) throw new Error(error.message);
  const wantedName = normalizeVenue(form.name);
  const wantedAddress = normalizeVenue(form.address);
  return (data ?? [])
    .filter((row) => row.id !== form.venueId)
    .filter((row) => {
      const sameName = wantedName !== "" && normalizeVenue(row.name) === wantedName;
      const sameAddress = wantedAddress !== "" && normalizeVenue(row.address) === wantedAddress;
      return sameName || sameAddress;
    })
    .map((row) => {
      const city = Array.isArray(row.capitals) ? row.capitals[0] : row.capitals;
      return { id: row.id, name: row.name, city: city?.city ?? "", status: row.status };
    });
}

export async function saveAdminBar(form) {
  await requireAdmin();
  const errors = validateBar(form);
  if (errors.length > 0) throw new Error(errors.join(" "));
  if (!form.confirmDuplicate) {
    const similar = await findSimilarVenues(form);
    if (similar.length > 0) {
      const duplicate = new Error(`A similar venue already exists in ${similar[0].city}.`);
      duplicate.code = "duplicate";
      throw duplicate;
    }
  }
  const supabase = adminClient();
  const venueId = form.venueId ?? crypto.randomUUID();
  const instagram = blankToNull(form.instagram);
  const website = blankToNull(form.website);
  const mapsUrl = blankToNull(form.mapsUrl);
  const payload = {
    capital_id: form.capitalId,
    name: form.name.trim(),
    address: blankToNull(form.address),
    phone: blankToNull(form.phone),
    website,
    instagram_url: instagram,
    maps_url: mapsUrl,
    source_url: mapsUrl,
    source_checked: form.lastChecked || null,
    source_note: blankToNull(form.notes),
    status: form.status,
    confidence: form.confidence || null,
  };

  const write = form.venueId
    ? supabase.from("venues").update(payload).eq("id", form.venueId)
    : supabase.from("venues").insert({ id: venueId, ...payload });
  const { data, error } = await write.select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("The database did not apply the save.");
  const id = data[0].id;

  if (form.country.trim() !== form.originalCountry) {
    const { data: city, error: cityError } = await supabase
      .from("capitals")
      .update({ country: form.country.trim() })
      .eq("id", form.capitalId)
      .select("id");
    if (cityError) throw new Error(cityError.message);
    if (!city?.length) throw new Error("The database did not apply the country.");
  }

  await syncDances(supabase, id, form.dances);
  await syncHours(supabase, id, form.hours);
  await syncSchedule(supabase, id, form.schedule);
  await syncSources(supabase, id, { mapsUrl, website, instagram, checked: form.lastChecked || null });
  return id;
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

async function syncDances(supabase, venueId, dances) {
  const next = new Set(dances);
  const { data: existing, error } = await supabase
    .from("venue_dances")
    .select("dance")
    .eq("venue_id", venueId);
  if (error) throw new Error(error.message);
  const have = new Set((existing ?? []).map((row) => row.dance));
  const remove = [...have].filter((dance) => !next.has(dance));
  const add = [...next].filter((dance) => !have.has(dance));
  if (remove.length > 0) {
    const { error: deleteError } = await supabase
      .from("venue_dances")
      .delete()
      .eq("venue_id", venueId)
      .in("dance", remove);
    if (deleteError) throw new Error(deleteError.message);
  }
  if (add.length > 0) {
    const { error: insertError } = await supabase
      .from("venue_dances")
      .insert(add.map((dance) => ({ venue_id: venueId, dance })));
    if (insertError) throw new Error(insertError.message);
  }
}

async function syncHours(supabase, venueId, hours) {
  const rows = hours.map((day) => ({
    venue_id: venueId,
    weekday: day.weekday,
    is_closed: day.closed,
    opens: day.closed ? null : day.opens || null,
    closes: day.closed ? null : day.closes || null,
    hours_text: day.closed ? "Closed" : hoursText(day),
  }));
  const { error } = await supabase.from("venue_hours").upsert(rows, { onConflict: "venue_id,weekday" });
  if (error) throw new Error(error.message);
}

async function syncSchedule(supabase, venueId, schedule) {
  const { error: deleteError } = await supabase.from("venue_night_dances").delete().eq("venue_id", venueId);
  if (deleteError) throw new Error(deleteError.message);
  const rows = schedule.flatMap((day) =>
    day.dances.map((dance) => ({ venue_id: venueId, weekday: day.weekday, dance })),
  );
  if (rows.length === 0) return;
  const { error } = await supabase.from("venue_night_dances").insert(rows);
  if (error) throw new Error(error.message);
}

async function syncSources(supabase, venueId, { mapsUrl, website, instagram, checked }) {
  const wanted = [
    mapsUrl ? { kind: "google_maps", url: mapsUrl } : null,
    website ? { kind: "website", url: website } : null,
    instagram ? { kind: "instagram", url: instagram } : null,
  ].filter(Boolean);
  const managed = ["google_maps", "website", "instagram"];
  const keep = new Set(wanted.map((row) => row.kind));
  const remove = managed.filter((kind) => !keep.has(kind));
  if (remove.length > 0) {
    const { error } = await supabase
      .from("venue_sources")
      .delete()
      .eq("venue_id", venueId)
      .in("kind", remove);
    if (error) throw new Error(error.message);
  }
  if (wanted.length === 0) return;
  const { error } = await supabase.from("venue_sources").upsert(
    wanted.map((row) => ({ venue_id: venueId, kind: row.kind, url: row.url, checked_at: checked })),
    { onConflict: "venue_id,kind" },
  );
  if (error) throw new Error(error.message);
}

function hoursText(day) {
  const unchanged = timeInput(day.opens) === timeInput(day.originalOpens)
    && timeInput(day.closes) === timeInput(day.originalCloses);
  if (day.text && unchanged) return day.text;
  if (!day.opens || !day.closes) return day.text || "";
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

function normalizeVenue(value) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ");
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const ADMIN_DANCES = DANCES;
export const ADMIN_DAYS = DAY_ORDER;
