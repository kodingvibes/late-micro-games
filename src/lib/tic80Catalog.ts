const CATALOG_CACHE_TTL = 300_000;
let cache: { data: Tic80Game[]; ts: number } | null = null;

// ponytail: known-working carts from tic80.com. Replace with real backend URLs.
const FALLBACK_CATALOG: Tic80Game[] = [
  {
    id: "palette-demo",
    name: "PALETTE DEMO",
    description: "Demostración de paletas por Nesbox",
    cartUrl: "https://tic80.com/cart/255730685116b5ceb150867dd96fc200/palette_demo.tic",
    coverUrl: "https://tic80.com/cart/255730685116b5ceb150867dd96fc200/cover.gif",
    accent: "indigo",
  },
  {
    id: "deleted",
    name: "DELETED",
    description: "El clásico Rick Roll en TIC-80",
    cartUrl: "https://tic80.com/cart/9d852129be8c6b46f6ff6d7252b1b6b8/deleted.tic",
    coverUrl: "https://tic80.com/cart/9d852129be8c6b46f6ff6d7252b1b6b8/cover.gif",
    accent: "rose",
  },
];

export interface Tic80Game {
  id: string;
  name: string;
  description: string;
  cartUrl: string;
  coverUrl: string | null;
  accent: string;
}

export async function fetchTic80Catalog(): Promise<Tic80Game[]> {
  if (cache && Date.now() - cache.ts < CATALOG_CACHE_TTL) return cache.data;
  try {
    const res = await fetch("/api/tic80/games", { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: Tic80Game[] = await res.json();
    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return FALLBACK_CATALOG;
  }
}
