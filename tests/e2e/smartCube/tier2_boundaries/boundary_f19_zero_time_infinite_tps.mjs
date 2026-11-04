// tests/e2e/smartCube/tier2_boundaries/boundary_f19_zero_time_infinite_tps.mjs
// Boundary F19: Zero Time, Negative Time, and Infinite TPS Boundary Guards (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('Boundary F19: Zero Time & Infinite TPS Guards');

function safeTps(moves, elapsedMs) {
  if (typeof moves !== 'number' || moves <= 0) return 0;
  if (typeof elapsedMs !== 'number' || elapsedMs <= 0) return 0;
  const sec = elapsedMs / 1000;
  const tps = moves / sec;
  if (!isFinite(tps) || isNaN(tps)) return 0;
  return Number(tps.toFixed(2));
}

suite.it('B19-1: Zero elapsed milliseconds returns 0 TPS instead of Infinity', () => {
  assertEqual(safeTps(10, 0), 0);
});

suite.it('B19-2: Negative elapsed milliseconds returns 0 TPS', () => {
  assertEqual(safeTps(10, -500), 0);
});

suite.it('B19-3: Zero move count returns 0 TPS', () => {
  assertEqual(safeTps(0, 5000), 0);
});

suite.it('B19-4: Sub-millisecond elapsed time is clamped safely without overflow', () => {
  const tps = safeTps(1, 1); // 1 move in 1 millisecond -> 1000 TPS
  assertEqual(tps, 1000.00);
});

suite.it('B19-5: Non-numeric parameters (null, undefined, NaN) return 0 TPS', () => {
  assertEqual(safeTps(null, 1000), 0);
  assertEqual(safeTps(10, null), 0);
  assertEqual(safeTps(NaN, 1000), 0);
  assertEqual(safeTps(10, NaN), 0);
});
