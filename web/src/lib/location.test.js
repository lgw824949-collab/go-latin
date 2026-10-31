import assert from "node:assert/strict";
import test from "node:test";
import {
  createLookupGate,
  matchRegisteredPlace,
  readGeocode,
  requestCoordinates,
  reverseGeocode,
} from "./location.js";

const seoul = {
  id: "seoul",
  city: "Seoul",
  country: "South Korea",
  iso2: "KR",
  venues: [{ id: "latin", name: "Latin" }],
};
const tokyo = {
  id: "tokyo",
  city: "Tokyo",
  country: "Japan",
  iso2: "JP",
  venues: [],
};

test("a registered city matches only the same country code and city name", () => {
  assert.equal(matchRegisteredPlace([seoul, tokyo], { city: "Seoul", iso2: "kr" }).city.id, "seoul");
  assert.equal(matchRegisteredPlace([seoul, tokyo], { city: "Séoul", iso2: "KR" }).kind, "city");
  assert.equal(matchRegisteredPlace([seoul], { city: "Busan", iso2: "KR" }).kind, "capital");
  assert.equal(matchRegisteredPlace([seoul], { city: "Busan", iso2: "KR" }).city.id, "seoul");
  assert.equal(matchRegisteredPlace([seoul], { city: "Busan", iso2: "KR" }).queriedCity, "Busan");
  assert.equal(matchRegisteredPlace([seoul, { ...tokyo, iso2: "KR", id: "busan", city: "Busan" }], { city: "Incheon", iso2: "KR" }).kind, "unknown");
  assert.equal(matchRegisteredPlace([seoul], { city: "Seoul", iso2: "JP" }).kind, "unknown");
  assert.equal(matchRegisteredPlace([seoul, { ...seoul, id: "seoul-2" }], { city: "Seoul", iso2: "KR" }).kind, "unknown");
});

test("the city lookup keeps the city and country code and drops the neighbourhood", () => {
  assert.deepEqual(readGeocode({ city: "Seoul", locality: "Myeong-dong", countryCode: "kr", latitude: 37.5, longitude: 126.9 }), {
    city: "Seoul",
    iso2: "KR",
  });
  assert.equal(readGeocode({ city: "", locality: "Yeonsan-dong", countryCode: "KR" }), null);
  assert.equal(readGeocode({ city: "Busan", countryCode: "KOR" }), null);
});

test("coordinates are requested only through the provided geolocation object", async () => {
  const calls = [];
  const coords = await requestCoordinates({
    getCurrentPosition(success) {
      calls.push("asked");
      success({ coords: { latitude: 37.5, longitude: 126.9 } });
    },
  });
  assert.deepEqual(coords, { lat: 37.5, lng: 126.9 });
  assert.deepEqual(calls, ["asked"]);
  await assert.rejects(
    requestCoordinates({
      getCurrentPosition(_success, failure) {
        failure({ code: 1 });
      },
    }),
    (error) => error.code === 1,
  );
});

test("a failed or overlapping lookup does not return a city", async () => {
  const gate = createLookupGate();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: false, json: async () => ({}) };
  };
  assert.equal(await reverseGeocode(37.5, 126.9, { fetchImpl, gate }), null);
  assert.equal(calls, 1);
  gate.busy = true;
  assert.equal(await reverseGeocode(37.5, 126.9, { fetchImpl, gate }), null);
  assert.equal(calls, 1);
  assert.equal(await reverseGeocode(91, 0, { fetchImpl, gate: createLookupGate() }), null);
  assert.equal(calls, 1);
});
