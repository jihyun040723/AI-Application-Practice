# My Tasks (To-Do List App)

## Project Overview

Personal to-do list web app. Pure HTML/CSS/JavaScript, no build step, no
backend — opening `index.html` in a browser is enough. Data persists via
`localStorage`.

## Commands

- Run: open `index.html` directly in any browser.

## Tech Stack

- HTML5 + CSS custom properties (light/dark theme via `body.dark` class)
- Vanilla JavaScript (ES6 class), no framework, no dependencies
- `localStorage` for persistence, `Blob` + `<a download>` for JSON export,
  `FileReader` for JSON import

## Architecture

- `index.html` — page structure: dashboard, toolbar (search/sort),
  import/export buttons, category filter row, add-task row, task list.
- `style.css` — CSS variables define the light theme on `:root`; `body.dark`
  overrides them for dark mode. Category colors: work `#4A90E2`, personal
  `#27AE60`, study `#8E44AD`.
- `script.js` — single `TaskManager` class owns `this.tasks` (array) and
  `this.settings` (filter/sort/theme), persisted together under one
  `localStorage` key (`my-tasks-data`). All rendering goes through
  `render()` → `renderDashboard()` / `renderFilterCounts()` /
  `renderList()` / `renderQuote()`; there is no virtual DOM, the list is
  fully re-rendered on every change.
- Each task also carries `dueDate` (nullable `YYYY-MM-DD` string) and
  `repeat` (`"none" | "daily" | "weekly"`). Completing a recurring task in
  `toggleComplete()` pushes a new task for the next occurrence instead of
  just toggling the flag.

## Code Style

- All code and comments in English; UI-facing text in Korean.
- Keep everything in the three files listed above — no build tooling.

## Development Notes

- Inline editing, drag-and-drop reordering, and keyboard shortcuts
  (Alt+N / Alt+D / Alt+1-4) are all handled by delegated event listeners
  set up once in `bindEvents()`.
- Import always backs up the previous `localStorage` snapshot under a
  timestamped key (`my-tasks-data-backup-<timestamp>`) before overwriting.
