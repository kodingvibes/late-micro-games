// SNES-style sound effects using Web Audio API
// No external files needed — all sounds are synthesized.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.08,
  slide = 0,
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) {
      osc.frequency.linearRampToValueAtTime(freq + slide, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

function playNoise(duration: number, volume = 0.06) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch {
    // Audio not available
  }
}

// ─── SFX ──────────────────────────────────────────────────────────

export function sfxShoot() {
  playTone(880, 0.08, "square", 0.05, -400);
}

export function sfxExplosion() {
  playNoise(0.3, 0.08);
  playTone(60, 0.3, "sawtooth", 0.06, -30);
}

export function sfxHit() {
  playTone(220, 0.1, "square", 0.06, -100);
  playNoise(0.08, 0.04);
}

export function sfxPickup() {
  playTone(660, 0.06, "square", 0.05, 0);
  setTimeout(() => playTone(880, 0.08, "square", 0.05, 0), 60);
}

export function sfxLineClear() {
  playTone(523, 0.1, "square", 0.06, 0);
  setTimeout(() => playTone(659, 0.1, "square", 0.06, 0), 80);
  setTimeout(() => playTone(784, 0.15, "square", 0.06, 0), 160);
}

export function sfxGameOver() {
  playTone(440, 0.15, "square", 0.07, -100);
  setTimeout(() => playTone(330, 0.15, "square", 0.07, -80), 150);
  setTimeout(() => playTone(220, 0.3, "square", 0.07, -60), 300);
}

export function sfxWin() {
  playTone(523, 0.1, "square", 0.06, 0);
  setTimeout(() => playTone(659, 0.1, "square", 0.06, 0), 100);
  setTimeout(() => playTone(784, 0.1, "square", 0.06, 0), 200);
  setTimeout(() => playTone(1047, 0.2, "square", 0.06, 0), 300);
}

export function sfxMove() {
  playTone(440, 0.03, "square", 0.03, 0);
}

export function sfxRotate() {
  playTone(660, 0.04, "square", 0.04, 100);
}

export function sfxDrop() {
  playTone(220, 0.1, "square", 0.05, -100);
}

export function sfxFlag() {
  playTone(550, 0.06, "square", 0.04, 0);
}

export function sfxReveal() {
  playTone(330, 0.05, "square", 0.03, 0);
}

export function sfxMerge() {
  playTone(440, 0.06, "square", 0.05, 200);
  setTimeout(() => playTone(660, 0.08, "square", 0.05, 200), 60);
}
