import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";

const SIZE = 4;
const TILE_COLORS: Record<number, number> = {
  0: 0xcdc1b4, 2: 0xeee4da, 4: 0xede0c8, 8: 0xf2b179,
  16: 0xf59563, 32: 0xf67c5f, 64: 0xf65e3b, 128: 0xedcf72,
  256: 0xedcc61, 512: 0xedc850, 1024: 0xedc53f, 2048: 0xedc22e,
};

class Twenty48Scene extends Phaser.Scene {
  private grid: number[][] = [];
  private score = 0;
  private gameOver = false;
  private won = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private tileSize = 80;
  private gap = 10;
  private ox = 0;
  private oy = 0;

  constructor() {
    super("Twenty48");
  }

  create() {
    this.graphics = this.add.graphics();
    this.scoreText = this.add.text(10, 10, "Score: 0", { fontSize: "20px", color: "#776e65" });
    this.add.text(10, 38, "Flechas/WASD: mover · R: reiniciar", { fontSize: "12px", color: "#776e65" });
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", () => this.draw(), this);
    this.reset();
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
        if (dx > 0) {
          for (let x = SIZE - 1; x >= 0; x--) line.push(this.grid[y][x]);
        } else {
          for (let x = 0; x < SIZE; x++) line.push(this.grid[y][x]);
        }
        const r = this.slideLine(line);
        gain += r.gain;
        if (dx > 0) {
          for (let x = 0; x < SIZE; x++) {
            const nv = r.out[SIZE - 1 - x];
            if (this.grid[y][x] !== nv) moved = true;
            this.grid[y][x] = nv;
          }
        } else {
          for (let x = 0; x < SIZE; x++) {
            const nv = r.out[x];
            if (this.grid[y][x] !== nv) moved = true;
            this.grid[y][x] = nv;
          }
        }
      }
    } else {
      for (let x = 0; x < SIZE; x++) {
        const line: number[] = [];
        if (dy > 0) {
          for (let y = SIZE - 1; y >= 0; y--) line.push(this.grid[y][x]);
        } else {
          for (let y = 0; y < SIZE; y++) line.push(this.grid[y][x]);
        }
        const r = this.slideLine(line);
        gain += r.gain;
        if (dy > 0) {
          for (let y = 0; y < SIZE; y++) {
            const nv = r.out[SIZE - 1 - y];
            if (this.grid[y][x] !== nv) moved = true;
            this.grid[y][x] = nv;
          }
        } else {
          for (let y = 0; y < SIZE; y++) {
            const nv = r.out[y];
            if (this.grid[y][x] !== nv) moved = true;
            this.grid[y][x] = nv;
          }
        }
      }
    }
    this.score += gain;
    return moved;
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
    if (e.code === "KeyR") {
      this.scene.restart();
      return;
    }
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
      this.scoreText.setText(`Score: ${this.score}`);
      this.draw();
    }
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    const w = this.scale.width;
    const h = this.scale.height;
    const maxBoard = Math.min(w, h - 80) - 40;
    this.tileSize = Math.max(40, (maxBoard - (SIZE + 1) * 10) / SIZE);
    this.gap = Math.max(6, this.tileSize * 0.12);
    const boardSize = SIZE * this.tileSize + (SIZE + 1) * this.gap;
    this.ox = Math.floor((w - boardSize) / 2);
    this.oy = 70;

    g.fillStyle(0xfaf8ef, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0xbbada0, 1);
    g.fillRect(this.ox, this.oy, boardSize, boardSize);

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const v = this.grid[y][x];
        const px = this.ox + this.gap + x * (this.tileSize + this.gap);
        const py = this.oy + this.gap + y * (this.tileSize + this.gap);
        g.fillStyle(TILE_COLORS[v] ?? 0x3c3a32, 1);
        g.fillRect(px, py, this.tileSize, this.tileSize);
        if (v > 0) {
          const fontSize = Math.max(12, this.tileSize * 0.4);
          const color = v <= 4 ? "#776e65" : "#fff";
          this.add.text(px + this.tileSize / 2, py + this.tileSize / 2, String(v), {
            fontSize: `${fontSize}px`,
            color,
            fontStyle: "bold",
          }).setOrigin(0.5);
        }
      }
    }
  }
}

export const createTwenty48Game: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 500,
    height: 600,
    backgroundColor: "#faf8ef",
    scene: [Twenty48Scene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};