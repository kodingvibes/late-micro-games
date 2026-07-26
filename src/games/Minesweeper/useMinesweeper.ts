import { useState, useCallback, useEffect } from "react";

type Cell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTIES: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

function createBoard(rows: number, cols: number, mines: number, safeR: number, safeC: number): Cell[][] {
  const board: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );

  // place mines (avoid safe cell)
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }

  // calculate adjacent
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }

  return board;
}

function reveal(board: Cell[][], r: number, c: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));

  function flood(r: number, c: number) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = newBoard[r][c];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          flood(r + dr, c + dc);
        }
      }
    }
  }

  flood(r, c);
  return newBoard;
}

export function useMinesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<Cell[][]>(() => createBoard(9, 9, 10, 0, 0));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [firstClick, setFirstClick] = useState(true);

  const config = DIFFICULTIES[difficulty];

  const reset = useCallback((diff?: Difficulty) => {
    const d = diff || difficulty;
    const cfg = DIFFICULTIES[d];
    setBoard(createBoard(cfg.rows, cfg.cols, cfg.mines, 0, 0));
    setGameOver(false);
    setWon(false);
    setFirstClick(true);
    if (diff) setDifficulty(diff);
  }, [difficulty]);

  const handleReveal = useCallback((r: number, c: number) => {
    if (gameOver || won) return;
    setBoard(prev => {
      const cell = prev[r][c];
      if (cell.revealed || cell.flagged) return prev;

      if (firstClick) {
        setFirstClick(false);
        const newBoard = createBoard(config.rows, config.cols, config.mines, r, c);
        const revealed = reveal(newBoard, r, c);
        return revealed;
      }

      if (cell.mine) {
        // game over - reveal all mines
        const newBoard = prev.map(row => row.map(c => ({ ...c, revealed: c.mine ? true : c.revealed })));
        setGameOver(true);
        return newBoard;
      }

      const newBoard = reveal(prev, r, c);
      // check win
      const totalSafe = config.rows * config.cols - config.mines;
      const revealedCount = newBoard.flat().filter(c => c.revealed).length;
      if (revealedCount === totalSafe) setWon(true);
      return newBoard;
    });
  }, [gameOver, won, firstClick, config]);

  const handleFlag = useCallback((r: number, c: number) => {
    if (gameOver || won) return;
    setBoard(prev => {
      const cell = prev[r][c];
      if (cell.revealed) return prev;
      const newBoard = prev.map(row => row.map(c => ({ ...c })));
      newBoard[r][c].flagged = !newBoard[r][c].flagged;
      return newBoard;
    });
  }, [gameOver, won]);

  const handleClick = useCallback((r: number, c: number) => {
    if (flagMode) handleFlag(r, c);
    else handleReveal(r, c);
  }, [flagMode, handleReveal, handleFlag]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "f" || e.key === "F") setFlagMode(f => !f);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const flagCount = board.flat().filter(c => c.flagged).length;
  const minesLeft = config.mines - flagCount;

  return {
    board, gameOver, won, difficulty, flagMode, minesLeft,
    setFlagMode, handleClick, reset, config,
  };
}
