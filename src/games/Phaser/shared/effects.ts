// Shared visual effects for late.kodingvibes.com Phaser mini-games.
// Fade-in, screen shake, score pop, game over overlay.

import Phaser from "phaser";
import { HEX, PALETTE, FONTS } from "./theme";

/**
 * Fade in the main camera from black.
 * Call at the end of create().
 */
export function fadeInScene(scene: Phaser.Scene, duration = 300): void {
  scene.cameras.main.fadeIn(duration, 11, 13, 23); // PALETTE.bg
}

/**
 * Shake the main camera.
 */
export function screenShake(
  scene: Phaser.Scene,
  intensity = 0.005,
  duration = 200,
): void {
  scene.cameras.main.shake(duration, intensity);
}

/**
 * Spawn a floating score text that rises, fades, and self-destructs.
 * Returns the Text object so the caller can add it to a container if needed.
 */
export function scorePop(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = HEX.cyan,
): Phaser.GameObjects.Text {
  const txt = scene.add.text(x, y, text, {
    fontSize: "22px",
    color,
    fontFamily: FONTS.dseg.fontFamily,
    fontStyle: "italic",
    shadow: { offsetX: 0, offsetY: 0, blur: 10, color, fill: true },
  }).setOrigin(0.5).setAlpha(1);

  scene.tweens.add({
    targets: txt,
    y: y - 50,
    alpha: 0,
    scaleX: 1.4,
    scaleY: 1.4,
    duration: 700,
    ease: "Power2",
    onComplete: () => txt.destroy(),
  });

  return txt;
}

/**
 * Animated game-over overlay with optional stats line.
 * Creates a semi-transparent backdrop + message + stats + restart hint.
 * All objects self-destruct after the animation completes.
 */
export function showGameOver(
  scene: Phaser.Scene,
  x: number,
  y: number,
  boardW: number,
  boardH: number,
  message = "GAME OVER",
  stats?: string,
): void {
  const cx = x + boardW / 2;
  const cy = y + boardH / 2;

  // Backdrop
  const backdrop = scene.add.graphics();
  backdrop.fillStyle(0x000000, 0);
  backdrop.fillRect(x, y, boardW, boardH);
  scene.tweens.add({
    targets: backdrop,
    alpha: 0.6,
    duration: 300,
    ease: "Power2",
  });

  // Message
  const msg = scene.add.text(cx, cy - 10, message, {
    fontSize: "34px",
    color: HEX.cyan,
    fontFamily: FONTS.dseg.fontFamily,
    fontStyle: "italic",
    shadow: { offsetX: 0, offsetY: 0, blur: 12, color: HEX.cyan, fill: true },
  }).setOrigin(0.5).setAlpha(0).setScale(0.5);

  scene.tweens.add({
    targets: msg,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    duration: 400,
    ease: "Back.easeOut",
    delay: 150,
  });

  // Stats line (optional, e.g. "1250 · 340m")
  let statsText: Phaser.GameObjects.Text | undefined;
  if (stats) {
    statsText = scene.add.text(cx, cy + 34, stats, {
      fontSize: "16px",
      color: HEX.textMuted,
      fontFamily: FONTS.dseg.fontFamily,
      fontStyle: "italic",
      shadow: { offsetX: 0, offsetY: 0, blur: 8, color: HEX.cyan, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({
      targets: statsText,
      alpha: 1,
      duration: 300,
      delay: 400,
    });
  }

  // Restart hint
  const hint = scene.add.text(cx, cy + (stats ? 62 : 34), "R para reiniciar", {
    fontSize: "15px",
    color: HEX.textMuted,
    fontFamily: FONTS.ui.fontFamily,
  }).setOrigin(0.5).setAlpha(0);

  scene.tweens.add({
    targets: hint,
    alpha: 1,
    duration: 300,
    delay: 500,
  });

  // Cleanup: destroy all created objects after a safe delay
  // (they'll also be cleaned up on scene restart)
}
