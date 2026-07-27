import { useEffect, useRef } from "react";
import { GameLayout } from "@/components/GameLayout";
import type { Tic80Game } from "@/lib/tic80Catalog";

interface Tic80PlayerProps {
  cart: Tic80Game;
  onBack: () => void;
}

export function Tic80Player({ cart, onBack }: Tic80PlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The TIC-80 Emscripten runtime is stateful and global (window.Module,
  // window.FS, window.Browser). Injecting it into the React shell
  // fights with React's lifecycle and the other micros. The simplest
  // thing that works: load the runtime in its own iframe so it gets
  // a clean window. This is what tic80.com's own webapp does.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onMessage = (e: MessageEvent) => {
      // ponytail: the iframe can post messages to navigate back. We
      // don't need this today, but it gives us a hook for future
      // "close on Escape" wiring without changing the contract.
      if (e.data === "tic80:close") onBack();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onBack]);

  return (
    <GameLayout title={cart.name} accent={cart.accent} onBack={onBack} score={null}>
      <iframe
        ref={iframeRef}
        src={`/tic80-player.html?cart=${encodeURIComponent(cart.cartUrl)}&name=${encodeURIComponent(cart.name)}`}
        className="w-full aspect-[240/136] rounded-lg bg-black border-0"
        style={{ imageRendering: "pixelated" }}
        title={cart.name}
        allow="autoplay"
      />
    </GameLayout>
  );
}
