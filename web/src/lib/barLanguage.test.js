import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BAR_COPY, BAR_LANGUAGE_KEY, profileHoursLabel, readBarLanguage, writeBarLanguage } from "./barLanguage.js";

test("BAR language defaults to English and accepts only explicit supported choices", () => {
  assert.equal(readBarLanguage(), "en");
  for (const saved of [null, "", "fr", "ko-KR", "true"]) assert.equal(readBarLanguage({ getItem: () => saved }), "en");
  assert.equal(readBarLanguage({ getItem: () => "ko" }), "ko");
});
test("language selection persists without changing navigation or using a network transport", () => {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  assert.equal(writeBarLanguage("ko", storage), true);
  assert.equal(entries.get(BAR_LANGUAGE_KEY), "ko");
  assert.equal(readBarLanguage(storage), "ko");
  assert.equal(writeBarLanguage("fr", storage), false);
  assert.equal(readBarLanguage(storage), "ko");
  writeBarLanguage("en", storage);
  assert.equal(readBarLanguage(storage), "en");
  const source = readFileSync(new URL("./barLanguage.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(|\.rpc\(|\.from\(|location\.|navigate\(/);
});
test("blocked browser storage does not crash the view or prevent a session language choice", () => {
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.doesNotThrow(() => writeBarLanguage("ko", blocked));
  assert.equal(readBarLanguage(blocked), "ko");
  writeBarLanguage("en", blocked);
});
test("English and Korean dictionaries cover every UI entry, all weekdays and four report choices", () => {
  assert.deepEqual(Object.keys(BAR_COPY.en).sort(), Object.keys(BAR_COPY.ko).sort());
  for (const language of ["en", "ko"]) {
    const t = BAR_COPY[language];
    assert.equal(t.weekdays.length, 7);
    assert.equal(t.reportOptions.length, 4);
    assert.ok(t.back("Hanoi").includes("Hanoi"));
    assert.ok(t.others("Hanoi").includes("Hanoi"));
    assert.notEqual(t.closed, t.unknown);
    assert.equal(profileHoursLabel("Closed", language), t.closed);
    assert.equal(profileHoursLabel("Not confirmed", language), t.unknown);
    assert.equal(profileHoursLabel("18:00–02:00 (+1 day)", language), "18:00–02:00 (+1 day)");
  }
});
