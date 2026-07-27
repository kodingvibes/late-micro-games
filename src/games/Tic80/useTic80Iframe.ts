import { useEffect, useRef, useState } from "react";
import type { Tic80Game } from "@/lib/tic80Catalog";
import type {
  PlayerState,
  Tic80HostMessage,
  Tic80IframeMessage,
} from "@/games/Tic80/tic80Messages";

export type { PlayerState };

const LOADER_SRC = "/tic80/loader.html";
const READY_TIMEOUT_MS = 30_000;

const decode = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

/**
 * Derive a stable, safe cart filename from the cart URL.
 *
 * The TIC-80 runtime receives this name as its `arguments[0]`. We strip the
 * path and query, keep the basename, and sanitise anything that isn't a
 * plain ASCII letter/digit/dot/dash/underscore. Fallback to `cart.tic`.
 */
function cartNameFromUrl(cartUrl: string): string {
  try {
    const u = new URL(cartUrl, "https://placeholder.invalid/");
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    const cleaned = last.replace(/[^A-Za-z0-9._-]/g, "_");
    if (cleaned && cleaned.length > 0) return cleaned;
  } catch {
    /* fall through */
  }
  return "cart.tic";
}

export interface UseTic80IframeResult {
  state: PlayerState;
  error: string | null;
}

export function useTic80Iframe(cart: Tic80Game): UseTic80IframeResult {
  const [state, setState] = useState<PlayerState>("booting");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stash teardown from the async setup so the effect's cleanup can call it.
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setState("booting");
    setError(null);

    let cancelled = false;

    (async () => {
      // 1) Download the cart in the parent (avoids CORS inside the runtime).
      let cartBuf: ArrayBuffer;
      try {
        const cartRes = await fetch(cart.cartUrl, {
          mode: "cors",
          credentials: "omit",
        });
        if (!cartRes.ok) {
          throw new Error(
            `No se pudo descargar el juego (HTTP ${cartRes.status})`,
          );
        }
        cartBuf = await cartRes.arrayBuffer();
      } catch (e) {
        if (mountedRef.current && !cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo descargar el juego (CORS o red)",
          );
          setState("error");
        }
        return;
      }

      if (!mountedRef.current || cancelled) return;

      // 2) Load the embedded runtime.
      let jsCode: Uint8Array<ArrayBuffer>;
      let wasmBytes: Uint8Array<ArrayBuffer>;
      try {
        const runtime = await import("./_runtime");
        jsCode = decode(runtime.TIC80_JS_B64);
        wasmBytes = decode(runtime.TIC80_WASM_B64);
      } catch (e) {
        if (mountedRef.current && !cancelled) {
          setError(
            e instanceof Error ? e.message : "Runtime no disponible",
          );
          setState("error");
        }
        return;
      }

      if (!mountedRef.current || cancelled) return;

      // 3) Create the sandboxed iframe. `allow-scripts` is mandatory; we
      //    intentionally omit `allow-same-origin` so the runtime can't reach
      //    into the parent's storage/cookies/etc.
      const iframe = document.createElement("iframe");
      iframe.setAttribute("title", "TIC-80 player");
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.setAttribute("referrerpolicy", "no-referrer");
      iframe.setAttribute("allow", "autoplay");
      iframe.style.cssText =
        "border:0;width:100%;height:100%;display:block;background:#000;";
      iframe.src = LOADER_SRC;
      iframeRef.current = iframe;

      // 4) Wire up the message listener BEFORE appending the iframe, so we
      //    don't miss the first "booting" ping.
      const onMessage = (e: MessageEvent) => {
        if (!iframe.contentWindow) return;
        if (e.source !== iframe.contentWindow) return;
        const data = e.data as Tic80IframeMessage | null;
        if (!data || typeof data !== "object") return;
        switch (data.type) {
          case "ready":
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            if (mountedRef.current) setState("ready");
            break;
          case "error":
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            if (mountedRef.current) {
              setError(data.detail || "Error al cargar el juego");
              setState("error");
            }
            break;
          case "booting":
            if (mountedRef.current) setState("booting");
            break;
          case "log":
            // Surface runtime logs to the browser console for debugging.
            if (data.level === "error") {
              // eslint-disable-next-line no-console
              console.error("[tic80]", data.message);
            } else {
              // eslint-disable-next-line no-console
              console.log("[tic80]", data.message);
            }
            break;
        }
      };
      window.addEventListener("message", onMessage);

      // 5) Append to the host. The Tic80Player renders an element with
      //    id="tic80-iframe-host" that we target directly.
      const host =
        document.getElementById("tic80-iframe-host") ?? document.body;
      host.appendChild(iframe);

      // 6) When the loader HTML has finished parsing, ship the init payload
      //    with Transferable Objects so we don't copy large buffers.
      const onIframeLoad = () => {
        if (cancelled || !mountedRef.current || !iframe.contentWindow) return;
        // Re-decode into fresh ArrayBuffers for transfer; the original
        // Uint8Array's underlying buffer can be detached by the transfer.
        const cartForTransfer = cartBuf.slice(0);
        const jsForTransfer = jsCode.buffer.slice(0);
        const wasmForTransfer = wasmBytes.buffer.slice(0);
        const init: Tic80HostMessage = {
          type: "init",
          jsBytes: jsForTransfer,
          wasmBytes: wasmForTransfer,
          cartBytes: cartForTransfer,
          cartName: cartNameFromUrl(cart.cartUrl),
        };
        iframe.contentWindow.postMessage(init, "*", [
          init.jsBytes,
          init.wasmBytes,
          init.cartBytes,
        ]);
      };
      iframe.addEventListener("load", onIframeLoad);

      // 7) Ready timeout. If the runtime never reports ready/error, give up.
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setError("Tiempo de carga agotado");
          setState("error");
        }
      }, READY_TIMEOUT_MS);

      // Cleanup is stored on the ref so the effect's teardown can call it.
      cleanupRef.current = () => {
        window.removeEventListener("message", onMessage);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        const ifr = iframeRef.current;
        if (ifr) {
          ifr.removeEventListener("load", onIframeLoad);
          // Send destroy so the iframe can release its Module reference
          // before we drop it. The parent will still remove the node below.
          try {
            const destroy: Tic80HostMessage = { type: "destroy" };
            ifr.contentWindow?.postMessage(destroy, "*");
          } catch {
            /* iframe may already be gone */
          }
          if (ifr.parentNode) ifr.parentNode.removeChild(ifr);
          iframeRef.current = null;
        }
      };
    })().catch((e) => {
      if (mountedRef.current && !cancelled) {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [cart.cartUrl, cart.id]);

  return { state, error };
}
