#!/usr/bin/env node
/**
 * Encodes the TIC-80 runtime files in `scripts/tic80-runtime/` into a single
 * TypeScript module (`src/games/Tic80/_runtime.ts`) that exports the JS and
 * WASM blobs as base64 constants. Both inputs are validated before encoding so
 * we never silently ship a corrupt runtime into the bundle.
 *
 * Validation gates (each one fails the build with a clear message):
 *   - tic80.js must exist, be ≥ 100 KB, and not look like HTML/XML.
 *   - tic80.wasm must exist, be ≥ 500 KB, and start with the WASM magic
 *     number (\x00asm = 0x00 0x61 0x73 0x6d).
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(__dirname, "tic80-runtime");
const TARGET_FILE = join(
  __dirname,
  "..",
  "src",
  "games",
  "Tic80",
  "_runtime.ts",
);

const JS_FILE = join(SOURCE_DIR, "tic80.js");
const WASM_FILE = join(SOURCE_DIR, "tic80.wasm");

// Min sizes (loose lower bounds: a real runtime is well above these).
const MIN_JS_BYTES = 100_000;
const MIN_WASM_BYTES = 500_000;

function die(msg) {
  console.error(`build-tic80-runtime: ${msg}`);
  process.exit(1);
}

if (!existsSync(JS_FILE) || !existsSync(WASM_FILE)) {
  die(
    "TIC-80 runtime files not found in scripts/tic80-runtime/. " +
      "Run `npm run download-tic80` first.",
  );
}

const jsBytes = readFileSync(JS_FILE);
const wasmBytes = readFileSync(WASM_FILE);

const jsSize = statSync(JS_FILE).size;
const wasmSize = statSync(WASM_FILE).size;

if (jsBytes.length !== jsSize) {
  die(
    `tic80.js size mismatch (stat=${jsSize}, read=${jsBytes.length}). Aborting.`,
  );
}
if (wasmBytes.length !== wasmSize) {
  die(
    `tic80.wasm size mismatch (stat=${wasmSize}, read=${wasmBytes.length}). Aborting.`,
  );
}

if (jsBytes.length < MIN_JS_BYTES) {
  die(
    `tic80.js is too small (${jsBytes.length} bytes; expected at least ${MIN_JS_BYTES}). Aborting.`,
  );
}

if (wasmBytes.length < MIN_WASM_BYTES) {
  die(
    `tic80.wasm is too small (${wasmBytes.length} bytes; expected at least ${MIN_WASM_BYTES}). Aborting.`,
  );
}

// Validate WASM magic number (\x00asm = 0x00 0x61 0x73 0x6d).
if (
  wasmBytes[0] !== 0x00 ||
  wasmBytes[1] !== 0x61 ||
  wasmBytes[2] !== 0x73 ||
  wasmBytes[3] !== 0x6d
) {
  const magic = [wasmBytes[0], wasmBytes[1], wasmBytes[2], wasmBytes[3]]
    .map((b) => "0x" + b.toString(16).padStart(2, "0"))
    .join(" ");
  die(
    `tic80.wasm has invalid magic number (${magic}); expected 0x00 0x61 0x73 0x6d. Aborting.`,
  );
}

// Validate that JS file is not an HTML error page.
const jsHead = jsBytes
  .subarray(0, 32)
  .toString("utf8")
  .trimStart()
  .toLowerCase();
if (
  jsHead.startsWith("<!doctype") ||
  jsHead.startsWith("<html") ||
  jsHead.startsWith("<?xml")
) {
  die(`tic80.js looks like HTML/XML, not JavaScript. Aborting.`);
}

const jsBase64 = jsBytes.toString("base64");
const wasmBase64 = wasmBytes.toString("base64");

const tsContent = `// AUTO-GENERATED. DO NOT EDIT.
// Regenerated on every build by scripts/build-tic80-runtime.mjs.
// Source: https://tic80.com/js/1.1.2837/{tic80.js,tic80.wasm}

export const TIC80_JS_B64: string = ${JSON.stringify(jsBase64)};
export const TIC80_WASM_B64: string = ${JSON.stringify(wasmBase64)};
`;

mkdirSync(dirname(TARGET_FILE), { recursive: true });
writeFileSync(TARGET_FILE, tsContent);

// Also copy the raw runtime files to public/ so the standalone
// tic80-player.html can fetch them directly. The player page is a
// plain HTML file served from the same origin — it can't reach the
// bundled base64, so it loads the JS and WASM over HTTP instead.
const PUBLIC_DIR = join(__dirname, "..", "public");
mkdirSync(PUBLIC_DIR, { recursive: true });
writeFileSync(join(PUBLIC_DIR, "tic80.js"), jsBytes);
writeFileSync(join(PUBLIC_DIR, "tic80.wasm"), wasmBytes);

const rel = relative(process.cwd(), TARGET_FILE);
console.log(`  ✓ generated ${rel}`);
console.log(`  ✓ copied tic80.js + tic80.wasm to public/`);
console.log(
  `    JS:  ${(jsBytes.length / 1024).toFixed(0)} KB (${(jsBase64.length / 1024).toFixed(0)} KB base64)`,
);
console.log(
  `    WASM: ${(wasmBytes.length / 1024).toFixed(0)} KB (${(wasmBase64.length / 1024).toFixed(0)} KB base64)`,
);
