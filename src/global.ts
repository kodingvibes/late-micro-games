export {};

import type { ThemeMode, AccentName, LateTheme } from "@late/theme";
export type { ThemeMode, AccentName };

export interface GamesEngine {
  version: string;
}

declare global {
  interface Window {
    GamesEngine: GamesEngine;
    LateTheme?: LateTheme;
  }
}
