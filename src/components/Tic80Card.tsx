import { useEffect, useState, useRef } from "react";
import { getTicCover } from "@/lib/ticCover";
import type { Tic80Game } from "@/lib/tic80Catalog";

interface Tic80CardProps {
  game: Tic80Game;
  onClick: () => void;
}

export function Tic80Card({ game, onClick }: Tic80CardProps) {
  const [cover, setCover] = useState<string | null>(game.coverUrl);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    if (!cover) getTicCover(game.cartUrl).then(setCover);
  }, [game.cartUrl, cover]);

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-2 p-6 rounded-2xl border-${game.accent}-500/20 bg-transparent shadow-card transition-all hover:border-${game.accent}-500/40 hover:bg-accent/5 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm overflow-hidden`}
    >
      {cover && (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity rounded-2xl"
        />
      )}
      <span className={`relative z-10 text-sm font-semibold text-slate-200`}>{game.name}</span>
      <span className="relative z-10 text-xs text-slate-500 text-center leading-tight">{game.description}</span>
    </button>
  );
}
