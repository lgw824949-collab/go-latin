import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { countryForCapital, saveAdminBarWith } from "./admin.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const cities = [
  { id: "seoul", city: "Seoul", country: "South Korea" },
  { id: "hanoi", city: "Hanoi", country: "Vietnam" },
];

test("a new bar shows the selected capital country", () => {
  assert.equal(countryForCapital(cities, ""), "");
  assert.equal(countryForCapital(cities, "seoul"), "South Korea");
});

test("an existing bar shows that capital country", () => {
  const loadedCountry = "South Korea";
  assert.equal(loadedCountry, countryForCapital(cities, "seoul"));
  assert.equal(countryForCapital([{ id: "seoul", country: loadedCountry }], "seoul"), loadedCountry);
});

test("changing city shows the new capital country", () => {
  assert.equal(countryForCapital(cities, "seoul"), "South Korea");
  assert.equal(countryForCapital(cities, "hanoi"), "Vietnam");
  assert.notEqual(countryForCapital(cities, "hanoi"), "South Korea");
});

test("a new save sends the selected capital country for both country fields", async () => {
  const { client, rpcs } = mockClient();
  await saveAdminBarWith(client, barForm({
    country: "  South Korea  ",
    originalCountry: "France",
  }));
  assert.equal(rpcs[0].args.payload.country, "South Korea");
  assert.equal(rpcs[0].args.payload.original_country, "South Korea");
});

test("an edit save sends the selected capital country for both country fields", async () => {
  const { client, rpcs } = mockClient();
  await saveAdminBarWith(client, barForm({
    venueId: "8d6c2e3a-6e2b-4d4a-9c1e-1a2b3c4d5e6f",
    capitalId: "hanoi",
    country: "Vietnam",
    originalCountry: "South Korea",
    name: "Existing edit",
  }));
  assert.equal(rpcs[0].args.payload.is_new, false);
  assert.equal(rpcs[0].args.payload.capital_id, "hanoi");
  assert.equal(rpcs[0].args.payload.country, "Vietnam");
  assert.equal(rpcs[0].args.payload.original_country, "Vietnam");
});

test("the country field is read only and follows the selected city", () => {
  const page = readFileSync(join(root, "web/src/pages/Admin.jsx"), "utf8");
  assert.match(page, /countryForCapital\(cities, next\)/);
  assert.match(page, /label="Country" value=\{country\} readOnly/);
  assert.match(page, /citiesForCountry\(countries, countrySlug\(country\)\)/);
  assert.match(page, /disabled=\{countryCities\.length === 0\}/);
  assert.match(page, /saveAdminBar\(/);
});

test("the country guard removes only the capital country update", () => {
  const previous = readFileSync(join(root, "supabase/migrations/016_save_admin_bar.sql"), "utf8");
  const guard = readFileSync(join(root, "supabase/migrations/018_save_admin_bar_country_guard.sql"), "utf8");
  assert.match(previous, /update public\.capitals/);
  assert.equal(guard.includes("update public.capitals"), false);
  assert.equal(guard.includes("v_count"), false);
  assert.equal(guard.includes("The database did not apply the country."), false);
  assert.match(guard, /is_go_latin_admin\(\)/);
  assert.match(guard, /insert into public\.venues/);
  assert.match(guard, /update public\.venues/);
  assert.match(guard, /grant execute on function public\.save_admin_bar\(jsonb\) to authenticated/);
  assert.equal(functionText(guard), functionText(previous));
});

test("direct capital updates lose the admin policy and the update grant", () => {
  const guard = readFileSync(join(root, "supabase/migrations/019_capitals_no_direct_update.sql"), "utf8");
  assert.match(guard, /drop policy if exists "admin update capitals" on public\.capitals/);
  assert.match(guard, /revoke update on table public\.capitals from authenticated/);
  assert.match(guard, /revoke update on table public\.capitals from anon/);
  assert.equal(guard.includes("update public.capitals set"), false);
  assert.equal(guard.includes("public read capitals"), false);
  assert.equal(/revoke\s+select/i.test(guard), false);
  assert.equal(/create\s+or\s+replace\s+function/i.test(guard), false);
  assert.equal(guard.includes("public.venues"), false);
});

function functionText(sql) {
  return sql
    .slice(sql.indexOf("create or replace"))
    .replace(/v_count integer;/g, "")
    .replace(
      /if btrim\(coalesce\(payload->>'country', ''\)\) is distinct from payload->>'original_country' then[\s\S]*?end if;\s*end if;/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

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

function mockClient({ rows = [] } = {}) {
  const rpcs = [];
  const client = {
    auth: {
      async getSession() {
        return { data: { session: adminSession }, error: null };
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
      };
    },
    async rpc(name, args) {
      rpcs.push({ name, args });
      return { data: args.payload.venue_id, error: null };
    },
  };
  return { client, rpcs };
}
