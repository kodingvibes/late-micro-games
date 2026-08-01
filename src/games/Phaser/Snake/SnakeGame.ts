import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, screenShake, scorePop } from "../shared/effects";
import {
  GradientBackground, drawSpriteBox, drawSpriteCircle, drawPanel, drawTileGrid,
} from "../shared/backgrounds";
import { sfxPickup, sfxGameOver, resumeAudio } from "../shared/sound";

const GRID_W = 25;
const GRID_H = 25;
const MIN_CELL = 12;

interface Point { x: number; y: number; }

interface EatParticle {
  x: number; y: number; vx: number; vy: number;
  color: number; size: number; life: number; maxLife: number;
}

class SnakeScene extends Phaser.Scene {
  private snake: Point[] = [];
  private food!: Point;
  private direction = { x: 1, y: 0 };
  private nextDirection = { x: 1, y: 0 };
  private score = 0;
  private gameOver = false;
  private gameOverTimer = 0;
  private paused = false;
  private speed = 0.15;
  private tickTimer = 0;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;
  private bg!: GradientBackground;
  private ox = 0;
  private oy = 0;
  private cell = 20;
  private foodPulse = 0;
  private foodRotation = 0;
  private snakeTrail: { x: number; y: number; life: number; }[] = [];
  private eatParticles: EatParticle[] = [];
  private blinkTimer = 0;
  private disintegrateParticles: { x: number; y: number; vx: number; vy: number; color: number; size: number; life: number; maxLife: number; }[] = [];

  constructor() { super("Snake"); }

  create() {
    this.graphics = this.add.graphics();
    this.bg = new GradientBackground(this, {
      layers: [
        { speed: 0.01, colors: [0x05070e, 0x0b0d17, 0x0f1220], height: 1 },
      ],
      scanlines: true,
      vignette: true,
    });

    this.add.text(20, 12, "SCORE", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.scoreText = this.add.text(20, 24, "0", {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    });
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Flechas: mover · P: pausa · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "34px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.restartHintText);
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.reset();
    fadeInScene(this, 300);
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.scale.off("resize", this.draw, this);
  }

  private reset() {
    this.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.gameOverTimer = 0;
    this.paused = false;
    this.speed = 0.15;
    this.snakeTrail = [];
    this.eatParticles = [];
    this.disintegrateParticles = [];
    this.blinkTimer = 0;
    this.foodRotation = 0;
    this.spawnFood();
    this.scoreText.setText(String(this.score));
    this.draw();
  }

  private spawnFood() {
    const occupied = new Set(this.snake.map((p) => `${p.x},${p.y}`));
    let pos: Point;
    do { pos = { x: Phaser.Math.Between(0, GRID_W - 1), y: Phaser.Math.Between(0, GRID_H - 1) }; }
    while (occupied.has(`${pos.x},${pos.y}`));
    this.food = pos;
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (this.gameOver) return;
    if (e.code === "KeyP") { this.paused = !this.paused; return; }
    if (this.paused) return;
    switch (e.code) {
      case "ArrowUp": if (this.direction.y === 0) this.nextDirection = { x: 0, y: -1 }; break;
      case "ArrowDown": if (this.direction.y === 0) this.nextDirection = { x: 0, y: 1 }; break;
      case "ArrowLeft": if (this.direction.x === 0) this.nextDirection = { x: -1, y: 0 }; break;
      case "ArrowRight": if (this.direction.x === 0) this.nextDirection = { x: 1, y: 0 }; break;
    }
  }

  private move() {
    this.direction = { ...this.nextDirection };
    const head = { x: this.snake[0].x + this.direction.x, y: this.snake[0].y + this.direction.y };
    if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) { this.gameOver = true; return; }
    if (this.snake.some((p) => p.x === head.x && p.y === head.y)) { this.gameOver = true; return; }
    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.speed = Math.max(0.06, this.speed - 0.002);
      const fx = this.ox + this.food.x * this.cell + this.cell / 2;
      const fy = this.oy + this.food.y * this.cell + this.cell / 2;
      this.spawnFood();
      this.scoreText.setText(String(this.score));
      sfxPickup();
      scorePop(this, fx, fy, "+10", HEX.lime);

      // Eat particles
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 60;
        this.eatParticles.push({
          x: fx, y: fy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: PALETTE.red,
          size: 2 + Math.random() * 3,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
        });
      }
    } else {
      const tail = this.snake.pop()!;
      this.snakeTrail.push({ x: tail.x, y: tail.y, life: 0.3 });
    }
    if (this.gameOver) {
      screenShake(this, 0.005, 250);
      sfxGameOver();
      this.gameOverTimer = 0;
      // Disintegration particles
      for (const seg of this.snake) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 30 + Math.random() * 80;
          this.disintegrateParticles.push({
            x: this.ox + seg.x * this.cell + this.cell / 2,
            y: this.oy + seg.y * this.cell + this.cell / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: PALETTE.lime,
            size: 2 + Math.random() * 4,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1.0,
          });
        }
      }
    }
  }

  override update(_t: number, delta: number) {
    if (this.gameOver) {
      this.gameOverTimer += delta / 1000;
      this.blinkTimer += delta / 1000;
      // Update disintegrate particles
      for (const p of this.disintegrateParticles) {
        p.x += p.vx * delta / 1000;
        p.y += p.vy * delta / 1000;
        p.vy += 100 * delta / 1000;
        p.life -= delta / 1000;
      }
      this.disintegrateParticles = this.disintegrateParticles.filter((p) => p.life > 0);
      this.draw();
      return;
    }
    if (this.paused) return;
    this.foodPulse += delta / 1000;
    this.foodRotation += delta / 1000 * 2;
    this.blinkTimer += delta / 1000;
    this.tickTimer += delta / 1000;
    for (const t of this.snakeTrail) t.life -= delta / 1000;
    this.snakeTrail = this.snakeTrail.filter((t) => t.life > 0);
    // Update eat particles
    for (const p of this.eatParticles) {
      p.x += p.vx * delta / 1000;
      p.y += p.vy * delta / 1000;
      p.vy += 100 * delta / 1000;
      p.life -= delta / 1000;
    }
    this.eatParticles = this.eatParticles.filter((p) => p.life > 0);
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
    this.overlay.removeAll(false);
    const w = this.scale.width;
    const h = this.scale.height;

    // Background
    this.bg.draw(g, w, h);

    const boardW = this.cell * GRID_W;
    const boardH = this.cell * GRID_H;

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

    // Grid
    drawTileGrid(g, this.ox, this.oy, boardW, boardH, this.cell, this.cell, PALETTE.accent, 0.06);

    // Snake trail particles
    for (const t of this.snakeTrail) {
      g.fillStyle(PALETTE.lime, t.life * 0.3);
      g.fillCircle(this.ox + t.x * this.cell + this.cell / 2, this.oy + t.y * this.cell + this.cell / 2, this.cell * 0.2 * t.life);
    }

    // Eat particles
    for (const p of this.eatParticles) {
      const alpha = Phaser.Math.Clamp(p.life / p.maxLife, 0, 1);
      g.fillStyle(p.color, alpha * 0.7);
      g.fillCircle(p.x, p.y, p.size * alpha);
    }

    // Snake body segments (tail to head)
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const p = this.snake[i];
      const px = this.ox + p.x * this.cell + 1;
      const py = this.oy + p.y * this.cell + 1;
      const sz = this.cell - 2;
      const t = i / Math.max(1, this.snake.length - 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(PALETTE.lime),
        Phaser.Display.Color.ValueToColor(PALETTE.green),
        100, Math.floor(t * 100),
      );
      const colorInt = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

      if (i === 0) {
        // Head with eyes (blinking)
        const isBlinking = Math.sin(this.blinkTimer * 2) > 0.95;
        drawSpriteBox(g, px, py, sz, sz, {
          fillColor: colorInt,
          outline: { color: 0x166534, width: 2 },
          highlight: { x: 0.3, y: 0.2, size: 0.3, alpha: 0.5 },
          shadow: { offset: 2, alpha: 0.2 },
          cornerRadius: 6,
        });
        if (!isBlinking) {
          // Eyes
          g.fillStyle(0xffffff, 0.9);
          g.fillCircle(px + sz * 0.3, py + sz * 0.3, sz * 0.12);
          g.fillCircle(px + sz * 0.7, py + sz * 0.3, sz * 0.12);
          g.fillStyle(0x000000, 0.8);
          g.fillCircle(px + sz * 0.3, py + sz * 0.3, sz * 0.06);
          g.fillCircle(px + sz * 0.7, py + sz * 0.3, sz * 0.06);
        }
        // Tongue
        g.lineStyle(1, PALETTE.red, 0.6);
        const tongueDir = this.direction;
        g.lineBetween(px + sz / 2 + tongueDir.x * sz * 0.5, py + sz / 2 + tongueDir.y * sz * 0.5,
          px + sz / 2 + tongueDir.x * sz * 0.8, py + sz / 2 + tongueDir.y * sz * 0.8);
      } else {
        // Body with scale pattern
        drawSpriteBox(g, px, py, sz, sz, {
          fillColor: colorInt,
          outline: { color: 0x166534, width: 1 },
          highlight: { x: 0.2, y: 0.2, size: 0.2, alpha: 0.3 },
          shadow: { offset: 1, alpha: 0.15 },
          cornerRadius: 4,
        });
        // Scale pattern
        g.lineStyle(1, 0x166534, 0.2);
        g.lineBetween(px + 2, py + sz * 0.5, px + sz - 2, py + sz * 0.5);
        g.lineBetween(px + sz * 0.5, py + 2, px + sz * 0.5, py + sz - 2);
      }
    }

    // Food with pulse glow and rotation
    const fp = this.foodPulse;
    const foodGlow = 0.1 + Math.sin(fp * 4) * 0.08;
    const foodScale = 1 + Math.sin(fp * 3) * 0.08;
    const fx = this.ox + this.food.x * this.cell + this.cell / 2;
    const fy = this.oy + this.food.y * this.cell + this.cell / 2;
    const foodR = (this.cell * 0.35) * foodScale;

    g.fillStyle(PALETTE.red, foodGlow);
    g.fillCircle(fx, fy, foodR * 1.8);
    drawSpriteCircle(g, fx, fy, foodR, {
      fillColor: PALETTE.red,
      outline: { color: 0x991b1b, width: 2 },
      highlight: { alpha: 0.5, size: 0.4 },
    });
    // Food shine
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(fx - foodR * 0.2, fy - foodR * 0.2, foodR * 0.25);

    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    // Game over with disintegration
    if (this.gameOver) {
      const progress = Math.min(1, this.gameOverTimer / 1.5);

      // Disintegration particles
      for (const p of this.disintegrateParticles) {
        const alpha = Phaser.Math.Clamp(p.life / p.maxLife, 0, 1);
        g.fillStyle(p.color, alpha);
        g.fillCircle(p.x, p.y, p.size * alpha);
      }

      const alpha = Math.min(0.6, progress * 1.5);
      g.fillStyle(0x000000, alpha);
      g.fillRect(this.ox, this.oy, boardW, boardH);

      g.lineStyle(2, PALETTE.cyan, 0.3);
      g.strokeRect(this.ox + 20, this.oy + 20, boardW - 40, boardH - 40);

      const cx = this.ox + boardW / 2;
      const cy = this.oy + boardH / 2;

      const textAlpha = Math.min(1, (progress - 0.3) * 2);
      this.gameOverText.setPosition(cx, cy - 8).setVisible(true).setAlpha(textAlpha);
      this.restartHintText.setPosition(cx, cy + 30).setVisible(true).setAlpha(Math.max(0, (progress - 0.6) * 2));
    } else {
      this.gameOverText.setVisible(false);
      this.restartHintText.setVisible(false);
    }
  }

  private layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cell = Math.max(MIN_CELL, Math.min(Math.floor((w - 40) / GRID_W), Math.floor((h - 100) / GRID_H)));
    this.ox = Math.floor((w - this.cell * GRID_W) / 2);
    this.oy = Math.floor((h - this.cell * GRID_H) / 2) + 20;
  }
}

export const createSnakeGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 700,
    height: 700,
    backgroundColor: HEX.bg,
    scene: [SnakeScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
