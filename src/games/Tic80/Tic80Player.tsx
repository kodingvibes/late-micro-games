import { useRef } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useTic80 } from "@/games/Tic80/useTic80";
import type { Tic80Game } from "@/lib/tic80Catalog";

interface Tic80PlayerProps {
  cart: Tic80Game;
  onBack: () => void;
}

export function Tic80Player({ cart, onBack }: Tic80PlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, error } = useTic80(cart, canvasRef);

  return (
    <GameLayout title={cart.name} accent={cart.accent} onBack={onBack} score={null}>
      <div className="relative w-full max-w-2xl">
        <canvas
          ref={canvasRef}
          width={240}
          height={136}
          className="w-full aspect-[240/136] rounded-lg bg-black image-rendering-pixelated"
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={() => canvasRef.current?.focus()}
          tabIndex={0}
        />
        {state === "booting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg pointer-events-none">
            <span className="text-slate-400 text-sm animate-pulse">
              Cargando juego...
            </span>
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg p-4 text-center">
            <span className="text-red-400 text-sm">
              {error || "Error al cargar el juego"}
            </span>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
