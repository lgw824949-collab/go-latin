import assert from "node:assert/strict";
import test from "node:test";
import {
  CITY_AD_LIMIT,
  loadCapitalCityAdsWith,
  loadCityAdsWith,
  partiesWithoutAds,
  selectCityAds,
} from "./cityAds.js";
import { selectHomeAds } from "./homeAds.js";

function ad(overrides) {
  const id = overrides.id ?? "ad-1";
  return {
    id,
    partyId: overrides.partyId ?? `party-${id}`,
    placement: overrides.placement ?? "CITY",
    placeId: overrides.placeId === undefined ? place : overrides.placeId,
    rank: overrides.rank ?? 1,
    status: overrides.status ?? "active",
    startsAt: overrides.startsAt ?? "2026-11-01T00:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-11-15T00:00:00.000Z",
    partyEndsAt: overrides.partyEndsAt ?? "2026-11-20T00:00:00.000Z",
    capitalId: overrides.capitalId ?? "",
    name: overrides.name ?? "Night",
    venueName: overrides.venueName ?? "Sala",
    destinationUrl: overrides.destinationUrl ?? "https://example.com/ad",
  };
}

const now = new Date("2026-11-01T12:00:00.000Z");
const place = "place-seoul";

test("no city ads leaves the party list unchanged", () => {
  assert.deepEqual(selectCityAds([], place, now), []);
  assert.deepEqual(partiesWithoutAds([{ id: "party-a" }], []), [{ id: "party-a" }]);
});

test("one city ad stays on that place and opens its destination", () => {
  const ads = selectCityAds([
    ad({ id: "ad-1", rank: 2, destinationUrl: "https://example.com/city" }),
  ], place, now);
  assert.deepEqual(ads.map((item) => item.id), ["ad-1"]);
  assert.equal(ads[0].destinationUrl, "https://example.com/city");
});

test("three city ads stay in rank order and a fourth is left out", () => {
  const rows = [4, 1, 3, 2].map((rank) => ad({ id: `ad-${rank}`, rank, partyId: `party-${rank}` }));
  const selected = selectCityAds(rows, place, now);
  assert.equal(selected.length, CITY_AD_LIMIT);
  assert.deepEqual(selected.map((item) => item.rank), [1, 2, 3]);
});

test("another city's ad and a home ad stay out", () => {
  const selected = selectCityAds([
    ad({ id: "here", rank: 1 }),
    ad({ id: "there", rank: 1, placeId: "place-paris", partyId: "paris" }),
    ad({ id: "home", rank: 1, placement: "HOME", placeId: null, partyId: "home-party" }),
  ], place, now);
  assert.deepEqual(selected.map((item) => item.id), ["here"]);
  assert.deepEqual(selectHomeAds([
    ad({ id: "home", rank: 1, placement: "HOME", placeId: null, partyId: "home-party" }),
    ad({ id: "city", rank: 1 }),
  ], now).map((item) => item.id), ["home"]);
});

test("the same party is shown once and is left out of the party list", () => {
  const selected = selectCityAds([
    ad({ id: "low", rank: 3, partyId: "same" }),
    ad({ id: "high", rank: 1, partyId: "same" }),
  ], place, now);
  assert.deepEqual(selected.map((item) => item.id), ["high"]);
  assert.deepEqual(partiesWithoutAds(
    [{ id: "same" }, { id: "other" }],
    selected,
  ).map((party) => party.id), ["other"]);
});

test("an ended ad period, an ended party, a paused ad, and a bad destination stay out", () => {
  assert.deepEqual(selectCityAds([
    ad({ id: "ad-ended", endsAt: "2026-11-01T12:00:00.000Z" }),
    ad({ id: "party-ended", partyEndsAt: "2026-11-01T12:00:00.000Z" }),
    ad({ id: "paused", status: "paused" }),
    ad({ id: "bad-url", destinationUrl: "ftp://example.com/ad" }),
  ], place, now), []);
});

test("a missing ad table leaves the city without ads", async () => {
  const rows = await loadCityAdsWith({
    from() {
      return { select: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: null, error: { message: "missing" } }) }) }) }) };
    },
  }, place, now);
  assert.deepEqual(rows, []);
  const capital = await loadCapitalCityAdsWith({
    from() {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "missing" } }) }) }) };
    },
  }, "seoul", now);
  assert.deepEqual(capital, []);
});
