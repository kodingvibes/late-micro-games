import type { ReactNode } from "react";

interface GameLayoutProps {
  title: string;
  score: number;
  onBack: () => void;
  children: ReactNode;
  accent?: string;
}

export function GameLayout({ title, score, onBack, children, accent = "indigo" }: GameLayoutProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen">
      <div className="flex items-center justify-between w-full max-w-lg">
        <button
          onClick={onBack}
          className={`text-sm text-${accent}-400 hover:text-${accent}-300 transition-colors`}
        >
          ← lobby
        </button>
        <h2 className={`text-lg font-bold text-${accent}-300`}>{title}</h2>
        <span className={`text-sm font-mono text-${accent}-400`}>{score}</span>
      </div>
      {children}
    </div>
  );
}
