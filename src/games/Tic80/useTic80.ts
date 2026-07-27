import { useEffect, useRef, useState } from "react";

export type PlayerState = "idle" | "booting" | "ready" | "error";

const TIC80_JS = "https://tic80.com/js/1.1.2837/tic80.js";

function injectScript(cartUrl: string, canvas: HTMLCanvasElement): () => void {
  const prev = (window as any).Module;
  (window as any).Module = {
    locateFile: (f: string) => "https://tic80.com/js/1.1.2837/" + f,
    canvas,
    arguments: [cartUrl],
    print: (m: string) => console.log("[tic80]", m),
    printErr: (m: string) => console.error("[tic80]", m),
    onRuntimeInitialized: () => {
      document.dispatchEvent(new CustomEvent("tic80:ready"));
    },
    setStatus: (m: string) => {
      if (m && m.includes("error"))
        document.dispatchEvent(new CustomEvent("tic80:error", { detail: m }));
    },
  };

  const existing = document.getElementById("tic80-script");
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.id = "tic80-script";
  script.src = TIC80_JS + "?_=" + Date.now();
  document.body.appendChild(script);

  return () => {
    const s = document.getElementById("tic80-script");
    if (s) s.remove();
    if ((window as any).Module === (window as any).__tic80_module) {
      delete (window as any).__tic80_module;
      delete (window as any).Module;
    }
  };
}

export function useTic80(
  cartUrl: string,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
): { state: PlayerState; error: string | null } {
  const [state, setState] = useState<PlayerState>("booting");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setState("booting");
    setError(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      setState("error");
      setError("Canvas no encontrado");
      return () => {};
    }

    const cleanup = injectScript(cartUrl, canvas);

    const onReady = () => {
      if (mountedRef.current) setState("ready");
    };
    const onError = (e: Event) => {
      if (mountedRef.current) {
        setError((e as CustomEvent).detail || "Error al cargar");
        setState("error");
      }
    };

    document.addEventListener("tic80:ready", onReady);
    document.addEventListener("tic80:error", onError);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("tic80:ready", onReady);
      document.removeEventListener("tic80:error", onError);
      cleanup();
    };
  }, [cartUrl, canvasRef]);

  return { state, error };
}
