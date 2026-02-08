/**
 * Sudoku Game Logic
 */

export const BLANK = 0;

export class SudokuCore {
  constructor() {
    this.grid = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
    this.solution = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
  }

  // Generate a new valid Sudoku grid
  generate() {
    // Clear grid
    this.solution = Array.from({ length: 9 }, () => Array(9).fill(BLANK));

    // Fill diagonal 3x3 boxes (they are independent)
    this.fillDiagonal();

    // Fill remaining blocks
    this.fillRemaining(0, 3);

    // Copy solution for game state use later if needed, mostly we just need solution to validate
    return this.solution;
  }

  fillDiagonal() {
    for (let i = 0; i < 9; i = i + 3) {
      this.fillBox(i, i);
    }
  }

  unUsedInBox(rowStart, colStart, num) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.solution[rowStart + i][colStart + j] === num) {
          return false;
        }
      }
    }
    return true;
  }

  fillBox(row, col) {
    let num;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        do {
          num = Math.floor(Math.random() * 9) + 1;
        } while (!this.unUsedInBox(row, col, num));
        this.solution[row + i][col + j] = num;
      }
    }
  }

  checkIfSafe(i, j, num) {
    return (
      this.unUsedInRow(i, num) &&
      this.unUsedInCol(j, num) &&
      this.unUsedInBox(i - (i % 3), j - (j % 3), num)
    );
  }

  unUsedInRow(i, num) {
    for (let j = 0; j < 9; j++) {
      if (this.solution[i][j] === num) {
        return false;
      }
    }
    return true;
  }

  unUsedInCol(j, num) {
    for (let i = 0; i < 9; i++) {
      if (this.solution[i][j] === num) {
        return false;
      }
    }
    return true;
  }

  fillRemaining(i, j) {
    if (j >= 9 && i < 9 - 1) {
      i = i + 1;
      j = 0;
    }
    if (i >= 9 && j >= 9) {
      return true;
    }

    if (i < 3) {
      if (j < 3) {
        j = 3;
      }
    } else if (i < 6) {
      if (j === Math.floor(i / 3) * 3) {
        j = j + 3;
      }
    } else {
      if (j === 6) {
        i = i + 1;
        j = 0;
        if (i >= 9) {
          return true;
        }
      }
    }

    for (let num = 1; num <= 9; num++) {
      if (this.checkIfSafe(i, j, num)) {
        this.solution[i][j] = num;
        if (this.fillRemaining(i, j + 1)) {
          return true;
        }
        this.solution[i][j] = BLANK;
      }
    }
    return false;
  }

  // Create a playable puzzle by removing numbers
  createPuzzle(difficulty = "medium") {
    const puzzle = this.solution.map((row) => [...row]);
    let attempts =
      difficulty === "easy" ? 30 : difficulty === "medium" ? 45 : 58;

    while (attempts > 0) {
      let row = Math.floor(Math.random() * 9);
      let col = Math.floor(Math.random() * 9);

      if (puzzle[row][col] !== BLANK) {
        puzzle[row][col] = BLANK;
        attempts--;
      }
    }

    return puzzle;
  }

  // Validate a specific move
  isValidMove(puzzle, row, col, num) {
    // Basic rule check (Row, Column, Box)
    // Note: 'puzzle' here is the current state of the board

    // Row check
    for (let x = 0; x < 9; x++) {
      if (x !== col && puzzle[row][x] === num) return false;
    }

    // Col check
    for (let x = 0; x < 9; x++) {
      if (x !== row && puzzle[x][col] === num) return false;
    }

    // Box check
    let startRow = row - (row % 3);
    let startCol = col - (col % 3);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (
          (i + startRow !== row || j + startCol !== col) &&
          puzzle[i + startRow][j + startCol] === num
        )
          return false;

    return true;
  }
}
