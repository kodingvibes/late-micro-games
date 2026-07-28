import { useEffect, useRef } from "react";
import "./bootstrap";
import { getPhaserGame } from "./shared/types";

interface PhaserGameProps {
  gameId: string;
  title: string;
  onBack: () => void;
}

async function loadDsegFont() {
  try {
    await document.fonts.load("italic 700 20px 'DSEG14 Classic'");
    await document.fonts.load("italic 700 20px 'DSEG14 Classic Mini'");
  } catch (e) {
    console.warn("[phaser] DSEG14 font preload failed", e);
  }
}

export function PhaserPlayer({ gameId, title, onBack }: PhaserGameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const meta = getPhaserGame(gameId);
    if (!meta) {
      console.error(`Phaser game not found: ${gameId}`);
      return;
    }

    let cancelled = false;
    container.innerHTML = "";

    void loadDsegFont().then(() => {
      if (cancelled) return;
      const game = meta.create(container);
      gameRef.current = game;

      const fit = () => {
        const container = containerRef.current;
        if (!container || !game.scale) return;
        const rect = container.getBoundingClientRect();
        const w = Math.max(320, Math.floor(rect.width));
        const h = Math.max(320, Math.floor(rect.height));
        game.scale.setGameSize(w, h);
      };

      const ro = new ResizeObserver(fit);
      if (containerRef.current) ro.observe(containerRef.current);
      requestAnimationFrame(fit);
    });

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0d17]" ref={wrapperRef}>
      <div className="flex items-center justify-between px-4 py-3 bg-[#0b0d17]/90 backdrop-blur border-b border-slate-800/60 flex-shrink-0">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-200 text-sm hover:bg-slate-700 transition"
        >
          ← Volver
        </button>
        <h2 className="text-slate-100 font-semibold text-sm sm:text-base">{title}</h2>
        <div className="w-20" />
      </div>
      <div className="flex-1 min-h-0 relative p-4">
        <div ref={containerRef} className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] rounded-xl overflow-hidden border border-slate-800/60 bg-[#0b0d17] shadow-2xl" />
      </div>
    </div>
  );
}
