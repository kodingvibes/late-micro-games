import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";

const COLS = 10;
const ROWS = 10;
const MINES = 15;

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

class MinesweeperScene extends Phaser.Scene {
  private cells: Cell[][] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private firstClick = true;
  private revealed = 0;
  private cellSize = 32;
  private ox = 0;
  private oy = 80;

  constructor() {
    super("Minesweeper");
  }

  create() {
    this.cells = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
    );
    this.graphics = this.add.graphics();
    this.statusText = this.add.text(10, 10, "Buscaminas — Minas: 15 · Banderas: 0", { fontSize: "18px", color: "#fff" });
    this.add.text(10, 38, "Click izq: revelar · Click der: bandera · R: reiniciar", { fontSize: "12px", color: "#bbb" });
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => { if (e.code === "KeyR") this.scene.restart(); });
    this.input.on("pointerdown", this.handleClick, this);
    this.scale.on("resize", () => this.draw(), this);
    this.draw();
  }

  private layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const maxBoard = Math.min(w, h - 100) - 40;
    this.cellSize = Math.max(20, maxBoard / Math.max(COLS, ROWS));
    const boardW = this.cellSize * COLS;
    const boardH = this.cellSize * ROWS;
    this.ox = Math.floor((w - boardW) / 2);
    this.oy = 80 + Math.floor((h - 80 - boardH) / 2);
  }

  private placeMines(ex: number, ey: number) {
    const positions: [number, number][] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (x !== ex || y !== ey) positions.push([x, y]);
      }
    }
    Phaser.Utils.Array.Shuffle(positions);
    for (let i = 0; i < MINES; i++) {
      const [x, y] = positions[i];
      this.cells[y][x].mine = true;
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.cells[ny][nx].mine) count++;
          }
        }
        this.cells[y][x].adjacent = count;
      }
    }
  }

  private reveal(x: number, y: number) {
    const c = this.cells[y][x];
    if (c.revealed || c.flagged) return;
    c.revealed = true;
    this.revealed++;
    if (c.mine) {
      this.gameOver = true;
      this.statusText.setText("¡Boom! Perdiste 💥");
      this.statusText.setColor("#f55");
      return;
    }
    if (c.adjacent === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) this.reveal(nx, ny);
        }
      }
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    if (this.gameOver) return;
    this.layout();
    const mx = Math.floor((pointer.x - this.ox) / this.cellSize);
    const my = Math.floor((pointer.y - this.oy) / this.cellSize);
    if (mx < 0 || mx >= COLS || my < 0 || my >= ROWS) return;

    if (this.firstClick) {
      this.firstClick = false;
      this.placeMines(mx, my);
    }

    if (pointer.rightButtonDown() || (pointer.event && (pointer.event as MouseEvent).button === 2)) {
      const c = this.cells[my][mx];
      if (!c.revealed) c.flagged = !c.flagged;
    } else {
      this.reveal(mx, my);
    }

    if (this.revealed === COLS * ROWS - MINES) {
      this.gameOver = true;
      this.statusText.setText("¡Ganaste! 🎉");
      this.statusText.setColor("#5f5");
    } else if (!this.gameOver) {
      const flagged = this.cells.flat().filter((c) => c.flagged).length;
      this.statusText.setText(`Buscaminas — Minas: ${MINES} · Banderas: ${flagged}`);
    }
    this.draw();
  }

  private draw() {
    this.layout();
    const g = this.graphics;
    g.clear();
    const w = this.scale.width;
    g.fillStyle(0x2c3e50, 1);
    g.fillRect(0, 0, w, this.scale.height);
    const boardW = this.cellSize * COLS;
    const boardH = this.cellSize * ROWS;
    g.fillStyle(0x34495e, 1);
    g.fillRect(this.ox, this.oy, boardW, boardH);

    const fs = Math.max(10, this.cellSize * 0.55);
    const numColors = ["", "#3498db", "#27ae60", "#e74c3c", "#8e44ad", "#d35400", "#16a085", "#000", "#666"];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.cells[y][x];
        const px = this.ox + x * this.cellSize + 1;
        const py = this.oy + y * this.cellSize + 1;
        const sz = this.cellSize - 2;
        if (c.revealed) {
          g.fillStyle(c.mine ? 0xe74c3c : 0x7f8c8d, 1);
          g.fillRect(px, py, sz, sz);
          if (c.mine) {
            this.add.text(px + sz / 2, py + sz / 2, "💣", { fontSize: `${fs}px` }).setOrigin(0.5);
          } else if (c.adjacent > 0) {
            this.add.text(px + sz / 2, py + sz / 2, String(c.adjacent), {
              fontSize: `${fs}px`, color: numColors[c.adjacent], fontStyle: "bold",
            }).setOrigin(0.5);
          }
        } else {
          g.fillStyle(0x95a5a6, 1);
          g.fillRect(px, py, sz, sz);
          if (c.flagged) {
            this.add.text(px + sz / 2, py + sz / 2, "⚑", { fontSize: `${fs}px`, color: "#e74c3c" }).setOrigin(0.5);
          }
        }
      }
    }
  }
}

export const createMinesweeperGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 500,
    height: 600,
    backgroundColor: "#2c3e50",
    scene: [MinesweeperScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};