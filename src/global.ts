export {};

import type { ThemeMode, AccentName, LateTheme } from "@late/theme";
export type { ThemeMode, AccentName };

declare global {
  interface Window {
    GamesEngine?: { version: string };
    LateTheme?: LateTheme;
  }
}
