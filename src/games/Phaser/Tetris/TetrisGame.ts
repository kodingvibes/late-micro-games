import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const SHAPES: number[][][] = [
  [[1, 1], [1, 1]],                          // O
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[0, 1, 0], [1, 1, 1], [0, 0, 0]],         // T
  [[0, 0, 1], [1, 1, 1], [0, 0, 0]],         // L
  [[1, 0, 0], [1, 1, 1], [0, 0, 0]],         // J
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]],         // S
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]],         // Z
];
const COLORS = [0xf5d000, 0x00e0e0, 0xa000f0, 0xf0a000, 0x0060e0, 0x00e000, 0xe02020];

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
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super("Tetris");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));

    this.graphics = this.add.graphics();
    this.scoreText = this.add.text(10, 10, "Score: 0   Lines: 0", { fontSize: "18px", color: "#fff" });
    this.add.text(10, 34, "Flechas: mover · ↑/X: rotar · ↓: bajar · Espacio: caída · P: pausa · R: reiniciar", { fontSize: "12px", color: "#aaa" });
    this.statusText = this.add.text(w - 10, 10, "", { fontSize: "16px", color: "#ff0" }).setOrigin(1, 0);

    this.spawnPiece();
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", this.draw, this);
    this.draw();
  }

  private spawnPiece() {
    const i = Phaser.Math.Between(0, SHAPES.length - 1);
    this.current = { shape: SHAPES[i], color: COLORS[i], x: Math.floor(COLS / 2) - 2, y: 0 };
    if (!this.valid(this.current.shape, this.current.x, this.current.y)) {
      this.gameOver = true;
    }
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
      this.scoreText.setText(`Score: ${this.score}   Lines: ${this.lines}`);
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
    if (e.code === "KeyR") {
      this.scene.restart();
      return;
    }
    if (this.gameOver) return;
    if (e.code === "KeyP") {
      this.paused = !this.paused;
      this.statusText.setText(this.paused ? "PAUSA" : "");
      return;
    }
    if (this.paused) return;
    switch (e.code) {
      case "ArrowLeft":
        if (this.valid(this.current.shape, this.current.x - 1, this.current.y)) this.current.x--;
        break;
      case "ArrowRight":
        if (this.valid(this.current.shape, this.current.x + 1, this.current.y)) this.current.x++;
        break;
      case "ArrowUp":
      case "KeyX":
        this.rotate();
        break;
      case "ArrowDown":
        if (this.valid(this.current.shape, this.current.x, this.current.y + 1)) {
          this.current.y++;
          this.score += 1;
        }
        break;
      case "Space":
        while (this.valid(this.current.shape, this.current.x, this.current.y + 1)) {
          this.current.y++;
          this.score += 2;
        }
        this.lock();
        break;
    }
    this.scoreText.setText(`Score: ${this.score}   Lines: ${this.lines}`);
    this.draw();
  }

  override update(_time: number, delta: number) {
    if (this.gameOver || this.paused) return;
    this.dropTimer += delta / 1000;
    if (this.dropTimer >= this.dropDelay) {
      this.dropTimer = 0;
      if (this.valid(this.current.shape, this.current.x, this.current.y + 1)) {
        this.current.y++;
      } else {
        this.lock();
      }
      this.draw();
    }
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    const w = this.scale.width;
    const h = this.scale.height;
    const boardW = COLS * CELL;
    const boardH = ROWS * CELL;
    const ox = Math.floor((w - boardW) / 2);
    const oy = Math.max(60, Math.floor((h - boardH) / 2));

    g.fillStyle(0x000000, 1);
    g.fillRect(ox, oy, boardW, boardH);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.board[y][x] !== -1) {
          g.fillStyle(this.board[y][x], 1);
          g.fillRect(ox + x * CELL + 1, oy + y * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
    if (this.current && !this.gameOver) {
      g.fillStyle(this.current.color, 1);
      for (let y = 0; y < this.current.shape.length; y++) {
        for (let x = 0; x < this.current.shape[y].length; x++) {
          if (!this.current.shape[y][x]) continue;
          g.fillRect(ox + (this.current.x + x) * CELL + 1, oy + (this.current.y + y) * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    if (this.gameOver) {
      const cx = ox + boardW / 2;
      const cy = oy + boardH / 2;
      this.add.text(cx, cy - 10, "GAME OVER", { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
      this.add.text(cx, cy + 30, "R para reiniciar", { fontSize: "16px", color: "#bbb" }).setOrigin(0.5);
    }
  }
}

export const createTetrisGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 600,
    height: 700,
    backgroundColor: "#1a1a22",
    scene: [TetrisScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};