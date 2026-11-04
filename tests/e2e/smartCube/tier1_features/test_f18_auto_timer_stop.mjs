// tests/e2e/smartCube/tier1_features/test_f18_auto_timer_stop.mjs
// F18: Automatic Solve Timer Stop on Solve (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F18: Automatic Solve Timer Stop');

suite.it('F18-1: Solved state automatically transitions timer from solving to solved', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R"); // Scramble with 1 move
  assertEqual(store.getState().timerStatus, 'scrambled');

  store.handleIncomingMove("R'"); // Solve with 1 inverse move
  assertEqual(store.getState().timerStatus, 'solved');
});

suite.it('F18-2: Freezes elapsedMs upon solve completion', async () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("U");
  store.handleIncomingMove("U'");
  assertEqual(store.getState().timerStatus, 'solved');

  const finalElapsed = store.getState().elapsedMs;
  await new Promise(r => setTimeout(r, 25));
  assertEqual(store.getState().elapsedMs, finalElapsed, 'Elapsed time must not increment after solve');
});

suite.it('F18-3: Appends solved record to sessionSolves array', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("F");
  store.handleIncomingMove("F'");

  const sessions = store.getState().sessionSolves;
  assertEqual(sessions.length, 1);
  assert(sessions[0].timeMs > 0);
  assertEqual(sessions[0].moveCount, 1);
});

suite.it('F18-4: Does not trigger solve stop when cube is not yet fully solved', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.handleIncomingMove('R');
  assertEqual(store.getState().timerStatus, 'solving');
});

suite.it('F18-5: 4-move scramble and inverse solve cycle stops cleanly', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");

  store.handleIncomingMove('U');
  store.handleIncomingMove('R');
  store.handleIncomingMove("U'");
  store.handleIncomingMove("R'");

  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 4);
});
