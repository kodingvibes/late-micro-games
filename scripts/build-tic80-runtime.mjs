import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(__dirname, "tic80-runtime");
const TARGET_FILE = join(__dirname, "..", "src", "games", "Tic80", "_runtime.ts");

const JS_FILE = join(SOURCE_DIR, "tic80.js");
const WASM_FILE = join(SOURCE_DIR, "tic80.wasm");

// Minimum sane sizes (matches download-tic80.mjs thresholds + a bit of slack).
const MIN_JS_BYTES = 100_000;
const MIN_WASM_BYTES = 500_000;

if (!existsSync(JS_FILE) || !existsSync(WASM_FILE)) {
  console.error(
    "TIC-80 runtime files not found in scripts/tic80-runtime/. Run `npm run download-tic80` first.",
  );
  process.exit(1);
}

const jsBytes = readFileSync(JS_FILE);
const wasmBytes = readFileSync(WASM_FILE);

if (jsBytes.length < MIN_JS_BYTES) {
  console.error(
    `tic80.js is too small (${jsBytes.length} bytes; expected at least ${MIN_JS_BYTES}). Aborting.`,
  );
  process.exit(1);
}

if (wasmBytes.length < MIN_WASM_BYTES) {
  console.error(
    `tic80.wasm is too small (${wasmBytes.length} bytes; expected at least ${MIN_WASM_BYTES}). Aborting.`,
  );
  process.exit(1);
}

// Validate WASM magic number (\x00asm).
if (
  wasmBytes[0] !== 0x00 ||
  wasmBytes[1] !== 0x61 ||
  wasmBytes[2] !== 0x73 ||
  wasmBytes[3] !== 0x6d
) {
  const magic = [wasmBytes[0], wasmBytes[1], wasmBytes[2], wasmBytes[3]]
    .map((b) => "0x" + b.toString(16).padStart(2, "0"))
    .join(" ");
  console.error(`tic80.wasm has invalid magic number (${magic}); expected 0x00 0x61 0x73 0x6d. Aborting.`);
  process.exit(1);
}

// Validate that JS file is not an HTML error page.
const jsHead = jsBytes.subarray(0, 32).toString("utf8").trimStart().toLowerCase();
if (jsHead.startsWith("<!doctype") || jsHead.startsWith("<html") || jsHead.startsWith("<?xml")) {
  console.error(`tic80.js looks like HTML, not JavaScript. Aborting.`);
  process.exit(1);
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
console.log(`  ✓ generated ${TARGET_FILE.replace(process.cwd() + "/", "")}`);
console.log(`    JS:  ${(jsBytes.length / 1024).toFixed(0)} KB (${(jsBase64.length / 1024).toFixed(0)} KB base64)`);
console.log(`    WASM: ${(wasmBytes.length / 1024).toFixed(0)} KB (${(wasmBase64.length / 1024).toFixed(0)} KB base64)`);
