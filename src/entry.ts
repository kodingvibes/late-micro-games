import "./index.css";
import { createRoot } from "react-dom/client";
import { mountGamesPage } from "./pages/Games/mount";

import pkg from "../package.json" with { type: "json" };

(globalThis as unknown as { __late_react_dom_client__: { createRoot: typeof createRoot } }).__late_react_dom_client__ = { createRoot };

declare global {
  interface Window {
    __lateMicroGamesMount?: () => void;
  }
}

window.GamesEngine = { version: pkg.version };

console.info("[micro-games] v" + pkg.version + " loaded");

function tryMount() {
  const root = document.getElementById("micro-games-root");
  if (root && !root.dataset.microMounted) {
    root.dataset.microMounted = "1";
    mountGamesPage(root);
  }
}

window.__lateMicroGamesMount = tryMount;
tryMount();
if (typeof MutationObserver !== "undefined" && document.body) {
  const obs = new MutationObserver(() => tryMount());
  obs.observe(document.body, { childList: true, subtree: true });
}
