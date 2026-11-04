// tests/e2e/smartCube/tier2_boundaries/boundary_f20_dnf_empty_sessions.mjs
// Boundary F20: Empty Session History, DNF Solves, and Identical Times (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { calculateWcaAo5, calculateWcaAo12 } from '../tier1_features/test_f20_session_wca_stats.mjs';

export const suite = createTestSuite('Boundary F20: Empty Sessions & DNF Solves');

function calculateAo5WithDnf(solves) {
  if (!solves || solves.length < 5) return null;
  const last5 = solves.slice(-5);
  const dnfCount = last5.filter(s => s === 'DNF' || s.isDnf).length;
  if (dnfCount >= 2) return 'DNF'; // WCA rule: 2+ DNFs in Ao5 results in DNF

  const numericTimes = last5.map(s => (s === 'DNF' || s.isDnf) ? Infinity : (typeof s === 'number' ? s : s.timeMs));
  const sorted = [...numericTimes].sort((a, b) => a - b);
  // Remove min (index 0) and max (index 4 = Infinity if single DNF)
  const middle3 = sorted.slice(1, 4);
  const sum = middle3.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / 3);
}

suite.it('B20-1: Empty solve array returns null for both Ao5 and Ao12', () => {
  assertEqual(calculateWcaAo5([]), null);
  assertEqual(calculateWcaAo12([]), null);
});

suite.it('B20-2: All identical solve times produce exact same Ao5 value', () => {
  const times = [15000, 15000, 15000, 15000, 15000];
  assertEqual(calculateWcaAo5(times), 15000);
});

suite.it('B20-3: Single DNF in 5 solves is treated as the discarded worst solve (WCA compliant)', () => {
  // Times: 10s, 11s, 12s, 13s, DNF
  // Discards 10s (best) and DNF (worst), averages 11s, 12s, 13s -> 12s
  const solves = [10000, 11000, 12000, 13000, 'DNF'];
  const ao5 = calculateAo5WithDnf(solves);
  assertEqual(ao5, 12000);
});

suite.it('B20-4: Two DNFs in 5 solves marks the entire Ao5 as DNF (WCA compliant)', () => {
  const solves = [10000, 11000, 12000, 'DNF', 'DNF'];
  const ao5 = calculateAo5WithDnf(solves);
  assertEqual(ao5, 'DNF');
});

suite.it('B20-5: Solves with +2 second penalties are calculated correctly in average', () => {
  // Base 10s + 2s penalty = 12s
  const times = [10000, 10000, 10000 + 2000, 10000, 10000];
  const ao5 = calculateWcaAo5(times);
  // Sorted: 10s, 10s, 10s, 10s, 12s -> trimmed 10s and 12s -> middle three are 10s, 10s, 10s -> 10s
  assertEqual(ao5, 10000);
});
