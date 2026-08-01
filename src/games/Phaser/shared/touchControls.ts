// Touch controls system for Phaser mini-games.
// Provides on-screen buttons for mobile/touch devices with auto-hide.
// Each game type gets its own button layout.

import Phaser from "phaser";
import { PALETTE, HEX } from "./theme";

// ─── Types ──────────────────────────────────────────────────────────

export type GameType = "SpaceInvaders" | "RiverRaid" | "Tetris" | "Snake" | "Minesweeper" | "Twenty48";

export interface TouchButtonState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  rotate: boolean;
  drop: boolean;
  flag: boolean;
  pause: boolean;
}

// ─── TouchButton ────────────────────────────────────────────────────

export class TouchButton {
  public x: number;
  public y: number;
  public radius: number;
  public label: string;
  public icon: "arrow-left" | "arrow-right" | "arrow-up" | "arrow-down" | "lightning" | "rotate" | "flag" | "pause" | "dpad";
  public alpha = 0.55;
  public pressed = false;
  public active = false;
  public visible = true;

  private scene: Phaser.Scene;
  private baseRadius: number;
  private pressTimer = 0;
  private lastPointerId = -1;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    radius: number,
    label: string,
    icon: TouchButtonStateIcon,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.baseRadius = radius;
    this.label = label;
    this.icon = icon;

    // Add pointer events
    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointerup", this.onPointerUp, this);
    scene.input.on("pointermove", this.onPointerMove, this);
  }

  private isInside(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.visible) return;
    if (this.isInside(pointer.x, pointer.y)) {
      this.pressed = true;
      this.active = true;
      this.lastPointerId = pointer.id;
      this.pressTimer = 0;
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.lastPointerId || this.lastPointerId === -1) {
      this.pressed = false;
      this.lastPointerId = -1;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (this.pressed && pointer.id === this.lastPointerId) {
      if (!this.isInside(pointer.x, pointer.y)) {
        this.pressed = false;
        this.lastPointerId = -1;
      }
    }
  }

  isPressed(): boolean {
    return this.pressed && this.visible;
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (!v) this.pressed = false;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  setRadius(r: number) {
    this.radius = r;
    this.baseRadius = r;
  }

  draw(g: Phaser.GameObjects.Graphics) {
    if (!this.visible) return;

    const r = this.radius;
    const alpha = this.pressed ? 0.8 : this.alpha;
    const scale = this.pressed ? 0.9 : 1;
    const cr = r * scale;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(this.x + 2, this.y + 2, cr);

    // Main circle
    g.fillStyle(this.pressed ? PALETTE.accentSoft : PALETTE.surfaceLight, alpha);
    g.fillCircle(this.x, this.y, cr);

    // Border
    g.lineStyle(2, PALETTE.accent, this.pressed ? 0.9 : 0.5);
    g.strokeCircle(this.x, this.y, cr);

    // Inner highlight
    g.fillStyle(0xffffff, this.pressed ? 0.15 : 0.08);
    g.fillCircle(this.x - cr * 0.15, this.y - cr * 0.15, cr * 0.5);

    // Draw icon
    this.drawIcon(g, this.x, this.y, cr);
  }

  private drawIcon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) {
    const s = r * 0.45;
    const color = this.pressed ? 0xffffff : PALETTE.text;
    const alpha = this.pressed ? 1 : 0.8;

    g.lineStyle(Math.max(2, r * 0.15), color, alpha);

    switch (this.icon) {
      case "arrow-left":
        g.lineBetween(cx + s * 0.3, cy - s * 0.4, cx - s * 0.5, cy);
        g.lineBetween(cx + s * 0.3, cy + s * 0.4, cx - s * 0.5, cy);
        g.lineBetween(cx - s * 0.5, cy, cx + s * 0.3, cy);
        break;
      case "arrow-right":
        g.lineBetween(cx - s * 0.3, cy - s * 0.4, cx + s * 0.5, cy);
        g.lineBetween(cx - s * 0.3, cy + s * 0.4, cx + s * 0.5, cy);
        g.lineBetween(cx + s * 0.5, cy, cx - s * 0.3, cy);
        break;
      case "arrow-up":
        g.lineBetween(cx - s * 0.4, cy + s * 0.3, cx, cy - s * 0.5);
        g.lineBetween(cx + s * 0.4, cy + s * 0.3, cx, cy - s * 0.5);
        g.lineBetween(cx, cy - s * 0.5, cx, cy + s * 0.3);
        break;
      case "arrow-down":
        g.lineBetween(cx - s * 0.4, cy - s * 0.3, cx, cy + s * 0.5);
        g.lineBetween(cx + s * 0.4, cy - s * 0.3, cx, cy + s * 0.5);
        g.lineBetween(cx, cy + s * 0.5, cx, cy - s * 0.3);
        break;
      case "lightning":
        // Lightning bolt
        g.fillStyle(color, alpha);
        g.beginPath();
        g.moveTo(cx - s * 0.15, cy - s * 0.6);
        g.lineTo(cx + s * 0.2, cy - s * 0.1);
        g.lineTo(cx - s * 0.05, cy - s * 0.05);
        g.lineTo(cx + s * 0.15, cy + s * 0.6);
        g.lineTo(cx - s * 0.2, cy + s * 0.1);
        g.lineTo(cx + s * 0.05, cy + s * 0.05);
        g.closePath();
        g.fillPath();
        break;
      case "rotate":
        // Rotate arrow
        g.beginPath();
        g.arc(cx, cy, s * 0.5, -Math.PI * 0.8, Math.PI * 0.3, false);
        g.strokePath();
        g.fillStyle(color, alpha);
        g.fillTriangle(
          cx + s * 0.5, cy - s * 0.15,
          cx + s * 0.7, cy - s * 0.3,
          cx + s * 0.5, cy - s * 0.5,
        );
        break;
      case "flag":
        // Flag icon
        g.lineStyle(Math.max(2, r * 0.12), color, alpha);
        g.lineBetween(cx - s * 0.3, cy - s * 0.6, cx - s * 0.3, cy + s * 0.6);
        g.fillStyle(color, alpha);
        g.beginPath();
        g.moveTo(cx - s * 0.25, cy - s * 0.5);
        g.lineTo(cx + s * 0.5, cy - s * 0.25);
        g.lineTo(cx - s * 0.25, cy);
        g.closePath();
        g.fillPath();
        break;
      case "pause":
        // Two vertical bars
        g.fillStyle(color, alpha);
        g.fillRect(cx - s * 0.35, cy - s * 0.5, s * 0.25, s);
        g.fillRect(cx + s * 0.1, cy - s * 0.5, s * 0.25, s);
        break;
      case "dpad":
        // Cross shape
        g.fillStyle(color, alpha);
        g.fillRect(cx - s * 0.15, cy - s * 0.6, s * 0.3, s * 1.2);
        g.fillRect(cx - s * 0.6, cy - s * 0.15, s * 1.2, s * 0.3);
        break;
    }
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
  }
}

type TouchButtonStateIcon = TouchButtonState["left"] extends boolean ? 
  "arrow-left" | "arrow-right" | "arrow-up" | "arrow-down" | "lightning" | "rotate" | "flag" | "pause" | "dpad" : never;

// ─── DPad (4-directional) ──────────────────────────────────────────

export class DPad {
  public visible = true;
  public direction: { x: number; y: number } | null = null;

  private scene: Phaser.Scene;
  private cx: number;
  private cy: number;
  private size: number;
  private activeDir: { x: number; y: number } | null = null;
  private buttons: TouchButton[] = [];

  constructor(scene: Phaser.Scene, cx: number, cy: number, size: number) {
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    this.size = size;

    const gap = size * 0.05;
    const btnR = size * 0.22;

    // Up
    this.buttons.push(new TouchButton(scene, cx, cy - size * 0.32, btnR, "↑", "arrow-up"));
    // Down
    this.buttons.push(new TouchButton(scene, cx, cy + size * 0.32, btnR, "↓", "arrow-down"));
    // Left
    this.buttons.push(new TouchButton(scene, cx - size * 0.32, cy, btnR, "←", "arrow-left"));
    // Right
    this.buttons.push(new TouchButton(scene, cx + size * 0.32, cy, btnR, "→", "arrow-right"));
  }

  setPosition(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    const gap = this.size * 0.05;
    const btnR = this.size * 0.22;
    this.buttons[0].setPosition(cx, cy - this.size * 0.32);
    this.buttons[1].setPosition(cx, cy + this.size * 0.32);
    this.buttons[2].setPosition(cx - this.size * 0.32, cy);
    this.buttons[3].setPosition(cx + this.size * 0.32, cy);
  }

  setVisible(v: boolean) {
    this.visible = v;
    for (const b of this.buttons) b.setVisible(v);
  }

  getDirection(): { x: number; y: number } | null {
    const up = this.buttons[0].isPressed();
    const down = this.buttons[1].isPressed();
    const left = this.buttons[2].isPressed();
    const right = this.buttons[3].isPressed();

    if (up || down || left || right) {
      return {
        x: left ? -1 : right ? 1 : 0,
        y: up ? -1 : down ? 1 : 0,
      };
    }
    return null;
  }

  draw(g: Phaser.GameObjects.Graphics) {
    if (!this.visible) return;

    // Draw DPad base circle
    const r = this.size * 0.5;
    g.fillStyle(PALETTE.surfaceLight, 0.4);
    g.fillCircle(this.cx, this.cy, r);
    g.lineStyle(1, PALETTE.accent, 0.3);
    g.strokeCircle(this.cx, this.cy, r);

    // Draw cross lines
    g.lineStyle(1, PALETTE.accent, 0.15);
    g.lineBetween(this.cx - r * 0.6, this.cy, this.cx + r * 0.6, this.cy);
    g.lineBetween(this.cx, this.cy - r * 0.6, this.cx, this.cy + r * 0.6);

    for (const b of this.buttons) b.draw(g);
  }

  destroy() {
    for (const b of this.buttons) b.destroy();
  }
}

// ─── TouchControlsManager ──────────────────────────────────────────

export class TouchControlsManager {
  public visible = true;
  public state: TouchButtonState = {
    left: false, right: false, up: false, down: false,
    fire: false, rotate: false, drop: false, flag: false, pause: false,
  };

  private scene: Phaser.Scene;
  private gameType: GameType;
  private buttons: TouchButton[] = [];
  private dpad: DPad | null = null;
  private isTouchDevice: boolean;
  private lastTouchTime = 0;
  private autoHideTimer = 0;
  private autoHideDelay = 3; // seconds
  private hidden = false;
  private pauseButton!: TouchButton;

  constructor(scene: Phaser.Scene, gameType: GameType) {
    this.scene = scene;
    this.gameType = gameType;

    // Detect touch device
    this.isTouchDevice = this.scene.sys.game.device.input.touch ||
      ("ontouchstart" in window) ||
      navigator.maxTouchPoints > 0;

    if (!this.isTouchDevice) {
      this.visible = false;
      return;
    }

    this.createButtons();
    this.setupAutoHide();
  }

  private setupAutoHide() {
    // Show on any touch interaction
    this.scene.input.on("pointerdown", () => {
      this.lastTouchTime = this.scene.time.now;
      this.hidden = false;
    });
    this.scene.input.on("pointermove", () => {
      this.lastTouchTime = this.scene.time.now;
      this.hidden = false;
    });
  }

  private createButtons() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const btnR = this.getButtonRadius(w, h);
    const margin = btnR * 1.5;

    // Pause button (top-right, all games)
    this.pauseButton = new TouchButton(
      this.scene,
      w - margin, margin,
      btnR * 0.7,
      "⏸",
      "pause",
    );
    this.pauseButton.alpha = 0.4;
    this.buttons.push(this.pauseButton);

    switch (this.gameType) {
      case "SpaceInvaders":
        this.createSpaceInvadersButtons(w, h, btnR, margin);
        break;
      case "RiverRaid":
        this.createRiverRaidButtons(w, h, btnR, margin);
        break;
      case "Tetris":
        this.createTetrisButtons(w, h, btnR, margin);
        break;
      case "Snake":
        this.createSnakeButtons(w, h, btnR, margin);
        break;
      case "Minesweeper":
        this.createMinesweeperButtons(w, h, btnR, margin);
        break;
      case "Twenty48":
        this.createTwenty48Buttons(w, h, btnR, margin);
        break;
    }
  }

  private getButtonRadius(w: number, h: number): number {
    const base = Math.min(w, h);
    return Math.max(22, Math.min(40, base * 0.06));
  }

  private repositionButtons() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const btnR = this.getButtonRadius(w, h);
    const margin = btnR * 1.5;

    // Reposition pause button
    this.pauseButton.setPosition(w - margin, margin);
    this.pauseButton.setRadius(btnR * 0.7);

    // Remove old game-specific buttons and recreate
    const oldButtons = this.buttons.filter(b => b !== this.pauseButton);
    for (const b of oldButtons) {
      b.destroy();
      const idx = this.buttons.indexOf(b);
      if (idx >= 0) this.buttons.splice(idx, 1);
    }
    if (this.dpad) {
      this.dpad.destroy();
      this.dpad = null;
    }

    this.createButtons();
  }

  private createSpaceInvadersButtons(w: number, h: number, btnR: number, margin: number) {
    const bottomY = h - margin;
    const leftX = margin + btnR;
    const rightX = w - margin - btnR;

    // Left button
    const leftBtn = new TouchButton(this.scene, leftX, bottomY, btnR, "←", "arrow-left");
    leftBtn.alpha = 0.55;
    this.buttons.push(leftBtn);

    // Right button
    const rightBtn = new TouchButton(this.scene, rightX, bottomY, btnR, "→", "arrow-right");
    rightBtn.alpha = 0.55;
    this.buttons.push(rightBtn);

    // Fire button (bottom-right, slightly above)
    const fireBtn = new TouchButton(this.scene, rightX, bottomY - btnR * 2.2, btnR * 1.1, "⚡", "lightning");
    fireBtn.alpha = 0.6;
    this.buttons.push(fireBtn);
  }

  private createRiverRaidButtons(w: number, h: number, btnR: number, margin: number) {
    const bottomY = h - margin;
    const leftX = margin + btnR;
    const rightX = w - margin - btnR;

    // Left button
    const leftBtn = new TouchButton(this.scene, leftX, bottomY, btnR, "←", "arrow-left");
    leftBtn.alpha = 0.55;
    this.buttons.push(leftBtn);

    // Right button
    const rightBtn = new TouchButton(this.scene, rightX, bottomY, btnR, "→", "arrow-right");
    rightBtn.alpha = 0.55;
    this.buttons.push(rightBtn);

    // Fire button (bottom-right, slightly above)
    const fireBtn = new TouchButton(this.scene, rightX, bottomY - btnR * 2.2, btnR * 1.1, "⚡", "lightning");
    fireBtn.alpha = 0.6;
    this.buttons.push(fireBtn);
  }

  private createTetrisButtons(w: number, h: number, btnR: number, margin: number) {
    const bottomY = h - margin;
    const centerX = w / 2;

    // Left
    const leftBtn = new TouchButton(this.scene, centerX - btnR * 2.5, bottomY, btnR, "←", "arrow-left");
    leftBtn.alpha = 0.55;
    this.buttons.push(leftBtn);

    // Right
    const rightBtn = new TouchButton(this.scene, centerX - btnR * 0.5, bottomY, btnR, "→", "arrow-right");
    rightBtn.alpha = 0.55;
    this.buttons.push(rightBtn);

    // Rotate (up)
    const rotateBtn = new TouchButton(this.scene, centerX + btnR * 1.5, bottomY, btnR, "↻", "rotate");
    rotateBtn.alpha = 0.55;
    this.buttons.push(rotateBtn);

    // Drop (down)
    const dropBtn = new TouchButton(this.scene, centerX + btnR * 3.5, bottomY, btnR, "↓", "arrow-down");
    dropBtn.alpha = 0.55;
    this.buttons.push(dropBtn);
  }

  private createSnakeButtons(w: number, h: number, btnR: number, margin: number) {
    const bottomY = h - margin;
    const centerX = w / 2;

    // D-Pad
    this.dpad = new DPad(this.scene, centerX, bottomY, btnR * 3.5);
  }

  private createMinesweeperButtons(w: number, h: number, btnR: number, margin: number) {
    const bottomY = h - margin;
    const centerX = w / 2;

    // Flag toggle button
    const flagBtn = new TouchButton(this.scene, centerX, bottomY, btnR * 1.2, "⚑", "flag");
    flagBtn.alpha = 0.6;
    this.buttons.push(flagBtn);
  }

  private createTwenty48Buttons(w: number, h: number, btnR: number, margin: number) {
    const bottomY = h - margin;
    const centerX = w / 2;

    // D-Pad for 2048
    this.dpad = new DPad(this.scene, centerX, bottomY, btnR * 3.5);
  }

  update() {
    if (!this.visible) return;

    // Auto-hide after 3 seconds of no touch
    if (this.lastTouchTime > 0) {
      const elapsed = (this.scene.time.now - this.lastTouchTime) / 1000;
      if (elapsed > this.autoHideDelay) {
        this.hidden = true;
      }
    }

    // Reposition on resize
    this.repositionButtons();

    // Read button states
    this.state.left = false;
    this.state.right = false;
    this.state.up = false;
    this.state.down = false;
    this.state.fire = false;
    this.state.rotate = false;
    this.state.drop = false;
    this.state.flag = false;
    this.state.pause = false;

    for (const b of this.buttons) {
      b.setVisible(this.visible && !this.hidden);
      if (b === this.pauseButton && b.isPressed()) this.state.pause = true;
      else if (b.icon === "arrow-left" && b.isPressed()) this.state.left = true;
      else if (b.icon === "arrow-right" && b.isPressed()) this.state.right = true;
      else if (b.icon === "arrow-up" && b.isPressed()) this.state.up = true;
      else if (b.icon === "arrow-down" && b.isPressed()) this.state.down = true;
      else if (b.icon === "lightning" && b.isPressed()) this.state.fire = true;
      else if (b.icon === "rotate" && b.isPressed()) this.state.rotate = true;
      else if (b.icon === "flag" && b.isPressed()) this.state.flag = true;
    }

    if (this.dpad) {
      this.dpad.setVisible(this.visible && !this.hidden);
      const dir = this.dpad.getDirection();
      if (dir) {
        this.state.left = dir.x === -1;
        this.state.right = dir.x === 1;
        this.state.up = dir.y === -1;
        this.state.down = dir.y === 1;
      }
    }
  }

  draw(g: Phaser.GameObjects.Graphics) {
    if (!this.visible || this.hidden) return;

    for (const b of this.buttons) {
      b.draw(g);
    }
    if (this.dpad) {
      this.dpad.draw(g);
    }
  }

  destroy() {
    for (const b of this.buttons) b.destroy();
    if (this.dpad) this.dpad.destroy();
    this.buttons = [];
    this.dpad = null;
  }
}

// ─── Responsive Helpers ───────────────────────────────────────────

/**
 * Calculate a proportional font size based on viewport dimensions.
 */
export function responsiveFontSize(
  baseSize: number,
  viewportW: number,
  viewportH: number,
  minSize = 10,
  maxSize = 40,
): number {
  const refW = 700;
  const refH = 700;
  const scale = Math.min(viewportW / refW, viewportH / refH);
  return Math.max(minSize, Math.min(maxSize, Math.round(baseSize * scale)));
}

/**
 * Calculate a proportional dimension based on viewport.
 */
export function responsiveDimension(
  base: number,
  viewportW: number,
  viewportH: number,
  refW = 700,
  refH = 700,
  minVal = 4,
): number {
  const scale = Math.min(viewportW / refW, viewportH / refH);
  return Math.max(minVal, Math.round(base * scale));
}
