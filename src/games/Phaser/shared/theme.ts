// Shared visual system for late.kodingvibes.com Phaser mini-games.
// Matches the shell's dark/indigo/violet palette.

export const PALETTE = {
  bg: 0x0b0d17,
  surface: 0x14162a,
  surfaceLight: 0x1e213a,
  border: 0x2a2e4a,
  text: 0xe2e8f0,
  textMuted: 0x94a3b8,

  accent: 0x6366f1,      // indigo-500
  accentSoft: 0x818cf8,  // indigo-400
  violet: 0x8b5cf6,
  pink: 0xec4899,
  cyan: 0x06b6d4,
  green: 0x22c55e,
  lime: 0x84cc16,
  yellow: 0xeab308,
  orange: 0xf97316,
  red: 0xef4444,
};

export const FONTS = {
  ui: { fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif" },
  mono: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
  dseg: { fontFamily: "'DSEG14 Classic', 'DSEG14 Classic Mini', monospace" },
  dsegMini: { fontFamily: "'DSEG14 Classic Mini', 'DSEG14 Classic', monospace" },
};

export const HEX = {
  bg: "#0b0d17",
  surface: "#14162a",
  surfaceLight: "#1e213a",
  border: "#2a2e4a",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  accent: "#6366f1",
  accentSoft: "#818cf8",
  violet: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
  green: "#22c55e",
  lime: "#84cc16",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

export function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export function colorToHex(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}

// Common helper: draw a glow behind a shape.
export function drawGlow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha = 0.35,
) {
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - 4, y - 4, width + 8, height + 8, 6);
}
