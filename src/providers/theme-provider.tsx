import { useEffect, useState, createContext, useContext, type ReactNode } from "react";

type ThemeMode = "dark" | "light";
type AccentName = "indigo" | "rose" | "emerald" | "amber" | "violet" | "cyan";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentName;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: "dark", accent: "indigo" });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeContextValue>(() => ({
    mode: (typeof window !== "undefined" && (window.LateTheme?.mode ?? "dark")) as ThemeMode,
    accent: (typeof window !== "undefined" && (window.LateTheme?.accent ?? "indigo")) as AccentName,
  }));

  useEffect(() => {
    const handler = (e: CustomEvent) => setTheme(e.detail);
    window.addEventListener("late:theme-change", handler as EventListener);
    return () => window.removeEventListener("late:theme-change", handler as EventListener);
  }, []);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
