# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# E2E Tests (requires dev server running on port 5175)
npm run test:e2e          # Run all Playwright tests (headless, Chromium only)
npm run test:e2e:ui       # Open Playwright interactive UI
```

To run a single test file:
```bash
npx playwright test tests/e2e/auth.spec.js
npx playwright test tests/e2e/todos.spec.js
```

To run a single test by name:
```bash
npx playwright test -g "test name here"
```

> **Note:** E2E tests expect the dev server on port **5175** (set in `playwright.config.js`). Start the dev server with `npm run dev -- --port 5175` before running tests.

## Architecture

This is a React 19 + Vite SPA with no backend — all state is stored in the browser.

### Auth flow (`src/utils/auth.js`)
- User accounts stored in `localStorage` under key `"users"` as a JSON array of `{ username, passwordHash }`.
- "Hashing" is base64-encoded `username:password` (not cryptographically secure — this is a demo app).
- Active session stored in `sessionStorage` under key `"currentUser"` (cleared on tab close).
- Todos are namespaced per user: `localStorage["todos_<username>"]`.

### State management (`src/App.jsx`)
All app state lives in `App`. There is no global state library. `App` owns:
- `user` — current username (null = show `AuthPage`)
- `todos` — array of `{ id, text, completed }`
- `filter` — `'all' | 'active' | 'completed'`

Two `useEffect` hooks sync todos to/from `localStorage` when the user or todos change.

### Component tree
```
App
├── AuthPage          (login/register tabs, shown when user is null)
└── [authenticated view]
    ├── TodoInput     (controlled input, calls onAdd)
    ├── TodoList      (renders TodoItem list)
    │   └── TodoItem  (toggle checkbox + delete button)
    └── TodoFilter    (all/active/completed buttons + clear completed)
```

### Styling
Plain CSS with no CSS preprocessor or utility framework. Each component has its own CSS file or uses `App.css` / `index.css`. Emerald green theme (`#10b981` family).
