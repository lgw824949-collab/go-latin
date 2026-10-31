import assert from "node:assert/strict";
import test from "node:test";
import {
  filterParties,
  isUpcoming,
  loadPublicPartiesWith,
  loadPublicPartyWith,
  partyHead,
  partySchedule,
  shapeParty,
  loadCapitalPartiesWith,
  loadPlacePartiesWith,
  placePath,
  shapePlace,
  upcomingParties,
} from "./partyPublic.js";

const now = new Date("2026-11-01T12:00:00.000Z");

test("a party page is noindex and has no canonical", () => {
  assert.deepEqual(partyHead(), { title: "Parties | Go Latin", robots: "noindex", canonical: "" });
  assert.equal(partyHead("Night | Go Latin").robots, "noindex");
  assert.equal(partyHead("Night | Go Latin").canonical, "");
});

test("a capital party reads the capital city and local time", () => {
  const party = shapeParty({
    id: "p1",
    name: "Night",
    venue_name: "Sala",
    starts_at: "2026-11-01T09:00:00.000Z",
    ends_at: "2026-11-01T13:00:00.000Z",
    official_url: "https://example.com/night",
    poster_url: "notaurl",
    party_dances: [{ dance: "salsa" }, { dance: "bachata" }],
    place_id: "place-seoul",
    party_places: {
      id: "place-seoul",
      capital_id: "seoul",
      city: null,
      country: null,
      timezone: null,
      capitals: { city: "Seoul", country: "South Korea", timezone: "Asia/Seoul" },
    },
  });
  assert.equal(party.placeId, "place-seoul");
  assert.equal(party.capitalId, "seoul");
  assert.equal(party.city, "Seoul");
  assert.equal(party.country, "South Korea");
  assert.equal(party.posterUrl, "");
  assert.equal(party.officialUrl, "https://example.com/night");
  assert.deepEqual(partySchedule(party), { date: "1 Nov 2026", time: "18:00–22:00", zone: "Asia/Seoul" });
});

test("a free-city party keeps its own city", () => {
  const party = shapeParty({
    id: "p2",
    name: "Day",
    venue_name: "Hall",
    starts_at: "2026-11-02T00:00:00.000Z",
    ends_at: "2026-11-02T04:00:00.000Z",
    official_url: "ftp://example.com",
    poster_url: "https://example.com/poster.png",
    party_dances: [{ dance: "kizomba" }],
    party_places: { capital_id: null, city: "Cancún", country: "Mexico", timezone: "America/Cancun" },
  });
  assert.equal(party.city, "Cancún");
  assert.equal(party.officialUrl, "");
  assert.equal(party.posterUrl, "https://example.com/poster.png");
});

test("ended parties stay out of the default list and an in-progress party stays", () => {
  const rows = [
    { id: "done", endsAt: "2026-11-01T12:00:00.000Z" },
    { id: "live", endsAt: "2026-11-01T12:00:01.000Z" },
    { id: "later", endsAt: "2026-12-01T00:00:00.000Z" },
  ];
  assert.equal(isUpcoming(rows[0], now), false);
  assert.deepEqual(upcomingParties(rows, now).map((party) => party.id), ["live", "later"]);
});

test("city, country, and dance filters use the stored names", () => {
  const parties = [
    { id: "a", city: "Seoul", country: "South Korea", dances: ["salsa"] },
    { id: "b", city: "Cancún", country: "Mexico", dances: ["bachata"] },
  ];
  assert.deepEqual(filterParties(parties, { city: "seoul" }).map((party) => party.id), ["a"]);
  assert.deepEqual(filterParties(parties, { city: "cancun" }).map((party) => party.id), ["b"]);
  assert.deepEqual(filterParties(parties, { country: "mexico", dance: "bachata" }).map((party) => party.id), ["b"]);
  assert.deepEqual(filterParties(parties, { dance: "kizomba" }), []);
});

test("a missing party table becomes an empty public list", async () => {
  const rows = await loadPublicPartiesWith({
    from() {
      return { select: async () => ({ data: null, error: { message: "Could not find the table" } }) };
    },
  });
  assert.deepEqual(rows, []);
  const missing = await loadPublicPartyWith({
    from() {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "missing" } }) }) }) };
    },
  }, "gone");
  assert.equal(missing, null);
});

test("a free-city address uses the place id unchanged", () => {
  assert.equal(placePath("11111111-1111-4111-8111-111111111111"), "/p/11111111-1111-4111-8111-111111111111");
  assert.equal(placePath("  "), "");
  const place = shapePlace({
    id: "place-cancun",
    capital_id: null,
    city: "Cancún",
    admin_area: "Quintana Roo",
    country: "Mexico",
    timezone: "America/Cancun",
  });
  assert.equal(place.city, "Cancún");
  assert.equal(place.adminArea, "Quintana Roo");
  assert.equal(place.capitalId, "");
});

test("a capital page keeps that capital's upcoming parties", async () => {
  const rows = await loadCapitalPartiesWith(partyDb({
    place: { id: "place-seoul", capital_id: "seoul" },
    parties: [
      partyRow("live", "place-seoul", "seoul", "2026-11-01T18:00:00.000Z"),
      partyRow("ended", "place-seoul", "seoul", "2026-11-01T12:00:00.000Z"),
      partyRow("other", "place-paris", "paris", "2026-12-01T00:00:00.000Z"),
    ],
  }), "seoul", now);
  assert.deepEqual(rows.map((party) => party.id), ["live"]);
});

test("a missing party table leaves the capital page without parties", async () => {
  const rows = await loadCapitalPartiesWith(partyDb({
    placeError: { message: "Could not find the table" },
  }), "seoul", now);
  assert.deepEqual(rows, []);
});

test("a free city keeps its upcoming parties and a missing city stays empty", async () => {
  const found = await loadPlacePartiesWith(partyDb({
    place: {
      id: "place-cancun",
      capital_id: null,
      city: "Cancún",
      admin_area: null,
      country: "Mexico",
      timezone: "America/Cancun",
    },
    parties: [
      partyRow("soon", "place-cancun", "", "2026-12-01T00:00:00.000Z"),
      partyRow("done", "place-cancun", "", "2026-10-01T00:00:00.000Z"),
    ],
  }), "place-cancun", now);
  assert.equal(found.place.city, "Cancún");
  assert.deepEqual(found.parties.map((party) => party.id), ["soon"]);
  assert.equal(partyHead("Cancún parties | Go Latin").robots, "noindex");

  const missing = await loadPlacePartiesWith(partyDb({
    placeError: { message: "Could not find the table" },
  }), "place-cancun", now);
  assert.equal(missing.place, null);
  assert.deepEqual(missing.parties, []);
});

function partyRow(id, placeId, capitalId, endsAt) {
  return {
    id,
    place_id: placeId,
    name: id,
    venue_name: "Sala",
    starts_at: "2026-11-01T00:00:00.000Z",
    ends_at: endsAt,
    official_url: "https://example.com/night",
    poster_url: "",
    party_dances: [{ dance: "salsa" }],
    party_places: capitalId
      ? { id: placeId, capital_id: capitalId, capitals: { city: "Seoul", country: "South Korea", timezone: "Asia/Seoul" } }
      : { id: placeId, capital_id: null, city: "Cancún", country: "Mexico", timezone: "America/Cancun" },
  };
}

function partyDb({ place = null, parties = [], placeError = null, partyError = null }) {
  return {
    from(table) {
      if (table === "party_places") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: place, error: placeError }) }) }) };
      }
      return { select: () => ({ eq: async () => ({ data: parties, error: partyError }) }) };
    },
  };
}
