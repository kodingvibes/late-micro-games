import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, screenShake } from "../shared/effects";
import { spawnExplosion, updateParticles, drawParticles } from "../shared/particles";
import {
  GradientBackground, drawSpriteBox, drawSpriteCircle, drawPanel, drawTileGrid,
} from "../shared/backgrounds";

const COLS = 10;
const ROWS = 10;
const MINES = 12;

interface Cell { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number; }

class MinesweeperScene extends Phaser.Scene {
  private cells: Cell[][] = [];
  private revealed = 0;
  private gameOver = false;
  private firstClick = true;
  private graphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private minesText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;
  private bg!: GradientBackground;
  private ox = 0;
  private oy = 0;
  private cellSize = 40;
  private _explosionParticles: any[] = [];
  private winCascadeTimer = 0;
  private winCascadeCells: [number, number][] = [];
  private flagCount = 0;

  constructor() { super("Minesweeper"); }

  create() {
    this.graphics = this.add.graphics();
    this.bg = new GradientBackground(this, {
      layers: [
        { speed: 0.01, colors: [0x05070e, 0x0b0d17, 0x0f1220], height: 1 },
      ],
      scanlines: true,
      vignette: true,
    });

    this.add.text(20, 12, "MINAS", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.minesText = this.add.text(20, 24, String(MINES), {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    });
    this.statusText = this.add.text(0, 0, "", { fontSize: "18px", color: HEX.accentSoft, fontFamily: FONTS.ui.fontFamily, fontStyle: "bold" }).setOrigin(0.5, 0);
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Click: revelar · Click derecho: bandera · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.restartHintText);
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.input.on("pointerdown", this.handleClick, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.reset();
    fadeInScene(this, 300);
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.input.off("pointerdown", this.handleClick, this);
    this.scale.off("resize", this.draw, this);
  }

  private reset() {
    this.cells = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
    );
    this.revealed = 0;
    this.gameOver = false;
    this.firstClick = true;
    this.flagCount = 0;
    this._explosionParticles = [];
    this.winCascadeCells = [];
    this.winCascadeTimer = 0;
    this.statusText.setText("");
    this.minesText.setText(String(MINES));
    this.draw();
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
      screenShake(this, 0.008, 300);
      const px = this.ox + x * this.cellSize + this.cellSize / 2;
      const py = this.oy + y * this.cellSize + this.cellSize / 2;
      this._explosionParticles = spawnExplosion(this, px, py, { count: 25, colors: [PALETTE.red, PALETTE.orange, PALETTE.yellow], speed: 130 });
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
    const x = Math.floor((pointer.x - this.ox) / this.cellSize);
    const y = Math.floor((pointer.y - this.oy) / this.cellSize);
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

    if (pointer.rightButtonDown()) {
      const c = this.cells[y][x];
      if (c.revealed) return;
      c.flagged = !c.flagged;
      this.flagCount += c.flagged ? 1 : -1;
      this.minesText.setText(String(MINES - this.flagCount));
      this.draw();
      return;
    }

    if (this.firstClick) {
      this.firstClick = false;
      this.placeMines(x, y);
    }
    this.reveal(x, y);
    this.draw();

    if (!this.gameOver && this.revealed >= COLS * ROWS - MINES) {
      this.statusText.setText("WIN!");
      this.statusText.setColor(HEX.lime);
      this.gameOver = true;
    }
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") this.scene.restart();
  }

  override update(_t: number, delta: number) {
    if (this._explosionParticles.length > 0) {
      this._explosionParticles = updateParticles(this._explosionParticles, delta / 1000);
      this.draw();
    }
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

    const boardW = this.cellSize * COLS;
    const boardH = this.cellSize * ROWS;

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
          if (c.mine) {
            // Mine with 3D detail
            drawSpriteCircle(g, px + sz / 2, py + sz / 2, sz * 0.4, {
              fillColor: PALETTE.red,
              outline: { color: 0x991b1b, width: 2 },
              highlight: { alpha: 0.4, size: 0.35 },
            });
            // Mine spikes
            g.lineStyle(1, PALETTE.red, 0.5);
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              g.lineBetween(px + sz / 2, py + sz / 2, px + sz / 2 + Math.cos(a) * sz * 0.5, py + sz / 2 + Math.sin(a) * sz * 0.5);
            }
            // Mine highlight
            g.fillStyle(0xffffff, 0.2);
            g.fillCircle(px + sz * 0.35, py + sz * 0.35, sz * 0.08);
          } else {
            // Revealed cell (sunken)
            g.fillStyle(PALETTE.surfaceLight, 0.6);
            g.fillRoundedRect(px, py, sz, sz, r);
            g.lineStyle(1, PALETTE.border, 0.3);
            g.strokeRoundedRect(px, py, sz, sz, r);
            if (c.adjacent > 0) {
              const txt = this.add.text(px + sz / 2, py + sz / 2, String(c.adjacent), {
                fontSize: `${fs}px`, color: numColors[c.adjacent], fontStyle: "italic", fontFamily: FONTS.dsegMini.fontFamily,
                shadow: { offsetX: 0, offsetY: 0, blur: 8, color: numColors[c.adjacent], fill: true },
              }).setOrigin(0.5);
              this.overlay.add(txt);
            }
          }
        } else {
          // Unrevealed cell with 3D raised effect
          drawSpriteBox(g, px, py, sz, sz, {
            fillColor: PALETTE.surfaceLight,
            outline: { color: PALETTE.border, width: 1 },
            highlight: { x: 0.2, y: 0.2, size: 0.3, alpha: 0.3 },
            shadow: { offset: 2, alpha: 0.2 },
            cornerRadius: r,
          });
          if (c.flagged) {
            // Flag
            g.lineStyle(2, PALETTE.red, 0.8);
            g.lineBetween(px + sz * 0.3, py + sz * 0.2, px + sz * 0.3, py + sz * 0.8);
            g.fillStyle(PALETTE.red, 0.8);
            g.fillTriangle(px + sz * 0.3, py + sz * 0.2, px + sz * 0.7, py + sz * 0.35, px + sz * 0.3, py + sz * 0.5);
          }
        }
      }
    }

    // Explosion particles
    drawParticles(g, this._explosionParticles);

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
    this.cellSize = Math.max(28, Math.min(Math.floor((w - 40) / COLS), Math.floor((h - 100) / ROWS)));
    this.ox = Math.floor((w - this.cellSize * COLS) / 2);
    this.oy = Math.floor((h - this.cellSize * ROWS) / 2) + 20;
  }
}

export const createMinesweeperGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 700,
    height: 700,
    backgroundColor: HEX.bg,
    scene: [MinesweeperScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
