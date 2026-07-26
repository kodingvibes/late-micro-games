import { useTwenty48 } from "./useTwenty48";
import { GameLayout } from "@/components/GameLayout";

interface Props {
  onBack: () => void;
}

export function Twenty48Game({ onBack }: Props) {
  const { grid, score, gameOver, won, reset, tileColor } = useTwenty48();

  return (
    <GameLayout title="2048" score={score} onBack={onBack} accent="amber">
      <div className="flex flex-col gap-1.5 bg-amber-900/20 p-2 rounded-xl">
        {grid.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((v, c) => (
              <div
                key={c}
                className={`w-16 h-16 flex items-center justify-center rounded-lg text-lg font-bold transition-all ${tileColor(v)}`}
              >
                {v !== 0 ? v : ""}
              </div>
            ))}
          </div>
        ))}
      </div>

      {won && !gameOver && (
        <p className="text-amber-300 text-sm font-semibold mt-2">¡2048 alcanzado! Seguí jugando</p>
      )}

      {gameOver && (
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-amber-300 text-sm font-semibold">game over</p>
          <button
            onClick={reset}
            className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500 transition-colors"
          >
            jugar de nuevo
          </button>
        </div>
      )}
    </GameLayout>
  );
}
