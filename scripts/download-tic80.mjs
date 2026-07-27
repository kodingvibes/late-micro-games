import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "tic80-runtime");

const FILES = [
  ["tic80.js", "https://tic80.com/js/1.1.2837/tic80.js"],
  ["tic80.wasm", "https://tic80.com/js/1.1.2837/tic80.wasm"],
];

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const [name, url] of FILES) {
    const dest = join(OUT, name);
    if (existsSync(dest)) {
      console.log(`  ✓ ${name} already exists, skipping`);
      continue;
    }
    process.stdout.write(`  ↓ ${name}... `);
    const data = await download(url);
    writeFileSync(dest, data);
    console.log(`done (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
  }
}

main().catch((e) => {
  console.error("download-tic80 failed:", e.message);
  process.exitCode = 1;
});
