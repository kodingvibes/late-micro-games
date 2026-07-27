import { useState } from "react";
import { GameCard } from "@/components/GameCard";
import { getBestScore } from "@/lib/leaderboard";
import { GodotGame } from "@/games/Godot/GodotGame";
import { GodotDemo } from "@/games/Godot/GodotDemo";
import { PhaserPlayer } from "@/games/Phaser/PhaserPlayer";

type GameId =
  | "tetris" | "2048" | "minesweeper" | "snake" | "space-invaders" | "godot-demo"
  | "phaser-tetris" | "phaser-2048" | "phaser-minesweeper" | "phaser-snake" | "phaser-space-invaders";

const GODOT_GAMES: { id: GameId; name: string; icon: string; description: string; accent: string }[] = [
  { id: "tetris", name: "Tetris", icon: "🧱", description: "Apilá y eliminá líneas", accent: "blue" },
  { id: "2048", name: "2048", icon: "🔢", description: "Uní fichas hasta 2048", accent: "amber" },
  { id: "minesweeper", name: "Buscaminas", icon: "💣", description: "Encontrá las minas", accent: "slate" },
  { id: "snake", name: "Snake", icon: "🐍", description: "Comé manzanas y crecé", accent: "green" },
  { id: "space-invaders", name: "Space Invaders", icon: "👾", description: "Dispará a los aliens", accent: "purple" },
  { id: "godot-demo", name: "Dodge the Creeps", icon: "🎮", description: "Demo Godot original", accent: "pink" },
];

const PHASER_GAMES: { id: GameId; name: string; icon: string; description: string; accent: string }[] = [
  { id: "phaser-tetris", name: "Tetris", icon: "🧱", description: "Versión Phaser", accent: "blue" },
  { id: "phaser-2048", name: "2048", icon: "🔢", description: "Versión Phaser", accent: "amber" },
  { id: "phaser-minesweeper", name: "Buscaminas", icon: "💣", description: "Versión Phaser", accent: "slate" },
  { id: "phaser-snake", name: "Snake", icon: "🐍", description: "Versión Phaser", accent: "green" },
  { id: "phaser-space-invaders", name: "Space Invaders", icon: "👾", description: "Versión Phaser", accent: "purple" },
];

const GODOT_TITLES: Record<string, string> = {
  tetris: "Tetris (Godot)",
  "2048": "2048 (Godot)",
  minesweeper: "Buscaminas (Godot)",
  snake: "Snake (Godot)",
  "space-invaders": "Space Invaders (Godot)",
};

const PHASER_TITLES: Record<string, string> = {
  "phaser-tetris": "Tetris (Phaser)",
  "phaser-2048": "2048 (Phaser)",
  "phaser-minesweeper": "Buscaminas (Phaser)",
  "phaser-snake": "Snake (Phaser)",
  "phaser-space-invaders": "Space Invaders (Phaser)",
};

export function GamesPage() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame) {
    if (activeGame === "godot-demo") return <GodotDemo onBack={() => setActiveGame(null)} />;
    if (activeGame in GODOT_TITLES) {
      return <GodotGame game={activeGame} title={GODOT_TITLES[activeGame]} onBack={() => setActiveGame(null)} />;
    }
    if (activeGame in PHASER_TITLES) {
      return <PhaserPlayer gameId={activeGame} title={PHASER_TITLES[activeGame]} onBack={() => setActiveGame(null)} />;
    }
  }

  return (
    <div className="min-h-screen bg-mf-surface p-6 relative overflow-hidden">
      <div className="bg-doodles bg-games-doodles" aria-hidden="true" />
      <h1 className="relative z-10 text-2xl font-bold text-slate-200 text-center mb-6">🎮 Juegos</h1>

      <section className="relative z-10 mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 max-w-lg mx-auto">Godot</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          {GODOT_GAMES.map(game => (
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

      <section className="relative z-10">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 max-w-lg mx-auto">Phaser</h2>
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