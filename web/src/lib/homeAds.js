import { createClient } from "@supabase/supabase-js";
import { httpUrl } from "./sources.js";

const env = import.meta.env ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const RESTRICTED_CAPITALS = Object.freeze([]);
export const HOME_AD_LIMIT = 5;

const HOME_AD_SELECT = `
  id, party_id, placement, rank, starts_at, ends_at, status, destination_url,
  parties (
    id, name, venue_name, ends_at,
    party_places (
      capital_id,
      capitals (id)
    )
  )
`;

let supabase;

export function homeAdHref(destination) {
  return httpUrl(destination);
}

export function shapeHomeAd(row) {
  const party = one(row?.parties);
  if (!row?.id || !party?.id) return null;
  const place = one(party.party_places);
  const capital = one(place?.capitals);
  return {
    id: row.id,
    partyId: row.party_id ?? party.id,
    placement: row.placement ?? "",
    rank: row.rank,
    status: row.status ?? "",
    startsAt: row.starts_at ?? "",
    endsAt: row.ends_at ?? "",
    partyEndsAt: party.ends_at ?? "",
    placeId: row.place_id ?? "",
    capitalId: place?.capital_id ?? capital?.id ?? "",
    name: text(party.name),
    venueName: text(party.venue_name),
    destinationUrl: httpUrl(row.destination_url),
  };
}

export function selectRankedAds(ads, { placement, limit, placeId = null, now = new Date(), restricted = RESTRICTED_CAPITALS } = {}) {
  const at = now.getTime();
  const blocked = new Set(restricted ?? []);
  const seen = new Set();
  return [...(ads ?? [])]
    .map((ad) => (ad?.partyId ? ad : shapeHomeAd(ad)))
    .filter((ad) => ad && rankedAdEligible(ad, at, blocked, placement, limit))
    .filter((ad) => placeId == null || ad.placeId === placeId)
    .sort((a, b) => a.rank - b.rank || String(a.id).localeCompare(String(b.id)))
    .filter((ad) => {
      if (seen.has(ad.partyId)) return false;
      seen.add(ad.partyId);
      return true;
    })
    .slice(0, limit);
}

export function selectHomeAds(ads, now = new Date(), restricted = RESTRICTED_CAPITALS) {
  return selectRankedAds(ads, { placement: "HOME", limit: HOME_AD_LIMIT, now, restricted });
}

export function homeAdConflict(candidate, existing) {
  if (candidate?.status !== "active") return null;
  for (const ad of existing ?? []) {
    if (!ad || ad.id === candidate.id || ad.status !== "active") continue;
    if (ad.placement !== candidate.placement || !windowsOverlap(ad, candidate)) continue;
    if (ad.partyId === candidate.partyId) return "ad periods overlap for the same party";
    if (ad.rank === candidate.rank && ad.placeId == candidate.placeId) {
      return "ad periods overlap on the same rank";
    }
  }
  return null;
}

export async function loadHomeAds(now = new Date()) {
  return loadHomeAdsWith(client(), now);
}

export async function loadHomeAdsWith(supabase, now = new Date()) {
  const { data, error } = await supabase.from("party_ads").select(HOME_AD_SELECT).eq("placement", "HOME").eq("status", "active");
  if (error || !Array.isArray(data)) return [];
  return selectHomeAds(data, now);
}

function rankedAdEligible(ad, at, blocked, placement, limit) {
  if (ad.placement !== placement || ad.status !== "active") return false;
  if (!Number.isInteger(ad.rank) || ad.rank < 1 || ad.rank > limit) return false;
  const start = Date.parse(ad.startsAt);
  const end = Date.parse(ad.endsAt);
  const partyEnd = Date.parse(ad.partyEndsAt);
  if (![start, end, partyEnd].every(Number.isFinite)) return false;
  if (!(start <= at && at < end)) return false;
  if (!(partyEnd > at)) return false;
  if (ad.capitalId && blocked.has(ad.capitalId)) return false;
  if (!httpUrl(ad.destinationUrl)) return false;
  return true;
}

function windowsOverlap(left, right) {
  const leftStart = Date.parse(left.startsAt);
  const leftEnd = Date.parse(left.endsAt);
  const rightStart = Date.parse(right.startsAt);
  const rightEnd = Date.parse(right.endsAt);
  if (![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)) return false;
  return leftStart < rightEnd && rightStart < leftEnd;
}

function client() {
  if (!url || !anonKey) {
    throw new Error("Add the Project URL and anon key to web/.env.local, then restart the dev server.");
  }
  if (!supabase) supabase = createClient(url, anonKey);
  return supabase;
}

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
