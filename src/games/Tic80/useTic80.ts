import { useEffect, useRef, useState } from "react";

export type PlayerState = "idle" | "booting" | "ready" | "error";

const decode = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

// Encode Uint8Array as a JSON-safe array so we can embed it as a literal in the iframe HTML.
const bytesToJson = (bytes: Uint8Array<ArrayBuffer>): number[] =>
  Array.from(bytes);

// Build the HTML for the sandboxed iframe. The runtime runs inside the iframe so:
//   - It can't pollute the parent window's globals (we use `__lateTic80Module`, not `Module`).
//   - All cleanup happens by removing the iframe (kills requestAnimationFrame, audio, workers).
//   - The cart is downloaded by the parent and shipped as bytes so we don't depend on CORS
//     for the cart URL inside the runtime, and so the cart is loaded synchronously from MEMFS.
function buildIframeHtml(
  cartBytes: Uint8Array<ArrayBuffer>,
  jsCode: Uint8Array<ArrayBuffer>,
  wasmBytes: Uint8Array<ArrayBuffer>,
): string {
  const cartJson = JSON.stringify(bytesToJson(cartBytes));
  const wasmJson = JSON.stringify(bytesToJson(wasmBytes));
  const jsStr = new TextDecoder().decode(jsCode);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: #000; width: 240px; height: 136px; overflow: hidden; }
body { display: flex; align-items: center; justify-content: center; }
canvas { display: block; image-rendering: pixelated; width: 240px; height: 136px; }
</style>
</head>
<body>
<canvas id="tic80-canvas" width="240" height="136"></canvas>
<script>
(function () {
  "use strict";

  // Cart bytes shipped in by the parent. Decoded once and stashed on window for the loader override.
  var __lateCartBytes = new Uint8Array(${cartJson});
  var __lateWasmBytes = new Uint8Array(${wasmJson});
  var __lateReady = false;
  var __lateError = null;

  // Notify the parent of state changes. The parent listens for these.
  function post(type, detail) {
    try { parent.postMessage({ __lateTic80: true, type: type, detail: detail || null }, "*"); }
    catch (e) { /* parent gone, ignore */ }
  }

  // Pre-populate MEMFS with the cart. We do this lazily from inside asyncLoad below.
  function ensureCartInFS() {
    if (__lateReady) return true;
    try {
      if (typeof FS === "undefined") return false;
      // createDataFile signature: (parent, name, data, canRead, canWrite, canOwn)
      try { FS.unlink("/cart.tic"); } catch (e) { /* not there yet, fine */ }
      FS.createDataFile("/", "cart.tic", __lateCartBytes, true, true, false);
      __lateReady = true;
      return true;
    } catch (e) {
      __lateError = "FS createDataFile failed: " + e;
      return false;
    }
  }

  // Hook the runtime's async loader BEFORE the script runs so cart loads come from MEMFS.
  // The TIC-80 wasm uses arguments[0] as the cart URL and calls
  // FS.createPreloadedFile -> asyncLoad(url, ...) which uses readAsync (XHR).
  // XHR can't load local paths, so we intercept here.
  function installLoaderOverride() {
    // We can't override the global asyncLoad yet (it's defined inside the runtime).
    // Instead, override readAsync which asyncLoad delegates to for http URLs.
    // readAsync=(url,onload,onerror)=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,true);...}
    // We replace it so local paths are served from MEMFS.
    window.__lateOriginalReadAsync = window.readAsync;
    window.readAsync = function (url, onload, onerror) {
      try {
        if (typeof url === "string" && url.charAt(0) === "/") {
          if (!ensureCartInFS()) {
            if (onerror) onerror();
            return;
          }
          var data = FS.readFile(url, { encoding: "binary" });
          if (data && data.buffer) {
            // data is a Uint8Array
            // readAsync expects an ArrayBuffer, not a typed array
            onload(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
          } else if (onerror) {
            onerror();
          }
          return;
        }
      } catch (e) {
        if (onerror) onerror(e);
        return;
      }
      // Fall back to default for http(s) URLs.
      if (window.__lateOriginalReadAsync) {
        window.__lateOriginalReadAsync(url, onload, onerror);
      } else if (onerror) {
        onerror();
      }
    };
  }

  // Public Module config. Namespaced as __lateTic80Module so the parent window's globals stay clean.
  window.__lateTic80Module = {
    canvas: document.getElementById("tic80-canvas"),
    arguments: ["/cart.tic"],
    wasmBinary: __lateWasmBytes,
    // Provide the cart as a preloaded file lookup so even direct MEMFS paths work
    // (some TIC-80 paths probe /cart.tic on startup).
    preInit: [function () {
      // Defer until FS is available.
      var tries = 0;
      (function wait() {
        if (ensureCartInFS()) return;
        if (++tries > 200) { post("error", "Could not initialize cart in MEMFS"); return; }
        setTimeout(wait, 5);
      })();
    }],
    print: function (m) { try { console.log("[tic80]", m); } catch (e) {} },
    printErr: function (m) { try { console.error("[tic80]", m); } catch (e) {} },
    onRuntimeInitialized: function () {
      if (!ensureCartInFS()) {
        post("error", __lateError || "Could not prepare cart in MEMFS");
        return;
      }
      // give the preInit watcher one more tick to settle
      setTimeout(function () { post("ready"); }, 0);
    },
    setStatus: function (m) {
      if (typeof m === "string" && m.toLowerCase().indexOf("error") !== -1) {
        post("error", m);
      }
    },
    onAbort: function (what) {
      post("error", "Aborted: " + (what || "unknown"));
    },
  };

  // Surface uncaught errors from the runtime
  window.addEventListener("error", function (ev) {
    post("error", (ev && (ev.message || ev.error && ev.error.message)) || "Runtime error");
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var reason = ev && ev.reason;
    post("error", (reason && (reason.message || String(reason))) || "Unhandled rejection");
  });

  installLoaderOverride();

  // Load the runtime
  try {
    ${jsStr}
  } catch (e) {
    post("error", "Runtime threw on load: " + (e && e.message ? e.message : e));
  }
})();
</script>
</body>
</html>`;
}

export function useTic80(
  cartUrl: string,
  containerRef: React.RefObject<HTMLDivElement | null>,
): { state: PlayerState; error: string | null } {
  const [state, setState] = useState<PlayerState>("booting");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setState("booting");
    setError(null);

    const container = containerRef.current;
    if (!container) {
      setState("error");
      setError("Container no encontrado");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 1) Download the cart. This dodges CORS issues inside the runtime and lets us
        //    surface a clear error if the cart can't be reached.
        let cartRes: Response;
        try {
          cartRes = await fetch(cartUrl, { mode: "cors", credentials: "omit" });
        } catch (e) {
          throw new Error("No se pudo descargar el juego (CORS o red)");
        }
        if (!cartRes.ok) {
          throw new Error("No se pudo descargar el juego (HTTP " + cartRes.status + ")");
        }
        const cartBuf = await cartRes.arrayBuffer();
        if (!mountedRef.current || cancelled) return;
        const cartBytes = new Uint8Array(cartBuf) as Uint8Array<ArrayBuffer>;

        // 2) Load the embedded runtime.
        const runtime = await import("./_runtime");
        const jsCode = decode(runtime.TIC80_JS_B64);
        const wasmBytes = decode(runtime.TIC80_WASM_B64);
        if (!mountedRef.current || cancelled) return;

        // 3) Build the iframe HTML and mount the sandbox.
        const html = buildIframeHtml(cartBytes, jsCode, wasmBytes);

        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", "TIC-80 player");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.setAttribute("allow", "autoplay");
        iframe.style.cssText =
          "border:0;width:240px;height:136px;display:block;background:#000;";
        iframeRef.current = iframe;
        container.appendChild(iframe);

        // 4) Write the HTML into the iframe via srcdoc (more robust than data URLs in some browsers).
        iframe.srcdoc = html;

        // 5) Listen for messages from the iframe.
        const onMessage = (e: MessageEvent) => {
          if (!iframe.contentWindow || e.source !== iframe.contentWindow) return;
          const data = e.data as { __lateTic80?: boolean; type?: string; detail?: string | null } | null;
          if (!data || !data.__lateTic80) return;
          if (data.type === "ready" && mountedRef.current) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setState("ready");
          } else if (data.type === "error" && mountedRef.current) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setError(data.detail || "Error al cargar el juego");
            setState("error");
          }
        };
        window.addEventListener("message", onMessage);

        // 6) Timeout guard. If the runtime never reports ready/error in 30s, give up.
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setError("Tiempo de carga agotado");
            setState("error");
          }
        }, 30_000);

        // Cleanup is handled by the outer return; nothing to do here.
      } catch (e) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : String(e));
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Removing the iframe drops its window/document, which kills requestAnimationFrame,
      // audio, workers, and event listeners attached inside it. This is the entire point
      // of sandboxing the runtime.
      if (iframeRef.current) {
        const ifr = iframeRef.current;
        // Clear handlers to avoid late messages from a torn-down iframe.
        ifr.removeAttribute("srcdoc");
        if (ifr.parentNode) ifr.parentNode.removeChild(ifr);
        iframeRef.current = null;
      }
      // Defensive: if for any reason a __lateTic80Module leaked to the parent, drop it.
      try {
        delete (window as unknown as { __lateTic80Module?: unknown }).__lateTic80Module;
      } catch {
        (window as unknown as { __lateTic80Module?: unknown }).__lateTic80Module = undefined;
      }
    };
  }, [cartUrl]);

  return { state, error };
}
