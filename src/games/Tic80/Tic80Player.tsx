import { useRef } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useTic80Iframe } from "@/games/Tic80/useTic80Iframe";
import type { Tic80Game } from "@/lib/tic80Catalog";

interface Tic80PlayerProps {
  cart: Tic80Game;
  onBack: () => void;
}

export function Tic80Player({ cart, onBack }: Tic80PlayerProps) {
  // Re-render key for the host so switching carts gives us a clean mount.
  const hostKeyRef = useRef(`${cart.id}:${cart.cartUrl}`);
  if (hostKeyRef.current !== `${cart.id}:${cart.cartUrl}`) {
    hostKeyRef.current = `${cart.id}:${cart.cartUrl}`;
  }

  const { state, error } = useTic80Iframe(cart);

  return (
    <GameLayout title={cart.name} accent={cart.accent} onBack={onBack} score={null}>
      <div className="relative w-full max-w-2xl">
        {/* The iframe sandbox is mounted inside this host. Its 240x136 canvas
            is scaled up by CSS via `aspect-[240/136]` and the iframe's
            `width:100%;height:100%` rules. */}
        <div
          id="tic80-iframe-host"
          key={hostKeyRef.current}
          className="w-full aspect-[240/136] rounded-lg bg-black overflow-hidden flex items-center justify-center"
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
