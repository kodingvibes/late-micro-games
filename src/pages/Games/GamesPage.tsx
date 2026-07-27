import { useState } from "react";
import { GameCard } from "@/components/GameCard";
import { getBestScore } from "@/lib/leaderboard";
import { TetrisGame } from "@/games/Tetris/TetrisGame";
import { Twenty48Game } from "@/games/Twenty48/Twenty48Game";
import { MinesweeperGame } from "@/games/Minesweeper/MinesweeperGame";
import { GodotDemo } from "@/games/Godot/GodotDemo";

type GameId = "tetris" | "2048" | "minesweeper" | "godot-demo";

const GAMES: { id: GameId; name: string; icon: string; description: string; accent: string }[] = [
  { id: "tetris", name: "Tetris", icon: "🧱", description: "Apilá y eliminá líneas", accent: "blue" },
  { id: "2048", name: "2048", icon: "🔢", description: "Uní fichas hasta 2048", accent: "amber" },
  { id: "minesweeper", name: "Buscaminas", icon: "💣", description: "Encontrá las minas", accent: "slate" },
  { id: "godot-demo", name: "Dodge the Creeps", icon: "🎮", description: "Demo Godot original", accent: "green" },
];

export function GamesPage() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame) {
    const id = activeGame;
    if (id === "tetris") return <TetrisGame onBack={() => setActiveGame(null)} />;
    if (id === "2048") return <Twenty48Game onBack={() => setActiveGame(null)} />;
    if (id === "minesweeper") return <MinesweeperGame onBack={() => setActiveGame(null)} />;
    if (id === "godot-demo") return <GodotDemo onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-mf-surface p-6 relative overflow-hidden">
      <div className="bg-doodles bg-games-doodles" aria-hidden="true" />
      <h1 className="relative z-10 text-2xl font-bold text-slate-200 text-center mb-6">🎮 Juegos</h1>

      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
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
