import Phaser from "phaser";
import type { PhaserGameFactory } from "../shared/types";
import { PALETTE, HEX, FONTS } from "../shared/theme";
import { fadeInScene, screenShake, scorePop } from "../shared/effects";
import { spawnExplosion, updateParticles, drawParticles } from "../shared/particles";
import {
  GradientBackground, createStarField, updateStarField, drawStarField,
  drawSpriteBox, drawSpriteCircle, drawSpriteTriangle, drawPanel,
} from "../shared/backgrounds";
import { sfxShoot, sfxExplosion, sfxHit, sfxGameOver, resumeAudio } from "../shared/sound";
import { TouchControlsManager, responsiveFontSize } from "../shared/touchControls";

const ROWS = 5;
const COLS = 8;

interface Bullet { x: number; y: number; }
interface Alien { x: number; y: number; alive: boolean; index: number; floatOff: number; blinkTimer: number; }

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
  private gameOverTimer = 0;
  private gameOverFlash = 0;
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
  private bg!: GradientBackground;
  private stars: { x: number; y: number; size: number; alpha: number; speed: number; }[] = [];
  private engineParticles: { x: number; y: number; life: number; }[] = [];
  private alienFloatTimer = 0;
  private engineGlowPulse = 0;
  private bulletParticles: { x: number; y: number; life: number; color: number; }[] = [];
  private gameOverParticles: { x: number; y: number; life: number; maxLife: number; color: number; size: number; vx: number; vy: number; }[] = [];
  private touchControls!: TouchControlsManager;

  constructor() { super("SpaceInvaders"); }

  create() {
    this.graphics = this.add.graphics();
    this.bg = new GradientBackground(this, {
      layers: [
        { speed: 0.01, colors: [0x05070e, 0x0b0d17, 0x0f1220], height: 1 },
      ],
      scanlines: true,
      vignette: true,
    });
    this.stars = createStarField(700, 700, 100);

    // HUD panel
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
    this.touchControls = new TouchControlsManager(this, "SpaceInvaders");
    this.reset();
    fadeInScene(this, 300);
  }

  private onShutdown() {
    this.input.keyboard?.off("keydown", this.handleKey, this);
    this.scale.off("resize", this.draw, this);
    this.touchControls?.destroy();
  }

  private reset() {
    this.bullets = [];
    this.aliens = [];
    this.engineParticles = [];
    this.bulletParticles = [];
    this.gameOverParticles = [];
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.gameOverTimer = 0;
    this.gameOverFlash = 0;
    this.paused = false;
    this.alienDir = 1;
    this.alienSpeed = 0.6;
    this.alienFloatTimer = 0;
    this.engineGlowPulse = 0;
    this.layout();
    this.playerX = this.playW / 2 - this.playerW / 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.aliens.push({ x: 50 * this.scale_ + c * 50 * this.scale_, y: 40 * this.scale_ + r * 40 * this.scale_, alive: true, index: r * COLS + c, floatOff: Math.random() * Math.PI * 2, blinkTimer: 0 });
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
      resumeAudio();
      sfxShoot();
      this.bullets.push({ x: this.playerX + this.playerW / 2, y: this.playH - 30 * this.scale_ });
    }
  }

  private aliveCount() { return this.aliens.filter((a) => a.alive).length; }

  override update(_t: number, delta: number) {
    if (this.gameOver) {
      this.gameOverTimer += delta / 1000;
      this.gameOverFlash += delta / 1000;
      // Update game over particles
      for (const p of this.gameOverParticles) {
        p.x += p.vx * delta / 1000;
        p.y += p.vy * delta / 1000;
        p.vy += 60 * delta / 1000;
        p.life -= delta / 1000;
      }
      this.gameOverParticles = this.gameOverParticles.filter((p) => p.life > 0);
      this.draw();
      return;
    }
    if (this.paused) return;
    const dt = delta / 1000;
    this.layout();
    this.touchControls?.update();
    const left = this.keyLeft.isDown || this.keyA.isDown || this.touchControls?.state.left;
    const right = this.keyRight.isDown || this.keyD.isDown || this.touchControls?.state.right;
    if (left) this.playerX -= 300 * this.scale_ * dt;
    if (right) this.playerX += 300 * this.scale_ * dt;

    // Touch fire
    if (this.touchControls?.state.fire) {
      resumeAudio();
      sfxShoot();
      this.bullets.push({ x: this.playerX + this.playerW / 2, y: this.playH - 30 * this.scale_ });
    }

    // Touch pause
    if (this.touchControls?.state.pause) {
      this.paused = !this.paused;
    }
    this.playerX = Phaser.Math.Clamp(this.playerX, 0, this.playW - this.playerW);

    // Engine glow pulse
    this.engineGlowPulse += dt * 5;

    // Engine particles
    this.engineParticles.push({ x: this.playerX + this.playerW / 2, y: this.playH - 10 * this.scale_, life: 0.3 });
    for (const p of this.engineParticles) { p.life -= dt; p.y += 20 * dt; }
    this.engineParticles = this.engineParticles.filter((p) => p.life > 0);

    // Bullet trail particles
    for (const b of this.bullets) {
      this.bulletParticles.push({ x: b.x, y: b.y + 5, life: 0.2, color: PALETTE.yellow });
    }
    for (const p of this.bulletParticles) { p.life -= dt; p.y += 10 * dt; }
    this.bulletParticles = this.bulletParticles.filter((p) => p.life > 0);

    // Alien float animation
    this.alienFloatTimer += dt;

    this.alienTimer += dt;
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
          screenShake(this, 0.004, 200);
          if (this.lives <= 0) this.gameOver = true;
          else { for (const b of this.aliens) if (b.alive) { const col = b.index % COLS; const row = Math.floor(b.index / COLS); b.x = 50 * this.scale_ + col * 50 * this.scale_; b.y = 40 * this.scale_ + row * 40 * this.scale_; } this.bullets = []; }
        }
      }
    }

    const aw = 30 * this.scale_, ah = 20 * this.scale_;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y -= 400 * this.scale_ * dt;
      if (b.y < 0) { this.bullets.splice(i, 1); continue; }
      for (const a of this.aliens) {
        if (!a.alive) continue;
        if (b.x > a.x && b.x < a.x + aw && b.y > a.y && b.y < a.y + ah) {
          a.alive = false;
          this.score += 10;
          this.alienSpeed += 0.05;
          this.bullets.splice(i, 1);
          sfxHit();
          // Explosion particles
          const ex = this.ox + b.x;
          const ey = this.oy + b.y;
          const newParts = spawnExplosion(this, ex, ey, {
            count: 12, colors: [PALETTE.green, PALETTE.lime, PALETTE.yellow], speed: 80,
          });
          // We'll add these to a particle array
          for (const p of newParts) {
            this.gameOverParticles.push({ ...p, vx: p.vx, vy: p.vy });
          }
          scorePop(this, ex, ey, "+10", HEX.lime);
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

    if (this.gameOver) {
      sfxGameOver();
      this.gameOverTimer = 0;
      this.gameOverFlash = 0;
      // Big explosion
      const px = this.ox + this.playerX + this.playerW / 2;
      const py = this.oy + this.playH - 20 * this.scale_;
      const newParts = spawnExplosion(this, px, py, {
        count: 30, colors: [PALETTE.red, PALETTE.orange, PALETTE.yellow, PALETTE.cyan], speed: 150,
      });
      for (const p of newParts) {
        this.gameOverParticles.push({ ...p, vx: p.vx, vy: p.vy });
      }
    }

    this.draw();
  }

  private draw() {
    this.layout();
    const g = this.graphics;
    g.clear();
    this.overlay.removeAll(false);
    const w = this.scale.width;
    const h = this.scale.height;

    // Background with stars (parallax scrolling)
    this.bg.draw(g, w, h);
    updateStarField(this.stars, 0.016, 20, w, h);
    drawStarField(g, this.stars);

    // Instructions (responsive)
    const instrSize = responsiveFontSize(13, w, h, 9, 16);
    this.instructionsText.setPosition(20, h - 26).setVisible(true).setFontSize(instrSize);

    // Play area panel
    drawPanel(g, this.ox - 8, this.oy - 8, this.playW + 16, this.playH + 16, {
      borderColor: PALETTE.accent,
      borderWidth: 2,
      shadowOffset: 4,
      cornerRadius: 12,
      fillColor: PALETTE.surface,
    });

    // Play area background (darker)
    g.fillStyle(0x080a14, 0.6);
    g.fillRect(this.ox, this.oy, this.playW, this.playH);

    // Grid lines in play area
    g.lineStyle(1, PALETTE.accent, 0.06);
    for (let x = this.ox; x <= this.ox + this.playW; x += 30 * this.scale_) {
      g.lineBetween(x, this.oy, x, this.oy + this.playH);
    }
    for (let y = this.oy; y <= this.oy + this.playH; y += 30 * this.scale_) {
      g.lineBetween(this.ox, y, this.ox + this.playW, y);
    }

    // Bullet trail particles
    for (const p of this.bulletParticles) {
      g.fillStyle(p.color, p.life * 0.4);
      g.fillCircle(this.ox + p.x, this.oy + p.y, 2 * p.life);
    }

    // Player ship with 3D shading
    const pw = this.playerW, ph = 20 * this.scale_;
    const sx = this.ox + this.playerX;
    const sy = this.oy + this.playH - ph - 10 * this.scale_;

    // Engine glow (pulsating)
    const glowPulse = 0.1 + Math.sin(this.engineGlowPulse) * 0.06;
    g.fillStyle(PALETTE.cyan, glowPulse);
    g.fillCircle(sx + pw / 2, sy + ph + 6, pw * 0.6);
    g.fillStyle(PALETTE.cyan, glowPulse * 2);
    g.fillCircle(sx + pw / 2, sy + ph + 4, pw * 0.35);

    // Engine particles
    for (const p of this.engineParticles) {
      g.fillStyle(PALETTE.cyan, p.life * 0.5);
      g.fillCircle(this.ox + p.x, this.oy + p.y, 2 * p.life * this.scale_);
    }

    // Ship body
    drawSpriteBox(g, sx, sy, pw, ph, {
      fillColor: PALETTE.cyan,
      outline: { color: 0x0891b2, width: 2 },
      highlight: { x: 0.25, y: 0.2, size: 0.3, alpha: 0.5 },
      shadow: { offset: 3, alpha: 0.3 },
      cornerRadius: 4,
    });

    // Ship cockpit
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(sx + pw * 0.5, sy + ph * 0.35, pw * 0.12);

    // Ship wings detail
    g.fillStyle(0x0891b2, 0.5);
    g.fillTriangle(sx + 2, sy + ph - 2, sx - 4, sy + ph + 6, sx + pw * 0.3, sy + ph - 2);
    g.fillTriangle(sx + pw - 2, sy + ph - 2, sx + pw + 4, sy + ph + 6, sx + pw * 0.7, sy + ph - 2);

    // Bullets with glow trail
    const bw = 4 * this.scale_, bh = 10 * this.scale_;
    for (const b of this.bullets) {
      g.fillStyle(PALETTE.yellow, 0.2);
      g.fillCircle(this.ox + b.x, this.oy + b.y + bh / 2, bw * 2.5);
      g.fillStyle(PALETTE.yellow, 0.5);
      g.fillCircle(this.ox + b.x, this.oy + b.y + bh / 2, bw * 1.2);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(this.ox + b.x, this.oy + b.y + bh / 2, bw * 0.5);
      // Trail
      g.fillStyle(PALETTE.yellow, 0.15);
      g.fillCircle(this.ox + b.x, this.oy + b.y + bh / 2 + 6, bw * 0.8);
    }

    // Aliens with 3D detail and float animation
    const aw = 30 * this.scale_, ah = 20 * this.scale_;
    for (const a of this.aliens) if (a.alive) {
      const floatY = Math.sin(this.alienFloatTimer * 2 + a.floatOff) * 4 * this.scale_;
      const ax = this.ox + a.x;
      const ay = this.oy + a.y + floatY;
      const alienColor = (a.index % 3 === 0) ? PALETTE.green : ((a.index % 3 === 1) ? PALETTE.lime : PALETTE.accentSoft);
      const darkColor = (a.index % 3 === 0) ? 0x166534 : ((a.index % 3 === 1) ? 0x4d7c0f : 0x3730a3);

      // Alien glow
      g.fillStyle(alienColor, 0.1);
      g.fillCircle(ax + aw / 2, ay + ah / 2, aw * 0.7);

      // Alien body
      drawSpriteBox(g, ax, ay, aw, ah, {
        fillColor: alienColor,
        outline: { color: darkColor, width: 2 },
        highlight: { x: 0.25, y: 0.2, size: 0.3, alpha: 0.4 },
        shadow: { offset: 2, alpha: 0.2 },
        cornerRadius: 5,
      });

      // Alien eyes (blink occasionally)
      const blink = Math.sin(this.alienFloatTimer * 3 + a.floatOff * 2) > 0.8;
      if (!blink) {
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(ax + aw * 0.3, ay + ah * 0.3, aw * 0.1);
        g.fillCircle(ax + aw * 0.7, ay + ah * 0.3, aw * 0.1);
        g.fillStyle(0x000000, 0.8);
        g.fillCircle(ax + aw * 0.3, ay + ah * 0.3, aw * 0.05);
        g.fillCircle(ax + aw * 0.7, ay + ah * 0.3, aw * 0.05);
      }

      // Alien mouth/teeth
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(ax + aw * 0.2, ay + ah * 0.6, aw * 0.6, ah * 0.15);
      g.fillStyle(darkColor, 0.5);
      for (let t = 0; t < 3; t++) {
        g.fillRect(ax + aw * (0.25 + t * 0.2), ay + ah * 0.6, aw * 0.08, ah * 0.15);
      }

      // Alien antenna
      g.lineStyle(1, darkColor, 0.6);
      g.lineBetween(ax + aw * 0.3, ay, ax + aw * 0.3, ay - 4 * this.scale_);
      g.lineBetween(ax + aw * 0.7, ay, ax + aw * 0.7, ay - 4 * this.scale_);
      g.fillStyle(PALETTE.yellow, 0.6);
      g.fillCircle(ax + aw * 0.3, ay - 4 * this.scale_, 1.5 * this.scale_);
      g.fillCircle(ax + aw * 0.7, ay - 4 * this.scale_, 1.5 * this.scale_);
    }

    // Game over particles
    for (const p of this.gameOverParticles) {
      const alpha = Phaser.Math.Clamp(p.life / p.maxLife * 1.5, 0, 1);
      const radius = p.size * (0.3 + 0.7 * (p.life / p.maxLife));
      g.fillStyle(p.color, alpha);
      g.fillCircle(p.x, p.y, radius);
    }

    // Game over overlay with flash transition
    if (this.gameOver) {
      // Flash effect
      const flashAlpha = Math.max(0, 0.8 - this.gameOverTimer * 2);
      if (flashAlpha > 0) {
        g.fillStyle(0xffffff, flashAlpha);
        g.fillRect(this.ox, this.oy, this.playW, this.playH);
      }

      const alpha = Math.min(0.6, this.gameOverTimer * 2);
      g.fillStyle(0x000000, alpha);
      g.fillRect(this.ox, this.oy, this.playW, this.playH);

      // Decorative border
      const borderPulse = 0.2 + Math.sin(this.gameOverTimer * 3) * 0.1;
      g.lineStyle(2, PALETTE.cyan, borderPulse);
      g.strokeRect(this.ox + 20, this.oy + 20, this.playW - 40, this.playH - 40);

      // Inner decorative corners
      const cornerSize = 20;
      g.lineStyle(2, PALETTE.accent, 0.3);
      // Top-left
      g.lineBetween(this.ox + 20, this.oy + 20, this.ox + 20 + cornerSize, this.oy + 20);
      g.lineBetween(this.ox + 20, this.oy + 20, this.ox + 20, this.oy + 20 + cornerSize);
      // Top-right
      g.lineBetween(this.ox + this.playW - 20, this.oy + 20, this.ox + this.playW - 20 - cornerSize, this.oy + 20);
      g.lineBetween(this.ox + this.playW - 20, this.oy + 20, this.ox + this.playW - 20, this.oy + 20 + cornerSize);
      // Bottom-left
      g.lineBetween(this.ox + 20, this.oy + this.playH - 20, this.ox + 20 + cornerSize, this.oy + this.playH - 20);
      g.lineBetween(this.ox + 20, this.oy + this.playH - 20, this.ox + 20, this.oy + this.playH - 20 - cornerSize);
      // Bottom-right
      g.lineBetween(this.ox + this.playW - 20, this.oy + this.playH - 20, this.ox + this.playW - 20 - cornerSize, this.oy + this.playH - 20);
      g.lineBetween(this.ox + this.playW - 20, this.oy + this.playH - 20, this.ox + this.playW - 20, this.oy + this.playH - 20 - cornerSize);

      const cx = this.ox + this.playW / 2;
      const cy = this.oy + this.playH / 2;

      const textAlpha = Math.min(1, (this.gameOverTimer - 0.3) * 2);
      this.gameOverText.setPosition(cx, cy - 8).setVisible(true).setAlpha(textAlpha);
      this.restartHintText.setPosition(cx, cy + 30).setVisible(true).setAlpha(Math.max(0, (this.gameOverTimer - 0.8) * 2));
    } else {
      this.gameOverText.setVisible(false);
      this.restartHintText.setVisible(false);
    }

    // Touch controls overlay
    this.touchControls?.draw(g);
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
