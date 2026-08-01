import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";

const GRID_W = 25;
const GRID_H = 25;

class SnakeScene extends Phaser.Scene {
  private snake: { x: number; y: number }[] = [];
  private dir: { x: number; y: number } = { x: 1, y: 0 };
  private nextDir: { x: number; y: number } = { x: 1, y: 0 };
  private food = { x: 0, y: 0 };
  private score = 0;
  private gameOver = false;
  private paused = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private tickTimer = 0;
  private speed = 0.15;
  private cell = 20;
  private ox = 0;
  private oy = 0;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;

  constructor() { super("Snake"); }

  create() {
    this.graphics = this.add.graphics();
    this.add.text(20, 12, "SCORE", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.scoreText = this.add.text(20, 24, "0", { fontSize: "26px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } });
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Flechas/WASD: mover · P: pausa · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.restartHintText);
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.reset();
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.scale.off("resize", this.draw, this);
  }

  private reset() {
    this.snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.paused = false;
    this.speed = 0.15;
    this.spawnFood();
    this.scoreText.setText(String(this.score));
    this.draw();
  }

  private spawnFood() {
    while (true) {
      const x = Phaser.Math.Between(0, GRID_W - 1);
      const y = Phaser.Math.Between(0, GRID_H - 1);
      if (!this.snake.some((s) => s.x === x && s.y === y)) {
        this.food = { x, y };
        return;
      }
    }
  }

  private layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cellW = (w - 40) / GRID_W;
    const cellH = (h - 100) / GRID_H;
    this.cell = Math.min(cellW, cellH);
    const boardW = this.cell * GRID_W;
    const boardH = this.cell * GRID_H;
    this.ox = (w - boardW) / 2;
    this.oy = Math.max(70, 80 + (h - 80 - boardH) / 2);
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (e.code === "KeyP") { this.paused = !this.paused; return; }
    if (this.gameOver || this.paused) return;
    switch (e.code) {
      case "ArrowUp": case "KeyW": if (this.dir.y !== 1) this.nextDir = { x: 0, y: -1 }; break;
      case "ArrowDown": case "KeyS": if (this.dir.y !== -1) this.nextDir = { x: 0, y: 1 }; break;
      case "ArrowLeft": case "KeyA": if (this.dir.x !== 1) this.nextDir = { x: -1, y: 0 }; break;
      case "ArrowRight": case "KeyD": if (this.dir.x !== -1) this.nextDir = { x: 1, y: 0 }; break;
    }
  }

  private move() {
    this.dir = this.nextDir;
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H ||
        this.snake.some((s) => s.x === head.x && s.y === head.y)) {
      this.gameOver = true;
      return;
    }
    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.speed = Math.max(0.06, this.speed - 0.002);
      this.spawnFood();
      this.scoreText.setText(String(this.score));
    } else {
      this.snake.pop();
    }
  }

  override update(_t: number, delta: number) {
    if (this.gameOver || this.paused) return;
    this.tickTimer += delta / 1000;
    if (this.tickTimer >= this.speed) {
      this.tickTimer = 0;
      this.move();
      this.draw();
    }
  }

  private draw() {
    this.layout();
    const g = this.graphics;
    g.clear();
    const w = this.scale.width;
    const h = this.scale.height;
    g.fillStyle(PALETTE.bg, 1);
    g.fillRect(0, 0, w, h);
    const boardW = this.cell * GRID_W;
    const boardH = this.cell * GRID_H;

    // instructions at bottom
    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    g.fillStyle(PALETTE.surface, 1);
    g.fillRoundedRect(this.ox - 8, this.oy - 8, boardW + 16, boardH + 16, 14);

    g.fillStyle(PALETTE.surfaceLight, 1);
    g.fillRect(this.ox, this.oy, boardW, boardH);

    g.lineStyle(1, PALETTE.border, 1);
    for (let x = 0; x <= GRID_W; x++) g.lineBetween(this.ox + x * this.cell, this.oy, this.ox + x * this.cell, this.oy + boardH);
    for (let y = 0; y <= GRID_H; y++) g.lineBetween(this.ox, this.oy + y * this.cell, this.ox + boardW, this.oy + y * this.cell);

    for (let i = 0; i < this.snake.length; i++) {
      const s = this.snake[i];
      const px = this.ox + s.x * this.cell + 1;
      const py = this.oy + s.y * this.cell + 1;
      const sz = this.cell - 2;
      const segColor = i === 0 ? PALETTE.lime : PALETTE.green;
      g.fillStyle(segColor, 0.35);
      g.fillRoundedRect(px - 2, py - 2, sz + 4, sz + 4, Math.max(3, sz * 0.22));
      g.fillStyle(segColor, 1);
      g.fillRoundedRect(px, py, sz, sz, Math.max(2, sz * 0.18));
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(px + sz * 0.3, py + sz * 0.3, sz * 0.15);
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(px + sz * 0.7, py + sz * 0.7, sz * 0.08);
    }

    const fx = this.ox + this.food.x * this.cell + this.cell / 2;
    const fy = this.oy + this.food.y * this.cell + this.cell / 2;
    const pulse = 0.85 + Math.sin(Date.now() / 200) * 0.15;
    g.fillStyle(PALETTE.red, 0.35);
    g.fillCircle(fx, fy, this.cell * 0.55 * pulse);
    g.fillStyle(PALETTE.red, 1);
    g.fillCircle(fx, fy, this.cell * 0.35);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(fx - this.cell * 0.1, fy - this.cell * 0.1, this.cell * 0.1);

    if (this.gameOver) {
      g.fillStyle(0x000000, 0.5);
      g.fillRect(this.ox, this.oy, boardW, boardH);
      this.gameOverText.setPosition(this.ox + boardW / 2, this.oy + boardH / 2 - 8).setVisible(true);
      this.restartHintText.setPosition(this.ox + boardW / 2, this.oy + boardH / 2 + 34).setVisible(true);
    } else {
      this.gameOverText.setVisible(false);
      this.restartHintText.setVisible(false);
    }
  }
}

export const createSnakeGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 600,
    height: 700,
    backgroundColor: HEX.bg,
    scene: [SnakeScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
