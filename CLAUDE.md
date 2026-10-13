# CLAUDE.md

## Project Overview
Interactive Rubik's Cube web application (2x2 and 3x3) built with React 19, Three.js, React Three Fiber, and Zustand. Includes timer, high scores, dynamic camera-relative controls, 3D animated menu previews, and algorithm guide sections.

## Commands
- `npm run dev`: Start Vite development server
- `npm run build`: Production build (`dist/`)
- `npm run lint`: Run Oxlint linter
- `npm run preview`: Preview production build locally

## Tech Stack
- **Framework**: React 19 + Vite 8
- **3D Graphics**: Three.js (`three`), `@react-three/fiber`, `@react-three/drei`
- **State Management**: Zustand 5
- **Effects**: `canvas-confetti`
- **Linting**: Oxlint

## Project Structure
```text
src/
├── App.jsx                 # Top-level state-based router (menu, 2x2, 3x3, algos)
├── App.css                 # Menu & navigation styles (.main-menu-*, .menu-btn)
├── index.css               # Global base styles & in-game layout (.app-container)
├── main.jsx                # React root entry point
├── components/
│   ├── CubeGame.jsx        # Generic game engine: timer, shuffle, highscore, controls
│   ├── Cube2x2.jsx         # 2x2 game view wrapper
│   ├── Cube3x3.jsx         # 3x3 game view wrapper
│   ├── RubiksCube.jsx      # Interactive 3D cube bound to Zustand store
│   ├── Cubie.jsx           # Individual cube piece with 6 colored faces
│   ├── MiniCube.jsx        # Isolated 3D cube preview for menu buttons (no store binding)
│   ├── CameraMapper.jsx    # Updates move directions based on current camera orientation
│   ├── LockCamera.jsx      # Camera control locking mechanism
│   ├── MoveButton.jsx      # On-screen move trigger button
│   └── algos/              # Algorithm guides
│       ├── MethodeSimple2x2.jsx
│       ├── MethodeOrtega2x2.jsx
│       ├── MethodeSimple3x3.jsx
│       └── MethodeCFOP3x3.jsx
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

### 3. Navigation & Routing
- Handled through React state (`mode`) in `App.jsx` without external router libraries.
- Standard flow: Main Menu -> Size Selection or Algos -> Specific method view -> Back button reverts state.

### 4. Styling Isolation
- `.main-menu-container` in `App.css` styles menus and sub-menus.
- `.app-container` in `index.css` styles the in-game canvas and HUD.
- Keep menu styles separated from gameplay styles to prevent UI regressions during game mode.

