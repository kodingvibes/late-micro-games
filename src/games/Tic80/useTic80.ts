import { useEffect, useRef, useState } from "react";
import type { Tic80Game } from "@/lib/tic80Catalog";

export type PlayerState = "idle" | "booting" | "ready" | "error";

const decode = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

function injectRuntime(
  cartUrl: string,
  cartBytes: Uint8Array<ArrayBuffer>,
  canvas: HTMLCanvasElement,
  jsCode: Uint8Array<ArrayBuffer>,
  wasmBytes: Uint8Array<ArrayBuffer>,
): () => void {
  const blob = new Blob([jsCode], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);

  const cartName = cartUrl.split("/").pop() || "cart.tic";

  // Eagerly create a 2D/WebGL context so the runtime doesn't try on a
  // canvas that the browser considers hidden or zero-sized. TIC-80's
  // Emscripten Browser module picks this up via Module.canvas.
  const gl =
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");
  const ctx2d = gl ? null : canvas.getContext("2d");
  console.log("[tic80-debug] canvas context: webgl=" + !!gl + " 2d=" + !!ctx2d + " canvas=" + canvas.width + "x" + canvas.height + " client=" + canvas.clientWidth + "x" + canvas.clientHeight);

  const prevModule = (window as any).Module;
  (window as any).Module = {
    canvas,
    arguments: [cartName],
    wasmBinary: wasmBytes,
    print: (m: string) => console.log("[tic80]", m),
    printErr: (m: string) => console.error("[tic80]", m),
    onRuntimeInitialized: () => {
      var w = window as any;
      // Override createPreloadedFile to replace the cart URL with a blob
      // URL that serves the cart bytes. The original function's async
      // machinery (addRunDependency / removeRunDependency) works correctly
      // when the XHR succeeds, and the blob URL is same-origin.
      var orig = w.FS.createPreloadedFile;
      w.FS.createPreloadedFile = function (parent: any, name: any, url: any, canRead: any, canWrite: any, onload: any, onerror: any, dontCreateFile: any, canOwn: any, preFinish: any) {
        var basename = "";
        if (typeof url === "string") {
          var idx = url.lastIndexOf("/");
          basename = idx >= 0 ? url.substring(idx + 1) : url;
        }
        var isCart = basename === cartName ||
          (typeof url === "string" && url.length >= cartName.length &&
           url.lastIndexOf(cartName) === url.length - cartName.length);
        if (isCart) {
          // Emscripten's createPreloadedFile uses asyncLoad for strings.
          // Pass the cart bytes directly as a Uint8Array so it goes through
          // the synchronous processData path with proper dependency handling.
          console.log("[tic80-debug] serving cart bytes directly: " + name);
          return orig.call(this, parent, name, cartBytes, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish);
        }
        return orig.apply(this, arguments);
      };
      document.dispatchEvent(new CustomEvent("tic80:ready"));
    },
    setStatus: (m: string) => {
      if (typeof m === "string" && m.toLowerCase().indexOf("error") !== -1) {
        document.dispatchEvent(new CustomEvent("tic80:error", { detail: m }));
      }
    },
  };

  const script = document.createElement("script");
  script.src = url;
  document.body.appendChild(script);

  return () => {
    script.remove();
    URL.revokeObjectURL(url);
    (window as any).Module = prevModule;
  };
}

export function useTic80(
  cart: Tic80Game,
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
      return;
    }

    canvas.width = 240;
    canvas.height = 136;

    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const [runtime, cartRes] = await Promise.all([
          import("./_runtime"),
          fetch(cart.cartUrl, { mode: "cors", credentials: "omit" }),
        ]);
        if (!cartRes.ok) throw new Error(`HTTP ${cartRes.status}`);
        const cartBuf = await cartRes.arrayBuffer();
        if (!mountedRef.current) return;
        const jsCode = decode(runtime.TIC80_JS_B64);
        const wasmBytes = decode(runtime.TIC80_WASM_B64);
        const cartBytes = new Uint8Array(cartBuf);
        if (!mountedRef.current) return;
        cleanup = injectRuntime(cart.cartUrl, cartBytes, canvas, jsCode, wasmBytes);
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
        setError((e as CustomEvent).detail || "Error al cargar el juego");
        setState("error");
      }
    };

    document.addEventListener("tic80:ready", onReady);
    document.addEventListener("tic80:error", onError);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("tic80:ready", onReady);
      document.removeEventListener("tic80:error", onError);
      cleanup?.();
    };
  }, [cart.cartUrl, cart.id, canvasRef]);

  return { state, error };
}
