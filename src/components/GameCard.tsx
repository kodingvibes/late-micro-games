import type { ReactNode } from "react";

interface GameCardProps {
  name: string;
  icon: ReactNode;
  description: string;
  bestScore: number;
  onClick: () => void;
  accent: string;
}

export function GameCard({ name, icon, description, bestScore, onClick, accent }: GameCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-2 rounded-2xl border border-${accent}-500/20 bg-${accent}-500/5 p-6 transition-all hover:border-${accent}-500/40 hover:bg-${accent}-500/10 hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className={`text-4xl text-${accent}-400`}>{icon}</div>
      <span className="text-sm font-semibold text-slate-200">{name}</span>
      <span className="text-xs text-slate-500 text-center leading-tight">{description}</span>
      {bestScore > 0 && (
        <span className={`mt-1 text-xs font-mono text-${accent}-400`}>
          mejor: {bestScore.toLocaleString()}
        </span>
      )}
    </button>
  );
}
