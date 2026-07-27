import { useEffect, useRef } from "react";
import Phaser from "phaser";
import "./bootstrap";
import { getPhaserGame } from "./shared/types";

interface PhaserGameProps {
  gameId: string;
  title: string;
  onBack: () => void;
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
    container.innerHTML = "";

    const game = meta.create(container);
    gameRef.current = game;

    const fit = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));
      game.scale.setParentSize?.(w, h);
      game.scale.refresh();
    };

    const ro = new ResizeObserver(fit);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    fit();

    return () => {
      ro.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameId]);

  return (
    <div className="h-screen flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 bg-mf-surface border-b border-slate-800 flex-shrink-0">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 transition"
        >
          ← Volver
        </button>
        <h2 className="text-slate-200 font-semibold">{title}</h2>
        <div className="w-16" />
      </div>
      <div ref={wrapperRef} className="flex-1 min-h-0 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full flex items-center justify-center"
        />
      </div>
    </div>
  );
}