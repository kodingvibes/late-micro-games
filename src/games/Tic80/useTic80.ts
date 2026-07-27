import { useEffect, useRef, useState } from "react";

export type PlayerState = "idle" | "booting" | "ready" | "error";

const decode = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

function injectRuntime(
  cartUrl: string,
  canvas: HTMLCanvasElement,
  jsCode: Uint8Array<ArrayBuffer>,
  wasmBytes: Uint8Array<ArrayBuffer>,
): () => void {
  const blob = new Blob([jsCode], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);

  (window as any).Module = {
    canvas,
    arguments: [cartUrl],
    wasmBinary: wasmBytes,
    print: (m: string) => console.log("[tic80]", m),
    printErr: (m: string) => console.error("[tic80]", m),
    onRuntimeInitialized: () => {
      document.dispatchEvent(new CustomEvent("tic80:ready"));
    },
    setStatus: (m: string) => {
      if (typeof m === "string" && m.includes("error"))
        document.dispatchEvent(new CustomEvent("tic80:error", { detail: m }));
    },
  };

  const script = document.createElement("script");
  script.src = url;
  document.body.appendChild(script);

  return () => {
    script.remove();
    URL.revokeObjectURL(url);
    (window as any).Module = undefined;
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

    let cleanup: () => void = () => {};

    (async () => {
      try {
        const runtime = await import("./_runtime");
        const jsCode = decode(runtime.TIC80_JS_B64);
        const wasmBytes = decode(runtime.TIC80_WASM_B64);
        if (!mountedRef.current) return;
        cleanup = injectRuntime(cartUrl, canvas, jsCode, wasmBytes);
      } catch (e) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : String(e));
          setState("error");
        }
      }
    })();

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
  }, [cartUrl]);

  return { state, error };
}
