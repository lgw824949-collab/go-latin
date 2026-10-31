import assert from "node:assert/strict";
import test from "node:test";
import { tonightCityParam } from "./tonightData.js";

test("a capital id is used as the Tonight city", () => {
  assert.equal(tonightCityParam("seoul"), "seoul");
  assert.equal(tonightCityParam("  hanoi  "), "hanoi");
});

test("a missing city id is not replaced with hanoi", () => {
  assert.equal(tonightCityParam(null), null);
  assert.equal(tonightCityParam(undefined), null);
  assert.equal(tonightCityParam(""), null);
  assert.equal(tonightCityParam("   "), null);
});

test("an unknown id is kept and is not rewritten to hanoi", () => {
  assert.equal(tonightCityParam("not-a-city"), "not-a-city");
  assert.equal(tonightCityParam("81C Đ. Xuân Diệu"), "81C Đ. Xuân Diệu");
  assert.notEqual(tonightCityParam("not-a-city"), "hanoi");
  assert.notEqual(tonightCityParam("81C Đ. Xuân Diệu"), "hanoi");
});
