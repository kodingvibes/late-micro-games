import { useEffect, useRef } from "react";

interface GodotDemoProps {
  onBack: () => void;
}

export function GodotDemo({ onBack }: GodotDemoProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
        <h2 className="text-slate-200 font-semibold">Dodge the Creeps — Godot Demo</h2>
        <div className="w-16" />
      </div>
      <div className="flex-1 min-h-0 relative">
        <iframe
          ref={iframeRef}
          src="/micro/games/latest/godot-demo/godot-demo.html"
          className="w-full h-full border-0"
          allow="fullscreen; autoplay"
          title="Godot demo"
        />
      </div>
    </div>
  );
}
