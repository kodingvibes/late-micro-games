import { useEffect, useRef, useCallback } from "react";

export function useGameLoop(callback: (dt: number) => void, running: boolean) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  const loop = useCallback((time: number) => {
    const dt = time - lastRef.current;
    lastRef.current = time;
    cbRef.current(dt);
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, loop]);
}
