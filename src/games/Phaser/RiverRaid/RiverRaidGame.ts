import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";

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
  private paused = false;
  private speed = 160;
  private riverW = 260;
  private targetRiverW = 260;
  private riverCenter = 0;
  private banks: BankPoint[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: number }[] = [];
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

  constructor() { super("RiverRaid"); }

  create() {
    this.graphics = this.add.graphics();
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
    this.scale.on("resize", () => this.draw(), this);
    this.events.on('shutdown', () => {
      this.input.keyboard?.off("keydown", this.handleKey, this);
      this.scale.off("resize", this.draw, this);
    });
    this.reset();
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
    this.nextSpawnY = -200;
    this.nextBridgeY = -1200;
    this.gameOver = false;
    this.paused = false;
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
    if (this.gameOver) return;
    if (e.code === "KeyP") { this.paused = !this.paused; return; }
    if (e.code === "Space") {
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

  private isInRiver(x: number, y: number): boolean {
    const cx = this.bankXAt(y);
    return Math.abs(x - cx) < this.riverW / 2 - 8;
  }

  private spawnEnemies() {
    const h = this.scale.height;
    if (this.nextSpawnY > -h) return;
    const y = this.nextSpawnY;
    const cx = this.bankXAt(y);
    const half = this.riverW / 2 - 40;
    const typeRoll = Math.random();
    if (typeRoll < 0.15) {
      this.enemies.push({ x: cx + Phaser.Math.Between(-half, half), y, w: 28, h: 28, type: "fuel", alive: true });
    } else if (typeRoll < 0.45) {
      this.enemies.push({ x: cx + Phaser.Math.Between(-half, half), y, w: 34, h: 22, type: "boat", alive: true });
    } else if (typeRoll < 0.75) {
      this.enemies.push({
        x: cx + Phaser.Math.Between(-half, half), y, w: 36, h: 24,
        type: "heli", alive: true, oscillate: Math.random() * Math.PI * 2, speedX: 40 + Math.random() * 60,
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
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 30 + Math.random() * 70;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.4 + Math.random() * 0.4,
        color,
      });
    }
  }

  override update(_t: number, delta: number) {
    if (this.gameOver || this.paused) return;
    const dt = delta / 1000;
    const w = this.scale.width;
    const h = this.scale.height;

    // auto scroll
    const move = this.speed * dt;
    this.distance += move / 10;
    this.fuel = Math.max(0, this.fuel - dt * 1.8);
    this.speed = Math.min(380, 160 + this.distance / 250);

    // river width meander
    this.targetRiverW = RIVER_W_MIN + (RIVER_W_MAX - RIVER_W_MIN) * (0.6 + 0.4 * Math.sin(this.distance / 800));
    this.riverW += (this.targetRiverW - this.riverW) * dt * 0.5;

    // input
    const left = this.keyLeft.isDown || this.keyA.isDown;
    const right = this.keyRight.isDown || this.keyD.isDown;
    if (left) this.player.x -= 260 * dt;
    if (right) this.player.x += 260 * dt;

    // banks
    for (const b of this.banks) b.y += move;
    this.banks = this.banks.filter((b) => b.y < h + SEGMENT_H);
    this.generateBanks(-SEGMENT_H);

    // clamp player to river
    const playerCx = this.bankXAt(this.player.y);
    const half = this.riverW / 2 - PLAYER_W / 2 - 6;
    this.player.x = Phaser.Math.Clamp(this.player.x, playerCx - half, playerCx + half);

    // bullets
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.y -= 520 * dt;
      if (b.y < -200) b.alive = false;
    }
    this.bullets = this.bullets.filter((b) => b.alive);

    // enemies
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

    // collisions
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ew2 = e.w / 2;
      const eh2 = e.h / 2;
      // player collision
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      if (Math.abs(dx) < (PLAYER_W / 2 + ew2 - 6) && Math.abs(dy) < (PLAYER_H / 2 + eh2 - 6)) {
        if (e.type === "fuel") {
          this.fuel = Math.min(100, this.fuel + 35);
          this.score += 50;
          e.alive = false;
        } else {
          this.lives--;
          e.alive = false;
          this.addExplosion(this.player.x, this.player.y, PALETTE.red);
          if (this.lives <= 0) this.gameOver = true;
        }
        continue;
      }
      // bullet collision
      for (const b of this.bullets) {
        if (!b.alive) continue;
        if (Math.abs(b.x - e.x) < ew2 && Math.abs(b.y - e.y) < eh2) {
          b.alive = false;
          if (e.type !== "bridge") {
            e.alive = false;
            this.score += e.type === "fuel" ? 50 : 100;
            this.addExplosion(e.x, e.y, e.type === "fuel" ? PALETTE.yellow : PALETTE.orange);
          } else {
            this.score += 300;
            this.addExplosion(e.x, e.y, PALETTE.red);
            e.alive = false;
          }
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.y < h + 80);

    // particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.y += move * 0.4;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // fuel empty
    if (this.fuel <= 0) {
      this.lives--;
      this.fuel = 50;
      this.addExplosion(this.player.x, this.player.y, PALETTE.red);
      if (this.lives <= 0) this.gameOver = true;
    }

    this.draw();
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(true);
    const w = this.scale.width;
    const h = this.scale.height;

    g.fillStyle(PALETTE.bg, 1);
    g.fillRect(0, 0, w, h);

    // water lane stripes (subtle motion)
    g.fillStyle(PALETTE.surface, 1);
    for (let y = Math.floor(-this.distance) % 120 - 120; y < h; y += 120) {
      g.fillRect(0, y, w, 60);
    }

    // banks (solid surface terrain)
    if (this.banks.length > 1) {
      const left: [number, number][] = [];
      const right: [number, number][] = [];
      for (const p of this.banks) {
        left.push([p.x - this.riverW / 2, p.y]);
        right.push([p.x + this.riverW / 2, p.y]);
      }
      g.fillStyle(PALETTE.surfaceLight, 1);
      g.beginPath();
      g.moveTo(0, h);
      for (const [x, y] of left) g.lineTo(x, y);
      g.lineTo(0, left[left.length - 1]?.[1] ?? 0);
      g.closePath();
      g.fillPath();

      g.beginPath();
      g.moveTo(w, h);
      for (const [x, y] of right) g.lineTo(x, y);
      g.lineTo(w, right[right.length - 1]?.[1] ?? 0);
      g.closePath();
      g.fillPath();

      // bank inner neon edge
      g.lineStyle(3, PALETTE.accent, 0.35);
      g.beginPath();
      for (const [x, y] of left) g.lineTo(x, y);
      g.strokePath();
      g.lineStyle(3, PALETTE.accent, 0.35);
      g.beginPath();
      for (const [x, y] of right) g.lineTo(x, y);
      g.strokePath();
    }

    // enemies
    for (const e of this.enemies) {
      if (e.type === "bridge") {
        g.fillStyle(PALETTE.surfaceLight, 1);
        g.fillRoundedRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, 4);
        g.fillStyle(PALETTE.border, 1);
        for (let i = -e.w / 2 + 20; i < e.w / 2; i += 40) {
          g.fillRect(e.x + i - 3, e.y - e.h / 2, 6, e.h);
        }
      } else if (e.type === "fuel") {
        g.fillStyle(PALETTE.yellow, 0.25);
        g.fillCircle(e.x, e.y, e.w * 0.6);
        g.fillStyle(PALETTE.yellow, 1);
        g.fillRoundedRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, 6);
        const fuelLabel = this.add.text(e.x, e.y, "F", { fontSize: "14px", color: HEX.bg, fontFamily: "'Inter', sans-serif", fontStyle: "bold" }).setOrigin(0.5);
        this.overlay.add(fuelLabel);
      } else if (e.type === "boat") {
        g.fillStyle(PALETTE.accent, 0.25);
        g.fillRoundedRect(e.x - e.w / 2 - 4, e.y - e.h / 2 - 4, e.w + 8, e.h + 8, 6);
        g.fillStyle(PALETTE.accentSoft, 1);
        g.fillRoundedRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, 5);
      } else if (e.type === "heli") {
        g.fillStyle(PALETTE.red, 0.25);
        g.fillCircle(e.x, e.y, e.w * 0.7);
        g.fillStyle(PALETTE.red, 1);
        g.fillRoundedRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, 5);
        g.fillStyle(PALETTE.surfaceLight, 1);
        g.fillRect(e.x - e.w * 0.7, e.y - 2, e.w * 1.4, 4);
      }
    }

    // bullets
    for (const b of this.bullets) {
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(b.x, b.y, 3);
      g.fillStyle(PALETTE.yellow, 0.35);
      g.fillCircle(b.x, b.y + 8, 5);
    }

    // particles
    for (const p of this.particles) {
      const alpha = Phaser.Math.Clamp(p.life * 2, 0, 1);
      g.fillStyle(p.color, alpha);
      g.fillCircle(p.x, p.y, 3 + p.life * 4);
    }

    // player jet
    const px = this.player.x;
    const py = this.player.y;
    g.fillStyle(PALETTE.cyan, 0.35);
    g.fillRoundedRect(px - PLAYER_W / 2 - 6, py - PLAYER_H / 2 - 6, PLAYER_W + 12, PLAYER_H + 12, 8);
    g.fillStyle(PALETTE.cyan, 1);
    g.beginPath();
    g.moveTo(px, py - PLAYER_H / 2);
    g.lineTo(px + PLAYER_W / 2, py + PLAYER_H / 2);
    g.lineTo(px - PLAYER_W / 2, py + PLAYER_H / 2);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(px, py - 8, 5);
    g.fillStyle(PALETTE.cyan, 0.5);
    g.fillTriangle(px - 8, py + PLAYER_H / 2, px + 8, py + PLAYER_H / 2, px, py + PLAYER_H / 2 + 18);

    // HUD: keep all numbers aligned in columns on the left, fuel on the right
    this.scoreText.setText(String(this.score));
    this.distanceText.setText(`${Math.floor(this.distance / 10)}m`);
    this.livesText.setText(String(this.lives));

    // FUEL on the right
    const fuelW = 160;
    const fuelH = 8;
    const fuelX = w - fuelW - 20;
    const fuelY = 28;
    g.fillStyle(PALETTE.surfaceLight, 1);
    g.fillRoundedRect(fuelX, fuelY, fuelW, fuelH, 4);
    const pct = Phaser.Math.Clamp(this.fuel / 100, 0, 1);
    g.fillStyle(this.fuel < 25 ? PALETTE.red : PALETTE.lime, 1);
    g.fillRoundedRect(fuelX, fuelY, fuelW * pct, fuelH, 4);
    g.lineStyle(1, PALETTE.border, 1);
    g.strokeRoundedRect(fuelX, fuelY, fuelW, fuelH, 4);
    this.fuelLabelText.setPosition(fuelX, fuelY - 8).setVisible(true);

    // instructions at bottom (same margin everywhere)
    this.instructionsText.setPosition(20, h - 26).setVisible(true);

    if (this.gameOver) {
      g.fillStyle(0x000000, 0.6);
      g.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      this.gameOverText.setPosition(cx, cy - 10).setVisible(true);
      this.statsText.setText(`${this.score} · ${Math.floor(this.distance / 10)}m`).setPosition(cx, cy + 34).setVisible(true);
      this.restartHintText.setPosition(cx, cy + 62).setVisible(true);
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
