import assert from "node:assert/strict";
import test from "node:test";
import {
  adLoadError,
  adWriteError,
  findAdConflict,
  saveAdWith,
  setAdStatusWith,
} from "./adAdmin.js";

const admin = { user: { app_metadata: { role: "admin" } } };

test("a home ad stores no place and a city ad stores that place", async () => {
  const home = fakeClient(admin);
  await saveAdWith(home, form(), [], [event()]);
  assert.equal(home.calls[0].payload.placement, "HOME");
  assert.equal(home.calls[0].payload.place_id, null);
  assert.equal(home.calls[0].payload.rank, 1);

  const city = fakeClient(admin);
  await saveAdWith(city, form({ placement: "CITY", placeId: "place-1", rank: 2 }), [], [event()]);
  assert.equal(city.calls[0].payload.placement, "CITY");
  assert.equal(city.calls[0].payload.place_id, "place-1");
  assert.equal(city.calls[0].payload.destination_url, "https://example.com/go");
});

test("rank, destination, interval, and city match are refused before a write", async () => {
  const client = fakeClient(admin);
  await assert.rejects(() => saveAdWith(client, form({ rank: 6 }), [], [event()]), /1부터 5/);
  await assert.rejects(() => saveAdWith(client, form({ placement: "CITY", placeId: "place-1", rank: 4 }), [], [event()]), /1부터 3/);
  await assert.rejects(() => saveAdWith(client, form({ destinationUrl: "ftp://example.com" }), [], [event()]), /http 또는 https/);
  await assert.rejects(() => saveAdWith(client, form({ endsDate: "2026-11-01", endsTime: "18:00" }), [], [event()]), /종료보다 빨라야/);
  await assert.rejects(
    () => saveAdWith(client, form({ placement: "CITY", placeId: "place-2" }), [], [event()]),
    /행사의 지역과 같아야/,
  );
  assert.equal(client.calls.length, 0);
});

test("the same rank or party overlap is refused and a paused ad does not block", async () => {
  const held = {
    id: "held",
    partyId: "party-a",
    placement: "HOME",
    placeId: "",
    rank: 1,
    status: "active",
    startsAt: "2026-11-01T09:00:00.000Z",
    endsAt: "2026-11-01T13:00:00.000Z",
  };
  assert.match(findAdConflict(form({ partyId: "party-b" }), [held]), /같은 순위/);
  assert.match(findAdConflict(form({ partyId: "party-a", rank: 2 }), [held]), /같은 행사/);
  assert.equal(findAdConflict(form({ status: "paused", partyId: "party-b" }), [held]), null);
  assert.equal(findAdConflict(form({ startsDate: "2026-11-01", startsTime: "22:00", endsDate: "2026-11-02", endsTime: "01:00" }), [held]), null);

  const client = fakeClient(admin);
  await assert.rejects(() => saveAdWith(client, form({ partyId: "party-b" }), [held], [event()]), /같은 순위/);
  assert.equal(client.calls.length, 0);
});

test("pause does not check the rank and resume does", async () => {
  const held = {
    id: "held",
    partyId: "party-a",
    placement: "HOME",
    placeId: "",
    rank: 1,
    status: "active",
    startsAt: "2026-11-01T09:00:00.000Z",
    endsAt: "2026-11-01T13:00:00.000Z",
  };
  const paused = { ...held, id: "paused-ad", partyId: "party-b", status: "paused" };
  const client = fakeClient(admin);
  await setAdStatusWith(client, paused, "paused", [held, paused]);
  assert.equal(client.calls[0].payload.status, "paused");
  await assert.rejects(() => setAdStatusWith(client, paused, "active", [held, paused]), /같은 순위/);
});

test("a signed-out session cannot change an ad", async () => {
  const client = fakeClient(null);
  await assert.rejects(() => saveAdWith(client, form(), [], [event()]), /Admin sign-in is required/);
  await assert.rejects(() => setAdStatusWith(client, { id: "ad-1", status: "active" }, "paused", []), /Admin sign-in is required/);
  assert.equal(client.calls.length, 0);
});

test("database ad errors stay readable", () => {
  assert.match(adWriteError(new Error("ad periods overlap on the same rank")).message, /같은 순위/);
  assert.match(adWriteError(new Error("ad periods overlap for the same party")).message, /같은 행사/);
  assert.match(adWriteError(new Error("new row violates row-level security policy")).message, /관리자만/);
  assert.match(adLoadError(new Error("Could not find the table 'public.party_ads'")), /아직 없습니다/);
});

function form(overrides = {}) {
  return {
    id: null,
    placement: "HOME",
    placeId: "",
    partyId: "party-1",
    advertiser: "Sponsor",
    destinationUrl: "https://example.com/go",
    startsDate: "2026-11-01",
    startsTime: "18:00",
    endsDate: "2026-11-01",
    endsTime: "22:00",
    rank: 1,
    status: "active",
    timezone: "Asia/Seoul",
    ...overrides,
  };
}

function event() {
  return { id: "party-1", placeId: "place-1", name: "Night" };
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
          calls.push({ table, op: "insert", payload });
          const result = Promise.resolve({ data: { id: "saved-1" }, error: null });
          result.select = () => ({ single: async () => ({ data: { id: "saved-1" }, error: null }) });
          return result;
        },
        update(payload) {
          calls.push({ table, op: "update", payload });
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };
}
