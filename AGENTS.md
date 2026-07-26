# late-micro-games — Agent Notes

## What this is
- React micro-frontend for online games (mini-games, multiplayer, etc.).
- Built as an ESM bundle (`dist/entry.js` + `dist/style.css`) that the
  late.kodingvibes.com shell mounts into `<div id="micro-games-root">` on
  the `/games` route.

## Build & release
After ANY change to `src/`:

1. Write commits in [Conventional Commits](https://www.conventionalcommits.org/) format (`feat:`, `fix:`, `chore:`, `docs:`, `BREAKING CHANGE:`, etc.).
2. Push to `main`.
3. Semantic Release (`.github/workflows/release.yml`) will bump `version` in `package.json`, generate `CHANGELOG.md`, create a GitHub release, and push a release commit.

An external deployment script watches the repo and handles building and
publishing the bundle automatically. **Do not run shell-side deploy
scripts manually from this repo.**

**Never bump the version manually** — the release workflow owns `package.json#version` and `CHANGELOG.md`.

## Day-to-day
- Typecheck only: `npm run lint` (= `tsc --noEmit`).
- Full build: `npm run build`.
- Dev server: `npm run dev` (port 5186).

## Backend coupling
- Consumes game data from `late-games-service` via the shell's `window.LateSession`.
- `window.GamesEngine` is the single source of truth for games state.
