// tests/e2e/smartCube/tier2_boundaries/boundary_f21_packet_stress_timer.mjs
// Milestone 5 Phase 1: High-Frequency Packet Stress, Timer Transition & Edge Harness
// Empirical Challenger verification suite for SmartCubeStore & VirtualGanCube

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { VirtualGanCube } from '../mocks/virtualGanCube.mjs';
import { SmartCubeStore } from '../../../../src/store/useSmartCubeStore.js';

function safeTps(moves, elapsedMs) {
  if (typeof moves !== 'number' || moves <= 0) return 0;
  if (typeof elapsedMs !== 'number' || elapsedMs <= 0) return 0;
  const sec = elapsedMs / 1000;
  const tps = moves / sec;
  if (!isFinite(tps) || isNaN(tps)) return 0;
  return Number(tps.toFixed(2));
}

export const suite = createTestSuite('Boundary F21: High-Frequency Packet Stress & Timer Transition');

// Test 1: Rapid packet burst (25 moves in < 100ms) through VirtualGanCube -> SmartCubeStore
suite.it('B21-1: Rapid packet burst of 25 moves in 60ms ingested with 0 dropped moves', async () => {
  const cube = new VirtualGanCube();
  const store = new SmartCubeStore();

  await store.connect(cube.device, cube.macAddress);
  assertEqual(store.getState().connectionStatus, 'connected');

  // Alternating quarter turns: R, U, R', U' repeated
  const moves = ["R", "U", "R'", "U'"];
  const burstMoves = [];
  for (let i = 0; i < 25; i++) {
    burstMoves.push(moves[i % moves.length]);
  }

  const baseTs = 5000;
  // Emit 25 packets spaced 2.5ms apart = 60ms total burst (< 100ms)
  for (let i = 0; i < burstMoves.length; i++) {
    cube.emitMove(burstMoves[i], baseTs + Math.round(i * 2.5));
  }

  const state = store.getState();
  assertEqual(state.moveCount, 25, 'Move count must reflect all 25 burst moves');
  assertEqual(state.moveHistory.length, 25, 'Move history must have exactly 25 records');

  // Verify all moves recorded in exact emission order with zero dropped moves
  for (let i = 0; i < 25; i++) {
    assertEqual(state.moveHistory[i].move, burstMoves[i], `Move ${i} mismatch`);
  }
});

// Test 2: Rapid moves reaching solved state trigger timer status transition to 'solved'
// with positive, accurate finalTps and zero dropped moves
suite.it('B21-2: Rapid solve in 76ms triggers transition to solved with accurate finalTps', async () => {
  const cube = new VirtualGanCube();
  const store = new SmartCubeStore();

  await store.connect(cube.device, cube.macAddress);

  // Scramble with 20 quarter turns
  const scrambleQuarterTurns = [
    "R", "U", "F", "L", "D", "B",
    "R", "U", "F", "L", "D", "B",
    "R", "U", "F", "L", "D", "B",
    "R", "U"
  ];
  store.newScramble(scrambleQuarterTurns.join(' '));
  assertEqual(store.getState().timerStatus, 'scrambled');

  // Exact 20 inverse quarter turns to solve
  const solveQuarterTurns = [
    "U'", "R'",
    "B'", "D'", "L'", "F'", "U'", "R'",
    "B'", "D'", "L'", "F'", "U'", "R'",
    "B'", "D'", "L'", "F'", "U'", "R'"
  ];
  assertEqual(solveQuarterTurns.length, 20);

  // Emit 20 inverse moves at 4ms intervals = 76ms total elapsed (< 100ms)
  const startTs = 10000;
  for (let i = 0; i < solveQuarterTurns.length; i++) {
    const ts = startTs + i * 4;
    cube.emitMove(solveQuarterTurns[i], ts);
  }

  const finalState = store.getState();
  assertEqual(finalState.timerStatus, 'solved', 'Timer status must transition to solved');
  assertEqual(finalState.moveCount, 20, 'Zero dropped moves across rapid burst');
  assertEqual(finalState.moveHistory.length, 20);

  // Verify positive and accurate finalTps
  assert(finalState.finalTps > 0, `finalTps must be positive, got ${finalState.finalTps}`);
  const expectedElapsed = 19 * 4; // 76ms
  assertEqual(finalState.elapsedMs, expectedElapsed, `Elapsed must be ${expectedElapsed}ms`);

  const expectedTps = safeTps(20, expectedElapsed);
  assertEqual(finalState.finalTps, expectedTps, `finalTps ${finalState.finalTps} must equal safeTps ${expectedTps}`);

  // Verify session solve record
  assertEqual(finalState.sessionSolves.length, 1, 'Exactly 1 session solve recorded');
  assertEqual(finalState.sessionSolves[0].timeMs, expectedElapsed);
  assertEqual(finalState.sessionSolves[0].tps, expectedTps);
});

// Test 3: Edge scenario: 0ms elapsed time clamp
suite.it('B21-3: 0ms elapsed time is clamped safely to >= 1ms with positive finite TPS', async () => {
  const store = new SmartCubeStore();

  // 1-move scramble
  store.newScramble("R");
  assertEqual(store.getState().timerStatus, 'scrambled');

  // Solve move arrives at exact start timestamp (0ms diff)
  const fixedTs = 25000;
  store.handleIncomingMove("R'", fixedTs);

  const state = store.getState();
  assertEqual(state.timerStatus, 'solved');
  assert(state.elapsedMs >= 1, `elapsedMs must be clamped to >= 1ms, got ${state.elapsedMs}`);
  assert(state.finalTps > 0, `finalTps must be positive, got ${state.finalTps}`);
  assert(Number.isFinite(state.finalTps), `finalTps must be finite, got ${state.finalTps}`);
  assertEqual(state.finalTps, safeTps(1, state.elapsedMs));
});

// Test 4: Edge scenario: Timestamp = 0 and relative clock robustness
suite.it('B21-4: Solve starting at timestamp 0 computes accurate elapsed time without 1ms lock', () => {
  const store = new SmartCubeStore();

  // Scramble 2 moves: R U
  store.newScramble("R U");
  assertEqual(store.getState().timerStatus, 'scrambled');

  // Move 1 arrives at relative timestamp 0
  store.handleIncomingMove("U'", 0);
  assertEqual(store.getState().timerStatus, 'solving');

  // Move 2 arrives 200ms later at relative timestamp 200 and solves the cube
  store.handleIncomingMove("R'", 200);
  const state = store.getState();
  assertEqual(state.timerStatus, 'solved');
  assertEqual(state.moveCount, 2);

  // Verify elapsedMs is 200ms
  assertEqual(state.elapsedMs, 200, `elapsedMs must be 200ms, got ${state.elapsedMs}`);
  assertEqual(state.finalTps, 10.00, `finalTps must be 10.00 for 2 moves in 200ms`);
});

// Test 5: Rapid scramble re-entry stress test (10 rapid cycles)
suite.it('B21-5: Rapid scramble re-entry across 10 consecutive cycles preserves history integrity', async () => {
  const store = new SmartCubeStore();

  for (let cycle = 0; cycle < 10; cycle++) {
    store.newScramble("R");
    assertEqual(store.getState().timerStatus, 'scrambled');
    assertEqual(store.getState().moveCount, 0);
    assertEqual(store.getState().moveHistory.length, 0);

    const cycleTs = 100000 + cycle * 1000;
    store.handleIncomingMove("R'", cycleTs + 500);

    assertEqual(store.getState().timerStatus, 'solved');
    assertEqual(store.getState().sessionSolves.length, cycle + 1);
  }

  assertEqual(store.getState().sessionSolves.length, 10, 'Must record exactly 10 solves');
});

// Test 6: Marathon 500-move solve without memory leak
suite.it('B21-6: Marathon 500-move solve executes cleanly and resets without memory leak', () => {
  const store = new SmartCubeStore();

  store.newScramble("R U R' U'");
  const faces = ['R', 'U', 'F', 'L', 'D', 'B'];

  const initialHeap = process.memoryUsage().heapUsed;

  const baseTs = 200000;
  for (let i = 0; i < 500; i++) {
    const move = faces[i % faces.length];
    store.handleIncomingMove(move, baseTs + i * 10);
  }

  const state = store.getState();
  assertEqual(state.moveCount, 500, 'Move count must reach 500');
  assertEqual(state.moveHistory.length, 500, 'Move history must retain 500 records');
  assertEqual(state.moveHistory[250].stepTime, 10, 'Step time must be constant 10ms');

  // Verify memory growth is strictly bounded (< 5MB delta for 500 moves)
  const currentHeap = process.memoryUsage().heapUsed;
  const heapDeltaMb = (currentHeap - initialHeap) / (1024 * 1024);
  assert(heapDeltaMb < 5.0, `Heap memory growth ${heapDeltaMb.toFixed(2)}MB exceeds 5MB limit`);

  // Verify resetSolve clears arrays
  store.resetSolve();
  assertEqual(store.getState().moveCount, 0);
  assertEqual(store.getState().moveHistory.length, 0);
  assertEqual(store.getState().timerStatus, 'idle');
});

// Test 7: Production ganProtocol.js clean import verification
suite.it('B21-7: Production ganProtocol.js imports cleanly without TypeError in Node.js 26', async () => {
  const mod = await import('../../../../src/utils/smartCube/ganProtocol.js');
  assert(mod !== null && typeof mod === 'object', 'Production ganProtocol.js must export valid module');
  assert(mod.COMMAND_REQUEST_FACELETS instanceof Uint8Array, 'COMMAND_REQUEST_FACELETS must be Uint8Array');
  assertEqual(mod.COMMAND_REQUEST_FACELETS.length, 20, 'COMMAND_REQUEST_FACELETS length must be 20');
  assert(mod.COMMAND_REQUEST_BATTERY instanceof Uint8Array, 'COMMAND_REQUEST_BATTERY must be Uint8Array');
  assertEqual(mod.COMMAND_REQUEST_BATTERY.length, 20, 'COMMAND_REQUEST_BATTERY length must be 20');
  assert(mod.COMMAND_REQUEST_HARDWARE instanceof Uint8Array, 'COMMAND_REQUEST_HARDWARE must be Uint8Array');
  assertEqual(mod.COMMAND_REQUEST_HARDWARE.length, 20, 'COMMAND_REQUEST_HARDWARE length must be 20');
  assert(mod.COMMAND_HARDWARE_RESET instanceof Uint8Array, 'COMMAND_HARDWARE_RESET must be Uint8Array');
  assertEqual(mod.COMMAND_HARDWARE_RESET.length, 20, 'COMMAND_HARDWARE_RESET length must be 20');
});

// Test 8: Production useSmartCubeStore.js clean import verification
suite.it('B21-8: Production useSmartCubeStore.js imports cleanly without cascade failure', async () => {
  const mod = await import('../../../../src/store/useSmartCubeStore.js');
  assert(mod !== null && typeof mod === 'object', 'Production useSmartCubeStore.js must export valid module');
  assert(typeof mod.SmartCubeStore === 'function', 'SmartCubeStore must be exported as a class/function');
  assert(typeof mod.useSmartCubeStore === 'function', 'useSmartCubeStore hook must be exported');
});

// Test 9: Production SmartCubeStore correctly calculates elapsed time and TPS when startTime is 0
suite.it('B21-9: Production SmartCubeStore correctly calculates elapsed time and TPS when solve starts at timestamp 0', () => {
  const store = new SmartCubeStore();
  store.newScramble("R U");
  assertEqual(store.getState().timerStatus, 'scrambled');

  // First move arrives at relative timestamp 0
  store.handleIncomingMove("U'", 0);
  assertEqual(store.getState().timerStatus, 'solving');
  assertEqual(store.getState().timerStartTime, 0, 'timerStartTime must be 0');

  // Second move arrives at relative timestamp 200 and solves the cube
  store.handleIncomingMove("R'", 200);
  const state = store.getState();
  assertEqual(state.timerStatus, 'solved');
  assertEqual(state.moveCount, 2);
  assertEqual(state.elapsedMs, 200, 'elapsedMs must be 200ms without 1ms collapse');
  assertEqual(state.finalTps, 10.00, 'finalTps must be 10.00 for 2 moves in 200ms');
});

// Test 10: Production SmartCubeStore preserves moveData.timestamp when timestamp is 0
suite.it('B21-10: Production SmartCubeStore correctly handles move object with timestamp 0 without fallback to Date.now()', () => {
  const store = new SmartCubeStore();
  store.newScramble("R");
  store.handleIncomingMove({ move: 'R', timestamp: 0, serial: 1 });

  const history = store.getState().moveHistory;
  assertEqual(history.length, 1);
  assertEqual(history[0].move, 'R');
  assertEqual(history[0].timestamp, 0, 'Move timestamp must be preserved as 0, not Date.now() epoch');
  assertEqual(store.getState().timerStartTime, 0, 'timerStartTime must be 0');
});
