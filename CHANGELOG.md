## [2.1.1](https://github.com/kodingvibes/late-micro-games/compare/v2.1.0...v2.1.1) (2026-07-27)


### Bug Fixes

* **godot:** use absolute micro/games path for iframe src ([a663ee3](https://github.com/kodingvibes/late-micro-games/commit/a663ee3318624fe92a86d1ac914ba3ca5072f0b6))

# [2.1.0](https://github.com/kodingvibes/late-micro-games/compare/v2.0.12...v2.1.0) (2026-07-27)


### Features

* **godot:** replace TIC-80/mad8 with official Godot Dodge the Creeps demo ([0917b7b](https://github.com/kodingvibes/late-micro-games/commit/0917b7b21afc5f891fc2b834d8f2e2f543e10fb6))

## [2.0.12](https://github.com/kodingvibes/late-micro-games/compare/v2.0.11...v2.0.12) (2026-07-27)


### Bug Fixes

* **tic80:** serve player from /micro/games/latest/ to avoid shell SPA fallback ([6d1fcac](https://github.com/kodingvibes/late-micro-games/commit/6d1fcac7312c83dcca5484905efd0240c9a05958))

## [2.0.11](https://github.com/kodingvibes/late-micro-games/compare/v2.0.10...v2.0.11) (2026-07-27)


### Bug Fixes

* **tic80:** write cart in preRun instead of onRuntimeInitialized ([61c997d](https://github.com/kodingvibes/late-micro-games/commit/61c997d76c08531891b5c6a50b686e130a54aeb1))

## [2.0.10](https://github.com/kodingvibes/late-micro-games/compare/v2.0.9...v2.0.10) (2026-07-27)


### Bug Fixes

* **tic80:** drop cart into MEMFS sandbox directly, skip preloader XHR ([0769133](https://github.com/kodingvibes/late-micro-games/commit/0769133672852788fab36e8210854fce02b360a0))

## [2.0.9](https://github.com/kodingvibes/late-micro-games/compare/v2.0.8...v2.0.9) (2026-07-27)


### Bug Fixes

* **tic80:** don't restore prev Module on cleanup (causes saveAs crash) ([53b0dbf](https://github.com/kodingvibes/late-micro-games/commit/53b0dbff91ce204f5be736a5193eac4acd16a892))

## [2.0.8](https://github.com/kodingvibes/late-micro-games/compare/v2.0.7...v2.0.8) (2026-07-27)


### Bug Fixes

* **tic80:** defer runtime injection until canvas has layout ([f586ce9](https://github.com/kodingvibes/late-micro-games/commit/f586ce9ca1db79f665a4ed2bc3c55612c9705771))

## [2.0.7](https://github.com/kodingvibes/late-micro-games/compare/v2.0.6...v2.0.7) (2026-07-27)


### Bug Fixes

* **tic80:** stop eagerly creating WebGL2 context that breaks SDL2 rendering ([5e8453a](https://github.com/kodingvibes/late-micro-games/commit/5e8453a8b67b8e91cefb6bcdcc5c17cc6797d160))

## [2.0.6](https://github.com/kodingvibes/late-micro-games/compare/v2.0.5...v2.0.6) (2026-07-27)


### Bug Fixes

* **tic80:** replace readAsync override with FS.createPreloadedFile to fix sandboxed cart loading ([12e0136](https://github.com/kodingvibes/late-micro-games/commit/12e013621ceb96e6ddef5b4aa2ca4b50f0f7bd4e))

## [2.0.5](https://github.com/kodingvibes/late-micro-games/compare/v2.0.4...v2.0.5) (2026-07-27)


### Bug Fixes

* **tic80:** register iframe load listener before appendChild to avoid race condition ([ec3c8d4](https://github.com/kodingvibes/late-micro-games/commit/ec3c8d435fb995d34cdb5bb5b05285a03549a2ae))

## [2.0.4](https://github.com/kodingvibes/late-micro-games/compare/v2.0.3...v2.0.4) (2026-07-27)


### Bug Fixes

* **tic80:** loader.html — 3 bugs blocking cart load in sandboxed iframe ([767e1a9](https://github.com/kodingvibes/late-micro-games/commit/767e1a9d6c40f41871ba3b0ad455cfe6e0f93aa3))

## [2.0.3](https://github.com/kodingvibes/late-micro-games/compare/v2.0.2...v2.0.3) (2026-07-27)


### Bug Fixes

* **tic80:** sandbox runtime in iframe, precache cart in MEMFS, robust download scripts ([e654621](https://github.com/kodingvibes/late-micro-games/commit/e654621a8c1540a3808d46bd52b448eb0f5078e1))


### Reverts

* Revert "fix(tic80): sandbox runtime in iframe, precache cart in MEMFS, robust download scripts" ([a3755cb](https://github.com/kodingvibes/late-micro-games/commit/a3755cbe388d47df438723e8fefd2f13f9659e65))

## [2.0.2](https://github.com/kodingvibes/late-micro-games/compare/v2.0.1...v2.0.2) (2026-07-27)


### Bug Fixes

* **tic80:** sandbox runtime in iframe, precache cart in MEMFS, robust download scripts ([8f44cfe](https://github.com/kodingvibes/late-micro-games/commit/8f44cfe124973728966bc32e86547a1ff0e7e7c1))

## [2.0.1](https://github.com/kodingvibes/late-micro-games/compare/v2.0.0...v2.0.1) (2026-07-27)


### Bug Fixes

* **tic80:** inline runtime as base64 in a code-split chunk ([52319a8](https://github.com/kodingvibes/late-micro-games/commit/52319a84c081e12050354bcccb51475fbf06f9de))

# [2.0.0](https://github.com/kodingvibes/late-micro-games/compare/v1.5.2...v2.0.0) (2026-07-27)


### Features

* **tic80:** self-host runtime instead of loading from tic80.com CDN ([f3c9219](https://github.com/kodingvibes/late-micro-games/commit/f3c9219e85ccd614f811481129042a3bdce3514f))


### BREAKING CHANGES

* **tic80:** the shell must now also serve the /tic80/
static directory (dist/tic80/) from the document root.

## [1.5.2](https://github.com/kodingvibes/late-micro-games/compare/v1.5.1...v1.5.2) (2026-07-27)


### Bug Fixes

* **tic80:** replace iframe with direct canvas embed ([a7d8531](https://github.com/kodingvibes/late-micro-games/commit/a7d8531143a49386be322c3c3c2f0f83e66c0af8))

## [1.5.1](https://github.com/kodingvibes/late-micro-games/compare/v1.5.0...v1.5.1) (2026-07-27)


### Bug Fixes

* **tic80:** explicit canvas dimensions, remove iframe sandbox, add locateFile ([212dadb](https://github.com/kodingvibes/late-micro-games/commit/212dadb928f9fbfcd65bf0bf084bdcb4f72d8044))

# [1.5.0](https://github.com/kodingvibes/late-micro-games/compare/v1.4.0...v1.5.0) (2026-07-27)


### Features

* **tic80:** embed TIC-80 cartridge player with cover extraction ([b77b049](https://github.com/kodingvibes/late-micro-games/commit/b77b04945b0a04c24aea99b2be1cb58bf14b4aa8))

# [1.4.0](https://github.com/kodingvibes/late-micro-games/compare/v1.3.0...v1.4.0) (2026-07-27)


### Features

* **games:** GameCard uses transparent glass surface ([eea9a1b](https://github.com/kodingvibes/late-micro-games/commit/eea9a1bf40750eda14a24aeebfd78b70cc7687ea))

# [1.3.0](https://github.com/kodingvibes/late-micro-games/compare/v1.2.2...v1.3.0) (2026-07-27)


### Features

* **games:** add card shadow to GameCard button ([9aff6fc](https://github.com/kodingvibes/late-micro-games/commit/9aff6fc03ac6cf2a120cd0eacca15768df1b8bcf))

## [1.2.2](https://github.com/kodingvibes/late-micro-games/compare/v1.2.1...v1.2.2) (2026-07-27)


### Bug Fixes

* **games:** redraw doodle motifs as hand-drawn strokes ([0d80886](https://github.com/kodingvibes/late-micro-games/commit/0d80886d7307aac8e302362771921d761f5b57a0))

## [1.2.1](https://github.com/kodingvibes/late-micro-games/compare/v1.2.0...v1.2.1) (2026-07-27)


### Bug Fixes

* **games:** doodle wallpaper now uses one SVG sprite tile ([d2852c0](https://github.com/kodingvibes/late-micro-games/commit/d2852c06e64b00ddf446e8aee3772637442d835c))

# [1.2.0](https://github.com/kodingvibes/late-micro-games/compare/v1.1.0...v1.2.0) (2026-07-27)


### Features

* **games:** add theme-aware doodle wallpaper with games motifs ([7a93c54](https://github.com/kodingvibes/late-micro-games/commit/7a93c5460cc6cce7b1081391f1b0ff96a9485609)), closes [hi#contrast](https://github.com/hi/issues/contrast)

# [1.1.0](https://github.com/kodingvibes/late-micro-games/compare/v1.0.0...v1.1.0) (2026-07-26)


### Features

* **ui:** wrap page in .bg-mf-surface shared canvas ([9c84706](https://github.com/kodingvibes/late-micro-games/commit/9c84706017506608d06d72aad0d9da1c3eecef5d))

# 1.0.0 (2026-07-26)


### Features

* implement 4 classic games (Snake, Tetris, 2048, Minesweeper) ([13030a9](https://github.com/kodingvibes/late-micro-games/commit/13030a93b4f2bcafaac829602d6b14ea9e757b67))
* initial scaffold for late-micro-games ([0392d88](https://github.com/kodingvibes/late-micro-games/commit/0392d88a8027bea81e9c4fefae95b9d5d46a8ede))
