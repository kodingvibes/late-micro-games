import { useSnake } from "./useSnake";
import { useGameLoop } from "@/lib/useGameLoop";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useRef } from "react";

interface Props {
  onBack: () => void;
}

export function SnakeGame({ onBack }: Props) {
  const { snake, food, score, gameOver, running, tick, reset, W, H } = useSnake();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 150);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  return (
    <GameLayout title="Snake" score={score} onBack={onBack} accent="emerald">
      <div
        className="grid gap-px bg-emerald-900/30 rounded-lg p-1"
        style={{ gridTemplateColumns: `repeat(${W}, 16px)` }}
      >
        {Array.from({ length: H }, (_, y) =>
          Array.from({ length: W }, (_, x) => {
            const isHead = snake[0].x === x && snake[0].y === y;
            const isBody = snake.some((c, i) => i > 0 && c.x === x && c.y === y);
            const isFood = food.x === x && food.y === y;
            let cls = "w-4 h-4 rounded-sm ";
            if (isHead) cls += "bg-emerald-300";
            else if (isBody) cls += "bg-emerald-500";
            else if (isFood) cls += "bg-red-400 animate-pulse";
            else cls += "bg-emerald-950/20";
            return <div key={`${x}-${y}`} className={cls} />;
          })
        )}
      </div>

      {gameOver && (
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-emerald-300 text-sm font-semibold">game over</p>
          <button
            onClick={reset}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
          >
            jugar de nuevo
          </button>
        </div>
      )}

      {!running && !gameOver && (
        <button
          onClick={reset}
          className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors mt-2"
        >
          empezar
        </button>
      )}
    </GameLayout>
  );
}
