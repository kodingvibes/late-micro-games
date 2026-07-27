import { useRef } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useTic80 } from "@/games/Tic80/useTic80";
import type { Tic80Game } from "@/lib/tic80Catalog";

interface Tic80PlayerProps {
  cart: Tic80Game;
  onBack: () => void;
}

export function Tic80Player({ cart, onBack }: Tic80PlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { state, error } = useTic80(cart.cartUrl, iframeRef);

  return (
    <GameLayout title={cart.name} accent={cart.accent} onBack={onBack} score={null}>
      <div className="relative w-full max-w-2xl">
        <iframe
          ref={iframeRef}
          title={cart.name}
          className="w-full aspect-[240/136] rounded-lg bg-black border-0"
        />
        {state === "booting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <span className="text-slate-400 text-sm animate-pulse">Cargando juego...</span>
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <span className="text-red-400 text-sm">{error || "Error al cargar el juego"}</span>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
