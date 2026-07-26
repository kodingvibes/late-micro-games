export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

const SHAPES: Record<PieceType, number[][]> = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};

const COLORS: Record<PieceType, string> = {
  I: "bg-cyan-400",
  O: "bg-yellow-400",
  T: "bg-purple-400",
  S: "bg-green-400",
  Z: "bg-red-400",
  J: "bg-blue-400",
  L: "bg-orange-400",
};

const W = 10;
const H = 20;

function randomPiece(): PieceType {
  const types: PieceType[] = ["I","O","T","S","Z","J","L"];
  return types[Math.floor(Math.random() * types.length)];
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}

interface Piece {
  type: PieceType;
  shape: number[][];
  x: number;
  y: number;
}

function spawnPiece(): Piece {
  const type = randomPiece();
  const shape = SHAPES[type];
  return { type, shape, x: Math.floor((W - shape[0].length) / 2), y: 0 };
}

function collides(board: (string | null)[][], piece: Piece): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const bx = piece.x + c;
      const by = piece.y + r;
      if (bx < 0 || bx >= W || by >= H || (by >= 0 && board[by][bx] !== null)) return true;
    }
  }
  return false;
}

function lockPiece(board: (string | null)[][], piece: Piece): (string | null)[][] {
  const newBoard = board.map(row => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const by = piece.y + r;
      if (by >= 0) newBoard[by][piece.x + c] = COLORS[piece.type];
    }
  }
  return newBoard;
}

function clearLines(board: (string | null)[][]): { board: (string | null)[][]; lines: number } {
  const remaining = board.filter(row => row.some(c => c === null));
  const cleared = H - remaining.length;
  while (remaining.length < H) {
    remaining.unshift(Array(W).fill(null));
  }
  return { board: remaining, lines: cleared };
}

export function createTetrisState() {
  const board: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  let current = spawnPiece();
  let next = spawnPiece();
  let score = 0;
  let gameOver = false;

  function drop() {
    if (gameOver) return;
    current.y++;
    if (collides(board, current)) {
      current.y--;
      const newBoard = lockPiece(board, current);
      const { board: clearedBoard, lines } = clearLines(newBoard);
      board.length = 0;
      board.push(...clearedBoard);
      if (lines > 0) {
        score += lines * 100 * lines;
      }
      current = next;
      next = spawnPiece();
      if (collides(board, current)) {
        gameOver = true;
      }
    }
  }

  function move(dx: number) {
    if (gameOver) return;
    current.x += dx;
    if (collides(board, current)) current.x -= dx;
  }

  function rotate() {
    if (gameOver) return;
    const original = current.shape;
    current.shape = rotateCW(current.shape);
    if (collides(board, current)) current.shape = original;
  }

  function hardDrop() {
    if (gameOver) return;
    while (!collides(board, { ...current, y: current.y + 1 })) {
      current.y++;
    }
    drop();
  }

  return {
    get board() { return board; },
    get current() { return current; },
    get next() { return next; },
    get score() { return score; },
    get gameOver() { return gameOver; },
    drop, move, rotate, hardDrop,
    reset() {
      board.length = 0;
      board.push(...Array.from({ length: H }, () => Array(W).fill(null)));
      current = spawnPiece();
      next = spawnPiece();
      score = 0;
      gameOver = false;
    },
  };
}

export type TetrisState = ReturnType<typeof createTetrisState>;
