import Phaser from "phaser";

export type PhaserGameFactory = (parent: HTMLElement) => Phaser.Game;

export interface GameMeta {
  id: string;
  title: string;
  create: PhaserGameFactory;
}

const games: Record<string, GameMeta> = {};

export function registerPhaserGame(meta: GameMeta) {
  games[meta.id] = meta;
}

export function getPhaserGame(id: string): GameMeta | null {
  return games[id] ?? null;
}

export function listPhaserGames(): GameMeta[] {
  return Object.values(games);
}