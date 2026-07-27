import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "tic80-runtime");

const FILES = [
  ["tic80.js", "https://tic80.com/js/1.1.2837/tic80.js", 100_000, "text"],
  ["tic80.wasm", "https://tic80.com/js/1.1.2837/tic80.wasm", 500_000, "wasm"],
];

const MAX_RETRIES = 3;
const TIMEOUT_MS = 60_000;
const RETRY_BASE_MS = 1_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

function validate(name, data, kind) {
  if (data.length < 100) {
    throw new Error(`${name}: file too small (${data.length} bytes) — likely an error page`);
  }
  if (kind === "wasm") {
    // WASM magic number: \x00asm
    const magic = data.subarray(0, 4);
    if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6d) {
      throw new Error(
        `${name}: invalid WASM magic number (got ${[...magic].map((b) => "0x" + b.toString(16)).join(" ")}), expected 0x00 0x61 0x73 0x6d`,
      );
    }
  } else if (kind === "text") {
    // JS should not start with HTML markers
    const head = data.subarray(0, 16).toString("utf8").trimStart().toLowerCase();
    if (head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<?xml")) {
      throw new Error(`${name}: file looks like HTML, not JavaScript`);
    }
  }
}

async function downloadWithRetry(name, url, kind) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await downloadOnce(url);
      validate(name, data, kind);
      return data;
    } catch (e) {
      lastErr = e;
      const cause = e.name === "AbortError" ? "timeout" : e.message;
      if (attempt < MAX_RETRIES) {
        const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.log(`  ! ${name}: attempt ${attempt} failed (${cause}), retrying in ${backoff}ms...`);
        await sleep(backoff);
      }
    }
  }
  throw new Error(`${name} failed after ${MAX_RETRIES} attempts: ${lastErr?.message ?? lastErr}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const [name, url, minBytes, kind] of FILES) {
    const dest = join(OUT, name);
    if (existsSync(dest)) {
      console.log(`  ✓ ${name} already exists, skipping download`);
      // Still validate cached file
      const { readFileSync } = await import("fs");
      try {
        validate(name, readFileSync(dest), kind);
        console.log(`  ✓ ${name} cached copy is valid`);
        continue;
      } catch (e) {
        console.log(`  ! ${name} cached copy invalid (${e.message}), re-downloading`);
      }
    }
    process.stdout.write(`  ↓ ${name}... `);
    const data = await downloadWithRetry(name, url, kind);
    writeFileSync(dest, data);
    console.log(`done (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
  }
}

main().catch((e) => {
  console.error("download-tic80 failed:", e.message);
  process.exitCode = 1;
});
