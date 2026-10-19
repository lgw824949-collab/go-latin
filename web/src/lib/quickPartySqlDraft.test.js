import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = (name) => readFileSync(new URL(`../../../supabase/migrations/${name}`, import.meta.url), "utf8");
const submissions = sql("DRAFT_quick_party_submissions.sql");
const storage = sql("DRAFT_quick_party_storage_security.sql");
const submit = sql("DRAFT_quick_party_submit_rpc.sql");
const moderation = sql("DRAFT_quick_party_review_rpc.sql");

test("draft submissions are RLS protected, approved-only public, and poster-unique", () => {
  assert.match(submissions, /enable row level security/i);
  assert.match(submissions, /for select to anon, authenticated using \(status = 'approved'\)/i);
  assert.match(submissions, /unique index[^;]+\(poster_path\)/i);
  assert.match(submit, /drop policy if exists "authenticated submit own pending quick parties"/i);
});
test("poster storage is private and scoped to the organizer folder", () => {
  assert.match(storage, /'quick-party-posters', 'quick-party-posters', false/);
  assert.match(storage, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(storage, /allowed_mime_types/);
});
test("submission RPC checks user, storage owner, quota lock and future city time", () => {
  assert.match(submit, /security definer/i);
  assert.match(submit, /v_user\s+uuid\s*:=\s*auth\.uid\(\)/);
  assert.match(submit, /pg_advisory_xact_lock/i);
  assert.match(submit, /owner_id = v_user::text/i);
  assert.match(submit, /p_start_time <= v_city_now/i);
  assert.match(submit, /v_recent_count >= 5/i);
  assert.match(submit, /array_position\(p_dance_genres, null\) is not null/i);
  assert.match(submit, /left\(p_poster_path, length\(v_user::text\) \+ 1\)/i);
  assert.match(submit, /length\(p_poster_path\) <= length\(v_user::text\) \+ 1/i);
  assert.match(submit, /'pending', v_user/);
  assert.match(submit, /revoke all on function public\.submit_quick_party[\s\S]*from public, anon/i);
});
test("moderation RPC denies nonadmins and only transitions pending events", () => {
  assert.match(moderation, /auth\.jwt\(\) -> 'app_metadata' ->> 'role'/);
  assert.match(moderation, /for update/i);
  assert.match(moderation, /v_previous <> 'pending'/i);
  assert.match(moderation, /quick_party_review_audit/i);
  assert.match(moderation, /revoke all on function public\.review_quick_party[\s\S]*from public, anon/i);
});
