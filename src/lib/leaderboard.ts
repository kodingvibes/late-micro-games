const STORAGE_KEY = "late-micro-games:leaderboard";

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function write(data: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getBestScore(game: string): number {
  return read()[game] ?? 0;
}

export function setBestScore(game: string, score: number): boolean {
  const data = read();
  if (score > (data[game] ?? 0)) {
    data[game] = score;
    write(data);
    return true;
  }
  return false;
}
