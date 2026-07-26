import { useState } from "react";
import { GameCard } from "@/components/GameCard";
import { getBestScore } from "@/lib/leaderboard";
import { SnakeGame } from "@/games/Snake/SnakeGame";
import { TetrisGame } from "@/games/Tetris/TetrisGame";
import { Twenty48Game } from "@/games/Twenty48/Twenty48Game";
import { MinesweeperGame } from "@/games/Minesweeper/MinesweeperGame";

type GameId = "snake" | "tetris" | "2048" | "minesweeper";

const GAMES: { id: GameId; name: string; icon: string; description: string; accent: string }[] = [
  { id: "snake", name: "Snake", icon: "🐍", description: "La serpiente clásica", accent: "emerald" },
  { id: "tetris", name: "Tetris", icon: "🧱", description: "Apilá y eliminá líneas", accent: "blue" },
  { id: "2048", name: "2048", icon: "🔢", description: "Uní fichas hasta 2048", accent: "amber" },
  { id: "minesweeper", name: "Buscaminas", icon: "💣", description: "Encontrá las minas", accent: "slate" },
];

export function GamesPage() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame === "snake") return <SnakeGame onBack={() => setActiveGame(null)} />;
  if (activeGame === "tetris") return <TetrisGame onBack={() => setActiveGame(null)} />;
  if (activeGame === "2048") return <Twenty48Game onBack={() => setActiveGame(null)} />;
  if (activeGame === "minesweeper") return <MinesweeperGame onBack={() => setActiveGame(null)} />;

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold text-slate-200 text-center mb-6">🎮 Juegos</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
        {GAMES.map(game => (
          <GameCard
            key={game.id}
            name={game.name}
            icon={<span>{game.icon}</span>}
            description={game.description}
            bestScore={getBestScore(game.id)}
            onClick={() => setActiveGame(game.id)}
            accent={game.accent}
          />
        ))}
      </div>
    </div>
  );
}
