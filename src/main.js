import { SudokuCore, BLANK } from "./sudoku.js";

const sudoku = new SudokuCore();

// State
let solution = [];
let puzzle = []; // The initial state of the puzzle
let userGrid = []; // The current state including user inputs
let selectedCell = null; // { row, col }
let mistakes = 0;
let timerInterval = null;
let seconds = 0;
let isNotesMode = false;
let notesGrid = []; // 9x9 array of Sets
let isGameOver = false;

// DOM Elements
const gridElement = document.getElementById("sudoku-grid");
const mistakesElement = document.getElementById("mistakes-count");
const timerElement = document.getElementById("timer");
const difficultySelect = document.getElementById("difficulty-select");
const newGameBtn = document.getElementById("btn-new-game");
const undoBtn = document.getElementById("btn-undo"); // Placeholder functionality
const eraseBtn = document.getElementById("btn-erase");
const notesBtn = document.getElementById("btn-notes");
const winModal = document.getElementById("win_modal");
const modalTime = document.getElementById("modal-time");
const modalDifficulty = document.getElementById("modal-difficulty");
const themeController = document.getElementById("theme-controller");

// History for Undo
let history = [];

// Initialize
init();

function init() {
  setupTheme();
  setupEventListeners();
  startNewGame();
}

function setupTheme() {
  // Check local storage or system preference
  const localTheme = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  let isDark;

  if (localTheme) {
    isDark = localTheme === "dark";
  } else {
    isDark = systemDark;
  }

  // Apply initial state
  setTheme(isDark);
}

function setTheme(isDark) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add("dark");
    html.setAttribute("data-theme", "dracula"); // Optional: DaisyUI theme
    localStorage.setItem("theme", "dark");
    themeController.checked = false; // Unchecked for Moon (Dark)
  } else {
    html.classList.remove("dark");
    html.setAttribute("data-theme", "cupcake"); // Optional: DaisyUI theme
    localStorage.setItem("theme", "light");
    themeController.checked = true; // Checked for Sun (Light)
  }
}

function setupEventListeners() {
  newGameBtn.addEventListener("click", startNewGame);

  difficultySelect.addEventListener("change", () => {
    startNewGame();
  });

  eraseBtn.addEventListener("click", () => {
    if (!selectedCell || isGameOver) return;
    const { row, col } = selectedCell;
    if (puzzle[row][col] === BLANK) {
      updateCell(row, col, BLANK);
    }
  });

  notesBtn.addEventListener("click", () => {
    isNotesMode = !isNotesMode;
    notesBtn.classList.toggle("btn-active");
    notesBtn.classList.toggle("btn-primary");
  });

  // Theme Toggle Listener
  themeController.addEventListener("change", (e) => {
    // If checked (True) -> User wants Light (Sun)
    // If unchecked (False) -> User wants Dark (Moon)
    const wantsLight = e.target.checked;
    setTheme(!wantsLight);
  });

  // Numpad clicks
  document.querySelectorAll(".numpad-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleInput(parseInt(btn.dataset.value));
    });
  });

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (isGameOver) return;

    const key = e.key;

    if (selectedCell) {
      let { row, col } = selectedCell;
      if (key === "ArrowUp") row = Math.max(0, row - 1);
      if (key === "ArrowDown") row = Math.min(8, row + 1);
      if (key === "ArrowLeft") col = Math.max(0, col - 1);
      if (key === "ArrowRight") col = Math.min(8, row + 1);
      selectCell(row, col);
      return;
    }

    if (key >= "1" && key <= "9") {
      handleInput(parseInt(key));
      return;
    }

    if (key === "Backspace" || key === "Delete") {
      if (!selectedCell) return;
      if (puzzle[selectedCell.row][selectedCell.col] === BLANK) {
        updateCell(selectedCell.row, selectedCell.col, BLANK);
      }
    }

    if (key === "n") {
      isNotesMode = !isNotesMode;
      notesBtn.classList.toggle("btn-active");
      notesBtn.classList.toggle("btn-primary");
    }
  });

  undoBtn.addEventListener("click", undo);
}

function startNewGame() {
  isGameOver = false;
  mistakes = 0;
  mistakesElement.innerText = mistakes;
  seconds = 0;
  history = [];
  isNotesMode = false;
  notesBtn.classList.remove("btn-active", "btn-primary");

  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  const difficulty = difficultySelect.value;
  document.getElementById("difficulty-display").innerText =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  // Generate logic
  solution = sudoku.generate();
  puzzle = sudoku.createPuzzle(difficulty);

  // Deep copy for userGrid
  userGrid = puzzle.map((row) => [...row]);

  // Reset notes
  notesGrid = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set()),
  );

  renderGrid();
  selectCell(null, null); // Deselect
}

function updateTimer() {
  seconds++;
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  timerElement.innerText = `${m}:${s}`;
}

function renderGrid() {
  gridElement.innerHTML = "";

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.className =
        "sudoku-cell border border-base-content/20 bg-base-100 text-base-content"; // Base styling
      cell.dataset.row = r;
      cell.dataset.col = c;

      const value = userGrid[r][c];
      const isInitial = puzzle[r][c] !== BLANK;

      if (value !== BLANK) {
        cell.innerText = value;
        if (isInitial) {
          cell.classList.add("filled-start");
        } else {
          cell.classList.add("text-primary");
        }
      } else {
        // Render notes
        const notes = notesGrid[r][c];
        if (notes.size > 0) {
          cell.classList.remove("flex", "items-center", "justify-center");
          cell.classList.add(
            "grid",
            "grid-cols-3",
            "grid-rows-3",
            "place-items-center",
            "text-[10px]",
            "leading-none",
            "text-base-content/60",
          );

          for (let n = 1; n <= 9; n++) {
            const noteSpan = document.createElement("span");
            if (notes.has(n)) noteSpan.innerText = n;
            cell.appendChild(noteSpan);
          }
        }
      }

      cell.addEventListener("click", () => selectCell(r, c));
      gridElement.appendChild(cell);
    }
  }
}

function selectCell(row, col) {
  if (row === null) {
    selectedCell = null;
    document
      .querySelectorAll(".sudoku-cell")
      .forEach((el) => el.classList.remove("selected", "highlighted"));
    return;
  }

  selectedCell = { row, col };

  // Reset classes
  document.querySelectorAll(".sudoku-cell").forEach((el) => {
    el.classList.remove("selected", "highlighted");
    const r = parseInt(el.dataset.row);
    const c = parseInt(el.dataset.col);
    const val = userGrid[r][c];

    // Highlight selected
    if (r === row && c === col) {
      el.classList.add("selected");
    }

    // Highlight same row/col/box
    else if (
      r === row ||
      c === col ||
      (Math.floor(r / 3) === Math.floor(row / 3) &&
        Math.floor(c / 3) === Math.floor(col / 3))
    ) {
      el.classList.add("highlighted");
    }

    // Highlight same numbers
    if (val !== BLANK && val === userGrid[row][col]) {
      el.classList.add("highlighted");
    }
  });
}

function handleInput(num) {
  if (isGameOver || !selectedCell) return;
  const { row, col } = selectedCell;

  // Cannot edit initial clues
  if (puzzle[row][col] !== BLANK) return;

  if (isNotesMode) {
    toggleNote(row, col, num);
    return;
  }

  // Regular Input
  if (userGrid[row][col] === num) return; // No change

  // Basic Validation: Is it the correct number?
  // "Pro" sudoku usually allows placing wrong numbers but validates them.
  // We will check against solution for "Mistakes" mode.

  const isCorrect = solution[row][col] === num;

  if (isCorrect) {
    // Save history before move
    saveHistory();

    updateCell(row, col, num);

    // Check win
    if (checkWin()) {
      gameOver(true);
    }
  } else {
    mistakes++;
    mistakesElement.innerText = mistakes;

    // Visual feedback
    const cell = getCellEl(row, col);
    cell.classList.add("error");
    // cell.innerText = num; // We could show it and mark error, or just flash error.
    // Let's just flash error and NOT place it if it's strictly mistakes mode.
    // Actually, let's strictly enforce solution here for simplicity of "mistakes" mechanic.

    setTimeout(() => cell.classList.remove("error"), 800);

    if (mistakes >= 3) {
      // Optional: Game Over on too many mistakes
      alert("Game Over! Too many mistakes.");
      startNewGame();
    }
  }
}

function toggleNote(row, col, num) {
  // Check if cell is filled
  if (userGrid[row][col] !== BLANK) return;

  const notes = notesGrid[row][col];
  if (notes.has(num)) {
    notes.delete(num);
  } else {
    notes.add(num);
  }
  // Re-render only this cell would be efficient, but grid is small enough to render all
  // or properly re-render. Let's re-render all for simplicity of clearing highlights
  renderGrid();
  selectCell(row, col); // Re-apply selection
}

function updateCell(row, col, val) {
  userGrid[row][col] = val; // val is BLANK or number

  // Clear notes in this cell
  if (val !== BLANK) {
    notesGrid[row][col].clear();

    // Optional: Clear notes in related row/col/box?
    // Let's do it for "Smart Notes" feel
    removeNoteFromRelated(row, col, val);
  }

  renderGrid();
  selectCell(row, col);
}

function removeNoteFromRelated(row, col, val) {
  // Row
  for (let c = 0; c < 9; c++) notesGrid[row][c].delete(val);
  // Col
  for (let r = 0; r < 9; r++) notesGrid[r][col].delete(val);
  // Box
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      notesGrid[startRow + r][startCol + c].delete(val);
    }
  }
}

function getCellEl(row, col) {
  return gridElement.children[row * 9 + col];
}

function checkWin() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (userGrid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

function gameOver(won) {
  isGameOver = true;
  clearInterval(timerInterval);
  if (won) {
    modalTime.innerText = timerElement.innerText;
    modalDifficulty.innerText =
      document.getElementById("difficulty-display").innerText;
    winModal.showModal();
  }
}

function saveHistory() {
  // Deep copy current states
  history.push({
    userGrid: userGrid.map((r) => [...r]),
    notesGrid: notesGrid.map((r) => r.map((c) => new Set(c))),
    mistakes: mistakes,
  });
  if (history.length > 20) history.shift();
}

function undo() {
  if (history.length === 0 || isGameOver) return;
  const lastState = history.pop();
  userGrid = lastState.userGrid;
  notesGrid = lastState.notesGrid;
  mistakes = lastState.mistakes;
  mistakesElement.innerText = mistakes;
  renderGrid();
  if (selectedCell) selectCell(selectedCell.row, selectedCell.col);
}
