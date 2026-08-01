import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, screenShake, scorePop } from "../shared/effects";
import type { Particle } from "../shared/particles";
import { spawnExplosion, updateParticles, drawParticles } from "../shared/particles";
import {
  GradientBackground, createStarField, updateStarField, drawStarField,
  drawMountainRange, drawWaterWaves,
  drawSpriteBox, drawSpriteCircle, drawSpriteTriangle, drawPanel, drawProgressBar,
} from "../shared/backgrounds";
import { sfxShoot, sfxExplosion, sfxPickup, sfxGameOver, resumeAudio } from "../shared/sound";
import { TouchControlsManager, responsiveFontSize } from "../shared/touchControls";

const RIVER_W_MIN = 180;
const RIVER_W_MAX = 360;
const SEGMENT_H = 80;
const PLAYER_W = 36;
const PLAYER_H = 48;

interface BankPoint { x: number; y: number; }
interface Enemy {
  x: number; y: number;
  w: number; h: number;
  type: "boat" | "heli" | "fuel" | "bridge";
  alive: boolean;
  oscillate?: number;
  speedX?: number;
  floatOff?: number;
}
interface Bullet { x: number; y: number; alive: boolean; }

class RiverRaidScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private player = { x: 0, y: 0 };
  private score = 0;
  private distance = 0;
  private fuel = 100;
  private lives = 3;
  private gameOver = false;
  private gameOverTimer = 0;
  private paused = false;
  private speed = 160;
  private riverW = 260;
  private targetRiverW = 260;
  private riverCenter = 0;
  private banks: BankPoint[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private nextSpawnY = -200;
  private nextBridgeY = -1200;
  private tick = 0;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;
  private fuelLabelText!: Phaser.GameObjects.Text;
  private bg!: GradientBackground;
  private stars: { x: number; y: number; size: number; alpha: number; speed: number; }[] = [];
  private waterTime = 0;
  private engineParticles: { x: number; y: number; life: number; }[] = [];
  private engineGlowPulse = 0;
  private gameOverZoom = 0;
  private gameOverParticles: Particle[] = [];
  private touchControls!: TouchControlsManager;

  constructor() { super("RiverRaid"); }

  create() {
    this.graphics = this.add.graphics();
    this.bg = new GradientBackground(this, {
      layers: [
        { speed: 0.003, colors: [0x05070e, 0x0b0d17, 0x0f1220, 0x14162a], height: 0.5 },
        { speed: 0.015, colors: [0x14162a, 0x1a1d35, 0x1e213a], height: 0.3, y: 0 },
      ],
      scanlines: true,
      vignette: true,
    });
    this.stars = createStarField(700, 700, 60);

    this.add.text(20, 12, "SCORE", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.scoreText = this.add.text(20, 24, "0", {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    });
    this.add.text(130, 12, "DIST", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.distanceText = this.add.text(130, 24, "0m", {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    });
    this.add.text(230, 12, "LIVES", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily });
    this.livesText = this.add.text(230, 24, "3", {
      fontSize: "24px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
    });
    this.overlay = this.add.container(0, 0);
    this.instructionsText = this.add.text(20, 0, "Flechas/A,D: mover · Espacio: disparar · P: pausa · R: reiniciar", { fontSize: "13px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setVisible(false);
    this.gameOverText = this.add.text(0, 0, "GAME OVER", { fontSize: "38px", color: HEX.cyan, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.statsText = this.add.text(0, 0, "", { fontSize: "16px", color: HEX.textMuted, fontFamily: FONTS.dseg.fontFamily, fontStyle: "italic", shadow: { offsetX: 0, offsetY: 0, blur: 8, color: HEX.cyan, fill: true } }).setOrigin(0.5).setVisible(false);
    this.restartHintText = this.add.text(0, 0, "R para reiniciar", { fontSize: "15px", color: HEX.accentSoft, fontFamily: FONTS.ui.fontFamily }).setOrigin(0.5).setVisible(false);
    this.fuelLabelText = this.add.text(0, 0, "FUEL", { fontSize: "11px", color: HEX.textMuted, fontFamily: FONTS.ui.fontFamily }).setOrigin(0, 1).setVisible(false);
    this.overlay.add(this.gameOverText);
    this.overlay.add(this.statsText);
    this.overlay.add(this.restartHintText);
    this.overlay.add(this.fuelLabelText);
    this.keyLeft = this.input.keyboard!.addKey("LEFT");
    this.keyRight = this.input.keyboard!.addKey("RIGHT");
    this.keyA = this.input.keyboard!.addKey("A");
    this.keyD = this.input.keyboard!.addKey("D");
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.scale.on("resize", this.draw, this);
    this.events.on('shutdown', this.onShutdown, this);
    this.touchControls = new TouchControlsManager(this, "RiverRaid");
    this.reset();
    fadeInScene(this, 300);
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.scale.off("resize", this.draw, this);
    this.touchControls?.destroy();
  }

  private reset() {
    const w = this.scale.width;
    this.riverCenter = w / 2;
    this.riverW = (w * 0.55);
    this.targetRiverW = this.riverW;
    this.player = { x: this.riverCenter, y: this.scale.height - 90 };
    this.score = 0;
    this.distance = 0;
    this.fuel = 100;
    this.lives = 3;
    this.speed = 160;
    this.banks = [];
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.engineParticles = [];
    this.nextSpawnY = -200;
    this.nextBridgeY = -1200;
    this.gameOver = false;
    this.gameOverTimer = 0;
    this.gameOverZoom = 0;
    this.gameOverParticles = [];
    this.paused = false;
    this.waterTime = 0;
    this.engineGlowPulse = 0;
    this.generateBanks(0);
    this.draw();
  }

  private generateBanks(limitY: number) {
    const h = this.scale.height;
    if (this.banks.length === 0) {
      for (let y = h; y >= limitY - SEGMENT_H; y -= SEGMENT_H) {
        this.banks.push({ x: this.riverCenter, y });
      }
      return;
    }
    let topY = this.banks[this.banks.length - 1].y;
    while (topY > limitY - SEGMENT_H) {
      topY -= SEGMENT_H;
      const prev = this.banks[this.banks.length - 1].x;
      const w = this.scale.width;
      const margin = this.riverW / 2 + 30;
      const minX = margin;
      const maxX = w - margin;
      const shift = Phaser.Math.Between(-50, 50);
      this.banks.push({ x: Phaser.Math.Clamp(prev + shift, minX, maxX), y: topY });
    }
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === "KeyR") { this.scene.restart(); return; }
    if (this.gameOver || this.paused) return;
    if (e.code === "KeyP") { this.paused = !this.paused; return; }
    if (e.code === "Space") {
      resumeAudio();
      sfxShoot();
      this.bullets.push({ x: this.player.x, y: this.player.y - 28, alive: true });
      this.bullets.push({ x: this.player.x - 10, y: this.player.y - 14, alive: true });
      this.bullets.push({ x: this.player.x + 10, y: this.player.y - 14, alive: true });
    }
  }

  private bankXAt(y: number): number {
    for (let i = 0; i < this.banks.length - 1; i++) {
      const a = this.banks[i];
      const b = this.banks[i + 1];
      if ((y <= a.y && y >= b.y) || (y >= a.y && y <= b.y)) {
        const t = (y - a.y) / (b.y - a.y);
        return Phaser.Math.Linear(a.x, b.x, t);
      }
    }
    return this.banks[0]?.x ?? this.scale.width / 2;
  }

  private spawnEnemies() {
    const h = this.scale.height;
    if (this.nextSpawnY > -h) return;
    const y = this.nextSpawnY;
    const cx = this.bankXAt(y);
    const half = this.riverW / 2 - 40;
    const typeRoll = Math.random();
    if (typeRoll < 0.15) {
      this.enemies.push({ x: cx + Phaser.Math.Between(-half, half), y, w: 28, h: 28, type: "fuel", alive: true, floatOff: Math.random() * Math.PI * 2 });
    } else if (typeRoll < 0.45) {
      this.enemies.push({ x: cx + Phaser.Math.Between(-half, half), y, w: 34, h: 22, type: "boat", alive: true, floatOff: Math.random() * Math.PI * 2 });
    } else if (typeRoll < 0.75) {
      this.enemies.push({
        x: cx + Phaser.Math.Between(-half, half), y, w: 36, h: 24,
        type: "heli", alive: true, oscillate: Math.random() * Math.PI * 2, speedX: 40 + Math.random() * 60, floatOff: Math.random() * Math.PI * 2,
      });
    }
    this.nextSpawnY += Phaser.Math.Between(140, 260);
  }

  private spawnBridge() {
    const h = this.scale.height;
    if (this.nextBridgeY > -h) return;
    const y = this.nextBridgeY;
    const cx = this.bankXAt(y);
    this.enemies.push({ x: cx, y, w: this.riverW + 30, h: 28, type: "bridge", alive: true });
    this.nextBridgeY -= Phaser.Math.Between(1400, 2000);
  }

  private addExplosion(x: number, y: number, color = PALETTE.orange) {
    const newParts = spawnExplosion(this, x, y, {
      count: 20,
      colors: [color, PALETTE.yellow, PALETTE.red, PALETTE.orange],
      speed: 100,
    });
    this.particles.push(...newParts);
    sfxExplosion();
    screenShake(this, 0.005, 250);
  }

  override update(_t: number, delta: number) {
    if (this.gameOver) {
      this.gameOverTimer += delta / 1000;
      this.gameOverZoom = Math.min(1, this.gameOverZoom + delta / 500);
      this.particles = updateParticles(this.particles, delta / 1000);
      this.gameOverParticles = updateParticles(this.gameOverParticles, delta / 1000);
      this.draw();
      return;
    }
    if (this.paused) return;
    const dt = delta / 1000;
    const w = this.scale.width;
    const h = this.scale.height;

    const move = this.speed * dt;
    this.distance += move / 10;
    this.fuel = Math.max(0, this.fuel - dt * 1.8);
    this.speed = Math.min(380, 160 + this.distance / 250);
    this.waterTime += dt;
    this.engineGlowPulse += dt * 4;

    this.targetRiverW = RIVER_W_MIN + (RIVER_W_MAX - RIVER_W_MIN) * (0.6 + 0.4 * Math.sin(this.distance / 800));
    this.riverW += (this.targetRiverW - this.riverW) * dt * 0.5;

    this.touchControls?.update();
    const left = this.keyLeft.isDown || this.keyA.isDown || this.touchControls?.state.left;
    const right = this.keyRight.isDown || this.keyD.isDown || this.touchControls?.state.right;
    if (left) this.player.x -= 260 * dt;
    if (right) this.player.x += 260 * dt;

    // Touch fire
    if (this.touchControls?.state.fire) {
      resumeAudio();
      sfxShoot();
      this.bullets.push({ x: this.player.x, y: this.player.y - 28, alive: true });
      this.bullets.push({ x: this.player.x - 10, y: this.player.y - 14, alive: true });
      this.bullets.push({ x: this.player.x + 10, y: this.player.y - 14, alive: true });
    }

    // Touch pause
    if (this.touchControls?.state.pause) {
      this.paused = !this.paused;
    }

    for (const b of this.banks) b.y += move;
    this.banks = this.banks.filter((b) => b.y < h + SEGMENT_H);
    this.generateBanks(-SEGMENT_H);

    const playerCx = this.bankXAt(this.player.y);
    const half = this.riverW / 2 - PLAYER_W / 2 - 6;
    this.player.x = Phaser.Math.Clamp(this.player.x, playerCx - half, playerCx + half);

    // Engine particles
    this.engineParticles.push({ x: this.player.x, y: this.player.y + PLAYER_H / 2, life: 0.4 });
    for (const p of this.engineParticles) { p.life -= dt; p.y += 30 * dt; }
    this.engineParticles = this.engineParticles.filter((p) => p.life > 0);

    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.y -= 520 * dt;
      if (b.y < -200) b.alive = false;
    }
    this.bullets = this.bullets.filter((b) => b.alive);

    this.spawnEnemies();
    this.spawnBridge();
    for (const e of this.enemies) {
      e.y += move;
      if (e.type === "heli" && e.speedX) {
        e.oscillate = (e.oscillate || 0) + e.speedX * dt * 0.05;
        const cx = this.bankXAt(e.y);
        e.x = cx + Math.sin(e.oscillate) * (this.riverW / 2 - 50);
      }
      if (e.type === "boat") {
        e.x += Math.sin(this.distance / 120 + e.y / 80) * 10 * dt;
      }
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ew2 = e.w / 2;
      const eh2 = e.h / 2;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      if (Math.abs(dx) < (PLAYER_W / 2 + ew2 - 6) && Math.abs(dy) < (PLAYER_H / 2 + eh2 - 6)) {
        if (e.type === "fuel") {
          this.fuel = Math.min(100, this.fuel + 35);
          this.score += 50;
          e.alive = false;
          sfxPickup();
          scorePop(this, e.x, e.y, "+50", HEX.yellow);
        } else {
          this.lives--;
          e.alive = false;
          this.addExplosion(this.player.x, this.player.y, PALETTE.red);
          if (this.lives <= 0) this.gameOver = true;
        }
        continue;
      }
      for (const b of this.bullets) {
        if (!b.alive) continue;
        if (Math.abs(b.x - e.x) < ew2 && Math.abs(b.y - e.y) < eh2) {
          b.alive = false;
          if (e.type !== "bridge") {
            e.alive = false;
            this.score += e.type === "fuel" ? 50 : 100;
            this.addExplosion(e.x, e.y, e.type === "fuel" ? PALETTE.yellow : PALETTE.orange);
            scorePop(this, e.x, e.y, e.type === "fuel" ? "+50" : "+100", e.type === "fuel" ? HEX.yellow : HEX.orange);
          } else {
            this.score += 300;
            this.addExplosion(e.x, e.y, PALETTE.red);
            scorePop(this, e.x, e.y, "+300", HEX.red);
            e.alive = false;
          }
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.y < h + 80);

    this.particles = updateParticles(this.particles, dt, this.speed * 0.4);

    if (this.fuel <= 0) {
      this.lives--;
      this.fuel = 50;
      this.addExplosion(this.player.x, this.player.y, PALETTE.red);
      if (this.lives <= 0) this.gameOver = true;
    }

    if (this.gameOver) {
      sfxGameOver();
      this.gameOverTimer = 0;
      this.gameOverZoom = 0;
      this.gameOverParticles = spawnExplosion(this, this.player.x, this.player.y, {
        count: 30, colors: [PALETTE.red, PALETTE.orange, PALETTE.yellow, PALETTE.cyan], speed: 150,
      });
    }

    this.draw();
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(false);
    const w = this.scale.width;
    const h = this.scale.height;

    // Background with stars
    this.bg.draw(g, w, h);
    updateStarField(this.stars, 0.016, 5, w, h);
    drawStarField(g, this.stars);

    // Mountains silhouette (parallax layer 2 - medium)
    const mountOffset = (this.distance * 0.1) % 400;
    drawMountainRange(g, w, h, mountOffset, 0x0d0f1e, 0.6, 60, 80, 40, 15);

    // Far mountains (parallax layer 1 - slow)
    const farMountOffset = (this.distance * 0.05) % 300;
    drawMountainRange(g, w, h, farMountOffset, 0x0a0c18, 0.4, 40, 120, 60, 10);

    // Water surface with wave texture
    if (this.banks.length > 1) {
      const left: [number, number][] = [];
      const right: [number, number][] = [];
      for (const p of this.banks) {
        left.push([p.x - this.riverW / 2, p.y]);
        right.push([p.x + this.riverW / 2, p.y]);
      }

      // River water fill
      g.fillStyle(0x0a0d1a, 0.8);
      g.beginPath();
      g.moveTo(left[0][0], left[0][1]);
      for (const [x, y] of left) g.lineTo(x, y);
      for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
      g.closePath();
      g.fillPath();

      // Animated water waves
      drawWaterWaves(g, w, h, this.waterTime, PALETTE.cyan, 0.08, 12, 8);

      // Water surface shimmer
      g.fillStyle(0xffffff, 0.03);
      for (let i = 0; i < 5; i++) {
        const sy = (this.waterTime * 40 + i * 80) % h;
        const cx = this.bankXAt(sy);
        g.fillRect(cx - 20, sy, 40, 2);
      }

      // Bank terrain (left)
      g.fillStyle(PALETTE.surfaceLight, 1);
      g.beginPath();
      g.moveTo(0, h);
      for (const [x, y] of left) g.lineTo(x, y);
      g.lineTo(0, left[left.length - 1]?.[1] ?? 0);
      g.closePath();
      g.fillPath();

      // Bank terrain (right)
      g.beginPath();
      g.moveTo(w, h);
      for (const [x, y] of right) g.lineTo(x, y);
      g.lineTo(w, right[right.length - 1]?.[1] ?? 0);
      g.closePath();
      g.fillPath();

      // Bank edge with glow
      g.lineStyle(3, PALETTE.accent, 0.3);
      g.beginPath();
      for (const [x, y] of left) g.lineTo(x, y);
      g.strokePath();
      g.beginPath();
      for (const [x, y] of right) g.lineTo(x, y);
      g.strokePath();

      // Bank edge inner bright line
      g.lineStyle(1, PALETTE.cyan, 0.15);
      g.beginPath();
      for (const [x, y] of left) g.lineTo(x, y);
      g.strokePath();
      g.beginPath();
      for (const [x, y] of right) g.lineTo(x, y);
      g.strokePath();
    }

    // Enemies
    for (const e of this.enemies) {
      const floatY = e.floatOff ? Math.sin(this.waterTime * 3 + e.floatOff) * 2 : 0;
      const ey = e.y + floatY;

      if (e.type === "bridge") {
        // Bridge with rivets
        drawSpriteBox(g, e.x - e.w / 2, ey - e.h / 2, e.w, e.h, {
          fillColor: PALETTE.surfaceLight,
          outline: { color: PALETTE.border, width: 2 },
          highlight: { x: 0.1, y: 0.1, size: 0.2, alpha: 0.2 },
          shadow: { offset: 2, alpha: 0.2 },
          cornerRadius: 3,
        });
        // Rivets
        g.fillStyle(PALETTE.border, 0.6);
        for (let i = -e.w / 2 + 20; i < e.w / 2; i += 40) {
          g.fillCircle(e.x + i, ey - e.h / 4, 2);
          g.fillCircle(e.x + i, ey + e.h / 4, 2);
        }
        // Bridge supports
        g.fillStyle(PALETTE.surface, 0.8);
        g.fillRect(e.x - e.w / 2 - 4, ey - e.h / 2, 4, e.h);
        g.fillRect(e.x + e.w / 2, ey - e.h / 2, 4, e.h);
      } else if (e.type === "fuel") {
        // Fuel can with glow
        g.fillStyle(PALETTE.yellow, 0.12);
        g.fillCircle(e.x, ey, e.w * 0.7);
        drawSpriteBox(g, e.x - e.w / 2, ey - e.h / 2, e.w, e.h, {
          fillColor: PALETTE.yellow,
          outline: { color: 0x854d0e, width: 2 },
          highlight: { x: 0.3, y: 0.2, size: 0.3, alpha: 0.5 },
          shadow: { offset: 2, alpha: 0.2 },
          cornerRadius: 6,
        });
        // Fuel label
        g.fillStyle(0x000000, 0.5);
        g.fillRect(e.x - 6, ey - 5, 12, 10);
        const fuelLabel = this.add.text(e.x, ey, "F", { fontSize: "12px", color: HEX.yellow, fontFamily: "'Inter', sans-serif", fontStyle: "bold" }).setOrigin(0.5);
        this.overlay.add(fuelLabel);
      } else if (e.type === "boat") {
        // Boat with cabin
        drawSpriteBox(g, e.x - e.w / 2, ey - e.h / 2, e.w, e.h, {
          fillColor: PALETTE.accentSoft,
          outline: { color: 0x3730a3, width: 2 },
          highlight: { x: 0.2, y: 0.2, size: 0.3, alpha: 0.4 },
          shadow: { offset: 2, alpha: 0.2 },
          cornerRadius: 4,
        });
        // Cabin
        g.fillStyle(PALETTE.surfaceLight, 0.8);
        g.fillRect(e.x - 6, ey - e.h / 2 - 6, 12, 8);
        // Chimney smoke
        g.fillStyle(0x94a3b8, 0.3);
        g.fillCircle(e.x, ey - e.h / 2 - 8, 3);
        g.fillStyle(0x94a3b8, 0.15);
        g.fillCircle(e.x + 2, ey - e.h / 2 - 12, 4);
      } else if (e.type === "heli") {
        // Helicopter body
        drawSpriteBox(g, e.x - e.w / 2, ey - e.h / 2, e.w, e.h, {
          fillColor: PALETTE.red,
          outline: { color: 0x991b1b, width: 2 },
          highlight: { x: 0.2, y: 0.2, size: 0.3, alpha: 0.4 },
          shadow: { offset: 2, alpha: 0.2 },
          cornerRadius: 5,
        });
        // Cockpit
        g.fillStyle(PALETTE.cyan, 0.3);
        g.fillCircle(e.x, ey - 2, 5);
        // Rotor blades (animated)
        const rotorAngle = this.waterTime * 20;
        g.lineStyle(2, PALETTE.surfaceLight, 0.8);
        const rLen = e.w * 0.7;
        g.lineBetween(
          e.x - Math.cos(rotorAngle) * rLen, ey - e.h / 2 - Math.sin(rotorAngle) * rLen,
          e.x + Math.cos(rotorAngle) * rLen, ey - e.h / 2 + Math.sin(rotorAngle) * rLen,
        );
        g.lineBetween(
          e.x - Math.cos(rotorAngle + Math.PI / 2) * rLen * 0.5, ey - e.h / 2 - Math.sin(rotorAngle + Math.PI / 2) * rLen * 0.5,
          e.x + Math.cos(rotorAngle + Math.PI / 2) * rLen * 0.5, ey - e.h / 2 + Math.sin(rotorAngle + Math.PI / 2) * rLen * 0.5,
        );
        // Rotor blur
        g.fillStyle(0xffffff, 0.08);
        g.fillCircle(e.x, ey - e.h / 2, e.w * 0.5);
        // Tail
        g.fillStyle(PALETTE.red, 0.6);
        g.fillRect(e.x + e.w / 2, ey - 2, 8, 4);
      }
    }

    // Bullets with glow
    for (const b of this.bullets) {
      g.fillStyle(PALETTE.yellow, 0.2);
      g.fillCircle(b.x, b.y, 6);
      g.fillStyle(PALETTE.yellow, 0.6);
      g.fillCircle(b.x, b.y, 3);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(b.x, b.y, 1.5);
    }

    // Particles
    drawParticles(g, this.particles);

    // Engine exhaust particles
    for (const p of this.engineParticles) {
      g.fillStyle(PALETTE.cyan, p.life * 0.4);
      g.fillCircle(p.x, p.y, 3 * p.life);
    }

    // Player ship with 3D detail
    const px = this.player.x;
    const py = this.player.y;

    // Engine glow (pulsating)
    const glowPulse = 0.08 + Math.sin(this.engineGlowPulse) * 0.04;
    g.fillStyle(PALETTE.cyan, glowPulse);
    g.fillCircle(px, py + PLAYER_H / 2 + 8, 14);
    g.fillStyle(PALETTE.cyan, glowPulse * 2);
    g.fillCircle(px, py + PLAYER_H / 2 + 6, 8);

    // Ship body
    drawSpriteTriangle(g,
      px, py - PLAYER_H / 2,
      px + PLAYER_W / 2, py + PLAYER_H / 2,
      px - PLAYER_W / 2, py + PLAYER_H / 2,
      {
        fillColor: PALETTE.cyan,
        outline: { color: 0x0891b2, width: 2 },
        glow: { color: PALETTE.cyan, alpha: 0.15, size: 20 },
      },
    );

    // Cockpit
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(px, py - 8, 5);

    // Wing details
    g.fillStyle(0x0891b2, 0.5);
    g.fillTriangle(px - PLAYER_W / 2 + 2, py + PLAYER_H / 2 - 2, px - PLAYER_W / 2 - 6, py + PLAYER_H / 2 + 8, px - PLAYER_W / 4, py + PLAYER_H / 2 - 2);
    g.fillTriangle(px + PLAYER_W / 2 - 2, py + PLAYER_H / 2 - 2, px + PLAYER_W / 2 + 6, py + PLAYER_H / 2 + 8, px + PLAYER_W / 4, py + PLAYER_H / 2 - 2);

    // HUD
    this.scoreText.setText(String(this.score));
    this.distanceText.setText(`${Math.floor(this.distance / 10)}m`);
    this.livesText.setText(String(this.lives));

    // Fuel bar styled
    const fuelW = 160;
    const fuelH = 10;
    const fuelX = w - fuelW - 20;
    const fuelY = 28;
    const pct = Phaser.Math.Clamp(this.fuel / 100, 0, 1);
    const fuelColor = this.fuel < 25 ? PALETTE.red : (this.fuel < 50 ? PALETTE.yellow : PALETTE.lime);
    drawProgressBar(g, fuelX, fuelY, fuelW, fuelH, pct, fuelColor, PALETTE.border);
    this.fuelLabelText.setPosition(fuelX, fuelY - 8).setVisible(true);

    // Fuel low warning blink
    if (this.fuel < 25 && Math.floor(this.waterTime * 4) % 2 === 0) {
      g.lineStyle(2, PALETTE.red, 0.4);
      g.strokeRoundedRect(fuelX - 2, fuelY - 2, fuelW + 4, fuelH + 4, 5);
    }

    const instrSize = responsiveFontSize(13, w, h, 9, 16);
    this.instructionsText.setPosition(20, h - 26).setVisible(true).setFontSize(instrSize);

    // Touch controls overlay
    this.touchControls?.draw(g);

    // Game over with zoom transition
    if (this.gameOver) {
      const zoom = this.gameOverZoom;
      const alpha = Math.min(0.7, zoom * 0.7);

      g.fillStyle(0x000000, alpha);
      g.fillRect(0, 0, w, h);

      // Zooming border
      const borderInset = 40 * (1 - zoom * 0.5);
      g.lineStyle(2, PALETTE.cyan, 0.2 + zoom * 0.2);
      g.strokeRect(borderInset, borderInset, w - borderInset * 2, h - borderInset * 2);

      const cx = w / 2;
      const cy = h / 2;

      // Game over text scales in
      const textScale = Math.min(1, zoom * 1.5);
      this.gameOverText.setPosition(cx, cy - 10).setVisible(true).setScale(textScale);
      this.statsText.setText(`${this.score} · ${Math.floor(this.distance / 10)}m`).setPosition(cx, cy + 34).setVisible(true).setAlpha(zoom);
      this.restartHintText.setPosition(cx, cy + 62).setVisible(true).setAlpha(Math.max(0, zoom * 2 - 1));

      // Game over particles
      drawParticles(g, this.gameOverParticles);
    } else {
      this.gameOverText.setVisible(false);
      this.statsText.setVisible(false);
      this.restartHintText.setVisible(false);
    }
  }
}

export const createRiverRaidGame: PhaserGameFactory = (parent) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 700,
    height: 700,
    backgroundColor: HEX.bg,
    scene: [RiverRaidScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
};
