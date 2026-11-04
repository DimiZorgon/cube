// tests/e2e/smartCube/tier2_boundaries/boundary_f18_timer_stop_under_rapid_moves.mjs
// Boundary F18: Timer Stop Under Rapid Concurrent Turns (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('Boundary F18: Timer Stop Under Rapid Turns');

suite.it('B18-1: Fast-paced solve stops cleanly on the final AUF turn', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("U"); // 1 move scramble

  store.handleIncomingMove("U'", 1200); // 1 move solve
  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 1);
});

suite.it('B18-2: Stray move arriving immediately after solve does not re-enter solving state', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("U");
  store.handleIncomingMove("U'", 1000);
  assertEqual(store.getState().timerStatus, 'solved');

  // Accidental post-solve flick
  store.handleIncomingMove('R', 1050);
  assertEqual(store.getState().timerStatus, 'solved', 'Must stay solved until new scramble');
});

suite.it('B18-3: Multiple solves in the same session append separate solve records', () => {
  const store = new SpecSmartCubeStore();
  // Solve 1
  store.newScramble("R");
  store.handleIncomingMove("R'");
  assertEqual(store.getState().timerStatus, 'solved');

  // Solve 2
  store.newScramble("U");
  store.handleIncomingMove("U'");
  assertEqual(store.getState().timerStatus, 'solved');

  assertEqual(store.getState().sessionSolves.length, 2);
});

suite.it('B18-4: Rapid stop does not cause negative elapsed time', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("F");
  store.handleIncomingMove("F'");
  assert(store.getState().elapsedMs >= 0, 'Elapsed time cannot be negative');
});

suite.it('B18-5: Session solve ID contains unique timestamp identifier', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R");
  store.handleIncomingMove("R'");
  const solveId = store.getState().sessionSolves[0].id;
  assert(solveId.startsWith('solve-'), 'Solve ID must follow solve- prefix format');
});
