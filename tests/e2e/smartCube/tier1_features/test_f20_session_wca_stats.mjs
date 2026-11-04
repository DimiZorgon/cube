// tests/e2e/smartCube/tier1_features/test_f20_session_wca_stats.mjs
// F20: Session History & WCA Averages (Ao5 / Ao12) (5 tests)

import { createTestSuite, assert, assertEqual, assertRoughlyEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('F20: Session History & WCA Averages');

export function calculateWcaAo5(timesMs) {
  if (!timesMs || timesMs.length < 5) return null;
  const last5 = timesMs.slice(-5);
  const sorted = [...last5].sort((a, b) => a - b);
  // Remove min and max (indices 0 and 4), average middle 3 (indices 1, 2, 3)
  const middle3 = sorted.slice(1, 4);
  const sum = middle3.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / 3);
}

export function calculateWcaAo12(timesMs) {
  if (!timesMs || timesMs.length < 12) return null;
  const last12 = timesMs.slice(-12);
  const sorted = [...last12].sort((a, b) => a - b);
  // Remove min and max (indices 0 and 11), average middle 10 (indices 1 to 10)
  const middle10 = sorted.slice(1, 11);
  const sum = middle10.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / 10);
}

suite.it('F20-1: Returns null Ao5 when fewer than 5 solves are recorded', () => {
  assertEqual(calculateWcaAo5([10000, 11000, 12000, 13000]), null);
});

suite.it('F20-2: Computes WCA Ao5 by trimming fastest and slowest solves', () => {
  // Times: 10.00s, 12.00s, 14.00s, 16.00s, 18.00s
  // Sorted: 10s, 12s, 14s, 16s, 18s -> trimmed 10s and 18s -> average of 12, 14, 16 is 14.00s
  const times = [10000, 12000, 14000, 16000, 18000];
  const ao5 = calculateWcaAo5(times);
  assertEqual(ao5, 14000);
});

suite.it('F20-3: Computes sliding Ao5 on the most recent 5 solves', () => {
  const times = [9000, 8000, 10000, 12000, 14000, 16000, 18000];
  // Last 5: 10000, 12000, 14000, 16000, 18000 -> Ao5 = 14000
  assertEqual(calculateWcaAo5(times), 14000);
});

suite.it('F20-4: Returns null Ao12 when fewer than 12 solves are recorded', () => {
  const elevenTimes = Array(11).fill(12000);
  assertEqual(calculateWcaAo12(elevenTimes), null);
});

suite.it('F20-5: Computes WCA Ao12 by trimming best and worst from 12 solves', () => {
  // 12 times: 5000 (best), 10 times 10000, 20000 (worst)
  const times = [5000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 20000];
  const ao12 = calculateWcaAo12(times);
  assertEqual(ao12, 10000);
});
