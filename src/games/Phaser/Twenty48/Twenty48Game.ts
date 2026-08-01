import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, scorePop } from "../shared/effects";
import {
  GradientBackground, drawSpriteBox, drawPanel, drawTileGrid,
} from "../shared/backgrounds";

const SIZE = 4;
const TILE_COLORS: Record<number, { bg: number; text: string; dark: number }> = {
  2: { bg: 0x6366f1, text: "#e2e8f0", dark: 0x3730a3 },
  4: { bg: 0x818cf8, text: "#e2e8f0", dark: 0x4338ca },
  8: { bg: 0x8b5cf6, text: "#e2e8f0", dark: 0x5b21b6 },
  16: { bg: 0xa78bfa, text: "#0b0d17", dark: 0x6d28d9 },
  32: { bg: 0xec4899, text: "#e2e8f0", dark: 0x9d174d },
  64: { bg: 0xf43f5e, text: "#e2e8f0", dark: 0x9f1239 },
  128: { bg: 0xf97316, text: "#e2e8f0", dark: 0x9a3412 },
  256: { bg: 0xeab308, text: "#0b0d17", dark: 0x854d0e },
  512: { bg: 0x84cc16, text: "#0b0d17", dark: 0x4d7c0f },
  1024: { bg: 0x22c55e, text: "#0b0d17", dark: 0x166534 },
  2048: { bg: 0x06b6d4, text: "#0b0d17", dark: 0x0891b2 },
};

class Twenty48Scene extends Phaser.Scene {
  private grid: number[][] = [];
  private score = 0;
  private gameOver = false;
  private won = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;
  private bg!: GradientBackground;
  private ox = 0;
  private oy = 0;
  private cellSize = 60;
  private gap = 8;
  private animatingTiles: { x: number; y: number; value: number; scale: number; alpha: number; }[] = [];
  private mergeParticles: { x: number; y: number; color: number; life: number; }[] = [];

  constructor() { super("Twenty48"); }

  create() {
    this.graphics = this.add.graphics();
    this.bg = new GradientBackground(this, {
      layers: [
        { speed: 0.01, colors: [0x05070e, 0x0b0d17, 0x0f1220], height: 1 },
      ],
      scanlines: true,
      vignette: true,
    });

    this.add.text(20, 12, "SCORE", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.scoreText = this.add.text(20, 24, "0", {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    });
    this.statusText = this.add.text(0, 0, "", { fontSize: "18px", color: HEX.accentSoft, fontFamily: FONTS.ui.fontFamily, fontStyle: "bold" }).setOrigin(0.5, 0);
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Flechas: mover · P: pausa · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.restartHintText);
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.reset();
    fadeInScene(this, 300);
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.scale.off("resize", this.draw, this);
  }

  private reset() {
    this.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    this.score = 0;
    this.gameOver = false;
    this.won = false;
    this.animatingTiles = [];
    this.mergeParticles = [];
    this.spawn();
    this.spawn();
    this.draw();
  }

  private emptyCells(): [number, number][] {
    const cells: [number, number][] = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (this.grid[y][x] === 0) cells.push([x, y]);
      }
    }
    return cells;
  }

  private spawn() {
    const cells = this.emptyCells();
    if (cells.length === 0) return;
    const [x, y] = Phaser.Utils.Array.GetRandom(cells);
    this.grid[y][x] = Math.random() < 0.9 ? 2 : 4;
    // Animate spawn
    this.animatingTiles.push({ x, y, value: this.grid[y][x], scale: 0, alpha: 1 });
  }

  private slideLine(line: number[]): { result: number[]; score: number; merged: boolean[] } {
    const filtered = line.filter((v) => v !== 0);
    const merged: boolean[] = Array(filtered.length).fill(false);
    const result: number[] = [];
    let score = 0;
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const v = filtered[i] * 2;
        result.push(v);
        score += v;
        merged[result.length - 1] = true;
        i += 2;
      } else {
        result.push(filtered[i]);
        i++;
      }
    }
    while (result.length < SIZE) result.push(0);
    return { result, score, merged };
  }

  private moveLeft() {
    let moved = false;
    let totalScore = 0;
    for (let y = 0; y < SIZE; y++) {
      const { result, score } = this.slideLine(this.grid[y]);
      if (result.join(",") !== this.grid[y].join(",")) moved = true;
      this.grid[y] = result;
      totalScore += score;
    }
    if (moved) {
      this.score += totalScore;
      this.scoreText.setText(String(this.score));
      this.spawn();
      this.draw();
    }
  }

  private moveRight() {
    let moved = false;
    let totalScore = 0;
    for (let y = 0; y < SIZE; y++) {
      const rev = [...this.grid[y]].reverse();
      const { result, score } = this.slideLine(rev);
      if (result.reverse().join(",") !== this.grid[y].join(",")) moved = true;
      this.grid[y] = result;
      totalScore += score;
    }
    if (moved) {
      this.score += totalScore;
      this.scoreText.setText(String(this.score));
      this.spawn();
      this.draw();
    }
  }

  private moveUp() {
    let moved = false;
    let totalScore = 0;
    for (let x = 0; x < SIZE; x++) {
      const col = this.grid.map((r) => r[x]);
      const { result, score } = this.slideLine(col);
      if (result.join(",") !== col.join(",")) moved = true;
      for (let y = 0; y < SIZE; y++) this.grid[y][x] = result[y];
      totalScore += score;
    }
    if (moved) {
      this.score += totalScore;
      this.scoreText.setText(String(this.score));
      this.spawn();
      this.draw();
    }
  }

  private moveDown() {
    let moved = false;
    let totalScore = 0;
    for (let x = 0; x < SIZE; x++) {
      const col = this.grid.map((r) => r[x]).reverse();
      const { result, score } = this.slideLine(col);
      const final = result.reverse();
      if (final.join(",") !== this.grid.map((r) => r[x]).join(",")) moved = true;
      for (let y = 0; y < SIZE; y++) this.grid[y][x] = final[y];
      totalScore += score;
    }
    if (moved) {
      this.score += totalScore;
      this.scoreText.setText(String(this.score));
      this.spawn();
      this.draw();
    }
  }

  private canMove(): boolean {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (this.grid[y][x] === 0) return true;
        if (x < SIZE - 1 && this.grid[y][x] === this.grid[y][x + 1]) return true;
        if (y < SIZE - 1 && this.grid[y][x] === this.grid[y + 1][x]) return true;
      }
    }
    return false;
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (this.gameOver) return;
    if (e.code === "KeyP") { return; }
    switch (e.code) {
      case "ArrowLeft": this.moveLeft(); break;
      case "ArrowRight": this.moveRight(); break;
      case "ArrowUp": this.moveUp(); break;
      case "ArrowDown": this.moveDown(); break;
    }
    if (!this.canMove()) {
      this.gameOver = true;
      this.draw();
    }
  }

  override update(_t: number, delta: number) {
    // Animate spawning tiles
    for (const t of this.animatingTiles) {
      t.scale = Math.min(1, t.scale + delta / 100);
    }
    this.animatingTiles = this.animatingTiles.filter((t) => t.scale < 1);

    // Merge particles
    for (const p of this.mergeParticles) p.life -= delta / 1000;
    this.mergeParticles = this.mergeParticles.filter((p) => p.life > 0);

    if (this.animatingTiles.length > 0 || this.mergeParticles.length > 0) this.draw();
  }

  private draw() {
    this.layout();
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(false);
    const w = this.scale.width;
    const h = this.scale.height;

    // Background
    this.bg.draw(g, w, h);

    const boardW = this.cellSize * SIZE + this.gap * (SIZE + 1);
    const boardH = this.cellSize * SIZE + this.gap * (SIZE + 1);

    // Board panel
    drawPanel(g, this.ox - 8, this.oy - 8, boardW + 16, boardH + 16, {
      borderColor: PALETTE.accent,
      borderWidth: 2,
      shadowOffset: 4,
      cornerRadius: 12,
      fillColor: PALETTE.surface,
    });

    // Board background
    g.fillStyle(0x080a14, 0.5);
    g.fillRoundedRect(this.ox, this.oy, boardW, boardH, 8);

    // Empty cell backgrounds
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const px = this.ox + this.gap + x * (this.cellSize + this.gap);
        const py = this.oy + this.gap + y * (this.cellSize + this.gap);
        g.fillStyle(PALETTE.surfaceLight, 0.3);
        g.fillRoundedRect(px, py, this.cellSize, this.cellSize, 6);
      }
    }

    // Tiles
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const v = this.grid[y][x];
        if (v === 0) continue;

        const anim = this.animatingTiles.find((t) => t.x === x && t.y === y);
        const scale = anim ? anim.scale : 1;

        const px = this.ox + this.gap + x * (this.cellSize + this.gap);
        const py = this.oy + this.gap + y * (this.cellSize + this.gap);
        const sz = this.cellSize;
        const colors = TILE_COLORS[v] || TILE_COLORS[2048];

        // Tile glow for high values
        if (v >= 128) {
          g.fillStyle(colors.bg, 0.15);
          g.fillCircle(px + sz / 2, py + sz / 2, sz * 0.7);
        }

        // Tile with 3D bevel
        const cx = px + sz / 2;
        const cy = py + sz / 2;
        const halfSz = (sz * scale) / 2;

        g.fillStyle(0x000000, 0.2);
        g.fillRoundedRect(cx - halfSz + 1, cy - halfSz + 1, sz * scale, sz * scale, 6);

        g.fillStyle(colors.bg, 1);
        g.fillRoundedRect(cx - halfSz, cy - halfSz, sz * scale, sz * scale, 6);

        // Highlight
        g.fillStyle(0xffffff, 0.15);
        g.fillRoundedRect(cx - halfSz + 2, cy - halfSz + 2, sz * scale - 4, (sz * scale) * 0.4, 5);

        // Border
        g.lineStyle(1, colors.dark, 0.5);
        g.strokeRoundedRect(cx - halfSz, cy - halfSz, sz * scale, sz * scale, 6);

        // Text
        const fontSize = v >= 1000 ? "18px" : v >= 100 ? "22px" : "26px";
        const txt = this.add.text(cx, cy, String(v), {
          fontSize, color: colors.text, fontFamily: FONTS.dseg.fontFamily, fontStyle: "bold",
          shadow: { offsetX: 0, offsetY: 0, blur: 6, color: colors.text, fill: true },
        }).setOrigin(0.5).setScale(scale);
        this.overlay.add(txt);
      }
    }

    // Merge particles
    for (const p of this.mergeParticles) {
      g.fillStyle(p.color, p.life * 0.5);
      g.fillCircle(p.x, p.y, 4 * p.life);
    }

    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    if (this.gameOver) {
      g.fillStyle(0x000000, 0.6);
      g.fillRect(this.ox, this.oy, boardW, boardH);
      g.lineStyle(2, PALETTE.cyan, 0.3);
      g.strokeRect(this.ox + 20, this.oy + 20, boardW - 40, boardH - 40);
      const cx = this.ox + boardW / 2;
      const cy = this.oy + boardH / 2;
      this.gameOverText.setPosition(cx, cy - 8).setVisible(true);
      this.restartHintText.setPosition(cx, cy + 30).setVisible(true);
    } else {
      this.gameOverText.setVisible(false);
      this.restartHintText.setVisible(false);
    }
  }

  private layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const maxW = w - 40;
    const maxH = h - 100;
    this.cellSize = Math.max(40, Math.min(Math.floor((maxW - this.gap * 5) / SIZE), Math.floor((maxH - this.gap * 5) / SIZE)));
    const boardW = this.cellSize * SIZE + this.gap * (SIZE + 1);
    const boardH = this.cellSize * SIZE + this.gap * (SIZE + 1);
    this.ox = Math.floor((w - boardW) / 2);
    this.oy = Math.floor((h - boardH) / 2) + 20;
  }
}

export const createTwenty48Game: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 700,
    height: 700,
    backgroundColor: HEX.bg,
    scene: [Twenty48Scene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
