import { useState, useCallback, useEffect } from "react";

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Cell = { x: number; y: number };

const W = 20;
const H = 20;
const INITIAL_SPEED = 150;

function opposite(d: Dir): Dir {
  switch (d) {
    case "UP": return "DOWN";
    case "DOWN": return "UP";
    case "LEFT": return "RIGHT";
    case "RIGHT": return "LEFT";
  }
}

export function useSnake() {
  const [snake, setSnake] = useState<Cell[]>(() => [{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Cell>(() => ({ x: 15, y: 10 }));
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [nextDir, setNextDir] = useState<Dir>("RIGHT");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);

  const spawnFood = useCallback((s: Cell[]): Cell => {
    const occupied = new Set(s.map(c => `${c.x},${c.y}`));
    let c: Cell;
    do {
      c = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) };
    } while (occupied.has(`${c.x},${c.y}`));
    return c;
  }, []);

  const reset = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setDir("RIGHT");
    setNextDir("RIGHT");
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }, []);

  const tick = useCallback(() => {
    setSnake(prev => {
      setDir(d => {
        setNextDir(n => {
          const nd = opposite(d) === n ? d : n;
          return nd;
        });
        return d;
      });
      const currentDir = dir;
      const nd = nextDir;
      const actualDir = opposite(currentDir) === nd ? currentDir : nd;
      setDir(actualDir);
      setNextDir(actualDir);

      const head = prev[0];
      const newHead: Cell = (() => {
        switch (actualDir) {
          case "UP": return { x: head.x, y: head.y - 1 };
          case "DOWN": return { x: head.x, y: head.y + 1 };
          case "LEFT": return { x: head.x - 1, y: head.y };
          case "RIGHT": return { x: head.x + 1, y: head.y };
        }
      })();

      // wall collision
      if (newHead.x < 0 || newHead.x >= W || newHead.y < 0 || newHead.y >= H) {
        setGameOver(true);
        setRunning(false);
        return prev;
      }

      // self collision
      if (prev.some(c => c.x === newHead.x && c.y === newHead.y)) {
        setGameOver(true);
        setRunning(false);
        return prev;
      }

      const ate = newHead.x === food.x && newHead.y === food.y;
      const newSnake = [newHead, ...prev];
      if (!ate) newSnake.pop();
      if (ate) {
        setScore(s => s + 1);
        setFood(spawnFood(newSnake));
      }
      return newSnake;
    });
  }, [dir, nextDir, food, spawnFood]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const map: Record<string, Dir> = {
      ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
      w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
    };
    const nd = map[e.key];
    if (nd) {
      e.preventDefault();
      setNextDir(nd);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return { snake, food, score, gameOver, running, tick, reset, W, H };
}
