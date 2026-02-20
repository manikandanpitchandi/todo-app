# CLAUDE.md

This file provides guidance for AI assistants working in this repository.

## Project Overview

A client-side React todo application with user authentication. There is no backend — all data is stored in the browser via `localStorage` (users and todos) and `sessionStorage` (active session). The app is built with React 19 and Vite 7.

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 (JSX, functional components, hooks) |
| Build tool | Vite 7 |
| Linter | ESLint 9 (flat config) |
| E2E testing | Playwright 1.58 |
| Test reporting | xlsx (JSON → Excel conversion) |

## Development Commands

```bash
# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run E2E tests (requires dev server on port 5175)
npm run test:e2e

# Run E2E tests with interactive UI
npm run test:e2e:ui

# Run E2E tests and export results to Excel
npm run test:e2e:excel
```

**Important:** Playwright tests expect the dev server to be running at `http://localhost:5175` before executing. Start the dev server with `npm run dev` in a separate terminal before running tests. The default Vite port is `5173` but the Playwright config targets `5175` — if the ports conflict, ensure the server binds to `5175`.

## Repository Structure

```
todo-app/
├── src/
│   ├── main.jsx                  # Entry point — mounts App into #root
│   ├── App.jsx                   # Root component: state, auth gate, todo logic
│   ├── App.css                   # Styles for the main app layout
│   ├── index.css                 # Global base styles
│   ├── components/
│   │   ├── AuthPage.jsx          # Login / Register tabbed form
│   │   ├── AuthPage.css          # Styles for auth UI
│   │   ├── TodoInput.jsx         # Controlled input + Add button
│   │   ├── TodoList.jsx          # Renders list of TodoItem or empty state
│   │   ├── TodoItem.jsx          # Single todo row: checkbox, text, delete
│   │   └── TodoFilter.jsx        # Footer: item count, filter buttons, clear
│   └── utils/
│       └── auth.js               # All auth logic (register, login, session)
├── tests/
│   └── e2e/
│       ├── auth.spec.js          # Playwright: registration, login, logout flows
│       └── todos.spec.js         # Playwright: CRUD, filtering, clear completed
├── scripts/
│   └── results-to-excel.mjs     # Converts test-results.json → test-results.xlsx
├── public/
│   └── vite.svg                  # Favicon
├── .claude/
│   └── settings.local.json       # Claude Code permission overrides
├── index.html                    # HTML shell (SPA entry)
├── vite.config.js                # Vite config (uses @vitejs/plugin-react)
├── playwright.config.js          # Playwright config (Chromium only, port 5175)
├── eslint.config.js              # ESLint flat config
├── package.json
└── e2e-test.mjs / e2e-auth-test.mjs  # Legacy standalone E2E scripts (not Playwright)
```

## Architecture & Key Conventions

### State Management

All state lives in `App.jsx` — no external state library. The three top-level pieces of state are:

```js
const [user, setUser] = useState(() => getSession()); // null when logged out
const [todos, setTodos] = useState([]);
const [filter, setFilter] = useState('all');           // 'all' | 'active' | 'completed'
```

Todos sync to `localStorage` automatically via `useEffect`. The key is namespaced per user: `todos_<username>`.

### Todo Data Shape

```js
{ id: crypto.randomUUID(), text: string, completed: boolean }
```

### Authentication

All auth logic is in `src/utils/auth.js`. Key behaviors:

- **User registry** is stored in `localStorage` under the key `"users"` as a JSON array.
- **Sessions** are stored in `sessionStorage` under `"currentUser"`. Sessions are lost on tab/browser close.
- **Password "hashing"** uses base64-encoding of `"username:password"` — this is intentionally simple for a demo app and not cryptographically secure. Do not change this without understanding the implications for existing stored credentials.
- Usernames are case-insensitive (normalized to their registered casing).
- Validation rules: username ≥ 3 chars, password ≥ 4 chars.

### Component Conventions

- All components are functional with hooks.
- Props flow down from `App.jsx`; there is no context or global store.
- CSS is co-located with components (e.g., `AuthPage.css` next to `AuthPage.jsx`). Global styles go in `src/index.css`.
- Components use plain CSS classes — no CSS-in-JS or utility framework.
- ARIA labels are present on interactive elements (checkboxes, delete buttons).

### File Extensions

- Source files use `.jsx` for React components and `.js` for plain JS utilities.
- Scripts in `scripts/` use `.mjs` (ES modules).
- Test files use `.spec.js`.

### ESLint Rules

- Based on `eslint/js` recommended + `react-hooks` + `react-refresh`.
- `no-unused-vars` is set to `error` but ignores names matching `^[A-Z_]` (constants/components).
- Targets `**/*.{js,jsx}`.
- The `dist/` directory is ignored.

## Testing

### Playwright E2E Tests

Tests live in `tests/e2e/`. The Playwright config runs only Chromium, serially (`fullyParallel: false`), with no retries.

**`auth.spec.js`** covers:
- Auth page visible on first load
- Register new user, auto-redirect to login tab after 1.2 s
- Duplicate username error
- Short username validation
- Login with valid/invalid credentials
- Logout returns to auth page
- Todos persist across logout and re-login (localStorage)

**`todos.spec.js`** covers:
- Empty state display
- Add todo via button and Enter key
- Input cleared after add
- Empty todo not added
- Toggle completion (checkbox)
- Delete todo
- Item count in footer
- All / Active / Completed filter buttons
- Active filter button gets `.active` class
- Clear completed button visibility and behavior

Each test in `auth.spec.js` starts from a fresh browser context with no stored data. Tests in `todos.spec.js` register and log in a test user in `beforeEach`.

### Selectors Used in Tests

| Selector | Element |
|---|---|
| `.auth-wrapper` | Auth page container |
| `.auth-card` | Login/register card |
| `.auth-tab` | Login / Register tab buttons |
| `.auth-tab.active` | Currently active tab |
| `#auth-username` | Username input |
| `#auth-password` | Password input |
| `button.auth-submit` | Form submit button |
| `.auth-error` | Error message paragraph |
| `.auth-success` | Success message paragraph |
| `.card` | Main todo card (visible when logged in) |
| `.app-username` | Displayed username in header |
| `button.logout-btn` | Logout button |
| `input.todo-input` | New todo text input |
| `button.add-btn` | Add todo button |
| `.todo-list` | `<ul>` of todos |
| `.todo-item` | Individual `<li>` |
| `.todo-item.completed` | Completed todo |
| `.todo-text` | Todo label text |
| `.empty-message` | "No todos here!" paragraph |
| `.todo-footer` | Footer bar |
| `.item-count` | Active item count span |
| `button.filter-btn` | All / Active / Completed buttons |
| `button.filter-btn.active` | Currently selected filter |
| `button.clear-btn` | Clear completed button |

### Generating Excel Test Reports

```bash
npm run test:e2e:excel
```

This runs Playwright with the JSON reporter, saves to `test-results.json`, then `scripts/results-to-excel.mjs` converts that to `test-results.xlsx` with two sheets: **Test Results** (color-coded pass/fail rows) and **Summary** (totals, pass rate, duration).

## Claude Code Permissions

`.claude/settings.local.json` grants permission to run:
- `npx playwright:*` — for executing Playwright commands
- `node:*` — for running Node scripts (e.g., `results-to-excel.mjs`)

## Common Tasks

### Adding a New Component

1. Create `src/components/MyComponent.jsx` (and optionally `MyComponent.css`).
2. Import and use it in the appropriate parent component (most likely `App.jsx`).
3. Pass callbacks down as props following the existing pattern.
4. Add CSS classes that match the existing naming conventions.

### Adding a New E2E Test

1. Add tests to the appropriate spec file in `tests/e2e/`, or create a new `*.spec.js` file there.
2. Use the CSS selectors from the table above. If you add new selectors, update this document.
3. The `beforeEach` in `todos.spec.js` handles auth setup — leverage it for todo-related tests.

### Changing the Dev Port

The Playwright config in `playwright.config.js` hardcodes `baseURL: 'http://localhost:5175'`. If you change the dev server port, update this value to match.
