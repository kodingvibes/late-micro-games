import { useEffect, useRef, useState } from "react";

export type PlayerState = "idle" | "booting" | "ready" | "error";

const TIC80_JS = "https://tic80.com/js/1.1.2837/tic80.js";

export function useTic80(
  cartUrl: string,
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
): { state: PlayerState; error: string | null } {
  const [state, setState] = useState<PlayerState>("booting");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const iframe = iframeRef.current;
    if (!iframe) {
      setState("error");
      setError("No iframe");
      return;
    }

    setState("booting");
    const doc = iframe.contentDocument;
    if (!doc) {
      setState("error");
      setError("No iframe document");
      return;
    }

    doc.open();
    doc.write(`
<!DOCTYPE html>
<html>
<head>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#111}
canvas{display:block;width:100%;aspect-ratio:240/136;max-width:720px;margin:0 auto;image-rendering:pixelated;outline:none;background:#000}
canvas:focus{outline:none}
</style>
</head>
<body>
<canvas id="tic80-canvas" width="240" height="136" tabindex="0" oncontextmenu="event.preventDefault()" onmousedown="window.focus()"></canvas>
<script>
window.Module = {
  locateFile: function(f){return 'https://tic80.com/js/1.1.2837/'+f},
  canvas: document.getElementById('tic80-canvas'),
  arguments: [${JSON.stringify(cartUrl)}],
  print: function(m){console.log('[tic80]',m)},
  printErr: function(m){console.error('[tic80]',m)},
  onRuntimeInitialized: function(){
    window.parent.postMessage({type:'tic80:ready'},'*');
  },
  setStatus: function(m){
    if(m && m.includes('error')) window.parent.postMessage({type:'tic80:error',message:m},'*');
  },
};
</script>
<script src="${TIC80_JS}"></script>
</body>
</html>
`);
    doc.close();

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "tic80:ready" && mountedRef.current) setState("ready");
      if (e.data?.type === "tic80:error" && mountedRef.current) {
        setError(e.data.message);
        setState("error");
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("message", onMessage);
    };
  }, [cartUrl, iframeRef]);

  return { state, error };
}
