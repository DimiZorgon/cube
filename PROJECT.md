# Project: GAN 16 ui Smart Cube Integration & Speedcubing Workflow

## Architecture
The system integrates physical smart cube hardware (specifically GAN 16 ui `GAN16ui_DE40`) with a web-based 3D cube simulator and speedcubing timer.
- **Hardware Layer (`src/utils/smartCube/ganBleDriver.js`, `ganProtocol.js`)**: Web Bluetooth GATT interface. Handles GATT connection, service discovery (`0000fff0-0000-1000-8000-00805f9b34fb`), TX command characteristic (`fff5`), RX state characteristic (`fff6`), AES-128-CBC encryption/decryption, move decoding, and battery telemetry parsing (`0xEF`, `0xDD` subType `0xEF`).
- **Core Simulator & Math Layer (`src/utils/cubeMath.js`, `solvePhaseDetector.js`)**: 54-facelet virtual cube simulator (`CubeStateSimulator`), facelet rotation permutations, solved state verification, and CFOP phase detection (Cross -> F2L -> OLL -> PLL -> complete).
- **Store & State Management Layer (`src/store/useSmartCubeStore.js`)**: Zustand store and headless store class. Governs FSM states (`idle`, `scrambling`, `scrambled`, `inspecting`, `solving`, `solved`), scramble sequence matching, timer start/stop, live TPS, step split tracking, and session persistence to localStorage.
- **UI Layer (`src/pages/SmartCubePage.jsx`)**: Presentation layer with live RAF timer display, CFOP 4-step phase tracker, move tape, battery telemetry pill, session statistics, and solves history drawer.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Windows GATT Discovery | Resilient GATT service discovery without disconnect flapping on empty `getPrimaryServices()` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Gen4 Characteristic Resolution | Direct lookup of Gen4 service `0000fff0-...` and characteristics `fff5`, `fff6` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Battery Telemetry Parsing | Parse battery percentage from Gen4 `0xEF` and `0xDD` subType `0xEF` packets | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Post-Connect Command Spacing | 120ms `POST_CONNECT_GAP_MS` pacing between initialization requests to prevent BLE drop | M1 | Survey 1 Investigation |
| 5 | Simulator F/B Permutation Fix | Fix `_applyQuarterTurn('F')` and `('B')` in `CubeStateSimulator` to match 3D coordinate frame | M2 | Survey 3 Discovery |
| 6 | CFOP Phase Detection Engine | Monotonic forward step detector (`Cross`, `F2L`, `OLL`, `PLL`) with step skips support | M2 | ORIGINAL_REQUEST §R3 |
| 7 | Scramble Sequence Validation | Track physical turns against scramble sequence with `'scrambling'` state and double-turn support | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Timer Auto-Start & Wall Clock | Auto-start timer on first move after scramble/inspection with `wallStartTime = Date.now()` | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Solved State Auto-Stop & Splits | Auto-stop on solved state, record duration/moves/TPS per CFOP step into `solveRecord` | M3 | ORIGINAL_REQUEST §R3 |
| 10 | CFOP Phase Tracker UI | Live 4-segment CFOP phase indicator in `SmartCubePage.jsx` showing active and completed steps | M4 | ORIGINAL_REQUEST §R3 |
| 11 | Battery & Timer RAF Sync UI | UI battery percentage pill and live RAF timer display synchronized with wallStartTime | M4 | ORIGINAL_REQUEST §R2, §R3 |
| 12 | Solves History Step Breakdown | Render CFOP split duration chips for historical solves in history drawer | M4 | ORIGINAL_REQUEST §R3 |
| 13 | E2E & Adversarial Hardening | 100% pass rate for 240 E2E tests, 79 Tier 5 adversarial tests, and new regression tests | M5 | ORIGINAL_REQUEST §R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | BLE GATT & Battery Telemetry | Fix Windows Chrome GATT discovery, Gen4 characteristics, battery packet decoding, and post-connect pacing | none | DONE (Verified: 12 M1 tests, 19 challenger tests, 16 fuzz tests, 240 E2E tests, 79 Tier 5 tests pass) |
| M2 | Simulator Permutations & CFOP Engine | Fix F/B quarter-turn permutations in `cubeMath.js`, implement monotonic CFOP phase detector | none | DONE (Verified: 28 M2 tests, 33 CFOP stress tests, 26 simulator stress tests, 565 reviewer assertions pass) |
| M3 | Scramble Tracking, Timer & Splits Store | Implement scramble tracking FSM, timer auto-start/stop, split calculations, and session history schema | M1, M2 | SPECIFIED (See CUBE_STATION_ROADMAP.md) |
| M4 | UI Presentation & Step Breakdown | Add CFOP tracker component, sync live timer RAF, display battery pill and historical split chips | M3 | SPECIFIED (See CUBE_STATION_ROADMAP.md) |
| M5 | Full E2E & Adversarial Hardening | Verify all 240 E2E tests, 79 Tier 5 tests, new regression suites, and production build | M1, M2, M3, M4 | SPECIFIED (See CUBE_STATION_ROADMAP.md) |

## Interface Contracts
### `src/utils/smartCube/ganBleDriver.js`
- `connect(device: BluetoothDevice): Promise<void>`
  - Resolves `0000fff0-0000-1000-8000-00805f9b34fb`, `fff5` (cmd), `fff6` (state).
  - Tolerates initial empty `getPrimaryServices()` via connection holding and explicit fallback queries.
  - Emits: `onNotification(value: DataView)`, `onBattery(level: number)`.

### `src/utils/smartCube/ganProtocol.js`
- `decodeGen4Packet(buffer: Uint8Array, key: Uint8Array, iv: Uint8Array): DecodedPacket`
  - Returns `{ type: 'BATTERY', batteryLevel: number, decrypted: Uint8Array }` for `0xEF` and `0xDD` subType `0xEF`.
  - Safely handles truncated packets, 0% battery, and values outside 0..100.
  - Returns `{ type: 'MOVE', move: string, timestamp: number, ... }` for move packets.

### `src/utils/smartCube/solvePhaseDetector.js`
- `detectSolvePhase(facelets: string, currentPhase: 'cross'|'f2l'|'oll'|'pll'|'complete', crossFace?: 'D'): PhaseDetectionResult`
  - Returns `{ phase: 'cross'|'f2l'|'oll'|'pll'|'complete', isAdvance: boolean }`.
  - Monotonic forward progression: only advances, never regresses during a solve.

### `src/store/useSmartCubeStore.js`
- `timerStatus`: `'idle' | 'scrambling' | 'scrambled' | 'inspecting' | 'solving' | 'solved'`
- `scrambleTracking`: `{ moves: string[], index: number, subStep: number, error: string|null }`
- `phaseSplits`: `{ cross?: StepMetrics, f2l?: StepMetrics, oll?: StepMetrics, pll?: StepMetrics }`
- `solveRecord`: `{ id, timestamp, elapsedMs, timeMs, moveCount, tps, scramble, moves, splits, steps, ... }`

## Code Layout
- `src/utils/smartCube/ganBleDriver.js`: Web Bluetooth driver, GATT connection, retry loop, characteristic resolution.
- `src/utils/smartCube/ganProtocol.js`: Packet codec, AES decryption, Gen4 command/state/battery framing.
- `src/utils/cubeMath.js`: `CubeStateSimulator`, facelet definitions, rotation permutations, `isSolved`.
- `src/utils/smartCube/solvePhaseDetector.js`: CFOP phase detection logic (Cross, F2L, OLL, PLL).
- `src/store/useSmartCubeStore.js`: Smart cube store (headless class & Zustand hook), timer FSM, scramble tracker, session storage.
- `src/pages/SmartCubePage.jsx`: Smart cube page UI, live timer, CFOP tracker, metrics, history drawer.
- `tests/e2e/smartCube/`: E2E test suites (Tiers 1-4, Tier 5 adversarial, verification scripts).
