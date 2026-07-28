import { useState } from "react";
import { GameCard } from "@/components/GameCard";
import { getBestScore } from "@/lib/leaderboard";
import { PhaserPlayer } from "@/games/Phaser/PhaserPlayer";

type GameId =
  | "phaser-tetris" | "phaser-2048" | "phaser-minesweeper" | "phaser-snake" | "phaser-space-invaders" | "phaser-river-raid";

const PHASER_GAMES: { id: GameId; name: string; icon: string; description: string; accent: string }[] = [
  { id: "phaser-tetris", name: "Tetris", icon: "🧱", description: "Apilá y eliminá líneas", accent: "blue" },
  { id: "phaser-2048", name: "2048", icon: "🔢", description: "Uní fichas hasta 2048", accent: "amber" },
  { id: "phaser-minesweeper", name: "Buscaminas", icon: "💣", description: "Encontrá las minas", accent: "slate" },
  { id: "phaser-snake", name: "Snake", icon: "🐍", description: "Comé manzanas y crecé", accent: "green" },
  { id: "phaser-space-invaders", name: "Space Invaders", icon: "👾", description: "Dispará a los aliens", accent: "purple" },
  { id: "phaser-river-raid", name: "River Raid", icon: "✈️", description: "Volá por el río", accent: "pink" },
];

const PHASER_TITLES: Record<string, string> = {
  "phaser-tetris": "Tetris",
  "phaser-2048": "2048",
  "phaser-minesweeper": "Buscaminas",
  "phaser-snake": "Snake",
  "phaser-space-invaders": "Space Invaders",
  "phaser-river-raid": "River Raid",
};

export function GamesPage() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame && activeGame in PHASER_TITLES) {
    return <PhaserPlayer gameId={activeGame} title={PHASER_TITLES[activeGame]} onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-mf-surface p-6 relative overflow-hidden">
      <div className="bg-doodles bg-games-doodles" aria-hidden="true" />
      <h1 className="relative z-10 text-2xl font-bold text-slate-200 text-center mb-6">🎮 Juegos</h1>

      <section className="relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          {PHASER_GAMES.map(game => (
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
      </section>
    </div>
  );
}
