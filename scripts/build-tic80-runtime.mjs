import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(__dirname, "tic80-runtime");
const TARGET_FILE = join(__dirname, "..", "src", "games", "Tic80", "_runtime.ts");

const JS_FILE = join(SOURCE_DIR, "tic80.js");
const WASM_FILE = join(SOURCE_DIR, "tic80.wasm");

if (!existsSync(JS_FILE) || !existsSync(WASM_FILE)) {
  console.error(
    "TIC-80 runtime files not found in scripts/tic80-runtime/. Run `npm run download-tic80` first.",
  );
  process.exit(1);
}

const jsBase64 = readFileSync(JS_FILE).toString("base64");
const wasmBase64 = readFileSync(WASM_FILE).toString("base64");

const tsContent = `// AUTO-GENERATED. DO NOT EDIT.
// Regenerated on every build by scripts/build-tic80-runtime.mjs.
// Source: https://tic80.com/js/1.1.2837/{tic80.js,tic80.wasm}

export const TIC80_JS_B64: string = ${JSON.stringify(jsBase64)};
export const TIC80_WASM_B64: string = ${JSON.stringify(wasmBase64)};
`;

mkdirSync(dirname(TARGET_FILE), { recursive: true });
writeFileSync(TARGET_FILE, tsContent);
console.log(`  ✓ generated ${TARGET_FILE.replace(process.cwd() + "/", "")}`);
console.log(`    JS:  ${(jsBase64.length / 1024).toFixed(0)} KB (base64)`);
console.log(`    WASM: ${(wasmBase64.length / 1024).toFixed(0)} KB (base64)`);
