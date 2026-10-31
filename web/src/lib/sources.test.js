import assert from "node:assert/strict";
import test from "node:test";
import { validateBar } from "./admin.js";
import { verificationOf } from "./manage.js";
import {
  buildSourceRows,
  httpUrl,
  sourceCheckedLabel,
  sourceKindsToRemove,
  sourceLabel,
  staleHoursNote,
  venueSourceFields,
} from "./sources.js";
import { assessVenue } from "./tonight.js";

const clock = { weekday: 1, minutes: 20 * 60, year: 2026, month: 10, day: 12 };

test("only http and https values can become links", () => {
  assert.equal(httpUrl(""), "");
  assert.equal(httpUrl("   "), "");
  assert.equal(httpUrl("instagram.com/turn_latinclub_no.1"), "");
  assert.equal(httpUrl("javascript:alert(1)"), "");
  assert.equal(httpUrl(" https://www.instagram.com/latin_gangnam/ "), "https://www.instagram.com/latin_gangnam/");
  assert.equal(httpUrl("http://example.com"), "http://example.com");
});

test("a blank link is rejected only when text is present and not http", () => {
  const form = { capitalId: "seoul", name: "Bar", country: "Korea", website: "", instagram: "  ", mapsUrl: "" };
  assert.deepEqual(validateBar(form), []);
  assert.deepEqual(validateBar({ ...form, website: "example.com" }), ["Website must be an http or https URL."]);
  assert.deepEqual(validateBar({ ...form, mapsUrl: "javascript:alert(1)" }), ["Google Maps must be an http or https URL."]);
});

test("empty urls are omitted and no check date is invented", () => {
  const rows = buildSourceRows({
    mapsUrl: null,
    website: "",
    instagram: "https://www.instagram.com/latin_gangnam/",
    checked: null,
  });
  assert.deepEqual(rows, [{
    kind: "instagram",
    url: "https://www.instagram.com/latin_gangnam/",
    checked_at: null,
  }]);
  assert.deepEqual(sourceKindsToRemove(rows), ["google_maps", "website"]);
});

test("the venue check date is stored as entered and the map url is not copied from another link", () => {
  const fields = venueSourceFields({
    website: "  ",
    instagram: "https://www.instagram.com/latin_gangnam/",
    mapsUrl: "https://maps.app.goo.gl/example",
    lastChecked: "",
  });
  assert.equal(fields.website, null);
  assert.equal(fields.instagram_url, "https://www.instagram.com/latin_gangnam/");
  assert.equal(fields.source_url, fields.maps_url);
  assert.equal(fields.source_checked, null);
  assert.equal(venueSourceFields({
    website: "",
    instagram: "",
    mapsUrl: "",
    lastChecked: "2026-09-29",
  }).source_checked, "2026-09-29");
});

test("a missing check date is not described as a listed or recent check", () => {
  const venue = {
    source: "google_maps",
    website: " ",
    instagram: "",
    sourceChecked: null,
    sources: [{ kind: "google_maps", url: "https://maps.app.goo.gl/example", checkedAt: null }],
  };
  assert.equal(sourceCheckedLabel(null), "");
  assert.equal(sourceCheckedLabel("2026-13-01"), "");
  assert.equal(sourceLabel(venue), "Source: Google Maps");
  const note = staleHoursNote(venue);
  assert.equal(note.includes("the listed date"), false);
  assert.equal(note.includes("No check date is recorded"), true);
  assert.equal(verificationOf({ lastChecked: null, nightDances: [] }, new Date("2026-10-12T00:00:00Z")).recent, false);
  assert.equal(assessVenue({
    status: "operating",
    sourceChecked: null,
    hours: [{ weekday: 1, closed: false, opens: "19:00", closes: "02:00", text: "7 PM–2 AM" }],
    nightDances: [],
  }, clock).statusText, "Opening hours not confirmed");
});

test("an old check date stays old on the city note and in admin verification", () => {
  const note = staleHoursNote({
    source: "google_maps",
    sourceChecked: "2026-09-29",
    sources: [],
  });
  assert.equal(note.includes("29 Sep 2026"), true);
  assert.equal(note.includes("That check is old"), true);
  const check = verificationOf({ lastChecked: "2026-09-29", nightDances: [1] }, new Date(2026, 9, 12));
  assert.equal(check.recent, false);
  assert.equal(check.needs, true);
});
