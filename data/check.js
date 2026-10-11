import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTINENTS, assertCapital, filterCapitals } from "./contract.js";

const root = dirname(fileURLToPath(import.meta.url));
const capitals = JSON.parse(readFileSync(join(root, "capitals.json"), "utf8"));

if (!Array.isArray(capitals) || capitals.length === 0) {
  throw new Error("capitals.json must be a non-empty array");
}

const ids = new Set();
for (const [index, capital] of capitals.entries()) {
  assertCapital(capital, index);
  if (ids.has(capital.id)) throw new Error(`${capital.id}: duplicate id`);
  ids.add(capital.id);
}

for (const continent of CONTINENTS) {
  const count = capitals.filter((capital) => capital.continent === continent.id).length;
  if (count === 0) throw new Error(`${continent.id}: no capitals`);
}

const bachata = filterCapitals(capitals, { dance: "bachata" })
  .map((capital) => capital.id)
  .sort();
if (bachata.join(",") !== "amsterdam,athens,belgrade,berlin,brussels,bucharest,budapest,buenos_aires,chisinau,hanoi,kyiv,lisbon,london,luxembourg,madrid,mexico_city,montevideo,moscow,ottawa,paris,phnom_penh,prague,quito,santiago,santo_domingo,singapore,tirana,vienna,vilnius,warsaw,washington,wellington,yerevan,zagreb") {
  throw new Error(`bachata filter mismatch, got ${bachata.join(",")}`);
}

const seoul = capitals.find((capital) => capital.id === "seoul");
const withVenue = [
  {
    ...seoul,
    venue: {
      name: "Example",
      status: "operating",
      dances: ["bachata"],
      nights: [],
    },
  },
];
const danceHit = filterCapitals(withVenue, { dance: "bachata", continent: "asia" });
const danceMiss = filterCapitals(withVenue, { dance: "salsa" });
if (danceHit.length !== 1 || danceMiss.length !== 0) {
  throw new Error("dance filter did not match the venue");
}

console.log(`ok ${capitals.length} capitals, ${CONTINENTS.length} continents`);
