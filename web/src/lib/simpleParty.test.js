import assert from "node:assert/strict";
import test from "node:test";
import {
  genreLabel,
  isListedSimpleParty,
  isSimplePartyCity,
  listedSimpleParties,
  posterFileError,
  reuseContacts,
  shapeSimpleParty,
  simplePartyStartsAt,
  simplePartyWriteError,
  validateSimpleParty,
} from "./simpleParty.js";

test("only Seoul, Bangkok, and Hanoi are in the first simple party set", () => {
  assert.equal(isSimplePartyCity("seoul"), true);
  assert.equal(isSimplePartyCity("bangkok"), true);
  assert.equal(isSimplePartyCity("hanoi"), true);
  assert.equal(isSimplePartyCity("tokyo"), false);
});

test("mixed is a genre label and a missing poster is rejected", () => {
  assert.equal(genreLabel("mixed"), "Mixed");
  assert.equal(posterFileError(null), "Add one poster image.");
  assert.equal(posterFileError({ type: "application/pdf", size: 10 }), "Poster must be a JPEG, PNG, or WebP image.");
  assert.equal(posterFileError({ type: "image/jpeg", size: 5 * 1024 * 1024 }), "Poster must be 4 MB or smaller.");
  assert.equal(posterFileError({ type: "image/jpeg", size: 12 }), "");
});

test("a simple party form keeps the six fields and rejects extra description needs", () => {
  const ok = {
    capitalId: "seoul",
    date: "2026-10-20",
    startTime: "21:00",
    genre: "salsa",
    venueName: "Top Salsa Bar",
    snsUrl: "https://www.instagram.com/example/",
    posterFile: { type: "image/jpeg", size: 1000 },
  };
  assert.deepEqual(validateSimpleParty(ok), []);
  assert.match(validateSimpleParty({ ...ok, capitalId: "tokyo" })[0], /Seoul, Bangkok, or Hanoi/);
  assert.match(validateSimpleParty({ ...ok, genre: "reggaeton" })[0], /Mixed/);
  assert.match(validateSimpleParty({ ...ok, snsUrl: "instagram.com/x" })[0], /https/);
});

test("a Seoul wall clock becomes an absolute start instant", () => {
  assert.equal(simplePartyStartsAt({
    capitalId: "seoul",
    date: "2026-10-20",
    startTime: "21:00",
  }), "2026-10-20T12:00:00.000Z");
});

test("today stays listed and a previous local date is dropped", () => {
  const zoneNow = new Date("2026-10-19T15:00:00+09:00");
  const today = { capitalId: "seoul", startsAt: "2026-10-19T01:00:00.000Z" };
  const past = { capitalId: "seoul", startsAt: "2026-10-18T14:00:00.000Z" };
  const later = { capitalId: "seoul", startsAt: "2026-10-20T12:00:00.000Z" };
  assert.equal(isListedSimpleParty(today, zoneNow), true);
  assert.equal(isListedSimpleParty(past, zoneNow), false);
  assert.deepEqual(listedSimpleParties([later, past, today], zoneNow).map((party) => party.startsAt), [
    today.startsAt,
    later.startsAt,
  ]);
});

test("BAR website or Instagram can be reused as the inquiry SNS", () => {
  assert.deepEqual(
    reuseContacts([
      { id: "a", name: "La Habanera", website: "https://lahabanerahanoi.com/", instagram: "" },
      { id: "b", name: "No link", website: "", instagram: "" },
    ]),
    [{ venueName: "La Habanera", snsUrl: "https://lahabanerahanoi.com/", venueId: "a" }],
  );
});

test("a row from another city is not shaped as a listed party", () => {
  assert.equal(shapeSimpleParty({
    id: "x",
    capital_id: "tokyo",
    venue_name: "Bar",
    sns_url: "https://example.com",
    poster_url: "https://example.com/p.jpg",
    starts_at: "2026-10-20T12:00:00.000Z",
    genre: "salsa",
  }), null);
  assert.equal(shapeSimpleParty({
    id: "y",
    capital_id: "hanoi",
    venue_name: "La Habanera",
    sns_url: "https://lahabanerahanoi.com/",
    poster_url: "https://example.com/p.jpg",
    starts_at: "2026-10-20T12:00:00.000Z",
    genre: "bachata",
  }).capitalId, "hanoi");
});

test("a missing simple party table is reported without a stack dump", () => {
  assert.match(
    simplePartyWriteError({ message: "Could not find the table 'public.simple_parties' in the schema cache" }).message,
    /not applied/,
  );
});
