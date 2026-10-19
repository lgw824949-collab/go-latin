import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = readFileSync(new URL("./quickPartyData.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../pages/QuickParties.jsx", import.meta.url), "utf8");

test("database pagination has a stable order and 50-row window", () => {
  assert.match(data, /QUICK_PARTY_PAGE_SIZE = 50/);
  assert.match(data, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(data, /\.range\(page \* QUICK_PARTY_PAGE_SIZE, \(page \+ 1\) \* QUICK_PARTY_PAGE_SIZE - 1\)/);
});
test("hasMore uses raw database row count, not city-local filtered count", () => {
  assert.match(data, /hasMore: \(data \?\? \[\]\)\.length === QUICK_PARTY_PAGE_SIZE/);
  assert.match(data, /rows: \(data \?\? \[\]\)\.filter/);
  assert.match(page, /then\(\(\{ rows, hasMore \}\) =>/);
});
