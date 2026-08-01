import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, scorePop } from "../shared/effects";

const SIZE = 4;

class Twenty48Scene extends Phaser.Scene {
  private grid: number[][] = [];
  private score = 0;
  private gameOver = false;
  private won = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private tileSize = 80;
  private gap = 10;
  private ox = 0;
  private oy = 0;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;
  private winText!: Phaser.GameObjects.Text;

  constructor() { super("Twenty48"); }

  create() {
    this.graphics = this.add.graphics();
    this.add.text(20, 12, "SCORE", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.scoreText = this.add.text(20, 24, "0", { fontSize: "26px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } });
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Flechas/WASD: mover · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.winText = this.add.text(0, 0, "¡2048!", { fontSize: "40px", color: HEX.accentSoft, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.restartHintText);
    this.overlay.add(this.winText);
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
    this.spawn();
    this.spawn();
    this.draw();
  }

  private emptyCells(): [number, number][] {
    const e: [number, number][] = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) if (this.grid[y][x] === 0) e.push([x, y]);
    }
    return e;
  }

  private spawn() {
    const e = this.emptyCells();
    if (e.length === 0) return;
    const [x, y] = Phaser.Utils.Array.GetRandom(e);
    this.grid[y][x] = Math.random() < 0.9 ? 2 : 4;
  }

  private slideLine(line: number[]): { out: number[]; moved: boolean; gain: number } {
    const filtered = line.filter((v) => v !== 0);
    const merged: number[] = [];
    let gain = 0;
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        merged.push(filtered[i] * 2);
        gain += filtered[i] * 2;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }
    while (merged.length < SIZE) merged.push(0);
    const moved = merged.some((v, idx) => v !== line[idx]);
    return { out: merged, moved, gain };
  }

  private move(dx: number, dy: number): boolean {
    let moved = false;
    let gain = 0;
    if (dx !== 0) {
      for (let y = 0; y < SIZE; y++) {
        const line: number[] = [];
        if (dx > 0) for (let x = SIZE - 1; x >= 0; x--) line.push(this.grid[y][x]);
        else for (let x = 0; x < SIZE; x++) line.push(this.grid[y][x]);
        const r = this.slideLine(line);
        gain += r.gain;
        if (dx > 0) for (let x = 0; x < SIZE; x++) { const nv = r.out[SIZE - 1 - x]; if (this.grid[y][x] !== nv) moved = true; this.grid[y][x] = nv; }
        else for (let x = 0; x < SIZE; x++) { const nv = r.out[x]; if (this.grid[y][x] !== nv) moved = true; this.grid[y][x] = nv; }
      }
    } else {
      for (let x = 0; x < SIZE; x++) {
        const line: number[] = [];
        if (dy > 0) for (let y = SIZE - 1; y >= 0; y--) line.push(this.grid[y][x]);
        else for (let y = 0; y < SIZE; y++) line.push(this.grid[y][x]);
        const r = this.slideLine(line);
        gain += r.gain;
        if (dy > 0) for (let y = 0; y < SIZE; y++) { const nv = r.out[SIZE - 1 - y]; if (this.grid[y][x] !== nv) moved = true; this.grid[y][x] = nv; }
        else for (let y = 0; y < SIZE; y++) { const nv = r.out[y]; if (this.grid[y][x] !== nv) moved = true; this.grid[y][x] = nv; }
      }
    }
    this.score += gain;
    return moved;
  }

  private darkTileColor(v: number): number {
    const colors: Record<number, number> = {
      2: 0x1e213a, 4: 0x25294a, 8: 0x312e81, 16: 0x3730a3, 32: 0x4338ca,
      64: 0x4f46e5, 128: 0x06b6d4, 256: 0x0891b2, 512: 0x0e7490, 1024: 0x6366f1, 2048: 0x8b5cf6,
    };
    return colors[v] ?? PALETTE.surfaceLight;
  }

  private canMove(): boolean {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (this.grid[y][x] === 0) return true;
        if (x + 1 < SIZE && this.grid[y][x] === this.grid[y][x + 1]) return true;
        if (y + 1 < SIZE && this.grid[y][x] === this.grid[y + 1][x]) return true;
      }
    }
    return false;
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (this.gameOver) return;
    let moved = false;
    switch (e.code) {
      case "ArrowUp": case "KeyW": moved = this.move(0, -1); break;
      case "ArrowDown": case "KeyS": moved = this.move(0, 1); break;
      case "ArrowLeft": case "KeyA": moved = this.move(-1, 0); break;
      case "ArrowRight": case "KeyD": moved = this.move(1, 0); break;
    }
    if (moved) {
      this.spawn();
      if (!this.won && this.grid.flat().includes(2048)) this.won = true;
      if (!this.canMove()) this.gameOver = true;
      this.scoreText.setText(String(this.score));
      this.draw();
    }
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(false);
    const w = this.scale.width;
    const h = this.scale.height;
    const maxBoard = Math.min(w, h - 80) - 40;
    this.tileSize = Math.max(40, (maxBoard - (SIZE + 1) * 10) / SIZE);
    this.gap = Math.max(6, this.tileSize * 0.12);
    const boardSize = SIZE * this.tileSize + (SIZE + 1) * this.gap;
    this.ox = Math.floor((w - boardSize) / 2);
    this.oy = Math.max(70, Math.floor((h - boardSize) / 2));

    g.fillStyle(PALETTE.bg, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(PALETTE.surface, 1);
    g.fillRoundedRect(this.ox, this.oy, boardSize, boardSize, 12);
    g.lineStyle(2, PALETTE.accent, 0.5);
    g.strokeRoundedRect(this.ox, this.oy, boardSize, boardSize, 12);

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const v = this.grid[y][x];
        const px = this.ox + this.gap + x * (this.tileSize + this.gap);
        const py = this.oy + this.gap + y * (this.tileSize + this.gap);
        const tileColor = this.darkTileColor(v);
        g.fillStyle(tileColor, 1);
        g.fillRoundedRect(px, py, this.tileSize, this.tileSize, 8);
        g.lineStyle(1, v >= 128 ? PALETTE.cyan : PALETTE.border, v >= 128 ? 0.6 : 0.4);
        g.strokeRoundedRect(px, py, this.tileSize, this.tileSize, 8);
        if (v >= 8) {
          g.fillStyle(PALETTE.cyan, 0.12);
          g.fillRoundedRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8, 6);
        }
        if (v > 0) {
          const fontSize = Math.max(12, this.tileSize * 0.4);
          const txt = this.add.text(px + this.tileSize / 2, py + this.tileSize / 2, String(v), {
            fontSize: `${fontSize}px`, color: v <= 4 ? "#94a3b8" : "#e2e8f0", fontStyle: v >= 8 ? "italic" : "bold", fontFamily: v >= 8 ? FONTS.dseg.fontFamily : FONTS.ui.fontFamily,
            shadow: v >= 8 ? { offsetX: 0, offsetY: 0, blur: 8, color: HEX.cyan, fill: true } : undefined,
          }).setOrigin(0.5);
          this.overlay.add(txt);
        }
      }
    }

    // instructions at bottom
    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    if (this.gameOver) {
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(this.ox, this.oy, boardSize, boardSize, 12);
    const cx = this.ox + boardSize / 2;
    const cy = this.oy + boardSize / 2;
      this.gameOverText.setPosition(cx, cy - 8).setVisible(true);
      this.restartHintText.setPosition(cx, cy + 34).setVisible(true);
      this.winText.setVisible(false);
    } else if (this.won) {
      const cx = this.ox + boardSize / 2;
      const cy = this.oy + boardSize / 2;
      this.winText.setPosition(cx, cy).setVisible(true);
      this.gameOverText.setVisible(false);
      this.restartHintText.setVisible(false);
    } else {
      this.gameOverText.setVisible(false);
      this.restartHintText.setVisible(false);
      this.winText.setVisible(false);
    }
  }
}

export const createTwenty48Game: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 500,
    height: 600,
    backgroundColor: HEX.bg,
    scene: [Twenty48Scene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
