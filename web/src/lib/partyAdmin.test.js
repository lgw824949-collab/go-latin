import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPoster,
  danceChanges,
  findPartyConflict,
  findPartyVenueWarning,
  isoToZonedLocal,
  PARTY_VENUE_WARNING,
  partyLoadError,
  partyWriteError,
  placeConflict,
  savePartyEventWith,
  savePartyPlaceWith,
  shapePlaces,
  zonedLocalToIso,
} from "./partyAdmin.js";

const admin = {
  user: { app_metadata: { role: "admin" } },
};

test("Seoul wall time becomes an absolute instant", () => {
  const iso = zonedLocalToIso("2026-11-01T18:00", "Asia/Seoul");
  assert.equal(iso, "2026-11-01T09:00:00.000Z");
  assert.equal(isoToZonedLocal(iso, "Asia/Seoul"), "2026-11-01T18:00");
});

test("a spring-forward gap is rejected", () => {
  assert.throws(
    () => zonedLocalToIso("2026-03-08T02:30", "America/New_York"),
    /없는 시각/,
  );
});

test("an invalid poster is cleared and a valid one stays", () => {
  assert.equal(clearPoster("notaurl"), null);
  assert.equal(clearPoster("  "), null);
  assert.equal(clearPoster(" https://example.com/a.png "), "https://example.com/a.png");
});

test("a free city that matches a capital is refused", () => {
  const message = placeConflict(
    { kind: "city", city: "Séoul", iso2: "kr", adminArea: "" },
    [],
    [{ id: "seoul", city: "Seoul", iso2: "KR" }],
  );
  assert.equal(message, "수도와 같은 도시는 수도 연결로 등록해야 합니다.");
});

test("the same free city and admin area is refused", () => {
  const message = placeConflict(
    { kind: "city", city: "Cancun", iso2: "MX", adminArea: "" },
    [{ id: "p1", kind: "city", city: "Cancún", iso2: "MX", adminArea: "" }],
    [],
  );
  assert.equal(message, "같은 국가·도시·행정구역의 지역이 이미 있습니다.");
});

test("a different admin area is another place", () => {
  const message = placeConflict(
    { kind: "city", city: "Cancun", iso2: "MX", adminArea: "Centro" },
    [{ id: "p1", kind: "city", city: "Cancun", iso2: "MX", adminArea: "" }],
    [],
  );
  assert.equal(message, null);
});

test("overlapping events at the same venue are refused", () => {
  const message = findPartyConflict(eventForm(), [{
    id: "other",
    placeId: "place-1",
    name: "Fiésta",
    venueName: "sala",
    startsAt: "2026-12-01T09:00:00.000Z",
    endsAt: "2026-12-01T13:00:00.000Z",
  }]);
  assert.equal(message, "같은 장소명과 시간이 겹칩니다.");
});

test("a different venue name can overlap", () => {
  const other = {
    id: "other",
    placeId: "place-1",
    name: "Fiesta",
    venueName: "Other Hall",
    startsAt: "2026-12-01T09:00:00.000Z",
    endsAt: "2026-12-01T13:00:00.000Z",
  };
  assert.equal(findPartyConflict(eventForm(), [other]), null);
  assert.equal(findPartyVenueWarning(eventForm(), [other]), PARTY_VENUE_WARNING);
});

test("a different venue warning still saves", async () => {
  const client = fakeClient(admin);
  const saved = await savePartyEventWith(client, {
    ...eventForm(),
    venueName: "Other Hall",
  }, [{
    id: "other",
    placeId: "place-1",
    name: "Fiésta",
    venueName: "Sala",
    startsAt: "2026-12-01T09:00:00.000Z",
    endsAt: "2026-12-01T13:00:00.000Z",
  }]);
  assert.equal(saved.venueWarning, true);
  assert.equal(client.calls[0].op, "insert");
});

test("editing an event ignores itself", () => {
  const self = {
    id: "party-1",
    placeId: "place-1",
    name: "Fiesta",
    venueName: "Sala",
    startsAt: "2026-12-01T09:00:00.000Z",
    endsAt: "2026-12-01T13:00:00.000Z",
  };
  const form = { ...eventForm(), id: "party-1" };
  assert.equal(findPartyConflict(form, [self]), null);
  assert.equal(findPartyVenueWarning(form, [self]), null);
});

test("another place does not warn", () => {
  assert.equal(findPartyVenueWarning(eventForm(), [{
    id: "other",
    placeId: "place-2",
    name: "Fiesta",
    venueName: "Other Hall",
    startsAt: "2026-12-01T09:00:00.000Z",
    endsAt: "2026-12-01T13:00:00.000Z",
  }]), null);
});

test("an event that only touches the end is allowed", () => {
  const message = findPartyConflict(eventForm(), [{
    id: "other",
    placeId: "place-1",
    name: "Fiesta",
    venueName: "Sala",
    startsAt: "2026-12-01T02:00:00.000Z",
    endsAt: "2026-12-01T09:00:00.000Z",
  }]);
  assert.equal(message, null);
});

test("a new event inserts dances in the same request and clears a bad poster", async () => {
  const client = fakeClient(admin);
  const saved = await savePartyEventWith(client, {
    ...eventForm(),
    posterUrl: "notaurl",
    dances: ["kizomba", "salsa"],
  }, []);
  assert.equal(saved.posterCleared, true);
  assert.equal(client.calls[0].table, "parties");
  assert.equal(client.calls[0].payload.poster_url, null);
  assert.equal(client.calls[0].payload.starts_at, "2026-12-01T09:00:00.000Z");
  assert.deepEqual(client.calls[0].payload.party_dances, [{ dance: "salsa" }, { dance: "kizomba" }]);
  assert.equal(client.calls.some((call) => call.table === "venues" || call.op === "rpc"), false);
});

test("editing dances adds the new one before deleting the old one", async () => {
  const client = fakeClient(admin);
  await savePartyEventWith(client, {
    ...eventForm(),
    id: "party-1",
    originalDances: ["salsa"],
    dances: ["bachata"],
  }, []);
  assert.deepEqual(client.calls.map((call) => call.op), ["update", "insert", "delete"]);
  assert.equal(client.calls[1].table, "party_dances");
  assert.deepEqual(client.calls[2].values, ["salsa"]);
});

test("the same venue overlap is still not saved", async () => {
  const client = fakeClient(admin);
  await assert.rejects(
    () => savePartyEventWith(client, eventForm(), [{
      id: "other",
      placeId: "place-1",
      name: "Fiesta",
      venueName: "Sala",
      startsAt: "2026-12-01T09:00:00.000Z",
      endsAt: "2026-12-01T13:00:00.000Z",
    }]),
    /겹칩니다/,
  );
  assert.equal(client.calls.length, 0);
});

test("a party without a dance is not saved", async () => {
  const client = fakeClient(admin);
  await assert.rejects(
    () => savePartyEventWith(client, { ...eventForm(), dances: [] }, []),
    /댄스를 하나 이상/,
  );
  assert.equal(client.calls.length, 0);
});

test("a signed-out session cannot save", async () => {
  await assert.rejects(
    () => savePartyEventWith(fakeClient(null), eventForm(), []),
    /Admin sign-in is required/,
  );
  await assert.rejects(
    () => savePartyPlaceWith(fakeClient({ user: { app_metadata: { role: "member" } } }), capitalForm(), [], []),
    /Admin sign-in is required/,
  );
});

test("a capital place stores only the capital id", async () => {
  const client = fakeClient(admin);
  await savePartyPlaceWith(client, capitalForm(), [], []);
  assert.deepEqual(client.calls[0].payload, { capital_id: "seoul" });
});

test("a free-city edit does not send a capital id", async () => {
  const client = fakeClient(admin);
  await savePartyPlaceWith(client, {
    id: "place-9",
    kind: "city",
    city: "Cancun",
    adminArea: "  ",
    country: "Mexico",
    iso2: "mx",
    timezone: "America/Cancun",
  }, [], []);
  assert.equal(client.calls[0].op, "update");
  assert.equal(client.calls[0].payload.iso2, "MX");
  assert.equal(client.calls[0].payload.admin_area, null);
  assert.equal("capital_id" in client.calls[0].payload, false);
});

test("database conflicts keep their party messages", () => {
  assert.match(partyWriteError(new Error('duplicate key value violates unique constraint "party_places_free_city_key"')).message, /이미 있습니다/);
  assert.match(partyWriteError(new Error("party overlaps an existing party with the same name and venue")).message, /겹칩니다/);
});

test("a missing party table does not change the public-page message", () => {
  assert.match(partyLoadError(new Error("Could not find the table 'public.party_places' in the schema cache")), /공개 화면/);
});

test("capital places read the capital city and timezone", () => {
  const [place] = shapePlaces(
    [{ id: "p1", capital_id: "seoul", city: null, timezone: null }],
    [{ id: "seoul", city: "Seoul", country: "South Korea", iso2: "KR", timezone: "Asia/Seoul" }],
  );
  assert.equal(place.kind, "capital");
  assert.equal(place.city, "Seoul");
  assert.equal(place.timezone, "Asia/Seoul");
});

test("dance edits list additions before removals", () => {
  assert.deepEqual(danceChanges(["salsa"], ["bachata", "salsa"]), { add: ["bachata"], remove: [] });
});

function eventForm() {
  return {
    id: null,
    placeId: "place-1",
    timezone: "Asia/Seoul",
    name: "Fiesta",
    venueName: "Sala",
    startsDate: "2026-12-01",
    startsTime: "18:00",
    endsDate: "2026-12-01",
    endsTime: "22:00",
    officialUrl: "https://example.com/night",
    source: "Organizer",
    sourceChecked: "2026-10-01",
    posterUrl: "",
    dances: ["salsa"],
    originalDances: [],
  };
}

function capitalForm() {
  return { id: null, kind: "capital", capitalId: "seoul" };
}

function fakeClient(session) {
  const calls = [];
  return {
    calls,
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
    },
    from(table) {
      return {
        insert(payload) {
          const call = { table, op: "insert", payload };
          calls.push(call);
          const result = Promise.resolve({ data: { id: "saved-1" }, error: null });
          result.select = () => ({
            single: async () => ({ data: { id: "saved-1" }, error: null }),
          });
          return result;
        },
        update(payload) {
          calls.push({ table, op: "update", payload });
          return {
            eq: async () => ({ error: null }),
          };
        },
        delete() {
          const call = { table, op: "delete" };
          calls.push(call);
          return {
            eq() {
              return {
                in(_column, values) {
                  call.values = values;
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}
