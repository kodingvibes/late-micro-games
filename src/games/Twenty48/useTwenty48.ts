import { useState, useCallback, useEffect } from "react";

const SIZE = 4;

function createEmptyGrid(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(grid: number[][]): number[][] {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function slide(row: number[]): { row: number[]; score: number } {
  const filtered = row.filter(v => v !== 0);
  const result: number[] = [];
  let score = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      result.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i++;
    } else {
      result.push(filtered[i]);
    }
  }
  while (result.length < SIZE) result.push(0);
  return { row: result, score };
}

function transpose(grid: number[][]): number[][] {
  return grid[0].map((_, c) => grid.map(row => row[c]));
}

function reverseRows(grid: number[][]): number[][] {
  return grid.map(row => [...row].reverse());
}

type Dir = "left" | "right" | "up" | "down";

function move(grid: number[][], dir: Dir): { grid: number[][]; score: number } {
  let working = grid.map(row => [...row]);
  let totalScore = 0;

  if (dir === "left") {
    working = working.map(row => {
      const { row: r, score } = slide(row);
      totalScore += score;
      return r;
    });
  } else if (dir === "right") {
    working = reverseRows(working).map(row => {
      const { row: r, score } = slide(row);
      totalScore += score;
      return r;
    });
    working = reverseRows(working);
  } else if (dir === "up") {
    working = transpose(working).map(row => {
      const { row: r, score } = slide(row);
      totalScore += score;
      return r;
    });
    working = transpose(working);
  } else if (dir === "down") {
    working = transpose(reverseRows(working)).map(row => {
      const { row: r, score } = slide(row);
      totalScore += score;
      return r;
    });
    working = reverseRows(transpose(working));
  }

  return { grid: working, score: totalScore };
}

function hasMoves(grid: number[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

function gridEquals(a: number[][], b: number[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export function useTwenty48() {
  const [grid, setGrid] = useState<number[][]>(() => addRandom(addRandom(createEmptyGrid())));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const reset = useCallback(() => {
    setGrid(addRandom(addRandom(createEmptyGrid())));
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  const handleMove = useCallback((dir: Dir) => {
    setGrid(prev => {
      const { grid: newGrid, score: gained } = move(prev, dir);
      if (gridEquals(prev, newGrid)) return prev;
      const withRandom = addRandom(newGrid);
      setScore(s => s + gained);
      if (!won && withRandom.some(row => row.some(v => v >= 2048))) setWon(true);
      if (!hasMoves(withRandom)) setGameOver(true);
      return withRandom;
    });
  }, [won]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const map: Record<string, Dir> = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
    };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      handleMove(dir);
    }
  }, [handleMove]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const tileColor = (v: number): string => {
    const map: Record<number, string> = {
      0: "bg-slate-800/40 text-transparent",
      2: "bg-amber-100 text-amber-800",
      4: "bg-amber-200 text-amber-800",
      8: "bg-amber-400 text-white",
      16: "bg-amber-500 text-white",
      32: "bg-amber-600 text-white",
      64: "bg-amber-700 text-white",
      128: "bg-amber-300 text-amber-900",
      256: "bg-amber-300 text-amber-900",
      512: "bg-amber-300 text-amber-900",
      1024: "bg-amber-200 text-amber-900",
      2048: "bg-yellow-300 text-yellow-900",
    };
    return map[v] || "bg-amber-800 text-white";
  };

  return { grid, score, gameOver, won, reset, tileColor };
}
