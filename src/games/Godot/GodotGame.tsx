import { useEffect, useRef } from "react";

interface GodotGameProps {
  game: string;
  title: string;
  onBack: () => void;
}

// The Godot export lives next to this micro bundle under /micro/games/latest/.
// Using import.meta.url lets the same component work in dev (public folder)
// and in production under the versioned /micro/games/latest/ path.
const BASE_EXPORT_URL = new URL("godot-games/godot-games.html", import.meta.url).href;

export function GodotGame({ game, title, onBack }: GodotGameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = `${BASE_EXPORT_URL}?game=${encodeURIComponent(game)}`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.focus();
  }, []);

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
      <div className="flex-1 relative" style={{ minHeight: "70vh" }}>
        <iframe
          ref={iframeRef}
          src={src}
          className="absolute inset-0 w-full h-full border-0"
          allow="fullscreen; autoplay"
          title={title}
        />
      </div>
    </div>
  );
}
