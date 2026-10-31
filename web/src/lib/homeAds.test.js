import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME_AD_LIMIT,
  RESTRICTED_CAPITALS,
  homeAdConflict,
  homeAdHref,
  loadHomeAdsWith,
  selectHomeAds,
} from "./homeAds.js";

const now = new Date("2026-11-01T12:00:00.000Z");

test("no home ads leaves the selection empty", () => {
  assert.equal(RESTRICTED_CAPITALS.length, 0);
  assert.deepEqual(selectHomeAds([], now), []);
});

test("one active home ad stays and opens its destination", () => {
  const ads = selectHomeAds([ad({ id: "ad-1", rank: 2, destinationUrl: "https://example.com/sponsor" })], now);
  assert.deepEqual(ads.map((item) => item.id), ["ad-1"]);
  assert.equal(homeAdHref(ads[0].destinationUrl), "https://example.com/sponsor");
  assert.equal(homeAdHref("ftp://example.com/sponsor"), "");
  assert.deepEqual(selectHomeAds([ad({ id: "blank", destinationUrl: "" })], now), []);
});

test("five home ads stay in rank order", () => {
  const rows = [5, 1, 4, 2, 3].map((rank) => ad({ id: `ad-${rank}`, rank, partyId: `party-${rank}` }));
  assert.deepEqual(selectHomeAds(rows, now).map((item) => item.rank), [1, 2, 3, 4, 5]);
});

test("a sixth eligible home ad is not shown", () => {
  const rows = [1, 2, 3, 4, 5, 6].map((rank) => ad({ id: `ad-${rank}`, rank, partyId: `party-${rank}` }));
  const selected = selectHomeAds(rows, now);
  assert.equal(selected.length, HOME_AD_LIMIT);
  assert.deepEqual(selected.map((item) => item.rank), [1, 2, 3, 4, 5]);
});

test("the same party is shown once, at its better rank", () => {
  const selected = selectHomeAds([
    ad({ id: "low", rank: 4, partyId: "same" }),
    ad({ id: "high", rank: 1, partyId: "same" }),
    ad({ id: "other", rank: 2, partyId: "other" }),
  ], now);
  assert.deepEqual(selected.map((item) => item.id), ["high", "other"]);
});

test("an overlapping rank or party is rejected and a paused ad holds neither", () => {
  const current = [ad({ id: "held", rank: 1, partyId: "party-a" })];
  assert.equal(
    homeAdConflict(ad({ id: "next", rank: 1, partyId: "party-b" }), current),
    "ad periods overlap on the same rank",
  );
  assert.equal(
    homeAdConflict(ad({ id: "next", rank: 2, partyId: "party-a" }), current),
    "ad periods overlap for the same party",
  );
  assert.equal(homeAdConflict(ad({ id: "next", rank: 1, partyId: "party-b", status: "paused" }), current), null);
  assert.equal(homeAdConflict(ad({ id: "next", rank: 1, partyId: "party-b" }), [ad({ id: "held", rank: 1, status: "paused" })]), null);
  assert.equal(
    homeAdConflict(ad({ id: "next", rank: 1, partyId: "party-b", startsAt: "2026-12-01T00:00:00.000Z", endsAt: "2026-12-02T00:00:00.000Z" }), current),
    null,
  );
  assert.equal(
    homeAdConflict(ad({
      id: "next",
      rank: 1,
      partyId: "party-b",
      startsAt: "2026-11-15T00:00:00.000Z",
      endsAt: "2026-11-20T00:00:00.000Z",
    }), current),
    null,
  );
  assert.equal(homeAdConflict(ad({ id: "held", rank: 1, partyId: "party-a" }), current), null);
});

test("a home ad drops when its own period or the party has ended", () => {
  assert.deepEqual(selectHomeAds([
    ad({ id: "ad-ended", endsAt: "2026-11-01T12:00:00.000Z" }),
  ], now), []);
  assert.deepEqual(selectHomeAds([
    ad({ id: "party-ended", partyEndsAt: "2026-11-01T12:00:00.000Z" }),
  ], now), []);
  assert.equal(selectHomeAds([
    ad({ id: "before-party", partyEndsAt: "2026-12-01T00:00:00.000Z" }),
  ], now)[0].id, "before-party");
});

test("a restricted capital is left out and the empty list removes none", () => {
  const row = ad({ id: "seoul-ad", capitalId: "seoul" });
  assert.equal(selectHomeAds([row], now).length, 1);
  assert.deepEqual(selectHomeAds([row], now, ["seoul"]), []);
});

test("a missing ad table leaves the home selection empty", async () => {
  const rows = await loadHomeAdsWith({
    from() {
      return { select: () => ({ eq: () => ({ eq: async () => ({ data: null, error: { message: "Could not find the table" } }) }) }) };
    },
  }, now);
  assert.deepEqual(rows, []);
});

function ad(overrides) {
  const id = overrides.id ?? "ad-1";
  return {
    id,
    partyId: overrides.partyId ?? `party-${id}`,
    placement: overrides.placement ?? "HOME",
    placeId: overrides.placeId ?? null,
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
