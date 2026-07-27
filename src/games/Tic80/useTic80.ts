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

  // ponytail: do NOT eagerly create a WebGL context here. The TIC-80
  // runtime's Emscripten SDL2 module creates its own via
  // `canvas.getContext("webgl", ...)`. If we create a WebGL2 context
  // first, the subsequent WebGL1 request returns null and SDL2 loses
  // its canvas context — the runtime boots, the cart loads, but the
  // framebuffer never gets drawn to.

  // ponytail: write the cart directly into the MEMFS sandbox folder
  // (FS.cwd()) before injecting the runtime. The TIC-80 web build's
  // `emsStart` only sets up the preloaded-file flow when `argv[1]`
  // ends in `.tic`; if we don't pass it as a CLI arg, the C side
  // boots into the studio and looks for the cart at the configured
  // `console->rom.path`. We can write the cart there directly, but
  // the path is locked to the sandbox. Easiest: pass the cart name
  // as the first arg so `emsStart` sets up the preloader, AND drop
  // the cart bytes into MEMFS at the path the preloader would have
  // created, AND seed `Module.filePreloaded = true` so the bootstrap
  // tick fires `start()` on its very first poll.
  const cartName = cartUrl.split("/").pop() || "cart.tic";
  (window as any).Module = {
    canvas,
    arguments: [cartName],
    wasmBinary: wasmBytes,
    filePreloaded: true,
    print: (m: string) => console.log("[tic80]", m),
    printErr: (m: string) => console.error("[tic80]", m),
    onRuntimeInitialized: () => {
      // ponytail: the preloader would have written the cart at
      // `<sandbox>/<cartName>`. We just drop the bytes there
      // synchronously and seed `filePreloaded = true` so the
      // bootstrap tick fires `start()` immediately instead of
      // waiting for an XHR that will never come.
      try {
        const sandbox = "/com.nesbox.tic/TIC-80";
        (window as any).FS.mkdirTree(sandbox);
        (window as any).FS.writeFile(sandbox + "/" + cartName, cartBytes);
      } catch (e) {
        console.error("[tic80] cart preload failed:", e);
      }
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
    // Don't touch window.Module — see the note above.
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

    // ponytail: wait for the canvas to have a real layout box before
    // injecting the runtime. Inside a React modal the canvas mounts
    // before the browser paints, so clientWidth is 0 on the first
    // frame. The TIC-80 runtime reads `canvas.clientWidth` during
    // SDL_CreateWindow; if it's 0 it bails out and never resizes or
    // renders. One rAF tick is enough for layout to settle.
    const waitForLayout = new Promise<void>((resolve) => {
      if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        resolve();
        return;
      }
      const obs = new ResizeObserver(() => {
        if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(canvas);
      requestAnimationFrame(() => {
        if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
          obs.disconnect();
          resolve();
        }
      });
    });

    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        await waitForLayout;
        if (!mountedRef.current) return;
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
