import test from "node:test";
import assert from "node:assert/strict";
import { openPasswordRecovery } from "./passwordRecovery.js";
const link = "https://example.test/admin/reset-password#type=recovery&access_token=test-only&refresh_token=test-only";
function mock(options = {}) {
  const calls = [];
  return { calls,
    setSession: async () => ({ data: { session: {} }, error: options.expired ? {} : null }),
    getUser: async () => ({ data: { user: { app_metadata: { role: options.role ?? "admin" } } } }),
    getClaims: async () => ({ data: { claims: { amr: [{ method: options.method ?? "recovery" }] } } }),
    updateUser: async value => { calls.push(["update", value]); return { error: options.fail ? {} : null }; },
    signOut: async value => { calls.push(["out", value]); return { error: null }; },
  };
}
test("no recovery token, wrong type, errors and expired links cannot change passwords", async () => {
  for (const url of ["https://example.test/admin/reset-password", link.replace("type=recovery", "type=signup"), link + "&error=expired"]) {
    const auth = mock();
    await assert.rejects(openPasswordRecovery(auth, url));
    assert.equal(auth.calls.length, 0);
  }
  await assert.rejects(openPasswordRecovery(mock({ expired: true }), link));
});
test("ordinary account and forged recovery type on ordinary session rejected", async () => {
  for (const options of [{ role: "user" }, { method: "password" }]) {
    const auth = mock(options);
    await assert.rejects(openPasswordRecovery(auth, link));
    assert.deepEqual(auth.calls, [["out", { scope: "local" }]]);
  }
});
test("password confirmation and minimum length prevent update", async () => {
  const auth = mock(); const recovery = await openPasswordRecovery(auth, link);
  await assert.rejects(recovery.save("short", "short"));
  await assert.rejects(recovery.save("test-password-only", "different"));
  assert.equal(auth.calls.length, 0);
});
test("successful recovery only updates password and clears local recovery session", async () => {
  const auth = mock(); const recovery = await openPasswordRecovery(auth, link);
  await recovery.save("test-password-only", "test-password-only");
  assert.deepEqual(auth.calls, [["update", { password: "test-password-only" }], ["out", { scope: "local" }]]);
  await assert.rejects(recovery.save("test-password-only", "test-password-only"));
});
test("save failure is safe and never exposes provider error content", async () => {
  const auth = mock({ fail: true }); const recovery = await openPasswordRecovery(auth, link);
  await assert.rejects(recovery.save("test-password-only", "test-password-only"), /could not be saved/);
  assert.equal(auth.calls.length, 1);
});
test("leaving the page invalidates the in-memory recovery capability", async () => {
  const auth = mock(); const recovery = await openPasswordRecovery(auth, link);
  await recovery.dispose();
  await assert.rejects(recovery.save("test-password-only", "test-password-only"));
  assert.deepEqual(auth.calls, [["out", { scope: "local" }]]);
});
test("cleanup failure retries sign-out without repeating the password change", async () => {
  const auth = mock(); let attempts = 0;
  auth.signOut = async () => ({ error: ++attempts === 1 ? {} : null });
  const recovery = await openPasswordRecovery(auth, link);
  await assert.rejects(recovery.save("test-password-only", "test-password-only"), /sign-out failed/);
  await recovery.save("", "");
  assert.equal(auth.calls.filter(([name]) => name === "update").length, 1);
  assert.equal(attempts, 2);
});
