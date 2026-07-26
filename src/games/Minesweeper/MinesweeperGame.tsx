import { useMinesweeper } from "./useMinesweeper";
import { GameLayout } from "@/components/GameLayout";

interface Props {
  onBack: () => void;
}

const NUM_COLORS = [
  "text-transparent",
  "text-blue-400",
  "text-green-400",
  "text-red-400",
  "text-purple-400",
  "text-amber-400",
  "text-cyan-400",
  "text-slate-400",
  "text-gray-400",
];

export function MinesweeperGame({ onBack }: Props) {
  const { board, gameOver, won, difficulty, flagMode, minesLeft, setFlagMode, handleClick, reset, config } = useMinesweeper();

  return (
    <GameLayout title="Buscaminas" score={minesLeft} onBack={onBack} accent="slate">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as const).map(d => (
            <button
              key={d}
              onClick={() => reset(d)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                difficulty === d
                  ? "bg-slate-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFlagMode(f => !f)}
          className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
            flagMode ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          🚩 {flagMode ? "ON" : "OFF"}
        </button>
      </div>

      <div
        className="grid gap-px bg-slate-800/50 p-1 rounded-lg"
        style={{ gridTemplateColumns: `repeat(${config.cols}, 24px)` }}
      >
        {board.flatMap((row, r) =>
          row.map((cell, c) => {
            let cls = "w-6 h-6 flex items-center justify-center text-xs font-bold rounded-sm ";
            if (cell.revealed) {
              if (cell.mine) cls += "bg-red-600 text-white";
              else cls += "bg-slate-700/60 " + (NUM_COLORS[cell.adjacent] || "text-slate-400");
            } else if (cell.flagged) {
              cls += "bg-slate-700 text-red-400";
            } else {
              cls += "bg-slate-800 hover:bg-slate-700 cursor-pointer";
            }
            return (
              <div
                key={`${r}-${c}`}
                className={cls}
                onClick={() => handleClick(r, c)}
                onContextMenu={e => { e.preventDefault(); handleClick(r, c); }}
              >
                {cell.revealed && cell.mine && "💣"}
                {cell.revealed && !cell.mine && cell.adjacent > 0 && cell.adjacent}
                {cell.flagged && !cell.revealed && "🚩"}
              </div>
            );
          })
        )}
      </div>

      {gameOver && (
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-red-400 text-sm font-semibold">game over</p>
          <button
            onClick={() => reset()}
            className="px-4 py-1.5 rounded-lg bg-slate-600 text-white text-sm hover:bg-slate-500 transition-colors"
          >
            jugar de nuevo
          </button>
        </div>
      )}

      {won && (
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-green-400 text-sm font-semibold">¡ganaste!</p>
          <button
            onClick={() => reset()}
            className="px-4 py-1.5 rounded-lg bg-slate-600 text-white text-sm hover:bg-slate-500 transition-colors"
          >
            jugar de nuevo
          </button>
        </div>
      )}
    </GameLayout>
  );
}
