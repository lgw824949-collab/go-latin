import { spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import { offlineConfig } from "../offline/config.mjs";

const tests = spawnSync(process.execPath, ["--test", fileURLToPath(new URL("../offline/offline.test.js", import.meta.url))], { stdio: "inherit" });
if (tests.status !== 0) process.exit(tests.status ?? 1);
const outDir = await mkdtemp(join(tmpdir(), "go-latin-offline-"));
let audited = false;
const config = offlineConfig(outDir, result => { audited = true; console.log("OFFLINE BUILD AUDIT:", JSON.stringify(result)); });
// Uses only this isolated config. Does not run npm build or the live prerender script.
await build(config);
if (!audited) throw new Error("Offline build was not audited; server will not start.");
console.log("Safety checks passed. Real SDK, env files and production endpoints are excluded.");
if (!process.argv.includes("--check")) {
  const server = await preview(config);
  server.printUrls();
  console.log("Mock admin/user/sign-out buttons are at the top. Ctrl+C stops preview.");
}
