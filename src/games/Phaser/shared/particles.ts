// Shared particle system for late.kodingvibes.com Phaser mini-games.
// Explosions, sparkle trails, and generic particle management.

import Phaser from "phaser";
import { PALETTE } from "./theme";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface ExplosionConfig {
  count?: number;
  colors?: number[];
  speed?: number;
  sizeMin?: number;
  sizeMax?: number;
  gravity?: number;
}

const DEFAULT_COLORS = [PALETTE.orange, PALETTE.yellow, PALETTE.red, PALETTE.accent];

/**
 * Spawn an explosion at (x, y).
 * Returns an array of Particle objects the game must manage in its update loop.
 */
export function spawnExplosion(
  _scene: Phaser.Scene,
  x: number,
  y: number,
  config: ExplosionConfig = {},
): Particle[] {
  const {
    count = 15,
    colors = DEFAULT_COLORS,
    speed = 80,
    sizeMin = 2,
    sizeMax = 5,
    gravity = 0,
  } = config;

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    const life = 0.3 + Math.random() * 0.4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life,
      maxLife: life,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
    });
  }
  return particles;
}

/**
 * Spawn a small sparkle trail (for bullets, snake tail, etc.)
 */
export function spawnSparkle(
  _scene: Phaser.Scene,
  x: number,
  y: number,
  color = PALETTE.cyan,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = 15 + Math.random() * 25;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.2 + Math.random() * 0.2,
      maxLife: 0.4,
      color,
      size: 1.5 + Math.random() * 2,
    });
  }
  return particles;
}

/**
 * Update all particles: move, apply gravity, reduce life.
 * Returns a new array with only alive particles.
 */
export function updateParticles(
  particles: Particle[],
  dt: number,
  scrollY = 0,
): Particle[] {
  const alive: Particle[] = [];
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt + scrollY * dt;
    p.vy += (p.vy > 0 ? 1 : -1) * 60 * dt; // drag
    p.life -= dt;
    if (p.life > 0) alive.push(p);
  }
  return alive;
}

/**
 * Draw all particles onto a Graphics object.
 */
export function drawParticles(
  g: Phaser.GameObjects.Graphics,
  particles: Particle[],
): void {
  for (const p of particles) {
    const alpha = Phaser.Math.Clamp(p.life / p.maxLife * 1.5, 0, 1);
    const radius = p.size * (0.3 + 0.7 * (p.life / p.maxLife));
    g.fillStyle(p.color, alpha);
    g.fillCircle(p.x, p.y, radius);
  }
}
