// Shared background systems for SNES-quality Phaser mini-games.
// Gradient backgrounds, parallax layers, star fields, scanlines, vignette.

import Phaser from "phaser";
import { PALETTE } from "./theme";

// ─── Parallax Layer ────────────────────────────────────────────────

export interface ParallaxLayerConfig {
  speed: number;       // relative scroll speed (0 = static, 1 = full)
  colors: number[];    // gradient color stops (top to bottom)
  height: number;      // fraction of screen height (0-1)
  y?: number;          // vertical offset (pixels)
}

export interface GradientBackgroundConfig {
  layers: ParallaxLayerConfig[];
  scanlines?: boolean;
  vignette?: boolean;
}

export class GradientBackground {
  private config: GradientBackgroundConfig;
  private scrollY = 0;

  constructor(_scene: Phaser.Scene, config: GradientBackgroundConfig) {
    this.config = {
      scanlines: false,
      vignette: false,
      ...config,
    };
  }

  update(_delta: number, scrollDelta = 0) {
    this.scrollY += scrollDelta;
  }

  draw(g: Phaser.GameObjects.Graphics, w: number, h: number) {
    const { layers, scanlines, vignette } = this.config;

    // Draw each parallax layer
    for (const layer of layers) {
      const layerH = h * layer.height;
      const yOff = layer.y ?? 0;
      const scrollOff = (this.scrollY * layer.speed) % layerH;

      // Gradient fill
      const step = layerH / Math.max(1, layer.colors.length - 1);
      for (let i = 0; i < layer.colors.length - 1; i++) {
        const y1 = yOff + i * step - scrollOff;
        const y2 = yOff + (i + 1) * step - scrollOff;
        g.fillGradientStyle(layer.colors[i], layer.colors[i], layer.colors[i + 1], layer.colors[i + 1]);
        g.fillRect(0, y1, w, y2 - y1 + 1);
      }

      // Wrap around
      if (scrollOff > 0) {
        const wrapY = yOff + layerH - scrollOff;
        const wrapH = scrollOff;
        const lastIdx = layer.colors.length - 1;
        g.fillGradientStyle(layer.colors[lastIdx], layer.colors[lastIdx], layer.colors[0], layer.colors[0]);
        g.fillRect(0, wrapY, w, wrapH);
      }
    }

    // Scanlines overlay
    if (scanlines) {
      g.fillStyle(0x000000, 0.08);
      for (let y = 0; y < h; y += 3) {
        g.fillRect(0, y, w, 1);
      }
    }

    // Vignette overlay
    if (vignette) {
      const edgeSize = Math.min(w, h) * 0.15;
      // Top
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
      g.fillRect(0, 0, w, edgeSize);
      // Bottom
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
      g.fillRect(0, h - edgeSize, w, edgeSize);
      // Left
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0, 0.5, 0);
      g.fillRect(0, 0, edgeSize, h);
      // Right
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.5, 0, 0.5);
      g.fillRect(w - edgeSize, 0, edgeSize, h);
    }
  }
}

// ─── Star Field ────────────────────────────────────────────────────

export interface Star {
  x: number; y: number; size: number; alpha: number; speed: number;
}

export function createStarField(w: number, h: number, count = 80): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.7,
      speed: 0.2 + Math.random() * 0.6,
    });
  }
  return stars;
}

export function updateStarField(stars: Star[], dt: number, scrollY: number, w: number, h: number) {
  for (const s of stars) {
    s.y += scrollY * s.speed * dt;
    if (s.y > h) { s.y = -2; s.x = Math.random() * w; }
    if (s.y < -2) { s.y = h; s.x = Math.random() * w; }
  }
}

export function drawStarField(g: Phaser.GameObjects.Graphics, stars: Star[]) {
  for (const s of stars) {
    g.fillStyle(0xffffff, s.alpha);
    g.fillCircle(s.x, s.y, s.size);
  }
}

// ─── Tile Pattern ──────────────────────────────────────────────────

export function drawTileGrid(
  g: Phaser.GameObjects.Graphics,
  ox: number, oy: number,
  w: number, h: number,
  cellW: number, cellH: number,
  color: number, alpha = 0.06,
) {
  g.lineStyle(1, color, alpha);
  for (let x = ox; x <= ox + w; x += cellW) {
    g.lineBetween(x, oy, x, oy + h);
  }
  for (let y = oy; y <= oy + h; y += cellH) {
    g.lineBetween(ox, y, ox + w, y);
  }
}

// ─── Sprite helpers with 3D shading ────────────────────────────────

export interface OutlineConfig {
  color: number;
  width?: number;
}

export interface HighlightConfig {
  x: number;   // relative position 0-1
  y: number;
  size: number; // relative size 0-1
  alpha: number;
}

export interface ShadowConfig {
  offset: number;
  alpha: number;
}

export interface SpriteBoxConfig {
  fillColor: number;
  outline?: OutlineConfig;
  highlight?: HighlightConfig;
  shadow?: ShadowConfig;
  cornerRadius?: number;
}

/**
 * Draw a box with 3D shading: shadow, fill, highlight, outline.
 */
export function drawSpriteBox(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  w: number, h: number,
  config: SpriteBoxConfig,
) {
  const { fillColor, outline, highlight, shadow, cornerRadius = 4 } = config;

  // Shadow
  if (shadow) {
    g.fillStyle(0x000000, shadow.alpha);
    g.fillRoundedRect(x + shadow.offset, y + shadow.offset, w, h, cornerRadius);
  }

  // Main fill
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(x, y, w, h, cornerRadius);

  // Inner glow (lighter top-left)
  if (highlight) {
    const hx = x + w * highlight.x;
    const hy = y + h * highlight.y;
    const hs = Math.min(w, h) * highlight.size;
    g.fillStyle(0xffffff, highlight.alpha);
    g.fillCircle(hx, hy, hs);
  }

  // Outline
  if (outline) {
    g.lineStyle(outline.width ?? 2, outline.color, 1);
    g.strokeRoundedRect(x, y, w, h, cornerRadius);
  }
}

/**
 * Draw a circle with 3D shading.
 */
export function drawSpriteCircle(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  radius: number,
  config: { fillColor: number; outline?: OutlineConfig; highlight?: { alpha: number; size: number } },
) {
  const { fillColor, outline, highlight: hl } = config;

  g.fillStyle(fillColor, 1);
  g.fillCircle(cx, cy, radius);

  if (hl) {
    g.fillStyle(0xffffff, hl.alpha);
    g.fillCircle(cx - radius * 0.2, cy - radius * 0.2, radius * hl.size);
  }

  if (outline) {
    g.lineStyle(outline.width ?? 2, outline.color, 1);
    g.strokeCircle(cx, cy, radius);
  }
}

/**
 * Draw a triangle (for ships, arrows) with 3D shading.
 */
export function drawSpriteTriangle(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  config: { fillColor: number; outline?: OutlineConfig; glow?: { color: number; alpha: number; size: number } },
) {
  const { fillColor, outline, glow } = config;

  // Glow behind
  if (glow) {
    const cx = (x1 + x2 + x3) / 3;
    const cy = (y1 + y2 + y3) / 3;
    g.fillStyle(glow.color, glow.alpha);
    g.fillCircle(cx, cy, glow.size);
  }

  g.fillStyle(fillColor, 1);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.closePath();
  g.fillPath();

  if (outline) {
    g.lineStyle(outline.width ?? 2, outline.color, 1);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.closePath();
    g.strokePath();
  }
}

// ─── UI Helpers ────────────────────────────────────────────────────

export interface PanelConfig {
  borderColor: number;
  borderWidth?: number;
  shadowOffset?: number;
  cornerRadius?: number;
  fillColor?: number;
}

export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  w: number, h: number,
  config: PanelConfig,
) {
  const { borderColor, borderWidth = 2, shadowOffset = 4, cornerRadius = 8, fillColor = PALETTE.surface } = config;

  // Shadow
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x + shadowOffset, y + shadowOffset, w, h, cornerRadius);

  // Fill
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(x, y, w, h, cornerRadius);

  // Border
  g.lineStyle(borderWidth, borderColor, 1);
  g.strokeRoundedRect(x, y, w, h, cornerRadius);

  // Inner glow top
  g.fillStyle(0xffffff, 0.04);
  g.fillRoundedRect(x + 4, y + 4, w - 8, h * 0.3, cornerRadius - 2);
}

export function drawProgressBar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  w: number, h: number,
  pct: number,
  fillColor: number,
  borderColor: number,
) {
  // Background
  g.fillStyle(PALETTE.surfaceLight, 1);
  g.fillRoundedRect(x, y, w, h, 4);

  // Fill
  const fillW = Math.max(2, w * Phaser.Math.Clamp(pct, 0, 1));
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(x, y, fillW, h, 4);

  // Inner highlight on fill
  g.fillStyle(0xffffff, 0.15);
  g.fillRoundedRect(x + 2, y + 1, fillW - 4, h * 0.4, 3);

  // Border
  g.lineStyle(1, borderColor, 0.6);
  g.strokeRoundedRect(x, y, w, h, 4);
}

// ─── Mountain Range ────────────────────────────────────────────────

export function drawMountainRange(
  g: Phaser.GameObjects.Graphics,
  w: number, h: number,
  offset: number,
  color: number,
  alpha = 0.6,
  amplitude = 60,
  frequency = 80,
  detailFreq = 40,
  detailAmp = 15,
) {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) {
    const mh = amplitude * Math.sin((x + offset) / frequency)
      + detailAmp * Math.sin((x + offset) / detailFreq);
    g.lineTo(x, h - mh);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();

  // Snow caps
  g.fillStyle(0xffffff, alpha * 0.15);
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) {
    const mh = amplitude * Math.sin((x + offset) / frequency)
      + detailAmp * Math.sin((x + offset) / detailFreq);
    const peak = mh > amplitude * 0.6;
    if (peak) {
      g.lineTo(x, h - mh - 4);
    } else {
      g.lineTo(x, h - mh + 2);
    }
  }
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();
}

// ─── Water Waves ──────────────────────────────────────────────────

export function drawWaterWaves(
  g: Phaser.GameObjects.Graphics,
  w: number, h: number,
  time: number,
  color: number,
  alpha = 0.08,
  spacing = 12,
  amplitude = 8,
) {
  g.lineStyle(1, color, alpha);
  for (let y = -spacing; y < h + spacing; y += spacing) {
    g.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const waveY = y + Math.sin((x + time * 60) / 30) * amplitude;
      if (x === 0) g.moveTo(x, waveY);
      else g.lineTo(x, waveY);
    }
    g.strokePath();
  }

  // Surface shimmer
  g.fillStyle(0xffffff, 0.03);
  for (let i = 0; i < 6; i++) {
    const sy = (time * 40 + i * 80) % h;
    g.fillRect(w * 0.3, sy, w * 0.4, 2);
  }
}

// ─── Explosion ────────────────────────────────────────────────────

export function drawExplosion(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  radius: number,
  time: number,
  color: number,
) {
  const expand = radius * (0.5 + 0.5 * Math.sin(time * 10));
  const alpha = Math.max(0, 1 - time * 2);

  // Outer ring
  g.lineStyle(2, color, alpha * 0.3);
  g.strokeCircle(cx, cy, expand);

  // Inner glow
  g.fillStyle(color, alpha * 0.15);
  g.fillCircle(cx, cy, expand * 0.7);

  // Core
  g.fillStyle(0xffffff, alpha * 0.4);
  g.fillCircle(cx, cy, expand * 0.2);

  // Debris lines
  g.lineStyle(1, color, alpha * 0.2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 5;
    const len = expand * (0.5 + 0.5 * Math.sin(time * 3 + i));
    g.lineBetween(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
  }
}

// ─── Confetti ─────────────────────────────────────────────────────

export interface ConfettiPiece {
  x: number; y: number; vx: number; vy: number;
  color: number; size: number; rotation: number; rotSpeed: number;
  life: number; maxLife: number;
}

export function spawnConfetti(
  cx: number, cy: number,
  count = 30,
  colors?: number[],
): ConfettiPiece[] {
  const palette = colors ?? [0x6366f1, 0x8b5cf6, 0xec4899, 0x06b6d4, 0x22c55e, 0xeab308, 0xf97316];
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 80 + Math.random() * 120;
    const life = 1.5 + Math.random() * 1.5;
    pieces.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      color: palette[Math.floor(Math.random() * palette.length)],
      size: 3 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
      life,
      maxLife: life,
    });
  }
  return pieces;
}

export function updateConfetti(pieces: ConfettiPiece[], dt: number): ConfettiPiece[] {
  const alive: ConfettiPiece[] = [];
  for (const p of pieces) {
    p.x += p.vx * dt;
    p.vy += 200 * dt; // gravity
    p.y += p.vy * dt;
    p.rotation += p.rotSpeed * dt;
    p.life -= dt;
    if (p.life > 0) alive.push(p);
  }
  return alive;
}

export function drawConfetti(g: Phaser.GameObjects.Graphics, pieces: ConfettiPiece[]) {
  for (const p of pieces) {
    const alpha = Phaser.Math.Clamp(p.life / p.maxLife, 0, 1);
    g.fillStyle(p.color, alpha);
    g.fillRect(p.x - p.size / 2, p.y - p.size / 4, p.size, p.size / 2);
  }
}
