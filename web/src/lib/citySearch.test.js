import assert from "node:assert/strict";
import test from "node:test";
import { homeResultLabel, visibleCapitals } from "./filterCapitals.js";

const capitals = [
  {
    id: "seoul",
    city: "Seoul",
    country: "South Korea",
    continent: "asia",
    venues: [{ dances: ["salsa"] }],
  },
  {
    id: "hanoi",
    city: "Hanoi",
    country: "Vietnam",
    continent: "asia",
    venues: [{ dances: ["bachata"] }],
  },
  {
    id: "bogota",
    city: "Bogotá",
    country: "Colombia",
    continent: "south_america",
    venues: [{ dances: ["salsa"] }],
  },
];

function ids(filters, query) {
  return visibleCapitals(capitals, filters, query).map((capital) => capital.id);
}

test("a city search ignores letter case", () => {
  assert.deepEqual(ids({}, "seoul"), ["seoul"]);
  assert.deepEqual(ids({}, "SEOUL"), ["seoul"]);
  assert.deepEqual(ids({}, "Seou"), ["seoul"]);
});

test("a country search uses the stored country name", () => {
  assert.deepEqual(ids({}, "korea"), ["seoul"]);
  assert.deepEqual(ids({}, "SOUTH KOREA"), ["seoul"]);
  assert.deepEqual(ids({}, "vietnam"), ["hanoi"]);
});

test("an accented city matches the same letters without accents", () => {
  assert.deepEqual(ids({}, "bogota"), ["bogota"]);
  assert.deepEqual(ids({}, "Bogotá"), ["bogota"]);
});

test("an empty search keeps the filtered city list", () => {
  assert.deepEqual(ids({}, ""), ["seoul", "hanoi", "bogota"]);
  assert.deepEqual(ids({}, "   "), ["seoul", "hanoi", "bogota"]);
  assert.deepEqual(ids({ dance: "salsa" }, ""), ["seoul", "bogota"]);
});

test("a search with no city or country shows nothing", () => {
  assert.deepEqual(ids({}, "lisbon"), []);
});

test("the result count names capitals, and a dance count names floors", () => {
  assert.equal(
    homeResultLabel({ count: 195, continentCount: 6 }),
    "195 capitals across six continents",
  );
  assert.equal(
    homeResultLabel({ count: 1, continentCount: 1 }),
    "1 capital across one continent",
  );
  assert.equal(
    homeResultLabel({ count: 49, danceName: "Salsa", continentCount: 5 }),
    "49 Salsa floors across five continents",
  );
  assert.equal(
    homeResultLabel({ count: 12, danceName: "Kizomba", continentCount: 4 }),
    "12 Kizomba floors across four continents",
  );
  assert.equal(
    homeResultLabel({ count: 9, danceName: "Salsa", continentName: "Asia", continentCount: 1 }),
    "9 Salsa floors in Asia",
  );
});

test("a search count matches the visible cards and a miss says there is no match", () => {
  assert.equal(
    homeResultLabel({ count: 1, danceName: "Salsa", query: "bogota", continentCount: 1 }),
    '1 Salsa floor matching "bogota"',
  );
  assert.equal(
    homeResultLabel({ count: 0, danceName: "Salsa", continentName: "Oceania", continentCount: 0 }),
    "0 Salsa floors in Oceania",
  );
  assert.equal(
    homeResultLabel({ count: 0, query: "nowhere", continentCount: 0 }),
    '0 capitals matching "nowhere"',
  );
});

test("dance and continent filters still limit the search", () => {
  assert.deepEqual(ids({ dance: "salsa" }, "seoul"), ["seoul"]);
  assert.deepEqual(ids({ dance: "salsa" }, "hanoi"), []);
  assert.deepEqual(ids({ dance: "bachata" }, "vietnam"), ["hanoi"]);
  assert.deepEqual(ids({ continent: "asia" }, "colombia"), []);
  assert.deepEqual(ids({ continent: "asia", dance: "salsa" }, ""), ["seoul"]);
});
