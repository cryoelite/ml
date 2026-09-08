#!/usr/bin/env bun
/* ============================================================================
   Copy Pyodide into public/pyodide/ so the site owns its Python runtime.

   Why not just point at the CDN?
     · offline. The whole point of a local-first tutorial is that a plane, a
       train or a flaky hotel network does not stop you.
     · determinism. The wheel set is pinned to the version in package.json
       rather than to whatever a CDN serves this month.
     · sandboxes. Cross-origin `importScripts` inside a worker is blocked by
       more environments than you would expect, and fails with a network error
       that tells the reader nothing useful.

   The core runtime comes from node_modules (already downloaded by `bun
   install`); the package wheels are fetched once from the official CDN. The
   result is gitignored — it is a build input, not source.

   Usage:  bun scripts/vendor-pyodide.mjs [--force]
   ========================================================================== */

import { mkdir, copyFile, stat, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "node_modules", "pyodide");
const DEST = join(ROOT, "public", "pyodide");
const FORCE = process.argv.includes("--force");
// `bun run dev` calls this on every start; stay silent when there is nothing to do.
const QUIET = process.argv.includes("--quiet");

/* Everything the tutorial can reach for from a browser cell. torch is absent
   on purpose: there is no WebAssembly build, which is exactly why the local
   kernel backend exists. */
const PACKAGES = [
  "micropip",
  "numpy",
  "matplotlib",
  "pandas",
  "scikit-learn",
  "scipy",
  "sympy",
  "pillow",
  "networkx",
];

const CORE = [
  "pyodide.js",
  "pyodide.mjs",
  "pyodide.asm.js",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

const fmt = (b) => `${(b / 1e6).toFixed(1)} MB`;

async function main() {
  if (!existsSync(SRC)) {
    console.error("✗ node_modules/pyodide is missing. Run `bun install` first.");
    process.exit(1);
  }

  const lock = JSON.parse(await readFile(join(SRC, "pyodide-lock.json"), "utf8"));
  const version = JSON.parse(await readFile(join(SRC, "package.json"), "utf8")).version;
  const base = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;

  await mkdir(DEST, { recursive: true });
  const say = (...a) => { if (!QUIET) console.log(...a); };
  say(`Pyodide ${version} (CPython ${lock.info.python}) → public/pyodide/\n`);

  /* --- core ------------------------------------------------------------- */
  let copied = 0;
  let coreBytes = 0;
  for (const name of CORE) {
    const from = join(SRC, name);
    if (!existsSync(from)) continue; // .asm.js only exists on some builds
    const to = join(DEST, name);
    const size = (await stat(from)).size;
    coreBytes += size;
    if (!FORCE && existsSync(to) && (await stat(to)).size === size) continue;
    await copyFile(from, to);
    copied++;
  }
  say(`  core     ${CORE.length} files, ${fmt(coreBytes)} (${copied} copied)`);

  /* --- wheels ----------------------------------------------------------- */
  const pk = lock.packages;
  const byNormalised = Object.fromEntries(
    Object.keys(pk).map((k) => [k.toLowerCase().replaceAll("_", "-"), k]),
  );

  const wanted = new Set();
  const stack = [...PACKAGES];
  while (stack.length) {
    const key = byNormalised[stack.pop().toLowerCase().replaceAll("_", "-")];
    if (!key || wanted.has(key)) continue;
    wanted.add(key);
    stack.push(...(pk[key].depends ?? []));
  }

  const missing = PACKAGES.filter((p) => !byNormalised[p.toLowerCase().replaceAll("_", "-")]);
  if (missing.length) {
    console.warn(`  ! not in this Pyodide build, skipping: ${missing.join(", ")}`);
  }

  const targets = [...wanted].map((n) => pk[n]).sort((a, b) => a.name.localeCompare(b.name));
  let downloaded = 0;
  let wheelBytes = 0;
  let failed = 0;

  // Six at a time: enough to saturate a normal link, gentle on the CDN.
  const queue = [...targets];
  const workers = Array.from({ length: 6 }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const to = join(DEST, item.file_name);
      if (!FORCE && existsSync(to)) {
        // Resolve the size BEFORE touching the accumulator: `wheelBytes +=
        // (await ...)` reads wheelBytes first, then suspends, and the five other
        // workers' updates are lost when it finally assigns.
        const { size } = await stat(to);
        wheelBytes += size;
        continue;
      }
      try {
        const res = await fetch(base + item.file_name);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        await writeFile(to, buf);
        wheelBytes += buf.byteLength;
        downloaded++;
        process.stdout.write(`\r  wheels   ${downloaded}/${targets.length} …`.padEnd(60));
        // progress is worth showing even in quiet mode: this is a real download
      } catch (err) {
        failed++;
        console.error(`\n  ✗ ${item.file_name}: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);

  process.stdout.write("\r".padEnd(60) + "\r");
  if (QUIET && !downloaded && !copied && !failed) return; // nothing happened; say nothing
  say(`  wheels   ${targets.length} files, ${fmt(wheelBytes)} (${downloaded} downloaded)`);
  say(`\n  total    ${fmt(coreBytes + wheelBytes)} in public/pyodide/`);
  if (failed) {
    console.error(`\n✗ ${failed} file(s) failed. Re-run to retry; the site falls back to the CDN meanwhile.`);
    process.exit(1);
  }
  say("\n✓ Browser runtime is self-hosted. It now works offline.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
