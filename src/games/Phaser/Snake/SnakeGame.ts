import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";

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
  private tickTimer = 0;
  private speed = 0.15;
  private cell = 20;
  private ox = 0;
  private oy = 0;

  constructor() {
    super("Snake");
  }

  create() {
    this.graphics = this.add.graphics();
    this.scoreText = this.add.text(10, 10, "Score: 0", { fontSize: "20px", color: "#fff" });
    this.add.text(10, 40, "Flechas/WASD: mover · P: pausa · R: reiniciar", { fontSize: "12px", color: "#aaa" });
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", () => this.draw(), this);
    this.reset();
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
    this.scoreText.setText(`Score: ${this.score}`);
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
    this.oy = 80 + (h - 80 - boardH) / 2;
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (e.code === "KeyP") { this.paused = !this.paused; return; }
    if (this.gameOver || this.paused) return;
    switch (e.code) {
      case "ArrowUp": case "KeyW":
        if (this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
        break;
      case "ArrowDown": case "KeyS":
        if (this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
        break;
      case "ArrowLeft": case "KeyA":
        if (this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
        break;
      case "ArrowRight": case "KeyD":
        if (this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
        break;
    }
  }

  private move() {
    this.dir = this.nextDir;
    const head = {
      x: this.snake[0].x + this.dir.x,
      y: this.snake[0].y + this.dir.y,
    };
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
      this.scoreText.setText(`Score: ${this.score}`);
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
    g.fillStyle(0x141420, 1);
    g.fillRect(0, 0, w, this.scale.height);
    const boardW = this.cell * GRID_W;
    const boardH = this.cell * GRID_H;
    g.fillStyle(0x000000, 1);
    g.fillRect(this.ox, this.oy, boardW, boardH);
    g.lineStyle(1, 0x333344, 1);
    for (let x = 0; x <= GRID_W; x++) {
      g.lineBetween(this.ox + x * this.cell, this.oy, this.ox + x * this.cell, this.oy + boardH);
    }
    for (let y = 0; y <= GRID_H; y++) {
      g.lineBetween(this.ox, this.oy + y * this.cell, this.ox + boardW, this.oy + y * this.cell);
    }
    for (let i = 0; i < this.snake.length; i++) {
      const s = this.snake[i];
      g.fillStyle(i === 0 ? 0x00ff00 : 0x80ff80, 1);
      g.fillRect(this.ox + s.x * this.cell + 1, this.oy + s.y * this.cell + 1, this.cell - 2, this.cell - 2);
    }
    g.fillStyle(0xff3030, 1);
    g.fillRect(this.ox + this.food.x * this.cell + 2, this.oy + this.food.y * this.cell + 2, this.cell - 4, this.cell - 4);
    if (this.gameOver) {
      this.add.text(this.ox + boardW / 2, this.oy + boardH / 2 - 10, "GAME OVER", { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
      this.add.text(this.ox + boardW / 2, this.oy + boardH / 2 + 30, "R para reiniciar", { fontSize: "16px", color: "#bbb" }).setOrigin(0.5);
    }
  }
}

export const createSnakeGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 600,
    height: 700,
    backgroundColor: "#141420",
    scene: [SnakeScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};