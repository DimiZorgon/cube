// tests/e2e/smartCube/tier1_features/test_f15_move_tape_history.mjs
// F15: Move Tape & Notation History (5 tests)

import { createTestSuite, assert, assertEqual, assertDeepEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F15: Move Tape & Notation History');

suite.it('F15-1: Initial moveHistory is an empty array', () => {
  const store = new SpecSmartCubeStore();
  assertDeepEqual(store.getState().moveHistory, []);
  assertEqual(store.getState().moveCount, 0);
});

suite.it('F15-2: Records move notation, timestamp, and stepTime in history tape', () => {
  const store = new SpecSmartCubeStore();
  const t0 = 1000;
  const t1 = 1250;

  store.handleIncomingMove('R', t0);
  store.handleIncomingMove("U'", t1);

  const history = store.getState().moveHistory;
  assertEqual(history.length, 2);
  assertEqual(history[0].move, 'R');
  assertEqual(history[0].timestamp, t0);
  assertEqual(history[1].move, "U'");
  assertEqual(history[1].timestamp, t1);
  assertEqual(history[1].stepTime, 250);
});

suite.it('F15-3: Increments moveCount with each registered turn', () => {
  const store = new SpecSmartCubeStore();
  const moves = ['R', 'U', "R'", "U'"];
  for (const m of moves) {
    store.handleIncomingMove(m);
  }
  assertEqual(store.getState().moveCount, 4);
});

suite.it('F15-4: ResetSolve clears move tape and resets count to zero', () => {
  const store = new SpecSmartCubeStore();
  store.handleIncomingMove('F');
  store.handleIncomingMove('R');
  assertEqual(store.getState().moveCount, 2);

  store.resetSolve();
  assertEqual(store.getState().moveCount, 0);
  assertDeepEqual(store.getState().moveHistory, []);
});

suite.it('F15-5: NewScramble clears previous solve tape ready for new attempt', () => {
  const store = new SpecSmartCubeStore();
  store.handleIncomingMove('R');
  store.handleIncomingMove('U');
  assertEqual(store.getState().moveHistory.length, 2);

  store.newScramble("F R U R' U' F'");
  assertEqual(store.getState().moveHistory.length, 0);
  assertEqual(store.getState().moveCount, 0);
});
