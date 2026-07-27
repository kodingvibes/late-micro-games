import { registerPhaserGame } from "./shared/types";
import { createTetrisGame } from "./Tetris/TetrisGame";
import { createTwenty48Game } from "./Twenty48/Twenty48Game";
import { createMinesweeperGame } from "./Minesweeper/MinesweeperGame";
import { createSnakeGame } from "./Snake/SnakeGame";
import { createSpaceInvadersGame } from "./SpaceInvaders/SpaceInvadersGame";

registerPhaserGame({ id: "phaser-tetris", title: "Tetris", create: createTetrisGame });
registerPhaserGame({ id: "phaser-2048", title: "2048", create: createTwenty48Game });
registerPhaserGame({ id: "phaser-minesweeper", title: "Buscaminas", create: createMinesweeperGame });
registerPhaserGame({ id: "phaser-snake", title: "Snake", create: createSnakeGame });
registerPhaserGame({ id: "phaser-space-invaders", title: "Space Invaders", create: createSpaceInvadersGame });
console.info("[phaser] registered 5 games");