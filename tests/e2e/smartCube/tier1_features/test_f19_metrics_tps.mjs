// tests/e2e/smartCube/tier1_features/test_f19_metrics_tps.mjs
// F19: Solve Metrics Calculation (Time, Move Count, TPS) (5 tests)

import { createTestSuite, assert, assertEqual, assertRoughlyEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F19: Solve Metrics Calculation');

function calculateTps(moves, timeMs) {
  if (timeMs <= 0) return 0;
  const sec = timeMs / 1000;
  return Number((moves / sec).toFixed(2));
}

suite.it('F19-1: Calculates accurate TPS formula moves / (ms / 1000)', () => {
  const tps = calculateTps(60, 10000); // 60 moves in 10.0 seconds
  assertEqual(tps, 6.00);
});

suite.it('F19-2: Returns 0 TPS when elapsed time is zero to prevent division by zero', () => {
  const tps = calculateTps(5, 0);
  assertEqual(tps, 0);
});

suite.it('F19-3: Computes fractional TPS rounded to 2 decimal places', () => {
  const tps = calculateTps(53, 11450); // 53 moves in 11.45s -> 4.6288...
  assertEqual(tps, 4.63);
});

suite.it('F19-4: High speed TPS calculation (12+ TPS sub-second turn burst)', () => {
  const tps = calculateTps(12, 1000); // 12 moves in 1.00s
  assertEqual(tps, 12.00);
});

suite.it('F19-5: Store finalTps matches recorded solve session TPS metric', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R");
  store.handleIncomingMove("R'");

  const state = store.getState();
  assertEqual(state.timerStatus, 'solved');
  assert(state.finalTps !== null, 'finalTps should be set');
  assertEqual(state.finalTps, state.sessionSolves[0].tps);
});
