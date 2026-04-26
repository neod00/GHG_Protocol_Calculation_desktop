import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "node:test";
import { spec as reporter } from "node:test/reporters";
import { build } from "esbuild";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(packageDir, ".test-dist");
const outfile = resolve(outDir, "scope12-regression.test.mjs");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(packageDir, "test/scope12-regression.test.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  sourcemap: "inline",
  logLevel: "silent"
});

let failed = false;
const stream = run({ files: [outfile] }).compose(reporter);

stream.on("data", (chunk) => {
  process.stdout.write(chunk);
});

stream.on("test:fail", () => {
  failed = true;
});

await new Promise((resolvePromise, rejectPromise) => {
  stream.on("end", resolvePromise);
  stream.on("error", rejectPromise);
});

rmSync(outDir, { recursive: true, force: true });

if (failed) {
  process.exitCode = 1;
}
