import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, screenShake } from "../shared/effects";
import { spawnExplosion, updateParticles, drawParticles } from "../shared/particles";
import {
  GradientBackground, drawSpriteBox, drawSpriteCircle, drawPanel, drawTileGrid,
  spawnConfetti, updateConfetti, drawConfetti,
} from "../shared/backgrounds";
import { sfxExplosion, sfxFlag, sfxReveal, sfxWin, sfxGameOver, resumeAudio } from "../shared/sound";
import { TouchControlsManager, responsiveFontSize } from "../shared/touchControls";

const COLS = 10;
const ROWS = 10;
const MINES = 12;

interface Cell { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number; }

class MinesweeperScene extends Phaser.Scene {
  private cells: Cell[][] = [];
  private revealed = 0;
  private gameOver = false;
  private gameWon = false;
  private gameOverTimer = 0;
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
  private chainExplosionParticles: any[] = [];
  private confettiPieces: any[] = [];
  private touchControls!: TouchControlsManager;
  private flagMode = false;

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
    this.touchControls = new TouchControlsManager(this, "Minesweeper");
    this.reset();
    fadeInScene(this, 300);
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.input.off("pointerdown", this.handleClick, this);
    this.scale.off("resize", this.draw, this);
    this.touchControls?.destroy();
  }

  private reset() {
    this.cells = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
    );
    this.revealed = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.gameOverTimer = 0;
    this.firstClick = true;
    this.flagCount = 0;
    this._explosionParticles = [];
    this.chainExplosionParticles = [];
    this.confettiPieces = [];
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
      this.gameOverTimer = 0;
      this.statusText.setText("BOOM");
      this.statusText.setColor(HEX.red);
      screenShake(this, 0.008, 300);
      sfxExplosion();
      const px = this.ox + x * this.cellSize + this.cellSize / 2;
      const py = this.oy + y * this.cellSize + this.cellSize / 2;
      this._explosionParticles = spawnExplosion(this, px, py, { count: 25, colors: [PALETTE.red, PALETTE.orange, PALETTE.yellow], speed: 130 });
      // Chain explosion on all mines
      for (let my = 0; my < ROWS; my++) {
        for (let mx = 0; mx < COLS; mx++) {
          if (this.cells[my][mx].mine) {
            const mpx = this.ox + mx * this.cellSize + this.cellSize / 2;
            const mpy = this.oy + my * this.cellSize + this.cellSize / 2;
            const chainParts = spawnExplosion(this, mpx, mpy, { count: 10, colors: [PALETTE.red, PALETTE.orange, PALETTE.yellow], speed: 80 });
            this.chainExplosionParticles.push(...chainParts);
          }
        }
      }
      return;
    }
    sfxReveal();
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

    if (pointer.rightButtonDown() || this.flagMode) {
      const c = this.cells[y][x];
      if (c.revealed) return;
      c.flagged = !c.flagged;
      this.flagCount += c.flagged ? 1 : -1;
      this.minesText.setText(String(MINES - this.flagCount));
      sfxFlag();
      this.flagMode = false; // toggle off after one flag
      this.draw();
      return;
    }

    resumeAudio();
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
      this.gameWon = true;
      this.gameOverTimer = 0;
      sfxWin();
      // Confetti!
      const cx = this.ox + (COLS * this.cellSize) / 2;
      const cy = this.oy + (ROWS * this.cellSize) / 2;
      this.confettiPieces = spawnConfetti(cx, cy, 50);
    }
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") this.scene.restart();
  }

  override update(_t: number, delta: number) {
    this.touchControls?.update();

    // Touch flag toggle
    if (this.touchControls?.state.flag) {
      this.flagMode = !this.flagMode;
    }

    if (this.gameOver) {
      this.gameOverTimer += delta / 1000;
      if (this._explosionParticles.length > 0) {
        this._explosionParticles = updateParticles(this._explosionParticles, delta / 1000);
      }
      if (this.chainExplosionParticles.length > 0) {
        this.chainExplosionParticles = updateParticles(this.chainExplosionParticles, delta / 1000);
      }
      if (this.confettiPieces.length > 0) {
        this.confettiPieces = updateConfetti(this.confettiPieces, delta / 1000);
      }
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
            // Mine with 3D detail - spherical body
            const cx = px + sz / 2;
            const cy = py + sz / 2;
            const mineR = sz * 0.4;

            // Mine body (sphere)
            g.fillStyle(0x1e293b, 1);
            g.fillCircle(cx, cy, mineR);

            // Mine gradient (top highlight)
            g.fillStyle(0x334155, 0.6);
            g.fillCircle(cx - mineR * 0.1, cy - mineR * 0.1, mineR * 0.7);

            // Mine highlight
            g.fillStyle(0xffffff, 0.15);
            g.fillCircle(cx - mineR * 0.25, cy - mineR * 0.25, mineR * 0.3);

            // Mine spikes
            g.lineStyle(2, 0x475569, 0.8);
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              const innerR = mineR * 0.7;
              const outerR = mineR * 1.2;
              g.lineBetween(
                cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR,
                cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR,
              );
              // Spike tip
              g.fillStyle(0x64748b, 0.6);
              g.fillCircle(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR, 2);
            }

            // Detonator
            g.fillStyle(0x94a3b8, 0.8);
            g.fillRect(cx - 2, cy - mineR - 4, 4, 6);
            g.fillStyle(0xef4444, 0.8);
            g.fillCircle(cx, cy - mineR - 4, 3);

            // Outline
            g.lineStyle(1, 0x991b1b, 0.5);
            g.strokeCircle(cx, cy, mineR);
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
          // Unrevealed cell with 3D raised effect (more pronounced)
          drawSpriteBox(g, px, py, sz, sz, {
            fillColor: PALETTE.surfaceLight,
            outline: { color: PALETTE.border, width: 1 },
            highlight: { x: 0.2, y: 0.2, size: 0.35, alpha: 0.35 },
            shadow: { offset: 3, alpha: 0.25 },
            cornerRadius: r,
          });
          if (c.flagged) {
            // Detailed flag
            const flagX = px + sz * 0.3;
            // Pole
            g.lineStyle(2, 0x94a3b8, 0.9);
            g.lineBetween(flagX, py + sz * 0.2, flagX, py + sz * 0.8);
            // Flag body
            g.fillStyle(PALETTE.red, 0.9);
            g.beginPath();
            g.moveTo(flagX, py + sz * 0.2);
            g.lineTo(flagX + sz * 0.4, py + sz * 0.3);
            g.lineTo(flagX, py + sz * 0.5);
            g.closePath();
            g.fillPath();
            // Flag highlight
            g.fillStyle(0xffffff, 0.2);
            g.fillTriangle(flagX + 2, py + sz * 0.22, flagX + sz * 0.3, py + sz * 0.3, flagX + 2, py + sz * 0.45);
            // Base
            g.fillStyle(0x64748b, 0.6);
            g.fillRect(flagX - 3, py + sz * 0.78, 6, 3);
          }
        }
      }
    }

    // Explosion particles
    drawParticles(g, this._explosionParticles);
    drawParticles(g, this.chainExplosionParticles);

    // Confetti
    drawConfetti(g, this.confettiPieces);

    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    // Touch controls overlay
    this.touchControls?.draw(g);

    if (this.gameOver) {
      const progress = Math.min(1, this.gameOverTimer / 1.5);

      if (this.gameWon) {
        // Win screen with celebration
        g.fillStyle(0x000000, 0.4);
        g.fillRect(this.ox, this.oy, boardW, boardH);

        g.lineStyle(2, PALETTE.lime, 0.4);
        g.strokeRect(this.ox + 20, this.oy + 20, boardW - 40, boardH - 40);

        const cx = this.ox + boardW / 2;
        const cy = this.oy + boardH / 2;

        const textAlpha = Math.min(1, progress * 2);
        this.gameOverText.setText("¡WIN!").setColor(HEX.lime).setPosition(cx, cy - 8).setVisible(true).setAlpha(textAlpha);
        this.restartHintText.setPosition(cx, cy + 30).setVisible(true).setAlpha(Math.max(0, (progress - 0.3) * 2));
      } else {
        g.fillStyle(0x000000, 0.6);
        g.fillRect(this.ox, this.oy, boardW, boardH);

        g.lineStyle(2, PALETTE.cyan, 0.3);
        g.strokeRect(this.ox + 20, this.oy + 20, boardW - 40, boardH - 40);

        const cx = this.ox + boardW / 2;
        const cy = this.oy + boardH / 2;

        const textAlpha = Math.min(1, (progress - 0.3) * 2);
        this.gameOverText.setText("GAME OVER").setColor(HEX.cyan).setPosition(cx, cy - 8).setVisible(true).setAlpha(textAlpha);
        this.restartHintText.setPosition(cx, cy + 30).setVisible(true).setAlpha(Math.max(0, (progress - 0.6) * 2));
      }
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
