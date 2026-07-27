#!/usr/bin/env node
/**
 * validate-tic80.mjs
 *
 * TDD validator for the TIC-80 player. Runs a series of acceptance checks
 * over the artifacts produced by `scripts/build-tic80-runtime.mjs` and the
 * current player source files. Exits 0 only if every check passes.
 *
 * Usage: node scripts/validate-tic80.mjs
 *
 * Pure Node.js — no test framework. Uses only `fs`, `path`, `node:url`.
 *
 * Two phases are encoded here:
 *  - Baseline checks (1-5): the existing runtime artifacts and `_runtime.ts`
 *    should already be in place after the previous build step.
 *  - New-architecture checks (6-11): the iframe-based player, the loader,
 *    the typed message contract and the replacement hook. These are expected
 *    to FAIL on the red phase (files not yet created) and PASS once the
 *    new architecture is implemented.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is the parent of `scripts/`.
const ROOT = path.resolve(__dirname, "..");

// ---------- paths ----------
const RUNTIME_TS = path.join(ROOT, "src", "games", "Tic80", "_runtime.ts");
const USE_TIC80_TS = path.join(ROOT, "src", "games", "Tic80", "useTic80.ts");
const TIC80_MESSAGES_TS = path.join(
  ROOT,
  "src",
  "games",
  "Tic80",
  "tic80Messages.ts"
);
const USE_TIC80_IFRAME_TS = path.join(
  ROOT,
  "src",
  "games",
  "Tic80",
  "useTic80Iframe.ts"
);
const TIC80_PLAYER_TSX = path.join(ROOT, "src", "games", "Tic80", "Tic80Player.tsx");
const TIC80_JS = path.join(ROOT, "scripts", "tic80-runtime", "tic80.js");
const TIC80_WASM = path.join(ROOT, "scripts", "tic80-runtime", "tic80.wasm");
const LOADER_HTML = path.join(ROOT, "public", "tic80", "loader.html");

const MIN_SIZE_BYTES = 100 * 1024; // 100 KB
const WASM_MAGIC = Buffer.from([0x00, 0x61, 0x73, 0x6d]); // "\0asm"

// ---------- ANSI colors ----------
const USE_COLOR = process.stdout.isTTY || process.env.FORCE_COLOR === "1";
function colorize(text, color) {
  if (!USE_COLOR) return text;
  const codes = {
    red: "\u001b[31m",
    green: "\u001b[32m",
    gray: "\u001b[90m",
    bold: "\u001b[1m",
    reset: "\u001b[0m",
  };
  return `${codes[color] ?? ""}${text}${codes.reset}`;
}

// ---------- helpers ----------
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? colorize("✓", "green") : colorize("✗", "red");
  const detailText = detail
    ? colorize(` — ${detail}`, "gray")
    : "";
  // eslint-disable-next-line no-console
  console.log(`${mark} ${name}${detailText}`);
}

function safeSize(p) {
  try {
    return statSync(p).size;
  } catch {
    return -1;
  }
}

function readPrefix(p, n) {
  try {
    const fd = readFileSync(p);
    return fd.subarray(0, n);
  } catch {
    return null;
  }
}

function readUtf8(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

// ---------- checks ----------

// 1. _runtime.ts exists and exports TIC80_JS_B64 + TIC80_WASM_B64.
function checkRuntimeTs() {
  const name = "src/games/Tic80/_runtime.ts exists with TIC80_JS_B64 & TIC80_WASM_B64 exports";
  if (!existsSync(RUNTIME_TS)) {
    record(name, false, "file missing");
    return;
  }
  const src = readUtf8(RUNTIME_TS);
  if (src === null) {
    record(name, false, "unreadable");
    return;
  }
  const hasJsExport = /export\s+(?:const|let|var)\s+TIC80_JS_B64\b/.test(src);
  const hasWasmExport = /export\s+(?:const|let|var)\s+TIC80_WASM_B64\b/.test(src);
  if (hasJsExport && hasWasmExport) {
    record(name, true);
  } else {
    const missing = [
      hasJsExport ? null : "TIC80_JS_B64",
      hasWasmExport ? null : "TIC80_WASM_B64",
    ].filter(Boolean).join(", ");
    record(name, false, `missing exports: ${missing}`);
  }
}

// 2. tic80.js and tic80.wasm exist.
function checkRuntimeArtifactsExist() {
  const name = "scripts/tic80-runtime/{tic80.js, tic80.wasm} exist";
  const jsOk = existsSync(TIC80_JS);
  const wasmOk = existsSync(TIC80_WASM);
  if (jsOk && wasmOk) {
    record(name, true);
  } else {
    const missing = [
      jsOk ? null : "tic80.js",
      wasmOk ? null : "tic80.wasm",
    ].filter(Boolean).join(", ");
    record(name, false, `missing: ${missing}`);
  }
}

// 3. tic80.js is a JS text file (not HTML and not WASM binary).
function checkTic80JsIsNotWasmOrHtml() {
  const name = "tic80.js has correct content (not WASM / not HTML)";
  if (!existsSync(TIC80_JS)) {
    record(name, false, "file missing");
    return;
  }
  const head = readPrefix(TIC80_JS, 4);
  if (!head) {
    record(name, false, "unreadable");
    return;
  }
  if (head.equals(WASM_MAGIC)) {
    record(name, false, "starts with WASM magic — expected JS source");
    return;
  }
  const src = readUtf8(TIC80_JS) ?? "";
  const trimmed = src.trimStart().toLowerCase();
  if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) {
    record(name, false, "starts with HTML — expected JS source");
    return;
  }
  const firstByte = head[0];
  if (firstByte >= 0x20 && firstByte <= 0x7e) {
    record(
      name,
      true,
      `starts with 0x${firstByte.toString(16)} ("${String.fromCharCode(firstByte)}")`
    );
  } else {
    record(name, false, `unexpected first byte 0x${firstByte.toString(16)}`);
  }
}

// 4. tic80.wasm starts with the WASM magic "\0asm".
function checkTic80WasmMagic() {
  const name = 'tic80.wasm has WASM magic \\x00asm';
  if (!existsSync(TIC80_WASM)) {
    record(name, false, "file missing");
    return;
  }
  const head = readPrefix(TIC80_WASM, 4);
  if (!head) {
    record(name, false, "unreadable");
    return;
  }
  if (head.equals(WASM_MAGIC)) {
    record(name, true);
  } else {
    const hex = Array.from(head)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    record(name, false, `got ${hex}`);
  }
}

// 5. Both files are > 100 KB.
function checkMinSizes() {
  const name = `tic80.js & tic80.wasm > ${MIN_SIZE_BYTES / 1024} KB`;
  const jsSize = safeSize(TIC80_JS);
  const wasmSize = safeSize(TIC80_WASM);
  if (jsSize < 0 || wasmSize < 0) {
    record(name, false, "one or both files missing");
    return;
  }
  if (jsSize > MIN_SIZE_BYTES && wasmSize > MIN_SIZE_BYTES) {
    record(name, true, `js=${jsSize}B wasm=${wasmSize}B`);
  } else {
    const tooSmall = [];
    if (jsSize <= MIN_SIZE_BYTES) tooSmall.push(`tic80.js=${jsSize}B`);
    if (wasmSize <= MIN_SIZE_BYTES) tooSmall.push(`tic80.wasm=${wasmSize}B`);
    record(name, false, `too small: ${tooSmall.join(", ")}`);
  }
}

// 6. public/tic80/loader.html exists (iframe loader).
function checkLoaderHtmlExists() {
  const name = "public/tic80/loader.html exists (iframe loader)";
  if (existsSync(LOADER_HTML)) {
    const size = safeSize(LOADER_HTML);
    record(name, true, `${size}B`);
  } else {
    record(name, false, "file missing");
  }
}

// 7. src/games/Tic80/tic80Messages.ts exists (typed message contract).
function checkTic80MessagesExists() {
  const name = "src/games/Tic80/tic80Messages.ts exists (typed message contract)";
  if (existsSync(TIC80_MESSAGES_TS)) {
    const src = readUtf8(TIC80_MESSAGES_TS);
    const size = safeSize(TIC80_MESSAGES_TS);
    if (src === null) {
      record(name, false, "exists but unreadable");
      return;
    }
    // Sanity: should look like a TS module exporting at least one type/const.
    const hasExport = /export\s+/.test(src);
    if (hasExport) {
      record(name, true, `${size}B`);
    } else {
      record(name, false, "no `export` found — not a proper module");
    }
  } else {
    record(name, false, "file missing");
  }
}

// 8. src/games/Tic80/useTic80Iframe.ts exists (new iframe-based hook).
function checkUseTic80IframeExists() {
  const name = "src/games/Tic80/useTic80Iframe.ts exists (new hook)";
  if (existsSync(USE_TIC80_IFRAME_TS)) {
    const src = readUtf8(USE_TIC80_IFRAME_TS);
    const size = safeSize(USE_TIC80_IFRAME_TS);
    if (src === null) {
      record(name, false, "exists but unreadable");
      return;
    }
    const exportsHook = /export\s+(?:function|const)\s+useTic80Iframe\b/.test(src);
    if (exportsHook) {
      record(name, true, `${size}B`);
    } else {
      record(name, false, "no `export function useTic80Iframe` found");
    }
  } else {
    record(name, false, "file missing");
  }
}

// 9. src/games/Tic80/useTic80.ts does NOT exist (legacy hook must be removed).
function checkUseTic80TsGone() {
  const name = "src/games/Tic80/useTic80.ts does NOT exist (legacy removed)";
  if (!existsSync(USE_TIC80_TS)) {
    record(name, true);
  } else {
    record(name, false, "file still present — should be deleted");
  }
}

// 10. Tic80Player.tsx does NOT reference the legacy `useTic80` import.
//     It must use `useTic80Iframe` instead.
function checkPlayerUsesIframeHook() {
  const name = "Tic80Player.tsx uses useTic80Iframe (not useTic80)";
  if (!existsSync(TIC80_PLAYER_TSX)) {
    record(name, false, "file missing");
    return;
  }
  const src = readUtf8(TIC80_PLAYER_TSX);
  if (src === null) {
    record(name, false, "unreadable");
    return;
  }
  // Strip line/block comments to avoid false positives on commented-out code.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const referencesLegacy = /useTic80\b/.test(stripped) && !/useTic80Iframe\b/.test(stripped.replace(/useTic80Iframe/g, ""));
  // More precise: look for an actual import or call named useTic80 but not useTic80Iframe.
  const hasLegacyImport = /from\s+["'][^"']*useTic80["']/.test(stripped);
  const hasIframeImport = /from\s+["'][^"']*useTic80Iframe["']/.test(stripped);
  const hasLegacyCall = /\buseTic80\s*\(/.test(stripped);

  if (hasLegacyImport || hasLegacyCall) {
    record(
      name,
      false,
      `still references useTic80 (import=${hasLegacyImport}, call=${hasLegacyCall})`
    );
    return;
  }
  if (!hasIframeImport) {
    record(
      name,
      false,
      "no import for useTic80Iframe found"
    );
    return;
  }
  void referencesLegacy; // silence linter
  record(name, true);
}

// 11. Tic80Player.tsx renders a div with id="tic80-iframe-host" (no <canvas>).
function checkPlayerHasIframeHost() {
  const name = 'Tic80Player.tsx has <div id="tic80-iframe-host"> (no <canvas>)';
  if (!existsSync(TIC80_PLAYER_TSX)) {
    record(name, false, "file missing");
    return;
  }
  const src = readUtf8(TIC80_PLAYER_TSX);
  if (src === null) {
    record(name, false, "unreadable");
    return;
  }
  // Strip comments.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const hasHost = /id\s*=\s*["']tic80-iframe-host["']/.test(stripped);
  const hasCanvas = /<canvas\b/.test(stripped);

  if (!hasHost) {
    record(name, false, 'no element with id="tic80-iframe-host" found');
    return;
  }
  if (hasCanvas) {
    record(name, false, "still contains a <canvas> element");
    return;
  }
  record(name, true);
}

// ---------- runner ----------

function main() {
  // eslint-disable-next-line no-console
  console.log(colorize("TIC-80 acceptance checks", "bold"));
  // eslint-disable-next-line no-console
  console.log(colorize("------------------------", "gray"));

  // Baseline — should pass on green and red.
  checkRuntimeTs();
  checkRuntimeArtifactsExist();
  checkTic80JsIsNotWasmOrHtml();
  checkTic80WasmMagic();
  checkMinSizes();

  // New architecture — expected to FAIL on red phase.
  checkLoaderHtmlExists();
  checkTic80MessagesExists();
  checkUseTic80IframeExists();
  checkUseTic80TsGone();
  checkPlayerUsesIframeHook();
  checkPlayerHasIframeHost();

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const summary = `Result: ${passed}/${total} passed`;
  // eslint-disable-next-line no-console
  console.log("");
  // eslint-disable-next-line no-console
  console.log(passed === total ? colorize(summary, "green") : colorize(summary, "red"));

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
