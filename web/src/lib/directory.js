import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CONTINENTS, DANCES } from "./filterCapitals.js";
import { cityVenueList } from "./venueList.js";

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const HOME_CAPITAL_SELECT = `
  id, city, country, iso2, continent, image,
  venues (
    id, capital_id, name, status,
    venue_dances (dance)
  )
`;

export const CITY_CAPITAL_SELECT = `
  id, city, country, continent, timezone, image,
  venues (
    id, capital_id, name, address, phone, website, instagram_url, maps_url,
    source, source_url, source_checked, source_note, status,
    venue_dances (dance),
    venue_hours (weekday, hours_text, opens, closes, is_closed),
    venue_night_dances (weekday, dance),
    venue_sources (kind, url, checked_at)
  )
`;

let supabase;
const listLoads = new Map();
const cityLoads = new Map();

export function loadCached(store, key, create) {
  const existing = store.get(key);
  if (existing) return existing;
  const pending = Promise.resolve().then(create).then(
    (value) => value,
    (error) => {
      if (store.get(key) === pending) store.delete(key);
      throw error;
    },
  );
  store.set(key, pending);
  return pending;
}

export function loadCapitals() {
  return loadCached(listLoads, "list", fetchCapitalList);
}

export function loadCapital(id) {
  return loadCached(cityLoads, id, () => fetchCapital(id));
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

export function useCapital(id) {
  const [state, setState] = useState({ id, status: "loading", capital: null, error: "" });
  const current = state.id === id ? state : { id, status: "loading", capital: null, error: "" };

  useEffect(() => {
    let live = true;
    setState({ id, status: "loading", capital: null, error: "" });
    loadCapital(id)
      .then((capital) => {
        if (live) setState({ id, status: "ready", capital, error: "" });
      })
      .catch((error) => {
        if (live) setState({ id, status: "error", capital: null, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [id]);

  return current;
}

export function shapeCapitalList(rows) {
  return (rows ?? []).map(shapeHomeCapital).sort(byDirectoryOrder);
}

export function shapeHomeCapital(row) {
  const venues = publicVenueRows(row.id, row.venues).map(shapeHomeVenue);
  return {
    id: row.id,
    city: row.city,
    country: row.country,
    iso2: typeof row.iso2 === "string" ? row.iso2.trim().toUpperCase() : "",
    continent: row.continent,
    image: row.image,
    venue: venues[0] ?? null,
    venues,
  };
}

export function shapeCityCapital(row) {
  const venues = publicVenueRows(row.id, row.venues).map(shapeCityVenue);
  return {
    id: row.id,
    city: row.city,
    country: row.country,
    continent: row.continent,
    timezone: row.timezone,
    image: row.image,
    venue: venues[0] ?? null,
    venues,
  };
}

export async function readCapital(id, query) {
  const { data, error } = await query.eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return shapeCityCapital(data);
}

async function fetchCapitalList() {
  const { data, error } = await client().from("capitals").select(HOME_CAPITAL_SELECT);
  if (error) throw new Error(error.message);
  return shapeCapitalList(data);
}

async function fetchCapital(id) {
  return readCapital(id, client().from("capitals").select(CITY_CAPITAL_SELECT));
}

function client() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }
  if (!supabase) supabase = createClient(url, anonKey);
  return supabase;
}

function publicVenueRows(capitalId, venues) {
  return cityVenueList(capitalId, venues).filter((venue) => venue?.status !== "permanently_closed");
}

function shapeHomeVenue(venue) {
  return {
    id: venue.id,
    name: venue.name ?? "",
    status: venue.status,
    dances: danceIds(venue.venue_dances),
  };
}

function shapeCityVenue(venue) {
  const hours = (venue.venue_hours ?? [])
    .map((row) => ({
      weekday: row.weekday,
      text: row.hours_text,
      opens: row.opens ?? null,
      closes: row.closes ?? null,
      closed: row.is_closed === true,
    }))
    .sort((a, b) => a.weekday - b.weekday);
  const nightDances = (venue.venue_night_dances ?? [])
    .map((row) => ({ weekday: row.weekday, dance: row.dance }))
    .sort((a, b) => a.weekday - b.weekday || String(a.dance).localeCompare(String(b.dance)));
  const sources = (venue.venue_sources ?? []).map((row) => ({
    kind: row.kind,
    ...(row.url != null ? { url: row.url } : {}),
    ...(row.checked_at != null ? { checkedAt: row.checked_at } : {}),
  }));

  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    mapsUrl: venue.maps_url,
    phone: venue.phone,
    website: venue.website,
    instagram: venue.instagram_url,
    source: venue.source,
    sourceUrl: venue.source_url,
    sourceChecked: venue.source_checked,
    sourceNote: venue.source_note,
    status: venue.status,
    dances: danceIds(venue.venue_dances),
    hours,
    nightDances,
    sources,
  };
}

function danceIds(rows) {
  const danceRank = new Map(DANCES.map((dance, index) => [dance.id, index]));
  return (rows ?? [])
    .map((row) => row.dance)
    .sort((a, b) => (danceRank.get(a) ?? 9) - (danceRank.get(b) ?? 9));
}

function byDirectoryOrder(a, b) {
  const rank = new Map(CONTINENTS.map((item, index) => [item.id, index]));
  const continent = (rank.get(a.continent) ?? 9) - (rank.get(b.continent) ?? 9);
  if (continent !== 0) return continent;
  return a.city.localeCompare(b.city);
}
