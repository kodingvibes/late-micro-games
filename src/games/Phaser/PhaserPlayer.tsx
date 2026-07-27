import { useEffect, useRef } from "react";
import "./bootstrap";
import { getPhaserGame } from "./shared/types";

interface PhaserGameProps {
  gameId: string;
  title: string;
  onBack: () => void;
}

export function PhaserPlayer({ gameId, title, onBack }: PhaserGameProps) {
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
    gameRef.current = meta.create(container);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameId]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-mf-surface border-b border-slate-800">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 transition"
        >
          ← Volver
        </button>
        <h2 className="text-slate-200 font-semibold">{title}</h2>
        <div className="w-16" />
      </div>
      <div
        ref={containerRef}
        className="flex-1 w-full"
        style={{ minHeight: "70vh" }}
      />
    </div>
  );
}