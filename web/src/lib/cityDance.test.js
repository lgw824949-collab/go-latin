import assert from "node:assert/strict";
import test from "node:test";
import { tonightBarPath } from "./barAnchor.js";
import { cityCardPath, venuesForDance } from "./filterCapitals.js";

const salsa = { id: "salsa-bar", name: "Top Salsa Bar", dances: ["salsa"] };
const both = { id: "both-bar", name: "Both", dances: ["bachata", "salsa"] };
const kizomba = { id: "kizomba-bar", name: "Kizomba Bar", dances: ["kizomba"] };

test("a home city card keeps the city path and adds the selected dance", () => {
  assert.equal(cityCardPath("seoul", "salsa"), "/c/seoul?dance=salsa");
  assert.equal(cityCardPath("seoul", "bachata"), "/c/seoul?dance=bachata");
  assert.equal(cityCardPath("seoul", "kizomba"), "/c/seoul?dance=kizomba");
});

test("a city card without a dance stays on the city path", () => {
  assert.equal(cityCardPath("seoul", null), "/c/seoul");
  assert.equal(cityCardPath("seoul", ""), "/c/seoul");
});

test("an unknown dance value is left off the city card", () => {
  assert.equal(cityCardPath("seoul", "tango"), "/c/seoul");
  assert.equal(cityCardPath("seoul", "SALSA"), "/c/seoul");
});

test("a dance filter keeps only bars that offer that dance", () => {
  assert.deepEqual(
    venuesForDance([salsa, both, kizomba], "salsa").map((venue) => venue.id),
    ["salsa-bar", "both-bar"],
  );
  assert.deepEqual(
    venuesForDance([salsa, both, kizomba], "kizomba").map((venue) => venue.id),
    ["kizomba-bar"],
  );
});

test("no dance filter or an unknown dance keeps every bar", () => {
  const bars = [salsa, both, kizomba];
  assert.equal(venuesForDance(bars, null), bars);
  assert.equal(venuesForDance(bars, "tango"), bars);
  assert.equal(venuesForDance(bars, ""), bars);
});

test("a tonight bar anchor stays on the city path without a dance query", () => {
  const id = "1df22aa0-8265-42ca-b58a-d0479a14d62d";
  assert.equal(tonightBarPath("seoul", id), `/c/seoul#bar-${id}`);
  assert.equal(tonightBarPath("seoul", id).includes("dance="), false);
});
