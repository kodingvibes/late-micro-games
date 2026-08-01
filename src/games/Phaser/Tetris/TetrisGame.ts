import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, screenShake, scorePop } from "../shared/effects";
import {
  GradientBackground, drawSpriteBox, drawPanel, drawTileGrid,
} from "../shared/backgrounds";

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const SHAPES: number[][][] = [
  [[1, 1], [1, 1]],
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
];
const COLORS = [PALETTE.yellow, PALETTE.cyan, PALETTE.violet, PALETTE.orange, PALETTE.accent, PALETTE.green, PALETTE.red];
const DARK_COLORS = [0x854d0e, 0x0891b2, 0x5b21b6, 0x9a3412, 0x3730a3, 0x166534, 0x991b1b];

class TetrisScene extends Phaser.Scene {
  private board: number[][] = [];
  private current!: { shape: number[][]; color: number; darkColor: number; x: number; y: number };
  private score = 0;
  private lines = 0;
  private gameOver = false;
  private paused = false;
  private dropTimer = 0;
  private dropDelay = 0.6;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;
  private nextLabelText!: Phaser.GameObjects.Text;
  private bg!: GradientBackground;
  private ox = 0;
  private oy = 0;
  private flashLines: number[] = [];
  private flashTimer = 0;

  constructor() { super("Tetris"); }

  create() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    this.graphics = this.add.graphics();
    this.bg = new GradientBackground(this, {
      layers: [
        { speed: 0.01, colors: [0x05070e, 0x0b0d17, 0x0f1220], height: 1 },
      ],
      scanlines: true,
      vignette: true,
    });

    this.add.text(20, 12, "SCORE", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0, 0);
    this.scoreText = this.add.text(20, 26, "0", {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    }).setOrigin(0, 0);
    this.add.text(140, 12, "LINES", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0, 0);
    this.linesText = this.add.text(140, 26, "0", {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    }).setOrigin(0, 0);
    this.statusText = this.add.text(this.scale.width - 20, 14, "", {
      fontSize: "18px", color: HEX.accentSoft, fontFamily: FONTS.ui.fontFamily, fontStyle: "bold",
    }).setOrigin(1, 0);
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Flechas: mover · ↑/X: rotar · ↓: bajar · Espacio: caída · P: pausa · R: reiniciar", {
      fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily,
    }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.nextLabelText = this.add.text(0, 0, "PRÓXIMA", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5, 1).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.restartHintText);

    this.spawnPiece();
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.draw();
    fadeInScene(this, 300);
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.scale.off("resize", this.draw, this);
  }

  private spawnPiece() {
    const i = Phaser.Math.Between(0, SHAPES.length - 1);
    this.current = { shape: SHAPES[i], color: COLORS[i], darkColor: DARK_COLORS[i], x: Math.floor(COLS / 2) - 2, y: 0 };
    if (!this.valid(this.current.shape, this.current.x, this.current.y)) this.gameOver = true;
  }

  private valid(shape: number[][], ox: number, oy: number): boolean {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const nx = ox + x, ny = oy + y;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && this.board[ny][nx] !== -1) return false;
      }
    }
    return true;
  }

  private lock() {
    for (let y = 0; y < this.current.shape.length; y++) {
      for (let x = 0; x < this.current.shape[y].length; x++) {
        if (!this.current.shape[y][x]) continue;
        const nx = this.current.x + x, ny = this.current.y + y;
        if (ny >= 0 && ny < ROWS) this.board[ny][nx] = this.current.color;
      }
    }
    this.clearLines();
    this.spawnPiece();
  }

  private clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (this.board[y].every((c) => c !== -1)) {
        this.flashLines.push(y);
        this.board.splice(y, 1);
        this.board.unshift(Array(COLS).fill(-1));
        cleared++;
        y++;
      }
    }
    if (cleared > 0) {
      this.lines += cleared;
      this.score += cleared * 100 * cleared;
      this.dropDelay = Math.max(0.1, 0.6 - this.lines * 0.02);
      this.scoreText.setText(String(this.score));
      this.linesText.setText(String(this.lines));
      screenShake(this, 0.003, 150);
      const cx = Math.floor((this.scale.width - COLS * CELL) / 2) + (COLS * CELL) / 2;
      const cy = Math.max(70, Math.floor((this.scale.height - ROWS * CELL) / 2)) + (ROWS * CELL) / 2;
      scorePop(this, cx, cy, `+${cleared * 100 * cleared}`);
      this.flashTimer = 0.3;
    }
  }

  private rotate() {
    const n = this.current.shape.length;
    const r: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) r[x][n - 1 - y] = this.current.shape[y][x];
    }
    const kicks = [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of kicks) {
      if (this.valid(r, this.current.x + dx!, this.current.y + dy!)) {
        this.current.shape = r;
        this.current.x += dx!;
        this.current.y += dy!;
        return;
      }
    }
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (this.gameOver) return;
    if (e.code === "KeyP") { this.paused = !this.paused; this.statusText.setText(this.paused ? "PAUSA" : ""); return; }
    if (this.paused) return;
    switch (e.code) {
      case "ArrowLeft": if (this.valid(this.current.shape, this.current.x - 1, this.current.y)) this.current.x--; break;
      case "ArrowRight": if (this.valid(this.current.shape, this.current.x + 1, this.current.y)) this.current.x++; break;
      case "ArrowUp": case "KeyX": this.rotate(); break;
      case "ArrowDown": if (this.valid(this.current.shape, this.current.x, this.current.y + 1)) { this.current.y++; this.score += 1; } break;
      case "Space": while (this.valid(this.current.shape, this.current.x, this.current.y + 1)) { this.current.y++; this.score += 2; } this.lock(); break;
    }
    this.scoreText.setText(String(this.score));
    this.linesText.setText(String(this.lines));
    this.draw();
  }

  override update(_time: number, delta: number) {
    if (this.gameOver || this.paused) return;
    this.dropTimer += delta / 1000;
    if (this.dropTimer >= this.dropDelay) {
      this.dropTimer = 0;
      if (this.valid(this.current.shape, this.current.x, this.current.y + 1)) this.current.y++;
      else this.lock();
      this.draw();
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= delta / 1000;
      this.draw();
    }
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(false);
    const w = this.scale.width;
    const h = this.scale.height;

    // Background
    this.bg.draw(g, w, h);

    const boardW = COLS * CELL;
    const boardH = ROWS * CELL;
    this.ox = Math.floor((w - boardW) / 2);
    this.oy = Math.max(70, Math.floor((h - boardH) / 2));

    // Board panel
    drawPanel(g, this.ox - 8, this.oy - 8, boardW + 16, boardH + 16, {
      borderColor: PALETTE.accent,
      borderWidth: 2,
      shadowOffset: 4,
      cornerRadius: 10,
      fillColor: PALETTE.surface,
    });

    // Board background
    g.fillStyle(0x080a14, 0.5);
    g.fillRect(this.ox, this.oy, boardW, boardH);

    // Grid lines
    drawTileGrid(g, this.ox, this.oy, boardW, boardH, CELL, CELL, PALETTE.accent, 0.08);

    // Draw locked cells with 3D bevel
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.board[y][x] !== -1) {
          const isFlashing = this.flashTimer > 0 && this.flashLines.includes(y);
          if (isFlashing && Math.floor(this.flashTimer * 10) % 2 === 0) {
            g.fillStyle(0xffffff, 0.8);
            g.fillRect(this.ox + x * CELL, this.oy + y * CELL, CELL, CELL);
          } else {
            this.drawCell(g, this.ox, this.oy, x, y, this.board[y][x]);
          }
        }
      }
    }

    // Draw current piece with 3D bevel
    if (this.current && !this.gameOver) {
      for (let y = 0; y < this.current.shape.length; y++) {
        for (let x = 0; x < this.current.shape[y].length; x++) {
          if (!this.current.shape[y][x]) continue;
          this.drawCell(g, this.ox, this.oy, this.current.x + x, this.current.y + y, this.current.color);
        }
      }
    }

    // Ghost piece (shadow)
    if (this.current && !this.gameOver) {
      let gy = this.current.y;
      while (this.valid(this.current.shape, this.current.x, gy + 1)) gy++;
      if (gy !== this.current.y) {
        for (let y = 0; y < this.current.shape.length; y++) {
          for (let x = 0; x < this.current.shape[y].length; x++) {
            if (!this.current.shape[y][x]) continue;
            const px = this.ox + (this.current.x + x) * CELL + 1;
            const py = this.oy + (gy + y) * CELL + 1;
            g.lineStyle(1, this.current.color, 0.3);
            g.strokeRoundedRect(px, py, CELL - 2, CELL - 2, 4);
          }
        }
      }
    }

    // Next piece preview
    const nextSize = CELL * 5;
    const nextX = this.ox + boardW + 24;
    const nextY = this.oy + 24;
    drawPanel(g, nextX, nextY, nextSize, nextSize, {
      borderColor: PALETTE.border,
      borderWidth: 1,
      shadowOffset: 3,
      cornerRadius: 8,
      fillColor: PALETTE.surface,
    });
    this.nextLabelText.setPosition(nextX + nextSize / 2, nextY - 14).setVisible(true);

    const nextPiece = this.current ? this.current.shape : SHAPES[0];
    const pcw = nextPiece[0].length * CELL;
    const pch = nextPiece.length * CELL;
    const pcx = nextX + (nextSize - pcw) / 2;
    const pcy = nextY + (nextSize - pch) / 2;
    for (let y = 0; y < nextPiece.length; y++) {
      for (let x = 0; x < nextPiece[y].length; x++) {
        if (!nextPiece[y][x]) continue;
        this.drawCell(g, pcx, pcy, x, y, this.current?.color ?? PALETTE.cyan);
      }
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

  private drawCell(g: Phaser.GameObjects.Graphics, ox: number, oy: number, x: number, y: number, color: number) {
    const px = ox + x * CELL + 1;
    const py = oy + y * CELL + 1;
    const sz = CELL - 2;

    // Find dark color for this piece
    const idx = COLORS.indexOf(color);
    const darkColor = idx >= 0 ? DARK_COLORS[idx] : 0x1e213a;

    // 3D bevel: shadow bottom-right
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(px + 1, py + 1, sz, sz, 4);

    // Main fill
    g.fillStyle(color, 1);
    g.fillRoundedRect(px, py, sz, sz, 4);

    // Top-left highlight
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(px + 1, py + 1, sz - 2, sz * 0.4, 3);

    // Bottom-right dark edge
    g.fillStyle(darkColor, 0.3);
    g.fillRoundedRect(px + sz * 0.5, py + sz * 0.6, sz * 0.5, sz * 0.4, 2);

    // Outline
    g.lineStyle(1, darkColor, 0.6);
    g.strokeRoundedRect(px, py, sz, sz, 4);
  }
}

export const createTetrisGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 700,
    height: 800,
    backgroundColor: HEX.bg,
    scene: [TetrisScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
