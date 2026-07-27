import { useEffect, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { Tic80Card } from "@/components/Tic80Card";
import { Tic80Player } from "@/games/Tic80/Tic80Player";
import { getBestScore } from "@/lib/leaderboard";
import { fetchTic80Catalog } from "@/lib/tic80Catalog";
import { SnakeGame } from "@/games/Snake/SnakeGame";
import { TetrisGame } from "@/games/Tetris/TetrisGame";
import { Twenty48Game } from "@/games/Twenty48/Twenty48Game";
import { MinesweeperGame } from "@/games/Minesweeper/MinesweeperGame";
import type { Tic80Game } from "@/lib/tic80Catalog";

type GameId = "snake" | "tetris" | "2048" | "minesweeper";

const GAMES: { id: GameId; name: string; icon: string; description: string; accent: string }[] = [
  { id: "snake", name: "Snake", icon: "🐍", description: "La serpiente clásica", accent: "emerald" },
  { id: "tetris", name: "Tetris", icon: "🧱", description: "Apilá y eliminá líneas", accent: "blue" },
  { id: "2048", name: "2048", icon: "🔢", description: "Uní fichas hasta 2048", accent: "amber" },
  { id: "minesweeper", name: "Buscaminas", icon: "💣", description: "Encontrá las minas", accent: "slate" },
];

type ActiveGame =
  | { kind: "local"; id: GameId }
  | { kind: "tic80"; cart: Tic80Game }
  | null;

export function GamesPage() {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [tic80Games, setTic80Games] = useState<Tic80Game[]>([]);

  useEffect(() => {
    fetchTic80Catalog().then(setTic80Games);
  }, []);

  if (activeGame?.kind === "local") {
    const { id } = activeGame;
    if (id === "snake") return <SnakeGame onBack={() => setActiveGame(null)} />;
    if (id === "tetris") return <TetrisGame onBack={() => setActiveGame(null)} />;
    if (id === "2048") return <Twenty48Game onBack={() => setActiveGame(null)} />;
    if (id === "minesweeper") return <MinesweeperGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame?.kind === "tic80") {
    return <Tic80Player key={activeGame.cart.id} cart={activeGame.cart} onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-mf-surface p-6 relative overflow-hidden">
      {/* ponytail: game-themed doodle wallpaper under the cards. */}
      <div className="bg-doodles bg-games-doodles" aria-hidden="true" />
      <h1 className="relative z-10 text-2xl font-bold text-slate-200 text-center mb-6">🎮 Juegos</h1>

      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
        {GAMES.map(game => (
          <GameCard
            key={game.id}
            name={game.name}
            icon={<span>{game.icon}</span>}
            description={game.description}
            bestScore={getBestScore(game.id)}
            onClick={() => setActiveGame({ kind: "local", id: game.id })}
            accent={game.accent}
          />
        ))}
      </div>

      {tic80Games.length > 0 && (
        <>
          <hr className="relative z-10 my-8 border-slate-700/50 max-w-2xl mx-auto" />
          <h2 className="relative z-10 text-xl font-bold text-slate-300 text-center mb-4">🕹️ TIC-80</h2>
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {tic80Games.map(game => (
              <Tic80Card
                key={game.id}
                game={game}
                onClick={() => setActiveGame({ kind: "tic80", cart: game })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
