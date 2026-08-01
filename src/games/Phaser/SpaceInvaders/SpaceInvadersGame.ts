import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";

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
  private livesText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private playW = 600;
  private playH = 500;
  private ox = 0;
  private oy = 80;
  private scale_ = 1;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;

  constructor() { super("SpaceInvaders"); }

  create() {
    this.graphics = this.add.graphics();
    this.add.text(20, 12, "SCORE", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.scoreText = this.add.text(20, 24, "0", { fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } });
    this.add.text(140, 12, "LIVES", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.livesText = this.add.text(140, 24, "3", { fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } });
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Flechas/A,D: mover · Espacio: disparar · P: pausa · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.restartHintText);
    this.keyLeft = this.input.keyboard!.addKey("LEFT");
    this.keyRight = this.input.keyboard!.addKey("RIGHT");
    this.keyA = this.input.keyboard!.addKey("A");
    this.keyD = this.input.keyboard!.addKey("D");
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.input.keyboard?.addCapture(["SPACE", "LEFT", "RIGHT", "UP", "DOWN", "A", "D", "W", "S", "P", "R"]);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.reset();
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.scale.off("resize", this.draw, this);
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
    this.scoreText.setText(String(this.score));
    this.livesText.setText(String(this.lives));
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
    this.oy = Math.max(70, 80 + (h - 80 - this.playH) / 2);
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
    const left = this.keyLeft.isDown || this.keyA.isDown;
    const right = this.keyRight.isDown || this.keyD.isDown;
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
    this.scoreText.setText(String(this.score));
    this.livesText.setText(String(this.lives));
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

    // instructions at bottom
    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    g.fillStyle(PALETTE.surface, 1);
    g.fillRoundedRect(this.ox - 8, this.oy - 8, this.playW + 16, this.playH + 16, 14);

    g.fillStyle(PALETTE.surfaceLight, 1);
    g.fillRect(this.ox, this.oy, this.playW, this.playH);

    const pw = this.playerW, ph = 20 * this.scale_;
    g.fillStyle(PALETTE.cyan, 0.35);
    g.fillRoundedRect(this.ox + this.playerX - 6, this.oy + this.playH - ph - 10 * this.scale_ - 6, pw + 12, ph + 12, 6);
    g.fillStyle(PALETTE.cyan, 1);
    g.fillRoundedRect(this.ox + this.playerX, this.oy + this.playH - ph - 10 * this.scale_, pw, ph, 4);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(this.ox + this.playerX + pw * 0.3, this.oy + this.playH - ph - 10 * this.scale_ + ph * 0.3, ph * 0.2);

    const bw = 4 * this.scale_, bh = 10 * this.scale_;
    for (const b of this.bullets) {
      g.fillStyle(PALETTE.yellow, 0.45);
      g.fillCircle(this.ox + b.x, this.oy + b.y + bh / 2, bw * 2);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(this.ox + b.x, this.oy + b.y + bh / 2, bw * 0.7);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(this.ox + b.x, this.oy + b.y + bh / 2, bw * 0.3);
    }

    const aw = 30 * this.scale_, ah = 20 * this.scale_;
    for (const a of this.aliens) if (a.alive) {
      const alienColor = (this.aliens.indexOf(a) % 3 === 0) ? PALETTE.green : ((this.aliens.indexOf(a) % 3 === 1) ? PALETTE.lime : PALETTE.accentSoft);
      g.fillStyle(alienColor, 0.25);
      g.fillRoundedRect(this.ox + a.x - 4, this.oy + a.y - 4, aw + 8, ah + 8, 4);
      g.fillStyle(alienColor, 1);
      g.fillRoundedRect(this.ox + a.x, this.oy + a.y, aw, ah, 4);
      g.fillStyle(PALETTE.bg, 1);
      g.fillRoundedRect(this.ox + a.x + aw * 0.2, this.oy + a.y + ah * 0.3, aw * 0.6, ah * 0.2, 2);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(this.ox + a.x + aw * 0.25, this.oy + a.y + ah * 0.2, aw * 0.08);
      g.fillCircle(this.ox + a.x + aw * 0.75, this.oy + a.y + ah * 0.2, aw * 0.08);
    }

    if (this.gameOver) {
      g.fillStyle(0x000000, 0.5);
      g.fillRect(this.ox, this.oy, this.playW, this.playH);
      this.gameOverText.setPosition(this.ox + this.playW / 2, this.oy + this.playH / 2 - 8).setVisible(true);
      this.restartHintText.setPosition(this.ox + this.playW / 2, this.oy + this.playH / 2 + 34).setVisible(true);
    } else {
      this.gameOverText.setVisible(false);
      this.restartHintText.setVisible(false);
    }
  }
}

export const createSpaceInvadersGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 700,
    height: 700,
    backgroundColor: HEX.bg,
    scene: [SpaceInvadersScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
