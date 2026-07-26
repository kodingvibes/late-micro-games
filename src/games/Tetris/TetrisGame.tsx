import { useEffect, useRef, useState, useCallback } from "react";
import { createTetrisState, type TetrisState } from "./useTetris";
import { GameLayout } from "@/components/GameLayout";

interface Props {
  onBack: () => void;
}

export function TetrisGame({ onBack }: Props) {
  const [state, setState] = useState<TetrisState>(() => createTetrisState());
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setState(s => { s.drop(); return s; });
      setTick(t => t + 1);
    }, 400);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a": e.preventDefault(); setState(s => { s.move(-1); return s; }); break;
      case "ArrowRight":
      case "d": e.preventDefault(); setState(s => { s.move(1); return s; }); break;
      case "ArrowDown":
      case "s": e.preventDefault(); setState(s => { s.drop(); return s; }); break;
      case "ArrowUp":
      case "w": e.preventDefault(); setState(s => { s.rotate(); return s; }); break;
      case " ": e.preventDefault(); setState(s => { s.hardDrop(); return s; }); break;
    }
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const reset = useCallback(() => {
    const s = createTetrisState();
    setState(s);
    setTick(0);
  }, []);

  const board = state.board;
  const current = state.current;
  const next = state.next;

  // render board with current piece
  const renderBoard = board.map((row, y) => {
    const cells = row.map((cell, x) => {
      let cls = "w-5 h-5 rounded-sm ";
      // check if current piece covers this cell
      let covered = false;
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c] && current.x + c === x && current.y + r === y) {
            cls += "bg-slate-300";
            covered = true;
          }
        }
      }
      if (!covered) cls += cell || "bg-slate-800/40";
      return <div key={x} className={cls} />;
    });
    return <div key={y} className="flex gap-px">{cells}</div>;
  });

  // render next piece preview
  const nextShape = next.shape;
  const nextRender = Array.from({ length: 4 }, (_, r) => (
    <div key={r} className="flex gap-px">
      {Array.from({ length: 4 }, (_, c) => {
        const filled = nextShape[r]?.[c];
        return <div key={c} className={`w-4 h-4 rounded-sm ${filled ? "bg-slate-300" : "bg-transparent"}`} />;
      })}
    </div>
  ));

  return (
    <GameLayout title="Tetris" score={state.score} onBack={onBack} accent="blue">
      <div className="flex gap-6 items-start">
        <div className="flex flex-col gap-px bg-slate-900/50 p-1 rounded-lg">{renderBoard}</div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-blue-400">siguiente</span>
          <div className="bg-slate-900/50 p-2 rounded-lg">{nextRender}</div>
        </div>
      </div>

      {state.gameOver && (
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-blue-300 text-sm font-semibold">game over</p>
          <button
            onClick={reset}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
          >
            jugar de nuevo
          </button>
        </div>
      )}
    </GameLayout>
  );
}
