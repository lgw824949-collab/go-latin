import { createClient } from "@supabase/supabase-js";
import { cityVenueList } from "./venueList.js";

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
let supabase;

function client() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }
  if (!supabase) supabase = createClient(url, anonKey);
  return supabase;
}

export function tonightCityParam(value) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id === "" ? null : id;
}

export async function loadTonightCities() {
  const { data, error } = await client().from("capitals").select("id, city, country, timezone").order("city");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadTonightCity(id) {
  const { data, error } = await client()
    .from("capitals")
    .select(`
      id, city, country, timezone,
      venues (
        id, capital_id, name, status, source_checked,
        venue_hours (weekday, hours_text, opens, closes, is_closed),
        venue_night_dances (weekday, dance)
      )
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    city: data.city,
    country: data.country,
    timezone: data.timezone,
    venues: cityVenueList(data.id, data.venues).map(shapeVenue),
  };
}

function shapeVenue(venue) {
  return {
    id: venue.id,
    name: venue.name,
    status: venue.status,
    sourceChecked: venue.source_checked,
    hours: (venue.venue_hours ?? []).map((row) => ({
      weekday: row.weekday,
      text: row.hours_text,
      opens: row.opens,
      closes: row.closes,
      closed: row.is_closed,
    })),
    nightDances: (venue.venue_night_dances ?? []).map((row) => ({
      weekday: row.weekday,
      dance: row.dance,
    })),
  };
}
