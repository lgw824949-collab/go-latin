import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  deleteSimplePartyAdminWith, emptySimplePartyForm, loadSimplePartyAdminWith,
  saveSimplePartyAdminWith, simplePartyEditForm,
} from "./simplePartyAdmin.js";
import { loadSimplePartiesWith, submitSimpleParty, submitSimplePartyWith } from "./simpleParty.js";

const ID = "11111111-1111-4111-8111-111111111111";
const OLD = "https://example.com/existing.png";
const FILE = { type: "image/png", size: 2048 };
const row = { id: ID, capital_id: "seoul", venue_id: null, venue_name: "Test venue",
  sns_url: "https://example.com/social", poster_url: OLD, starts_at: "2020-01-01T12:00:00Z", genre: "bachata" };
const form = (extra = {}) => ({ ...emptySimplePartyForm(), date: "2026-11-09", startTime: "21:00",
  venueName: "Test venue", snsUrl: "https://example.com/social", genre: "bachata", posterFile: FILE, ...extra });

test("invalid dates, times and SNS links fail before upload or RPC on create and edit", async () => {
  for (const id of ["", ID]) {
    for (const invalid of [
      { date: "2026-02-30" }, { startTime: "24:01" }, { startTime: "21:60" },
      { date: "" }, { startTime: "" }, { venueName: "   " },
      { capitalId: "chiang-mai" }, { snsUrl: "javascript:alert(1)" }, { snsUrl: "not a URL" },
    ]) {
      const { client, calls } = mock();
      await assert.rejects(saveSimplePartyAdminWith(client, form({ id, ...invalid })));
      assert.ok(!calls.some(call => ["upload", "rpc"].includes(call[0])));
    }
  }
});
function mock(options = {}) {
  const calls = [];
  const result = { data: options.rows ?? [row], error: options.readError ?? null };
  const query = {
    select: fields => { calls.push(["select", fields]); return query; },
    in: (key, values) => { calls.push(["in", key, values]); return query; },
    order: (key, value) => { calls.push(["order", key, value]); return Promise.resolve(result); },
    eq: (key, value) => { calls.push(["eq", key, value]); return Promise.resolve(result); },
  };
  const client = {
    auth: { getSession: async () => {
      calls.push(["session"]);
      return { data: { session: options.session === undefined ? { user: { app_metadata: { role: "admin" } } } : options.session }, error: options.authError };
    } },
    from: table => { calls.push(["from", table]); assert.equal(table, "simple_parties"); return query; },
    rpc: async (name, args) => {
      calls.push(["rpc", name, args]);
      if (options.rpcThrows) throw new Error("Network response lost");
      return { data: options.rpcData === undefined ? ID : options.rpcData, error: options.rpcError ?? null };
    },
    storage: { from: bucket => {
      assert.equal(bucket, "simple-party-posters");
      return {
        upload: async (path, file, settings) => { calls.push(["upload", path, file, settings]); return { error: options.uploadError }; },
        getPublicUrl: path => ({ data: { publicUrl: options.noUrl ? "" : `https://example.com/storage/${path}` } }),
        remove: () => { throw new Error("Storage deletion must never be called"); },
      };
    } },
  };
  return { client, calls };
}

test("signed-out, ordinary-user and user_metadata spoofing are rejected before all admin operations", async () => {
  for (const session of [null, { user: { app_metadata: {} } }, { user: { user_metadata: { role: "admin" } } }]) {
    for (const operation of [client => loadSimplePartyAdminWith(client), client => saveSimplePartyAdminWith(client, form()), client => deleteSimplePartyAdminWith(client, ID)]) {
      const { client, calls } = mock({ session });
      await assert.rejects(operation(client), /Admin sign-in/);
      assert.deepEqual(calls, [["session"]]);
    }
  }
});

test("an auth lookup failure cannot reach Storage, query or RPC", async () => {
  const { client, calls } = mock({ authError: { message: "Session unavailable" } });
  await assert.rejects(saveSimplePartyAdminWith(client, form()), /Session unavailable/);
  assert.deepEqual(calls, [["session"]]);
});

test("admin listing includes past events and limits queries to three cities", async () => {
  const { client, calls } = mock();
  const rows = await loadSimplePartyAdminWith(client);
  assert.equal(rows[0].startsAt, row.starts_at);
  assert.deepEqual(calls.find(call => call[0] === "in"), ["in", "capital_id", ["seoul", "bangkok", "hanoi"]]);
});

test("admin listing failure is an error, not an empty list", async () => {
  await assert.rejects(loadSimplePartyAdminWith(mock({ readError: { message: "Permission denied" } }).client), /Permission denied/);
});

test("create uploads a new object and sends the draft's insert RPC payload", async () => {
  const { client, calls } = mock();
  const saved = await saveSimplePartyAdminWith(client, form());
  const upload = calls.find(call => call[0] === "upload");
  assert.match(upload[1], /^seoul\/[0-9a-f-]{36}\.png$/);
  assert.equal(upload[3].upsert, false);
  const rpc = calls.find(call => call[0] === "rpc");
  assert.equal(rpc[1], "submit_simple_party");
  assert.deepEqual(Object.keys(rpc[2]), ["payload"]);
  assert.equal(rpc[2].payload.starts_at, "2026-11-09T12:00:00.000Z");
  assert.equal(rpc[2].payload.poster_url, saved.posterUrl);
  assert.equal(saved.id, ID);
});

test("edit keeps the existing poster without uploading and matches update RPC arguments", async () => {
  const { client, calls } = mock();
  const saved = await saveSimplePartyAdminWith(client, form({ id: ID, posterFile: null, posterUrl: OLD }));
  assert.equal(saved.posterUrl, OLD);
  assert.ok(!calls.some(call => call[0] === "upload"));
  const rpc = calls.find(call => call[0] === "rpc");
  assert.equal(rpc[1], "update_simple_party");
  assert.equal(rpc[2].party_id, ID);
  assert.equal(rpc[2].payload.poster_url, OLD);
});

test("replacement success changes the URL without deleting the old file", async () => {
  const { client } = mock();
  const saved = await saveSimplePartyAdminWith(client, form({ id: ID, posterUrl: OLD }));
  assert.notEqual(saved.posterUrl, OLD);
});

test("both create and update RPC failures preserve old poster and expose successful upload for manual retry", async () => {
  for (const id of ["", ID]) {
    const original = form({ id, posterUrl: OLD });
    const { client } = mock({ rpcError: { message: "RPC permission denied" } });
    await assert.rejects(saveSimplePartyAdminWith(client, original), error => {
      assert.match(error.message, /RPC permission denied/);
      assert.match(error.uploadedPoster.url, /seoul/);
      return true;
    });
    assert.equal(original.posterUrl, OLD);
    assert.equal(original.posterFile, FILE);
  }
});

test("network failure after upload does not delete a potentially committed poster", async () => {
  await assert.rejects(saveSimplePartyAdminWith(mock({ rpcThrows: true }).client, form()), error => {
    assert.match(error.message, /Network response lost/);
    assert.ok(error.uploadedPoster.url);
    return true;
  });
});

test("failed upload never calls RPC", async () => {
  const { client, calls } = mock({ uploadError: { message: "Storage denied" } });
  await assert.rejects(saveSimplePartyAdminWith(client, form({ id: ID, posterUrl: OLD })), /Storage denied/);
  assert.ok(!calls.some(call => call[0] === "rpc"));
});

test("invalid forms and files are rejected before upload", async () => {
  for (const extra of [{ capitalId: "tokyo" }, { posterFile: null }, { posterFile: { type: "image/png", size: 4194305 } }, { posterFile: { type: "image/svg+xml", size: 4 } }, { date: "2026-02-30" }, { id: "bad-id" }, { venueName: "x".repeat(201) }]) {
    const { client, calls } = mock();
    await assert.rejects(saveSimplePartyAdminWith(client, form(extra)));
    assert.deepEqual(calls, [["session"]]);
  }
});

test("an empty save result is not reported as success", async () => {
  await assert.rejects(saveSimplePartyAdminWith(mock({ rpcData: null }).client, form()), /result is unknown/);
});

test("delete uses the draft RPC only and never deletes a poster", async () => {
  const { client, calls } = mock();
  assert.equal(await deleteSimplePartyAdminWith(client, ID), ID);
  assert.deepEqual(calls, [["session"], ["rpc", "delete_simple_party", { party_id: ID }]]);
});

test("delete errors and ambiguous results are displayed as failures", async () => {
  await assert.rejects(deleteSimplePartyAdminWith(mock({ rpcError: { message: "Delete denied" } }).client, ID), /Delete denied/);
  await assert.rejects(deleteSimplePartyAdminWith(mock({ rpcData: null }).client, ID), /result is unknown/);
  await assert.rejects(deleteSimplePartyAdminWith(mock().client, "bad"), /Invalid party ID/);
});

test("edit form round-trips stored local wall times for Seoul, Bangkok and Hanoi", () => {
  for (const [capitalId, time] of [["seoul", "21:00"], ["bangkok", "19:00"], ["hanoi", "19:00"]]) {
    const edit = simplePartyEditForm({ id: ID, capitalId, startsAt: "2026-11-09T12:00:00Z", posterUrl: OLD });
    assert.equal(edit.date, "2026-11-09"); assert.equal(edit.startTime, time); assert.equal(edit.posterFile, null);
    assert.equal(edit.posterUrl, OLD);
  }
});

test("public list stays read-only and preserves poster/SNS while excluding past local dates", async () => {
  const next = { ...row, starts_at: "2026-11-10T12:00:00Z" };
  const { client, calls } = mock({ rows: [row, next] });
  const listed = await loadSimplePartiesWith(client, "seoul", new Date("2026-11-09T12:00:00Z"));
  assert.equal(listed.length, 1);
  assert.equal(listed[0].posterUrl, OLD); assert.equal(listed[0].snsUrl, row.sns_url);
  assert.ok(!calls.some(call => ["session", "upload", "rpc"].includes(call[0])));
});

test("public read errors and malformed responses never become empty party lists", async () => {
  await assert.rejects(loadSimplePartiesWith(mock({ readError: { message: "RLS denied" } }).client, "seoul"), /RLS denied/);
  const { client } = mock(); client.from = () => ({ select: () => ({ eq: async () => ({ data: null, error: null }) }) });
  await assert.rejects(loadSimplePartiesWith(client, "seoul"), /could not be loaded/);
});

test("legacy public registration exports reject without using the supplied client", async () => {
  const { client, calls } = mock();
  await assert.rejects(submitSimpleParty(form()), /Public registration is closed/);
  await assert.rejects(submitSimplePartyWith(client, form()), /Public registration is closed/);
  assert.deepEqual(calls, []);
});

test("RPC names and named arguments agree with the SQL draft", () => {
  const sql = fs.readFileSync(new URL("../../../supabase/drafts/quick_parties_admin_only.sql", import.meta.url), "utf8");
  assert.match(sql, /function public\.submit_simple_party\(payload jsonb\)/);
  assert.match(sql, /function public\.update_simple_party\(party_id uuid, payload jsonb\)/);
  assert.match(sql, /function public\.delete_simple_party\(party_id uuid\)/);
});

test("standalone SQL bootstrap is atomic and never grants anonymous submit", () => {
  const sql = fs.readFileSync(new URL("../../../supabase/drafts/quick_parties_admin_only.sql", import.meta.url), "utf8");
  const statements = sql.replace(/--[^\n]*/g, "");
  assert.equal((statements.match(/^begin;/gm) ?? []).length, 1);
  assert.equal((statements.match(/^commit;/gm) ?? []).length, 1);
  assert.match(sql, /if to_regclass\('public\.simple_parties'\) is null then/);
  assert.match(sql, /create table public\.simple_parties/);
  assert.match(sql, /insert into storage\.buckets/);
  assert.ok(sql.indexOf("create table public.simple_parties") < sql.indexOf("$preflight$"));
  assert.doesNotMatch(statements, /grant execute[^;]*to anon/i);
  for (const tag of ["validate", "submit", "update", "delete"]) {
    const body = sql.split(`as $${tag}$`)[1].split(`$${tag}$;`)[0];
    assert.match(body, /auth\.uid\(\) is null/);
    assert.match(body, /app_metadata' ->> 'role'\) is distinct from 'admin'/);
    assert.match(body, /public\.is_go_latin_admin\(\)/);
    assert.ok(body.indexOf("Admin sign-in is required") < body.indexOf(tag === "delete" ? "delete from" : tag === "validate" ? "jsonb_typeof" : "validate_party"));
  }
  assert.match(sql, /file_size_limit = 4194304/);
  assert.match(sql, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(sql, /as restrictive for insert to public/);
  assert.match(sql, /as restrictive for update to public/);
  assert.match(sql, /as restrictive for delete to public/);
  assert.doesNotMatch(statements, /drop\s+(?:table|schema)|truncate\s+|delete from storage\./i);
});

test("SQL dependency gate rejects missing Auth/Storage, disabled RLS and bypass client roles before bootstrap", () => {
  const sql = fs.readFileSync(new URL("../../../supabase/drafts/quick_parties_admin_only.sql", import.meta.url), "utf8");
  const gate = sql.split("do $dependencies$")[1].split("$dependencies$;")[0];
  assert.ok(sql.indexOf("do $dependencies$") < sql.indexOf("do $bootstrap$"));
  for (const dependency of ["storage.buckets", "storage.objects", "auth.uid()", "auth.jwt()", "pg_catalog.gen_random_uuid()"]) {
    assert.ok(gate.includes(`'${dependency}'`));
  }
  assert.match(gate, /and relrowsecurity/);
  assert.match(gate, /rolsuper or rolbypassrls/);
  assert.match(gate, /<> 2/);
  assert.match(sql, /set local search_path = '';/);
  assert.match(sql, /default pg_catalog\.gen_random_uuid\(\)/);
  assert.doesNotMatch(sqlExecutableText(gate), /alter\s+table|create\s+policy|\bexecute\b/i);
});

// Inspect the PL/pgSQL gate body, retaining executable tokens and line boundaries.
// Dynamic EXECUTE is forbidden separately so hiding its string never bypasses the gate.
function sqlExecutableText(sql) {
  let output = "", i = 0;
  while (i < sql.length) {
    if (sql.startsWith("--", i)) {
      while (i < sql.length && sql[i] !== "\n") i++;
      output += "\n";
    } else if (sql.startsWith("/*", i)) {
      let depth = 1; i += 2;
      while (i < sql.length && depth) {
        if (sql.startsWith("/*", i)) { depth++; i += 2; }
        else if (sql.startsWith("*/", i)) { depth--; i += 2; }
        else i++;
      }
      if (depth) throw new Error("Unterminated SQL comment");
      output += " ";
    } else if (sql[i] === "'") {
      const escaped = /(?:^|[^a-zA-Z0-9_$])[eE]$/.test(sql.slice(0, i));
      i++; let closed = false;
      while (i < sql.length) {
        if (escaped && sql[i] === "\\") { i += 2; }
        else if (sql.startsWith("''", i)) { i += 2; }
        else if (sql[i++] === "'") { closed = true; break; }
      }
      if (!closed) throw new Error("Unterminated SQL string");
      output += " ";
    } else { output += sql[i++]; }
  }
  return output;
}

test("SQL gate scanner ignores quoted messages and nested comments without hiding executable DDL", () => {
  const forbidden = /alter\s+table|create\s+policy|\bexecute\b/i;
  assert.doesNotMatch(sqlExecutableText("raise exception 'CREATE POLICY isn''t allowed'; /* outer /* CREATE POLICY */ end */ -- ALTER TABLE\nselect 1;"), forbidden);
  for (const sql of ["CREATE POLICY example ON storage.objects;", "ALTER /* comment */ TABLE storage.objects;", "EXECUTE 'CREATE POLICY example ON storage.objects';", "EXECUTE $$CREATE POLICY example ON storage.objects$$;"]) {
    assert.match(sqlExecutableText(sql), forbidden);
  }
  assert.throws(() => sqlExecutableText("'unterminated"), /Unterminated/);
  assert.throws(() => sqlExecutableText("/* unterminated"), /Unterminated/);
});
