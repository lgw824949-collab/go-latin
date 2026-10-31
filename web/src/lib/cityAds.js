import { createClient } from "@supabase/supabase-js";
import { selectRankedAds } from "./homeAds.js";

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const CITY_AD_LIMIT = 3;

const CITY_AD_SELECT = `
  id, party_id, place_id, placement, rank, starts_at, ends_at, status, destination_url,
  parties (
    id, name, venue_name, ends_at,
    party_places (
      capital_id,
      capitals (id)
    )
  )
`;

let supabase;

export function selectCityAds(ads, placeId, now = new Date(), restricted) {
  return selectRankedAds(ads, {
    placement: "CITY",
    limit: CITY_AD_LIMIT,
    placeId,
    now,
    restricted,
  });
}

export function partiesWithoutAds(parties, ads) {
  const shown = new Set((ads ?? []).map((ad) => ad.partyId));
  return (parties ?? []).filter((party) => !shown.has(party.id));
}

export async function loadCityAds(placeId, now = new Date()) {
  return loadCityAdsWith(client(), placeId, now);
}

export async function loadCityAdsWith(supabase, placeId, now = new Date()) {
  const id = text(placeId);
  if (!id) return [];
  const { data, error } = await supabase
    .from("party_ads")
    .select(CITY_AD_SELECT)
    .eq("placement", "CITY")
    .eq("status", "active")
    .eq("place_id", id);
  if (error || !Array.isArray(data)) return [];
  return selectCityAds(data, id, now);
}

export async function loadCapitalCityAds(capitalId, now = new Date()) {
  return loadCapitalCityAdsWith(client(), capitalId, now);
}

export async function loadCapitalCityAdsWith(supabase, capitalId, now = new Date()) {
  const id = text(capitalId);
  if (!id) return [];
  const place = await supabase.from("party_places").select("id, capital_id").eq("capital_id", id).maybeSingle();
  if (place.error || place.data?.capital_id !== id || !place.data?.id) return [];
  return loadCityAdsWith(supabase, place.data.id, now);
}

function client() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }
  if (!supabase) supabase = createClient(url, anonKey);
  return supabase;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
