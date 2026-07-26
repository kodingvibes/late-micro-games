import { GamesPage } from "./GamesPage";
import { ThemeProvider } from "@/providers/theme-provider";

export function mountGamesPage(root: HTMLElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ReactDOMClient = (globalThis as any).__late_react_dom_client__;
  if (!ReactDOMClient?.createRoot) {
    root.textContent = "[micro-games] react-dom/client no disponible";
    return;
  }
  const reactRoot = ReactDOMClient.createRoot(root);
  reactRoot.render(
    <ThemeProvider>
      <GamesPage />
    </ThemeProvider>,
  );
  return () => reactRoot.unmount();
}
