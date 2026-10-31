import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/global.css"), "utf8");

test("venue website and instagram links wrap inside the card", () => {
  const rule = css.slice(css.indexOf(".venue p a {"), css.indexOf(".venue p a {") + 120);
  assert.match(rule, /max-width:\s*100%/);
  assert.match(rule, /overflow-wrap:\s*anywhere/);
});
