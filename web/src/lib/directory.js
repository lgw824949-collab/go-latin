import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CONTINENTS, DANCES } from "./filterCapitals.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let pending;

export function loadCapitals() {
  if (!pending) pending = fetchCapitals();
  return pending;
}

export function useCapitals() {
  const [state, setState] = useState({ status: "loading", capitals: [], error: "" });

  useEffect(() => {
    let live = true;
    loadCapitals()
      .then((capitals) => {
        if (live) setState({ status: "ready", capitals, error: "" });
      })
      .catch((error) => {
        if (live) setState({ status: "error", capitals: [], error: error.message });
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}

async function fetchCapitals() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.from("capitals").select(`
    id, city, country, iso2, continent, lat, lng, timezone, image,
    venues (
      id, name, address, maps_url, phone, website, instagram_url, latitude, longitude,
      source, source_url, source_checked, source_note, status, confidence,
      venue_dances (dance),
      venue_hours (weekday, hours_text, opens, closes, is_closed),
      venue_night_dances (weekday, dance),
      venue_sources (kind, url, checked_at)
    )
  `);

  if (error) throw new Error(error.message);
  return (data ?? []).map(shapeCapital).sort(byDirectoryOrder);
}

function shapeCapital(row) {
  const venues = venueList(row.venues).map(shapeVenue).sort(byVenueName);
  return {
    id: row.id,
    city: row.city,
    country: row.country,
    iso2: String(row.iso2).trim(),
    continent: row.continent,
    lat: row.lat,
    lng: row.lng,
    timezone: row.timezone,
    image: row.image,
    venue: venues[0] ?? null,
    venues,
  };
}

function shapeVenue(venue) {
  const danceRank = new Map(DANCES.map((dance, index) => [dance.id, index]));
  const dances = (venue.venue_dances ?? [])
    .map((row) => row.dance)
    .sort((a, b) => (danceRank.get(a) ?? 9) - (danceRank.get(b) ?? 9));
  const hours = (venue.venue_hours ?? [])
    .map((row) => ({
      weekday: row.weekday,
      text: row.hours_text,
      opens: row.opens,
      closes: row.closes,
      closed: row.is_closed,
    }))
    .sort((a, b) => a.weekday - b.weekday);
  const nightDances = (venue.venue_night_dances ?? [])
    .map((row) => ({ weekday: row.weekday, dance: row.dance }))
    .sort((a, b) => a.weekday - b.weekday || a.dance.localeCompare(b.dance));
  const sources = (venue.venue_sources ?? []).map((row) => ({
    kind: row.kind,
    url: row.url,
    checkedAt: row.checked_at,
  }));

  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    mapsUrl: venue.maps_url,
    phone: venue.phone,
    website: venue.website,
    instagram: venue.instagram_url,
    latitude: venue.latitude,
    longitude: venue.longitude,
    source: venue.source,
    sourceUrl: venue.source_url,
    sourceChecked: venue.source_checked,
    sourceNote: venue.source_note,
    status: venue.status,
    confidence: venue.confidence,
    dances,
    hours,
    nightDances,
    sources,
  };
}

function venueList(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

function byVenueName(a, b) {
  const name = a.name.localeCompare(b.name);
  if (name !== 0) return name;
  return String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

function byDirectoryOrder(a, b) {
  const rank = new Map(CONTINENTS.map((item, index) => [item.id, index]));
  const continent = (rank.get(a.continent) ?? 9) - (rank.get(b.continent) ?? 9);
  if (continent !== 0) return continent;
  return a.city.localeCompare(b.city);
}
