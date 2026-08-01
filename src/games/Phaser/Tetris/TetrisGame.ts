import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";

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

class TetrisScene extends Phaser.Scene {
  private board: number[][] = [];
  private current!: { shape: number[][]; color: number; x: number; y: number };
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

  constructor() { super("Tetris"); }

  create() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    this.graphics = this.add.graphics();

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

    this.spawnPiece();
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', () => {
      this.input.keyboard?.off("keydown", this.handleKey, this);
      this.scale.off("resize", this.draw, this);
    });
    this.draw();
  }

  private spawnPiece() {
    const i = Phaser.Math.Between(0, SHAPES.length - 1);
    this.current = { shape: SHAPES[i], color: COLORS[i], x: Math.floor(COLS / 2) - 2, y: 0 };
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
    if (e.code === "KeyP") {
      this.paused = !this.paused;
      this.statusText.setText(this.paused ? "PAUSA" : "");
      return;
    }
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
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(true);
    const w = this.scale.width;
    const h = this.scale.height;
    const boardW = COLS * CELL;
    const boardH = ROWS * CELL;
    const ox = Math.floor((w - boardW) / 2);
    const oy = Math.max(70, Math.floor((h - boardH) / 2));

    g.fillStyle(PALETTE.surface, 1);
    g.fillRect(ox, oy, boardW, boardH);

    // grid
    g.lineStyle(1, PALETTE.border, 1);
    for (let x = 0; x <= COLS; x++) g.lineBetween(ox + x * CELL, oy, ox + x * CELL, oy + boardH);
    for (let y = 0; y <= ROWS; y++) g.lineBetween(ox, oy + y * CELL, ox + boardW, oy + y * CELL);

    // locked cells
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.board[y][x] !== -1) this.drawCell(g, ox, oy, x, y, this.board[y][x]);
      }
    }
    // current piece
    if (this.current && !this.gameOver) {
      for (let y = 0; y < this.current.shape.length; y++) {
        for (let x = 0; x < this.current.shape[y].length; x++) {
          if (!this.current.shape[y][x]) continue;
          this.drawCell(g, ox, oy, this.current.x + x, this.current.y + y, this.current.color);
        }
      }
    }

    // next box
    // next box
    const nextSize = CELL * 5;
    const nextX = ox + boardW + 24;
    const nextY = oy + 24;
    g.fillStyle(PALETTE.surface, 1);
    g.fillRoundedRect(nextX, nextY, nextSize, nextSize, 10);
    g.lineStyle(1, PALETTE.border, 1);
    g.strokeRoundedRect(nextX, nextY, nextSize, nextSize, 10);
    const nextText = this.add.text(nextX + nextSize / 2, nextY - 14, "PRÓXIMA", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5, 1);
    this.overlay.add(nextText);

    // render next piece centered in box
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

    // instructions at bottom
    this.add.text(20, h - 26, "Flechas: mover · ↑/X: rotar · ↓: bajar · Espacio: caída · P: pausa · R: reiniciar", {
      fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily,
    }).setOrigin(0, 0);

    if (this.gameOver) {
      const cx = ox + boardW / 2;
      const cy = oy + boardH / 2;
      g.fillStyle(0x000000, 0.6);
      g.fillRect(ox, oy, boardW, boardH);
      const over = this.add.text(cx, cy - 8, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5);
      const hint = this.add.text(cx, cy + 30, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5);
      this.overlay.add(over);
      this.overlay.add(hint);
    }
  }

  private drawCell(g: Phaser.GameObjects.Graphics, ox: number, oy: number, x: number, y: number, color: number) {
    const px = ox + x * CELL + 1;
    const py = oy + y * CELL + 1;
    g.fillStyle(color, 0.35);
    g.fillRoundedRect(px - 4, py - 4, CELL + 8, CELL + 8, 5);
    g.fillStyle(color, 1);
    g.fillRoundedRect(px, py, CELL - 2, CELL - 2, 4);
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(px + CELL * 0.25, py + CELL * 0.25, 3);
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
