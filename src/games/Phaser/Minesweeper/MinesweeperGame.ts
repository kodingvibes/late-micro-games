import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";

const COLS = 10;
const ROWS = 10;
const MINES = 15;

interface Cell { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number; }

class MinesweeperScene extends Phaser.Scene {
  private cells: Cell[][] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private gameOver = false;
  private firstClick = true;
  private revealed = 0;
  private cellSize = 32;
  private ox = 0;
  private oy = 80;
  private instructionsText!: Phaser.GameObjects.Text;

  constructor() { super("Minesweeper"); }

  create() {
    this.cells = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
    );
    this.graphics = this.add.graphics();
    this.add.text(20, 12, "MINAS", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.statusText = this.add.text(20, 24, "15", { fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } });
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Click izq: revelar · Click der: bandera · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.input.on("pointerdown", this.handleClick, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.draw();
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.input.off("pointerdown", this.handleClick, this);
    this.scale.off("resize", this.draw, this);
  }

  private layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const maxBoard = Math.min(w, h - 100) - 40;
    this.cellSize = Math.max(24, maxBoard / Math.max(COLS, ROWS));
    const boardW = this.cellSize * COLS;
    const boardH = this.cellSize * ROWS;
    this.ox = Math.floor((w - boardW) / 2);
    this.oy = Math.max(70, 80 + Math.floor((h - 80 - boardH) / 2));
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
            this.statusText.setText("BOOM");
            this.statusText.setColor(HEX.red);
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
      this.statusText.setText("WIN");
      this.statusText.setColor(HEX.cyan);
    } else if (!this.gameOver) {
      const flagged = this.cells.flat().filter((c) => c.flagged).length;
      this.statusText.setText(String(MINES - flagged));
      this.statusText.setColor(HEX.cyan);
    }
    this.draw();
  }

  private draw() {
    this.layout();
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(true);
    const w = this.scale.width;
    const h = this.scale.height;
    g.fillStyle(PALETTE.bg, 1);
    g.fillRect(0, 0, w, h);
    const boardW = this.cellSize * COLS;
    const boardH = this.cellSize * ROWS;

    // instructions at bottom
    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    g.fillStyle(PALETTE.surface, 1);
    g.fillRoundedRect(this.ox - 8, this.oy - 8, boardW + 16, boardH + 16, 14);

    const fs = Math.max(14, this.cellSize * 0.55);
    const numColors = ["", HEX.accentSoft, HEX.green, HEX.red, HEX.violet, HEX.orange, HEX.cyan, "#f8fafc", "#94a3b8"];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.cells[y][x];
        const px = this.ox + x * this.cellSize + 1;
        const py = this.oy + y * this.cellSize + 1;
        const sz = this.cellSize - 2;
        const r = Math.max(3, sz * 0.15);
        if (c.revealed) {
          g.fillStyle(c.mine ? PALETTE.red : PALETTE.surfaceLight, 1);
          g.fillRoundedRect(px, py, sz, sz, r);
          if (c.mine) {
            this.addMine(px + sz / 2, py + sz / 2, sz * 0.4);
          } else if (c.adjacent > 0) {
            const txt = this.add.text(px + sz / 2, py + sz / 2, String(c.adjacent), {
              fontSize: `${fs}px`, color: numColors[c.adjacent], fontStyle: "italic", fontFamily: FONTS.dsegMini.fontFamily,
              shadow: { offsetX: 0, offsetY: 0, blur: 8, color: numColors[c.adjacent], fill: true },
            }).setOrigin(0.5);
            this.overlay.add(txt);
          }
        } else {
          g.fillStyle(PALETTE.surfaceLight, 1);
          g.fillRoundedRect(px, py, sz, sz, r);
          g.lineStyle(1, PALETTE.border, 1);
          g.strokeRoundedRect(px, py, sz, sz, r);
          g.fillStyle(0xffffff, 0.06);
          g.fillRoundedRect(px + 2, py + 2, Math.max(1, sz - 4), Math.max(1, sz * 0.35), Math.max(1, r - 1));
          if (c.flagged) {
            const txt = this.add.text(px + sz / 2, py + sz / 2, "⚑", { fontSize: `${fs}px`, color: HEX.red }).setOrigin(0.5);
            this.overlay.add(txt);
          }
        }
      }
    }
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") this.scene.restart();
  }

  private addMine(cx: number, cy: number, r: number) {
    const g = this.graphics;
    g.fillStyle(PALETTE.bg, 1);
    g.fillCircle(cx, cy, r);
    g.fillStyle(PALETTE.red, 1);
    g.fillCircle(cx, cy, r * 0.45);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineStyle(2, PALETTE.red, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  }
}

export const createMinesweeperGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 500,
    height: 600,
    backgroundColor: HEX.bg,
    scene: [MinesweeperScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
