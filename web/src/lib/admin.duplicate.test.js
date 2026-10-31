import assert from "node:assert/strict";
import test from "node:test";
import { classifyVenueDuplicates, duplicateError, saveAdminBarWith, venueDuplicateAction, venueWriteError } from "./admin.js";

const seoul = { id: "existing", capital_id: "seoul", name: "Top Salsa Bar", address: "616-2 Sinsa-dong", status: "operating", city: "Seoul" };

function decide(form, rows, confirmDuplicate = false) {
  return venueDuplicateAction(classifyVenueDuplicates(form, rows), confirmDuplicate);
}

test("same city, name, and address is blocked", () => {
  const decision = decide(
    { capitalId: "seoul", name: "  TOP   salsa bar ", address: "616-2   Sinsa-dong" },
    [seoul],
  );
  assert.equal(decision.action, "block");
  assert.equal(decision.match.reason, "same-name-address");
  assert.equal(duplicateError(decision).code, "blocked");
});

test("same city and name with a different address is a branch", () => {
  const decision = decide(
    { capitalId: "seoul", name: "Top Salsa Bar", address: "9 Teheran-ro 6-gil" },
    [seoul],
  );
  assert.equal(decision.action, "allow");
});

test("same city and address with a different name warns", () => {
  const decision = decide(
    { capitalId: "seoul", name: "Gangnam Latin", address: "616-2 Sinsa-dong" },
    [seoul],
  );
  assert.equal(decision.action, "warn");
  assert.equal(decision.match.reason, "same-address");
  assert.equal(duplicateError(decision).code, "duplicate");
});

test("a same-address warning can be confirmed", () => {
  const decision = decide(
    { capitalId: "seoul", name: "Gangnam Latin", address: "616-2 Sinsa-dong" },
    [seoul],
    true,
  );
  assert.equal(decision.action, "allow");
});

test("confirming a duplicate does not bypass the same name and address", () => {
  const decision = decide(
    { capitalId: "seoul", name: "Top Salsa Bar", address: "616-2 Sinsa-dong" },
    [seoul],
    true,
  );
  assert.equal(decision.action, "block");
});

test("a missing address with the same city and name is blocked", () => {
  const decision = decide(
    { capitalId: "seoul", name: "Top Salsa Bar", address: "   " },
    [seoul],
  );
  assert.equal(decision.action, "block");
  assert.equal(decision.match.reason, "missing-address");
  assert.equal(decide(
    { capitalId: "seoul", name: "Top Salsa Bar", address: "" },
    [seoul],
    true,
  ).action, "block");
});

test("the same name and address in another city is a separate venue", () => {
  const decision = decide(
    { capitalId: "hanoi", name: "Top Salsa Bar", address: "616-2 Sinsa-dong" },
    [seoul],
  );
  assert.equal(decision.action, "allow");
});

test("creating and editing use the same comparison", () => {
  const form = { capitalId: "seoul", name: "Top Salsa Bar", address: "616-2 Sinsa-dong" };
  assert.equal(decide(form, [seoul]).action, "block");
  assert.equal(decide({ ...form, venueId: "existing" }, [seoul]).action, "allow");
  assert.equal(decide({ ...form, venueId: "other" }, [seoul]).action, "block");
});

test("quotes and spacing still count as the same name", () => {
  const decision = decide(
    { capitalId: "seoul", name: "La Habanera “Casa del Ron”", address: "1 Hang Bong" },
    [{ id: "h", capital_id: "seoul", name: "La Habanera \"Casa del Ron\"", address: "1 hang bong", city: "Hanoi" }],
  );
  assert.equal(decision.action, "block");
});

test("a block is kept when another row is only an address warning", () => {
  const decision = decide(
    { capitalId: "seoul", name: "Top Salsa Bar", address: "616-2 Sinsa-dong" },
    [
      seoul,
      { id: "other", capital_id: "seoul", name: "Other Bar", address: "616-2 Sinsa-dong", city: "Seoul" },
    ],
    true,
  );
  assert.equal(decision.action, "block");
  assert.equal(decision.match.id, "existing");
});

test("a same-address unique index becomes the blocked name and address message", () => {
  const error = venueWriteError({
    code: "23505",
    message: 'duplicate key value violates unique constraint "venues_name_address_key"',
  }, "  Top Salsa Bar ");
  assert.equal(error.code, "blocked");
  assert.equal(error.message, '"Top Salsa Bar" already uses this name and address in this city.');
});

test("a missing-address unique index becomes the blocked empty-address message", () => {
  const error = venueWriteError({
    code: "23505",
    details: "venues_name_without_address_key",
  }, "Top Salsa Bar");
  assert.equal(error.code, "blocked");
  assert.equal(error.message, '"Top Salsa Bar" already exists in this city. Enter a different address or keep the existing venue.');
});

test("other unique errors stay on the original message", () => {
  const primaryKey = venueWriteError({
    code: "23505",
    message: 'duplicate key value violates unique constraint "venues_pkey"',
  }, "Top Salsa Bar");
  const unnamed = venueWriteError({ code: "23505", message: "duplicate key value" }, "Top Salsa Bar");
  assert.equal(primaryKey.code, undefined);
  assert.equal(primaryKey.message, 'duplicate key value violates unique constraint "venues_pkey"');
  assert.equal(unnamed.code, undefined);
  assert.equal(unnamed.message, "duplicate key value");
});

const adminSession = { user: { app_metadata: { role: "admin" } } };

function barForm(overrides = {}) {
  return {
    venueId: null,
    capitalId: "seoul",
    country: "South Korea",
    originalCountry: "South Korea",
    name: "Atomic Bar",
    address: "1 Main",
    phone: "",
    website: "",
    instagram: "",
    mapsUrl: "https://maps.example/atomic",
    dances: ["salsa"],
    hours: [{
      weekday: 1,
      closed: false,
      opens: "18:00",
      closes: "02:00",
      originalOpens: "18:00",
      originalCloses: "02:00",
      text: "6 PM–2 AM",
    }],
    schedule: [{ weekday: 1, dances: ["salsa"] }],
    lastChecked: "2026-10-11",
    confidence: "likely",
    status: "operating",
    notes: "",
    confirmDuplicate: false,
    ...overrides,
  };
}

function mockClient({ session = adminSession, rows = [], rpc } = {}) {
  const rpcs = [];
  const client = {
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
    },
    from() {
      return {
        select() {
          return {
            async eq() {
              return { data: rows, error: null };
            },
          };
        },
        insert() {
          throw new Error("direct insert");
        },
        update() {
          throw new Error("direct update");
        },
        delete() {
          throw new Error("direct delete");
        },
        upsert() {
          throw new Error("direct upsert");
        },
      };
    },
    async rpc(name, args) {
      rpcs.push({ name, args });
      if (rpc) return rpc(args, rpcs.length);
      return { data: args.payload.venue_id, error: null };
    },
  };
  return { client, rpcs };
}

test("a save calls the bar RPC once and does not write child tables directly", async () => {
  const { client, rpcs } = mockClient();
  const saved = await saveAdminBarWith(client, barForm({ name: "RPC once" }));
  assert.equal(rpcs.length, 1);
  assert.equal(rpcs[0].name, "save_admin_bar");
  assert.equal(saved, rpcs[0].args.payload.venue_id);
  assert.equal(rpcs[0].args.payload.is_new, true);
  assert.equal(rpcs[0].args.payload.hours[0].hours_text, "6 PM–2 AM");
  assert.equal(rpcs[0].args.payload.sources[0].kind, "google_maps");
  assert.deepEqual(rpcs[0].args.payload.remove_source_kinds, ["website", "instagram"]);
  assert.equal(rpcs[0].args.payload.latitude, undefined);
  assert.equal(rpcs[0].args.payload.longitude, undefined);
});

test("a signed-out or non-admin session does not call the bar RPC", async () => {
  const signedOut = mockClient({ session: null });
  await assert.rejects(
    () => saveAdminBarWith(signedOut.client, barForm({ name: "Signed out" })),
    /Admin sign-in is required/,
  );
  const member = mockClient({ session: { user: { app_metadata: { role: "member" } } } });
  await assert.rejects(
    () => saveAdminBarWith(member.client, barForm({ name: "Member" })),
    /Admin sign-in is required/,
  );
  assert.equal(signedOut.rpcs.length, 0);
  assert.equal(member.rpcs.length, 0);
});

test("invalid bar input does not call the bar RPC", async () => {
  const { client, rpcs } = mockClient();
  await assert.rejects(
    () => saveAdminBarWith(client, barForm({ name: "   ", address: "9 Teheran-ro" })),
    /BAR name is required/,
  );
  await assert.rejects(
    () => saveAdminBarWith(client, barForm({ name: "Bad link", website: "notaurl" })),
    /Website must be an http or https URL/,
  );
  assert.equal(rpcs.length, 0);
});

test("a blocked duplicate does not call the bar RPC", async () => {
  const { client, rpcs } = mockClient({
    rows: [{ id: "existing", capital_id: "seoul", name: "Blocked Bar", address: "1 Main", status: "operating", capitals: { city: "Seoul" } }],
  });
  await assert.rejects(
    () => saveAdminBarWith(client, barForm({ name: "Blocked Bar" })),
    (error) => error.code === "blocked",
  );
  assert.equal(rpcs.length, 0);
});

test("a venue unique index from the RPC stays a blocked message", async () => {
  const { client } = mockClient({
    rpc: () => ({
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "venues_name_address_key"',
      },
    }),
  });
  await assert.rejects(
    () => saveAdminBarWith(client, barForm({ name: "Index block" })),
    (error) => error.code === "blocked" && error.message.includes("name and address"),
  );
});

test("a lost new-bar response retries the same id instead of inserting another", async () => {
  const { client, rpcs } = mockClient({
    rpc: (_args, count) => {
      if (count === 1) return { data: null, error: { message: "Failed to fetch" } };
      return { data: _args.payload.venue_id, error: null };
    },
  });
  const form = barForm({ name: "Lost response" });
  await assert.rejects(() => saveAdminBarWith(client, form), /Failed to fetch/);
  const saved = await saveAdminBarWith(client, form);
  assert.equal(rpcs.length, 2);
  assert.equal(rpcs[0].args.payload.venue_id, rpcs[1].args.payload.venue_id);
  assert.equal(rpcs[1].args.payload.is_new, true);
  assert.equal(saved, rpcs[0].args.payload.venue_id);
});

test("an edit saves that venue id", async () => {
  const { client, rpcs } = mockClient();
  await saveAdminBarWith(client, barForm({ venueId: "8d6c2e3a-6e2b-4d4a-9c1e-1a2b3c4d5e6f", name: "Existing edit" }));
  assert.equal(rpcs[0].args.payload.is_new, false);
  assert.equal(rpcs[0].args.payload.venue_id, "8d6c2e3a-6e2b-4d4a-9c1e-1a2b3c4d5e6f");
});
