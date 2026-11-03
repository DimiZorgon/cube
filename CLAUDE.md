# CLAUDE.md

## Project Overview
Interactive Rubik's Cube web application (2x2, 3x3, and 4x4) built with React 19, Three.js, React Three Fiber, React Router 7, and Zustand. Includes WCA speed timer, high scores, dynamic camera-relative controls, 3D animated menu previews, and interactive algorithm guide sections.

## Commands
- `npm run dev`: Start Vite development server
- `npm run build`: Production build (`dist/`) + SEO meta prerendering (`scripts/prerender-meta.mjs`) & `sitemap.xml`
- `npm run lint`: Run Oxlint linter
- `npm run preview`: Preview production build locally

## Tech Stack
- **Framework**: React 19 + Vite 8 + React Router 7
- **3D Graphics**: Three.js (`three`), `@react-three/fiber`, `@react-three/drei`
- **State Management**: Zustand 5
- **Effects**: `canvas-confetti`
- **Linting**: Oxlint

## Project Structure
```text
src/
├── App.jsx                 # RouterProvider entry point
├── router.jsx              # createBrowserRouter definition (with /en basename support)
├── App.css                 # Menu & navigation styles (.main-menu-*, .menu-btn)
├── index.css               # Global base styles & in-game layout (.app-container)
├── main.jsx                # React root entry point
├── routes/
│   ├── routeConfig.js      # Single source of truth for URLs, methods, sections & sitemap
│   ├── seo.js              # Per-route SEO metadata (FR/EN) shared by browser & build script
│   ├── useSeo.js           # Client-side head updater hook
│   └── caseLookup.js       # Resolves algorithm cases by (methodKey, caseId)
├── pages/                  # Route-level pages & wrappers
├── components/
│   ├── CubeGame.jsx        # Generic game engine: timer, shuffle, highscore, controls
│   ├── Cube2x2.jsx         # 2x2 game view wrapper
│   ├── Cube3x3.jsx         # 3x3 game view wrapper
│   ├── Cube4x4.jsx         # 4x4 game view wrapper
│   ├── RubiksCube.jsx      # Interactive 3D cube bound to Zustand store
│   ├── Cubie.jsx           # Individual cube piece with 6 colored faces
│   ├── MiniCube.jsx        # Isolated 3D cube preview for menu buttons (no store binding)
│   ├── CameraMapper.jsx    # Updates move directions based on current camera orientation
│   ├── LockCamera.jsx      # Camera control locking mechanism
│   ├── MoveButton.jsx      # On-screen move trigger button
│   └── algos/              # Algorithm guides (2x2, 3x3, 4x4)
└── store/
    └── useCubeStore.js     # Global state: cubies, moves, rotations, solving check
```

## Architecture & Conventions

### 1. State Management & 3D Separation
- **`useCubeStore.js`**: Single source of truth for the playable cube. Controls animated rotations (`startRotation`), move queue, and win conditions.
- **`MiniCube.jsx`**: Must **NOT** use `useCubeStore`. It generates its own cubies via `generateInitialCubies(size)` inside a local `<Canvas>` to avoid mutating or listening to global game state.

### 2. Solving Logic (`checkIsSolved`)
- Solved state is determined by calculating a global quaternion `qGlobal` from `cubies[0]`.
- Position checks compare current coordinate vs `initialPosition.applyQuaternion(qGlobal)`.
- For rotations, center pieces and the internal core (`zeros < 2`) are excluded from strict quaternion comparison because centers can rotate in place without breaking standard cube solution.

### 3. Navigation, Routing & SEO
- Handled through `react-router` v7 (`createBrowserRouter` in `src/router.jsx`) using `src/routes/routeConfig.js` as the single source of truth.
- French routes live at root (`/play/3x3`, `/algos/3x3/cfop/pll`), English routes under `/en` (`/en/play/3x3`, `/en/algos/3x3/cfop/pll`).
- Algorithm training cases are addressable via `/algos/:size/:method/test/:caseId`.
- `scripts/prerender-meta.mjs` generates flat `.html` files per indexable route and `dist/sitemap.xml` after `vite build`. See `deploy/nginx.conf.example` for the Nginx `try_files` configuration.

### 4. Styling Isolation
- `.main-menu-container` in `App.css` styles menus and sub-menus.
- `.app-container` in `index.css` styles the in-game canvas and HUD.
- Keep menu styles separated from gameplay styles to prevent UI regressions during game mode.
