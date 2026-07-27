import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";

const ROWS = 5;
const COLS = 8;

interface Bullet { x: number; y: number; }
interface Alien { x: number; y: number; alive: boolean; }

class SpaceInvadersScene extends Phaser.Scene {
  private playerX = 0;
  private playerW = 40;
  private bullets: Bullet[] = [];
  private aliens: Alien[] = [];
  private alienDir = 1;
  private alienSpeed = 0.6;
  private alienTimer = 0;
  private score = 0;
  private lives = 3;
  private gameOver = false;
  private paused = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private playW = 600;
  private playH = 500;
  private ox = 0;
  private oy = 80;
  private scale_ = 1;

  constructor() {
    super("SpaceInvaders");
  }

  create() {
    this.graphics = this.add.graphics();
    this.scoreText = this.add.text(10, 10, "Score: 0   Lives: 3", { fontSize: "18px", color: "#fff" });
    this.add.text(10, 40, "Flechas/A,D: mover · Espacio: disparar · P: pausa · R: reiniciar", { fontSize: "12px", color: "#aaa" });
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.input.keyboard?.addCapture("SPACE,LEFT,RIGHT,UP,DOWN,A,D,W,S,P,R");
    this.scale.on("resize", () => this.draw(), this);
    this.reset();
  }

  private reset() {
    this.bullets = [];
    this.aliens = [];
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.paused = false;
    this.alienDir = 1;
    this.alienSpeed = 0.6;
    this.layout();
    this.playerX = this.playW / 2 - this.playerW / 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.aliens.push({ x: 50 * this.scale_ + c * 50 * this.scale_, y: 40 * this.scale_ + r * 40 * this.scale_, alive: true });
      }
    }
    this.scoreText.setText(`Score: ${this.score}   Lives: ${this.lives}`);
    this.draw();
  }

  private layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.playW = w - 20;
    this.playH = h - 100;
    this.scale_ = Math.min(this.playW / 600, this.playH / 500);
    this.playerW = 40 * this.scale_;
    this.ox = (w - this.playW) / 2;
    this.oy = 80 + (h - 80 - this.playH) / 2;
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (this.gameOver) return;
    if (e.code === "KeyP") { this.paused = !this.paused; return; }
    if (e.code === "Space") {
      this.bullets.push({ x: this.playerX + this.playerW / 2, y: this.playH - 30 * this.scale_ });
    }
  }

  private aliveCount() { return this.aliens.filter((a) => a.alive).length; }

  override update(_t: number, delta: number) {
    if (this.gameOver || this.paused) return;
    this.layout();
    const left = this.input.keyboard?.addKey("LEFT")?.isDown || this.input.keyboard?.addKey("A")?.isDown;
    const right = this.input.keyboard?.addKey("RIGHT")?.isDown || this.input.keyboard?.addKey("D")?.isDown;
    if (left) this.playerX -= 300 * this.scale_ * delta / 1000;
    if (right) this.playerX += 300 * this.scale_ * delta / 1000;
    this.playerX = Phaser.Math.Clamp(this.playerX, 0, this.playW - this.playerW);

    this.alienTimer += delta / 1000;
    if (this.alienTimer >= 1 / (this.alienSpeed * 6)) {
      this.alienTimer = 0;
      let edge = false;
      for (const a of this.aliens) {
        if (!a.alive) continue;
        const nx = a.x + this.alienDir * 12 * this.scale_;
        if (nx <= 0 || nx >= this.playW - 30 * this.scale_) { edge = true; break; }
      }
      if (edge) { this.alienDir *= -1; }
      for (const a of this.aliens) {
        if (!a.alive) continue;
        a.x += this.alienDir * 12 * this.scale_;
        if (edge) a.y += 20 * this.scale_;
        if (a.y + 20 * this.scale_ >= this.playH - 30 * this.scale_) {
          this.lives--;
          if (this.lives <= 0) this.gameOver = true;
          else { for (const b of this.aliens) if (b.alive) { b.x = 50 * this.scale_ + (this.aliens.indexOf(b) % COLS) * 50 * this.scale_; b.y = 40 * this.scale_ + Math.floor(this.aliens.indexOf(b) / COLS) * 40 * this.scale_; } this.bullets = []; }
        }
      }
    }

    const bw = 4 * this.scale_, bh = 10 * this.scale_, aw = 30 * this.scale_, ah = 20 * this.scale_;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y -= 400 * this.scale_ * delta / 1000;
      if (b.y < 0) { this.bullets.splice(i, 1); continue; }
      for (const a of this.aliens) {
        if (!a.alive) continue;
        if (b.x > a.x && b.x < a.x + aw && b.y > a.y && b.y < a.y + ah) {
          a.alive = false;
          this.score += 10;
          this.alienSpeed += 0.05;
          this.bullets.splice(i, 1);
          break;
        }
      }
    }

    if (this.aliveCount() === 0) {
      this.score += 100;
      this.reset();
    }
    this.scoreText.setText(`Score: ${this.score}   Lives: ${this.lives}`);
    this.draw();
  }

  private draw() {
    this.layout();
    const g = this.graphics;
    g.clear();
    const w = this.scale.width;
    g.fillStyle(0x050510, 1);
    g.fillRect(0, 0, w, this.scale.height);
    g.fillStyle(0x000000, 1);
    g.fillRect(this.ox, this.oy, this.playW, this.playH);
    const pw = this.playerW, ph = 20 * this.scale_;
    g.fillStyle(0x00e0ff, 1);
    g.fillRect(this.ox + this.playerX, this.oy + this.playH - ph - 10 * this.scale_, pw, ph);
    const bw = 4 * this.scale_, bh = 10 * this.scale_;
    g.fillStyle(0xffff00, 1);
    for (const b of this.bullets) g.fillRect(this.ox + b.x - bw / 2, this.oy + b.y, bw, bh);
    const aw = 30 * this.scale_, ah = 20 * this.scale_;
    g.fillStyle(0x00ff00, 1);
    for (const a of this.aliens) if (a.alive) g.fillRect(this.ox + a.x, this.oy + a.y, aw, ah);
    g.fillStyle(0x000000, 1);
    for (const a of this.aliens) if (a.alive) g.fillRect(this.ox + a.x + aw * 0.2, this.oy + a.y + ah * 0.3, aw * 0.6, ah * 0.2);
    if (this.gameOver) {
      this.add.text(this.ox + this.playW / 2, this.oy + this.playH / 2 - 10, "GAME OVER", { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
      this.add.text(this.ox + this.playW / 2, this.oy + this.playH / 2 + 30, "R para reiniciar", { fontSize: "16px", color: "#bbb" }).setOrigin(0.5);
    }
  }
}

export const createSpaceInvadersGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 700,
    height: 700,
    backgroundColor: "#050510",
    scene: [SpaceInvadersScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};