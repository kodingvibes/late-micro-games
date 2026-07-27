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
