import { registerSW } from "virtual:pwa-register";
import { SudokuCore, BLANK } from "./sudoku.js";

registerSW({ immediate: true });

const sudoku = new SudokuCore();
const STATS_KEY = "mysudoku-stats";

// State
let solution = [];
let puzzle = [];
let userGrid = [];
let selectedCell = null;
let mistakes = 0;
let moves = 0;
let timerInterval = null;
let seconds = 0;
let isNotesMode = false;
let notesGrid = [];
let isGameOver = false;
let history = [];

// DOM Elements
const gridElement = document.getElementById("sudoku-grid");
const mistakesElement = document.getElementById("mistakes-count");
const movesElement = document.getElementById("moves-count");
const timerElement = document.getElementById("timer");
const streakElement = document.getElementById("streak-count");
const bestTimeElement = document.getElementById("best-time");
const difficultySelect = document.getElementById("difficulty-select");
const newGameBtn = document.getElementById("btn-new-game");
const undoBtn = document.getElementById("btn-undo");
const eraseBtn = document.getElementById("btn-erase");
const notesBtn = document.getElementById("btn-notes");
const winModal = document.getElementById("win_modal");
const aboutModal = document.getElementById("about_modal");
const aboutBtn = document.getElementById("btn-about");
const modalTime = document.getElementById("modal-time");
const modalMoves = document.getElementById("modal-moves");
const modalDifficulty = document.getElementById("modal-difficulty");
const modalStreak = document.getElementById("modal-streak");
const modalMessage = document.getElementById("modal-message");
const modalRecord = document.getElementById("modal-record");
const themeController = document.getElementById("theme-controller");

init();

function init() {
  setupTheme();
  setupEventListeners();
  refreshRecordsUI();
  startNewGame();
}

function defaultStats() {
  return {
    streak: 0,
    bestStreak: 0,
    gamesWon: 0,
    bestTimes: { easy: null, medium: null, hard: null },
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...JSON.parse(raw) };
  } catch {
    return defaultStats();
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function refreshRecordsUI() {
  const stats = loadStats();
  const difficulty = difficultySelect.value;
  streakElement.innerText = String(stats.streak);
  const best = stats.bestTimes[difficulty];
  bestTimeElement.innerText = best == null ? "--:--" : formatTime(best);
}

function setupTheme() {
  const localTheme = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = localTheme ? localTheme === "dark" : systemDark;
  setTheme(isDark);
}

function setTheme(isDark) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add("dark");
    html.setAttribute("data-theme", "dracula");
    localStorage.setItem("theme", "dark");
    themeController.checked = false;
  } else {
    html.classList.remove("dark");
    html.setAttribute("data-theme", "cupcake");
    localStorage.setItem("theme", "light");
    themeController.checked = true;
  }
}

function setupEventListeners() {
  newGameBtn.addEventListener("click", startNewGame);

  difficultySelect.addEventListener("change", () => {
    refreshRecordsUI();
    startNewGame();
  });

  eraseBtn.addEventListener("click", () => {
    if (!selectedCell || isGameOver) return;
    const { row, col } = selectedCell;
    if (puzzle[row][col] === BLANK && userGrid[row][col] !== BLANK) {
      saveHistory();
      updateCell(row, col, BLANK);
    }
  });

  notesBtn.addEventListener("click", () => {
    isNotesMode = !isNotesMode;
    notesBtn.classList.toggle("btn-active");
    notesBtn.classList.toggle("btn-primary");
  });

  themeController.addEventListener("change", (e) => {
    setTheme(!e.target.checked);
  });

  document.querySelectorAll(".numpad-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleInput(parseInt(btn.dataset.value, 10));
    });
  });

  document.addEventListener("keydown", (e) => {
    if (isGameOver) return;

    const key = e.key;

    if (selectedCell) {
      let { row, col } = selectedCell;
      let moved = false;
      if (key === "ArrowUp") {
        row = Math.max(0, row - 1);
        moved = true;
      } else if (key === "ArrowDown") {
        row = Math.min(8, row + 1);
        moved = true;
      } else if (key === "ArrowLeft") {
        col = Math.max(0, col - 1);
        moved = true;
      } else if (key === "ArrowRight") {
        col = Math.min(8, col + 1);
        moved = true;
      }
      if (moved) {
        e.preventDefault();
        selectCell(row, col);
        return;
      }
    }

    if (key >= "1" && key <= "9") {
      handleInput(parseInt(key, 10));
      return;
    }

    if (key === "Backspace" || key === "Delete") {
      if (!selectedCell) return;
      if (
        puzzle[selectedCell.row][selectedCell.col] === BLANK &&
        userGrid[selectedCell.row][selectedCell.col] !== BLANK
      ) {
        saveHistory();
        updateCell(selectedCell.row, selectedCell.col, BLANK);
      }
      return;
    }

    if (key === "n" || key === "N") {
      isNotesMode = !isNotesMode;
      notesBtn.classList.toggle("btn-active");
      notesBtn.classList.toggle("btn-primary");
    }
  });

  undoBtn.addEventListener("click", undo);

  aboutBtn.addEventListener("click", () => {
    aboutModal.showModal();
  });
}

function startNewGame() {
  isGameOver = false;
  mistakes = 0;
  moves = 0;
  seconds = 0;
  history = [];
  isNotesMode = false;
  notesBtn.classList.remove("btn-active", "btn-primary");

  mistakesElement.innerText = mistakes;
  movesElement.innerText = moves;
  renderTimer();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    seconds += 1;
    renderTimer();
  }, 1000);

  const difficulty = difficultySelect.value;
  document.getElementById("difficulty-display").innerText =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  refreshRecordsUI();

  solution = sudoku.generate();
  puzzle = sudoku.createPuzzle(difficulty);
  userGrid = puzzle.map((row) => [...row]);
  notesGrid = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set()),
  );

  renderGrid();
  selectCell(null, null);
}

function renderTimer() {
  timerElement.innerText = formatTime(seconds);
}

function renderGrid() {
  gridElement.innerHTML = "";

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.className =
        "sudoku-cell border border-base-content/20 bg-base-100 text-base-content";
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

  document.querySelectorAll(".sudoku-cell").forEach((el) => {
    el.classList.remove("selected", "highlighted");
    const r = parseInt(el.dataset.row, 10);
    const c = parseInt(el.dataset.col, 10);
    const val = userGrid[r][c];

    if (r === row && c === col) {
      el.classList.add("selected");
    } else if (
      r === row ||
      c === col ||
      (Math.floor(r / 3) === Math.floor(row / 3) &&
        Math.floor(c / 3) === Math.floor(col / 3))
    ) {
      el.classList.add("highlighted");
    }

    if (val !== BLANK && val === userGrid[row][col]) {
      el.classList.add("highlighted");
    }
  });
}

function handleInput(num) {
  if (isGameOver || !selectedCell) return;
  const { row, col } = selectedCell;

  if (puzzle[row][col] !== BLANK) return;

  if (isNotesMode) {
    toggleNote(row, col, num);
    return;
  }

  if (userGrid[row][col] === num) return;

  const isCorrect = solution[row][col] === num;

  if (isCorrect) {
    saveHistory();
    moves += 1;
    movesElement.innerText = moves;

    const completed = getNewlyCompletedUnits(row, col);
    updateCell(row, col, num, { animatePlace: true, completed });

    if (checkWin()) {
      playGridCompleteAnimation().then(() => gameOver(true));
    }
  } else {
    mistakes += 1;
    mistakesElement.innerText = mistakes;

    const cell = getCellEl(row, col);
    cell.classList.add("error");
    setTimeout(() => cell.classList.remove("error"), 800);

    if (mistakes >= 3) {
      resetStreak();
      alert("Game Over! Too many mistakes. Streak reset.");
      startNewGame();
    }
  }
}

function getNewlyCompletedUnits(row, col) {
  const completed = { rows: [], cols: [], boxes: [] };

  // After this correct fill, check if unit becomes complete
  const wouldBe = userGrid.map((r) => [...r]);
  wouldBe[row][col] = solution[row][col];

  if (isRowComplete(wouldBe, row)) completed.rows.push(row);
  if (isColComplete(wouldBe, col)) completed.cols.push(col);

  const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  if (isBoxComplete(wouldBe, row, col)) completed.boxes.push(boxIndex);

  return completed;
}

function isRowComplete(grid, row) {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] !== solution[row][c]) return false;
  }
  return true;
}

function isColComplete(grid, col) {
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] !== solution[r][col]) return false;
  }
  return true;
}

function isBoxComplete(grid, row, col) {
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (
        grid[startRow + r][startCol + c] !==
        solution[startRow + r][startCol + c]
      ) {
        return false;
      }
    }
  }
  return true;
}

function toggleNote(row, col, num) {
  if (userGrid[row][col] !== BLANK) return;

  const notes = notesGrid[row][col];
  if (notes.has(num)) {
    notes.delete(num);
  } else {
    notes.add(num);
  }
  renderGrid();
  selectCell(row, col);
}

function updateCell(row, col, val, options = {}) {
  userGrid[row][col] = val;

  if (val !== BLANK) {
    notesGrid[row][col].clear();
    removeNoteFromRelated(row, col, val);
  }

  renderGrid();
  selectCell(row, col);

  if (options.animatePlace && val !== BLANK) {
    const cell = getCellEl(row, col);
    cell.classList.add("cell-placed");
    setTimeout(() => cell.classList.remove("cell-placed"), 450);
  }

  if (options.completed) {
    animateCompletedUnits(options.completed);
  }
}

function animateCompletedUnits(completed) {
  const targets = new Set();

  for (const row of completed.rows) {
    for (let c = 0; c < 9; c++) targets.add(`${row},${c}`);
  }
  for (const col of completed.cols) {
    for (let r = 0; r < 9; r++) targets.add(`${r},${col}`);
  }
  for (const box of completed.boxes) {
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        targets.add(`${startRow + r},${startCol + c}`);
      }
    }
  }

  for (const key of targets) {
    const [r, c] = key.split(",").map(Number);
    const el = getCellEl(r, c);
    el.classList.add("unit-complete");
    setTimeout(() => el.classList.remove("unit-complete"), 700);
  }
}

function playGridCompleteAnimation() {
  return new Promise((resolve) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const el = getCellEl(r, c);
        const delay = (r + c) * 35;
        setTimeout(() => {
          el.classList.add("grid-complete");
          setTimeout(() => el.classList.remove("grid-complete"), 550);
        }, delay);
      }
    }
    setTimeout(resolve, 9 * 35 + 600);
  });
}

function removeNoteFromRelated(row, col, val) {
  for (let c = 0; c < 9; c++) notesGrid[row][c].delete(val);
  for (let r = 0; r < 9; r++) notesGrid[r][col].delete(val);
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

function resetStreak() {
  const stats = loadStats();
  stats.streak = 0;
  saveStats(stats);
  refreshRecordsUI();
}

function recordWin(difficulty, timeSeconds) {
  const stats = loadStats();
  stats.streak += 1;
  stats.gamesWon += 1;
  if (stats.streak > stats.bestStreak) {
    stats.bestStreak = stats.streak;
  }

  const previousBest = stats.bestTimes[difficulty];
  const isNewBest = previousBest == null || timeSeconds < previousBest;
  if (isNewBest) {
    stats.bestTimes[difficulty] = timeSeconds;
  }

  saveStats(stats);
  refreshRecordsUI();
  return { isNewBest, streak: stats.streak, bestStreak: stats.bestStreak };
}

function gameOver(won) {
  isGameOver = true;
  clearInterval(timerInterval);

  if (!won) return;

  const difficulty = difficultySelect.value;
  const result = recordWin(difficulty, seconds);

  modalTime.innerText = formatTime(seconds);
  modalMoves.innerText = String(moves);
  modalDifficulty.innerText =
    document.getElementById("difficulty-display").innerText;
  modalStreak.innerText = String(result.streak);
  modalMessage.innerText =
    result.streak > 1
      ? `Nice run — ${result.streak} wins in a row.`
      : "Great job solving the puzzle!";
  modalRecord.innerText = result.isNewBest
    ? `New best time for ${modalDifficulty.innerText}!`
    : result.streak === result.bestStreak && result.streak > 1
      ? `Personal best streak: ${result.bestStreak}`
      : "";

  winModal.showModal();
}

function saveHistory() {
  history.push({
    userGrid: userGrid.map((r) => [...r]),
    notesGrid: notesGrid.map((r) => r.map((c) => new Set(c))),
    mistakes,
    moves,
  });
  if (history.length > 20) history.shift();
}

function undo() {
  if (history.length === 0 || isGameOver) return;
  const lastState = history.pop();
  userGrid = lastState.userGrid;
  notesGrid = lastState.notesGrid;
  mistakes = lastState.mistakes;
  moves = lastState.moves;
  mistakesElement.innerText = mistakes;
  movesElement.innerText = moves;
  renderGrid();
  if (selectedCell) selectCell(selectedCell.row, selectedCell.col);
}
