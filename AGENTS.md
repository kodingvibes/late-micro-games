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

## TIC-80 catalog
- `GET /api/tic80/games` returns `Tic80Game[]` with `id`, `name`, `description`,
  `cartUrl` (CORS-enabled `.tic` binary), `coverUrl` (optional PNG), `accent`.
- Falls back to a hardcoded catalog if the endpoint is unreachable.
- TIC-80 cartridges render on a direct `<canvas>` in the main document (no iframe).
- The official WASM runtime (`tic80.js` + `tic80.wasm`, v1.1.2837) is self-hosted
  at `/tic80/` on the same origin, downloaded from `tic80.com` during `npm run build`.
- Cart switching tears down and re-injects the runtime via cache-busted `<script>`.
- Cover images are extracted from the `.tic` binary (CHUNK_SCREEN + PALETTE)
  when `coverUrl` is not provided. Cached per `cartUrl`.
