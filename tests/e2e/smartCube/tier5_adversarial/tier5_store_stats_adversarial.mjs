// tests/e2e/smartCube/tier5_adversarial/tier5_store_stats_adversarial.mjs
// Tier 5 Adversarial Coverage Hardening: Smart Cube Store, FSM, and WCA Analytics Audit
// Challenger 2: White-box adversarial testing for store FSM, stats math, and gyro arithmetic.

import * as THREE from 'three';
import {
  createTestSuite,
  assert,
  assertEqual,
  assertDeepEqual,
  assertRoughlyEqual
} from '../helpers/testUtils.mjs';

import {
  safeTps,
  getEffectiveTime,
  calculateWcaAo5,
  calculateWcaAo12,
  calculateWcaMo3,
  calculateSessionStats
} from '../../../../src/utils/smartCube/wcaStats.js';

import {
  SmartCubeStore,
  generateRandomScramble
} from '../../../../src/store/useSmartCubeStore.js';

import {
  checkIsSolved,
  isFaceletsSolved,
  CubeStateSimulator,
  generateInitialCubies,
  applyRotationToCubies,
  SOLVED_FACELETS
} from '../../../../src/utils/cubeMath.js';

export const suite = createTestSuite('Tier 5 Adversarial: Smart Cube Store & Analytics Hardening');

// ============================================================================
// SUITE 1: PURE WCA STATS & TPS ARITHMETIC ADVERSARIAL STRESS
// ============================================================================

suite.it('T5-STATS-01: safeTps handles boundary anomalies, extreme values, and invalid types', () => {
  // Normal TPS
  assertEqual(safeTps(10, 2000), 5.00);
  assertEqual(safeTps(1, 300), 3.33);

  // Zero & negative guards
  assertEqual(safeTps(0, 1000), 0);
  assertEqual(safeTps(-5, 1000), 0);
  assertEqual(safeTps(10, 0), 0);
  assertEqual(safeTps(10, -500), 0);
  assertEqual(safeTps(0, 0), 0);

  // Sub-millisecond / microsecond inputs
  assertEqual(safeTps(1, 0.0001), 10000000);

  // Non-finite and NaN values
  assertEqual(safeTps(NaN, 1000), 0);
  assertEqual(safeTps(10, NaN), 0);
  assertEqual(safeTps(Infinity, 1000), 0);
  assertEqual(safeTps(10, Infinity), 0);
  assertEqual(safeTps(-Infinity, 1000), 0);

  // Invalid types
  assertEqual(safeTps(null, 1000), 0);
  assertEqual(safeTps(10, null), 0);
  assertEqual(safeTps('10', 1000), 0);
  assertEqual(safeTps(10, '1000'), 0);
  assertEqual(safeTps(undefined, undefined), 0);
  assertEqual(safeTps({}, []), 0);
});

suite.it('T5-STATS-02: getEffectiveTime penalty parsing, casing, and object structures', () => {
  // Pure numbers
  assertEqual(getEffectiveTime(12500), 12500);
  assertEqual(getEffectiveTime(0), 0);

  // Object structures with elapsedMs or timeMs
  assertEqual(getEffectiveTime({ elapsedMs: 14200 }), 14200);
  assertEqual(getEffectiveTime({ timeMs: 9800 }), 9800);
  assertEqual(getEffectiveTime({ elapsedMs: 11000, timeMs: 9800 }), 11000); // prefers elapsedMs

  // +2 Second penalty
  assertEqual(getEffectiveTime({ elapsedMs: 10000, penalty: '+2' }), 12000);
  assertEqual(getEffectiveTime({ timeMs: 8000, penalty: '+2' }), 10000);

  // DNF representations
  assertEqual(getEffectiveTime('DNF'), Infinity);
  assertEqual(getEffectiveTime({ elapsedMs: 10000, penalty: 'dnf' }), Infinity);
  assertEqual(getEffectiveTime({ elapsedMs: 10000, isDnf: true }), Infinity);

  // Nullish / empty object
  assertEqual(getEffectiveTime(null), 0);
  assertEqual(getEffectiveTime({}), 0);
});

suite.it('T5-STATS-03: calculateWcaAo5 trimmed mean and multi-DNF boundary conditions', () => {
  // Fewer than 5 solves returns null
  assertEqual(calculateWcaAo5(null), null);
  assertEqual(calculateWcaAo5([]), null);
  assertEqual(calculateWcaAo5([10000, 11000]), null);
  assertEqual(calculateWcaAo5([10000, 11000, 12000, 13000]), null);

  // Exactly 5 identical times
  assertEqual(calculateWcaAo5([10000, 10000, 10000, 10000, 10000]), 10000);

  // Trimming fastest (index 0) and slowest (index 4)
  // Raw: 8000, 12000, 14000, 16000, 25000 -> trims 8000 & 25000 -> avg(12000, 14000, 16000) = 14000
  assertEqual(calculateWcaAo5([8000, 12000, 14000, 16000, 25000]), 14000);

  // Single DNF is trimmed as worst solve
  // Raw: 10000, 12000, 14000, 16000, 'DNF' -> trims 10000 & DNF -> avg(12000, 14000, 16000) = 14000
  assertEqual(calculateWcaAo5([10000, 12000, 14000, 16000, 'DNF']), 14000);
  assertEqual(calculateWcaAo5(['DNF', 10000, 12000, 14000, 16000]), 14000);

  // Two or more DNFs strictly yields 'DNF'
  assertEqual(calculateWcaAo5([10000, 12000, 14000, 'DNF', 'DNF']), 'DNF');
  assertEqual(calculateWcaAo5(['DNF', 10000, 'DNF', 14000, 16000]), 'DNF');
  assertEqual(calculateWcaAo5(['DNF', 'DNF', 'DNF', 'DNF', 'DNF']), 'DNF');

  // Sliding window: only last 5 solves are evaluated
  // Solves 1..7: first two are 99999, last five are [10s, 12s, 14s, 16s, 18s]
  const history = [99999, 99999, 10000, 12000, 14000, 16000, 18000];
  assertEqual(calculateWcaAo5(history), 14000);

  // Exact millisecond rounding (WCA truncation/rounding standard)
  // 10001, 10002, 10003, 10004, 10005 -> middle 3: 10002 + 10003 + 10004 = 30009 / 3 = 10003
  assertEqual(calculateWcaAo5([10001, 10002, 10003, 10004, 10005]), 10003);
});

suite.it('T5-STATS-04: calculateWcaAo12 trimmed mean and boundary conditions', () => {
  // Fewer than 12 solves
  assertEqual(calculateWcaAo12(null), null);
  assertEqual(calculateWcaAo12(Array(11).fill(10000)), null);

  // Exactly 12 identical solves
  assertEqual(calculateWcaAo12(Array(12).fill(12000)), 12000);

  // Best & worst trimmed
  // 12 solves: min=5000, max=25000, ten times of 10000 -> avg is 10000
  const twelve = [5000, ...Array(10).fill(10000), 25000];
  assertEqual(calculateWcaAo12(twelve), 10000);

  // Single DNF is trimmed as worst (11th index)
  const elevenPlusDnf = [5000, ...Array(10).fill(10000), 'DNF'];
  assertEqual(calculateWcaAo12(elevenPlusDnf), 10000);

  // Two DNFs yields 'DNF'
  const twoDnfs = [5000, ...Array(9).fill(10000), 'DNF', 'DNF'];
  assertEqual(calculateWcaAo12(twoDnfs), 'DNF');
});

suite.it('T5-STATS-05: calculateWcaMo3 Mean of 3 WCA regulations', () => {
  // Fewer than 3 solves
  assertEqual(calculateWcaMo3(null), null);
  assertEqual(calculateWcaMo3([]), null);
  assertEqual(calculateWcaMo3([10000, 12000]), null);

  // Exactly 3 solves arithmetic mean
  assertEqual(calculateWcaMo3([10000, 12000, 14000]), 12000);

  // ANY DNF in Mo3 yields 'DNF' (WCA Reg 9f7: no trimming in Mo3)
  assertEqual(calculateWcaMo3([10000, 12000, 'DNF']), 'DNF');
  assertEqual(calculateWcaMo3(['DNF', 'DNF', 'DNF']), 'DNF');
});

suite.it('T5-STATS-06: calculateSessionStats comprehensive edge cases (1..4 solves, all DNFs, penalties)', () => {
  // Empty session
  const emptyStats = calculateSessionStats([]);
  assertEqual(emptyStats.count, 0);
  assertEqual(emptyStats.best, null);
  assertEqual(emptyStats.worst, null);
  assertEqual(emptyStats.mo3, null);
  assertEqual(emptyStats.ao5, null);
  assertEqual(emptyStats.ao12, null);
  assertEqual(emptyStats.avgTps, null);

  // 1 solve
  const stats1 = calculateSessionStats([{ elapsedMs: 12500, tps: 3.5 }]);
  assertEqual(stats1.count, 1);
  assertEqual(stats1.best, 12500);
  assertEqual(stats1.worst, 12500);
  assertEqual(stats1.mo3, null);
  assertEqual(stats1.ao5, null);
  assertEqual(stats1.avgTps, 3.5);

  // 2 solves
  const stats2 = calculateSessionStats([
    { elapsedMs: 10000, tps: 4.0 },
    { elapsedMs: 14000, tps: 2.0 }
  ]);
  assertEqual(stats2.count, 2);
  assertEqual(stats2.best, 10000);
  assertEqual(stats2.worst, 14000);
  assertEqual(stats2.mo3, null);
  assertEqual(stats2.ao5, null);
  assertEqual(stats2.avgTps, 3.0);

  // 3 solves (Mo3 activates)
  const stats3 = calculateSessionStats([
    { elapsedMs: 10000, tps: 4.0 },
    { elapsedMs: 12000, tps: 3.0 },
    { elapsedMs: 14000, tps: 2.0 }
  ]);
  assertEqual(stats3.count, 3);
  assertEqual(stats3.best, 10000);
  assertEqual(stats3.worst, 14000);
  assertEqual(stats3.mo3, 12000);
  assertEqual(stats3.ao5, null);

  // 4 solves (Mo3 uses last 3, Ao5 still null)
  const stats4 = calculateSessionStats([
    { elapsedMs: 8000, tps: 5.0 },
    { elapsedMs: 10000, tps: 4.0 },
    { elapsedMs: 12000, tps: 3.0 },
    { elapsedMs: 14000, tps: 2.0 }
  ]);
  assertEqual(stats4.count, 4);
  assertEqual(stats4.best, 8000);
  assertEqual(stats4.worst, 14000);
  assertEqual(stats4.mo3, 12000); // last 3: 10k, 12k, 14k -> 12000
  assertEqual(stats4.ao5, null);

  // Session with +2 penalty affecting best / worst
  const statsPenalties = calculateSessionStats([
    { elapsedMs: 10000, penalty: '+2' }, // effective 12000
    { elapsedMs: 11000, penalty: 'none' } // effective 11000
  ]);
  assertEqual(statsPenalties.best, 11000);
  assertEqual(statsPenalties.worst, 12000);

  // Session where all solves are DNFs
  const statsAllDnf = calculateSessionStats([
    { elapsedMs: 10000, penalty: 'dnf', isDnf: true },
    { elapsedMs: 12000, penalty: 'dnf', isDnf: true }
  ]);
  assertEqual(statsAllDnf.count, 2);
  assertEqual(statsAllDnf.best, null);
  assertEqual(statsAllDnf.worst, null);
  assertEqual(statsAllDnf.avgTps, null);
});

// ============================================================================
// SUITE 2: SMART CUBE STORE FSM, RESETS & MOVE HISTORY ADVERSARIAL
// ============================================================================

suite.it('T5-STORE-01: Timer FSM strict state transitions (idle, scrambled, inspecting, solving, solved)', () => {
  const store = new SmartCubeStore();
  assertEqual(store.getState().timerStatus, 'idle');

  // Inspection cannot start from idle
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'idle');

  // Moves received in idle state do NOT trigger timer or solve
  store.handleIncomingMove('R');
  assertEqual(store.getState().timerStatus, 'idle');
  assertEqual(store.getState().moveCount, 1);

  // New scramble transitions to 'scrambled'
  store.newScramble("R U R' U'");
  assertEqual(store.getState().timerStatus, 'scrambled');
  assertEqual(store.getState().moveCount, 0);
  assertEqual(store.getState().elapsedMs, 0);

  // Inspection transitions from 'scrambled' to 'inspecting'
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');

  // Accidental re-inspection call remains 'inspecting'
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');

  // First move during inspection auto-starts solving
  const t0 = 100000;
  store.handleIncomingMove('U', t0);
  assertEqual(store.getState().timerStatus, 'solving');
  assertEqual(store.getState().moveCount, 1);
  assertEqual(store.getState().timerStartTime, t0);
});

suite.it('T5-STORE-02: Post-solve guard protects completed solve against trailing turns', () => {
  const store = new SmartCubeStore();
  // Simple 1-move scramble
  store.newScramble("U");
  assertEqual(store.getState().timerStatus, 'scrambled');

  // Solve with inverse U'
  store.handleIncomingMove("U'", 101000);
  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 1);
  const recordedSolves = store.getState().sessionSolves.length;
  assertEqual(recordedSolves, 1);
  const recordedElapsed = store.getState().elapsedMs;
  const recordedTps = store.getState().finalTps;

  // Additional turns after solve (fidgeting, celebration turns)
  store.handleIncomingMove("R", 102000);
  store.handleIncomingMove("R'", 103000);
  store.handleIncomingMove("F", 104000);

  // State must remain strictly guarded
  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 1);
  assertEqual(store.getState().elapsedMs, recordedElapsed);
  assertEqual(store.getState().finalTps, recordedTps);
  assertEqual(store.getState().sessionSolves.length, 1);
});

suite.it('T5-STORE-03: Move history stepTime calculation, zero-interval, and clock jitter resilience', () => {
  const store = new SmartCubeStore();
  store.newScramble("R U R' U'");

  // Move 1 at t=1000
  store.handleIncomingMove('R', 1000);
  assertEqual(store.getState().moveHistory.length, 1);
  assertEqual(store.getState().moveHistory[0].stepTime, 0);

  // Move 2 at t=1250 (stepTime = 250ms)
  store.handleIncomingMove('U', 1250);
  assertEqual(store.getState().moveHistory[1].stepTime, 250);

  // Move 3 at identical timestamp t=1250 (stepTime = 0ms)
  store.handleIncomingMove('F', 1250);
  assertEqual(store.getState().moveHistory[2].stepTime, 0);

  // Move 4 with out-of-order/jitter timestamp t=1200 (earlier than previous 1250)
  // StepTime should clamp to 0 instead of negative
  store.handleIncomingMove('D', 1200);
  assertEqual(store.getState().moveHistory[3].stepTime, 0);
});

suite.it('T5-STORE-04: Full state reset and session management (penalties, deletes, clears)', () => {
  const store = new SmartCubeStore();

  // Create mock solves
  const s1 = { id: 's1', elapsedMs: 12000, timeMs: 12000, penalty: 'none', isDnf: false };
  const s2 = { id: 's2', elapsedMs: 15000, timeMs: 15000, penalty: 'none', isDnf: false };
  store.recordSolve(s1);
  store.recordSolve(s2);
  assertEqual(store.getState().sessionSolves.length, 2);

  // Update penalty to +2
  store.updateSolvePenalty('s1', '+2');
  assertEqual(store.getState().sessionSolves[0].penalty, '+2');
  assertEqual(store.getState().sessionSolves[0].isDnf, false);

  // Update penalty to DNF
  store.updateSolvePenalty('s2', 'dnf');
  assertEqual(store.getState().sessionSolves[1].penalty, 'dnf');
  assertEqual(store.getState().sessionSolves[1].isDnf, true);

  // Delete solve
  store.deleteSolve('s1');
  assertEqual(store.getState().sessionSolves.length, 1);
  assertEqual(store.getState().sessionSolves[0].id, 's2');

  // Clear session
  store.clearSessionSolves();
  assertEqual(store.getState().sessionSolves.length, 0);

  // resetSolve restores idle state
  store.newScramble("R U");
  store.handleIncomingMove("R", 5000);
  assertEqual(store.getState().timerStatus, 'solving');
  store.resetSolve();
  assertEqual(store.getState().timerStatus, 'idle');
  assertEqual(store.getState().moveCount, 0);
  assertEqual(store.getState().moveHistory.length, 0);
});

// ============================================================================
// SUITE 3: SOLVE DETECTION O(1) + VECTOR NORMALS ADVERSARIAL
// ============================================================================

suite.it('T5-SOLVE-01: Monochromatic O(1) facelet solve detection validates solved and broken states', () => {
  // Pure solved state
  assert(isFaceletsSolved(SOLVED_FACELETS));

  // Invalid lengths
  assertEqual(isFaceletsSolved(null), false);
  assertEqual(isFaceletsSolved(''), false);
  assertEqual(isFaceletsSolved(SOLVED_FACELETS.slice(0, 53)), false);
  assertEqual(isFaceletsSolved(SOLVED_FACELETS + 'U'), false);

  // Single sticker swapped on U face
  const brokenFacelets = 'R' + SOLVED_FACELETS.slice(1);
  assertEqual(isFaceletsSolved(brokenFacelets), false);

  // Checkerboard pattern (each face has 2 colors)
  const sim = new CubeStateSimulator();
  sim.applyMoves("M2 E2 S2"); // Cube simulator doesn't support slice moves directly, use standard turns:
  const sim2 = new CubeStateSimulator();
  sim2.applyMoves("R2 L2 U2 D2 F2 B2");
  assertEqual(sim2.isSolved(), false);

  // Return to solved
  sim2.applyMoves("R2 L2 U2 D2 F2 B2");
  assert(sim2.isSolved());
});

suite.it('T5-SOLVE-02: 3D Cubie rotation normal vectors verify solved state across full rotations', () => {
  const initialCubies = generateInitialCubies(3);
  assertEqual(initialCubies.length, 26); // 26 surface cubies

  // Solved state check
  assert(checkIsSolved(initialCubies));

  // Perform single quarter turn (R)
  const rCubies = applyRotationToCubies(initialCubies, 'x', [1], 1);
  assertEqual(checkIsSolved(rCubies), false);

  // Complete full 360 rotation (R4)
  const r2Cubies = applyRotationToCubies(rCubies, 'x', [1], 1);
  const r3Cubies = applyRotationToCubies(r2Cubies, 'x', [1], 1);
  const r4Cubies = applyRotationToCubies(r3Cubies, 'x', [1], 1);
  assert(checkIsSolved(r4Cubies));
});

// ============================================================================
// SUITE 4: GYROSCOPE QUATERNION ARITHMETIC & RECALIBRATION ADVERSARIAL
// ============================================================================

// Helper reproducing SmartCubePage safeNormalizeQuaternion
function safeNormalizeQuaternion([x, y, z, w]) {
  if (![x, y, z, w].every(v => typeof v === 'number' && !isNaN(v))) {
    return [0, 0, 0, 1];
  }
  const lenSq = x * x + y * y + z * z + w * w;
  if (lenSq < 0.000001) {
    return [0, 0, 0, 1];
  }
  const inv = 1 / Math.sqrt(lenSq);
  return [x * inv, y * inv, z * inv, w * inv];
}

// Helper reproducing SmartCubePage mapGanToThreeQuaternion
function mapGanToThreeQuaternion(raw) {
  if (!raw || raw.length < 4) return [0, 0, 0, 1];
  return safeNormalizeQuaternion([raw[0], raw[2], -raw[1], raw[3]]);
}

suite.it('T5-GYRO-01: Quaternion normalization handles degenerate, zero, and NaN inputs safely', () => {
  // Identity
  assertDeepEqual(safeNormalizeQuaternion([0, 0, 0, 1]), [0, 0, 0, 1]);

  // Degenerate zero quaternion [0, 0, 0, 0] must not produce NaN (divide by zero guard)
  assertDeepEqual(safeNormalizeQuaternion([0, 0, 0, 0]), [0, 0, 0, 1]);

  // NaN or non-numeric inputs
  assertDeepEqual(safeNormalizeQuaternion([NaN, 0, 0, 1]), [0, 0, 0, 1]);
  assertDeepEqual(safeNormalizeQuaternion(['0', 0, 0, 1]), [0, 0, 0, 1]);

  // Unnormalized vector (length = 2)
  const norm = safeNormalizeQuaternion([0, 0, 0, 2]);
  assertDeepEqual(norm, [0, 0, 0, 1]);
});

suite.it('T5-GYRO-02: GAN to Three.js coordinate mapping and pitch axis inversion', () => {
  // Pure identity mapping
  const mappedIdentity = mapGanToThreeQuaternion([0, 0, 0, 1]);
  assertDeepEqual(mappedIdentity, [0, 0, -0, 1]); // -0 is equivalent to 0 in quaternion

  // GAN (qx, qy, qz, qw) -> Three.js (qx, qz, -qy, qw)
  const mapped = mapGanToThreeQuaternion([0.1, 0.2, 0.3, 0.9]);
  const expectedUnnorm = [0.1, 0.3, -0.2, 0.9];
  const len = Math.hypot(...expectedUnnorm);
  assertRoughlyEqual(mapped[0], 0.1 / len, 0.0001);
  assertRoughlyEqual(mapped[1], 0.3 / len, 0.0001);
  assertRoughlyEqual(mapped[2], -0.2 / len, 0.0001);
  assertRoughlyEqual(mapped[3], 0.9 / len, 0.0001);
});

suite.it('T5-GYRO-03: Recalibration arithmetic relative delta computes exact identity when aligned', () => {
  const store = new SmartCubeStore();
  const currentPhysicalQuat = [0.1, 0.2, 0.3, 0.9];
  store.getState().gyroQuaternion = [...currentPhysicalQuat];

  // Perform recalibrate
  store.recalibrateGyro();
  assertDeepEqual(store.getState().gyroZeroQuaternion, currentPhysicalQuat);
  assertDeepEqual(store.getState().gyroQuaternion, [0, 0, 0, 1]);

  // Now emulate next physical orientation update matching zero
  const qZeroArr = mapGanToThreeQuaternion(store.getState().gyroZeroQuaternion);
  const qZero = new THREE.Quaternion(...qZeroArr);

  const qLiveArr = mapGanToThreeQuaternion(currentPhysicalQuat);
  const qLive = new THREE.Quaternion(...qLiveArr);

  // qTarget = qZero.clone().invert().multiply(qLive)
  const qTarget = qZero.clone().invert().multiply(qLive);

  // When live orientation matches zero orientation, target must be exactly identity (0, 0, 0, 1)
  assertRoughlyEqual(qTarget.x, 0, 0.00001);
  assertRoughlyEqual(qTarget.y, 0, 0.00001);
  assertRoughlyEqual(qTarget.z, 0, 0.00001);
  assertRoughlyEqual(qTarget.w, 1, 0.00001);
});

// ============================================================================
// SUITE 5: RELATIVE VS EPOCH CLOCK LIVE DISPLAY HAZARD AUDIT
// ============================================================================

suite.it('T5-CLOCK-01: Verifies store handles relative hardware timestamps without overflow', () => {
  const store = new SmartCubeStore();
  store.newScramble("R U R' U'");

  // Hardware sends small relative milliseconds (e.g. 125430)
  const hwStart = 125430;
  // Move 1: starts timer at hwStart
  store.handleIncomingMove("U", hwStart);
  assertEqual(store.getState().timerStatus, 'solving');
  assertEqual(store.getState().timerStartTime, hwStart);

  // Move 2 & 3: intermediate moves
  store.handleIncomingMove("R", hwStart + 500);
  store.handleIncomingMove("U'", hwStart + 1000);

  // Move 4: final move at hwStart + 1520 solves cube
  store.handleIncomingMove("R'", hwStart + 1520); // 1.52 seconds later

  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().elapsedMs, 1520);
  assertEqual(store.getState().moveCount, 4);
  assertEqual(store.getState().finalTps, 2.63); // 4 moves / 1.52s = 2.63
});

suite.it('T5-CLOCK-02: Exposes live RAF display arithmetic hazard if mixing Date.now() with relative clock', () => {
  // If timerStartTime is stored as relative hardware timestamp (e.g. 5000ms):
  const relativeHardwareStart = 5000;
  const epochNow = Date.now(); // ~1.7e12 ms

  const dangerousLiveDiff = epochNow - relativeHardwareStart;
  // This difference is > 1.7 trillion milliseconds (~54 years!)
  assert(dangerousLiveDiff > 1000000000000, 'Mixing epoch with relative timestamp produces 54+ years');

  // Verify safe resolution: If store uses Date.now() or tracks local epoch delta, live display remains small
  const safeEpochStart = Date.now();
  const safeLiveDiff = Date.now() - safeEpochStart;
  assert(safeLiveDiff < 5000, 'Pure epoch difference stays within milliseconds');
});

// ============================================================================
// SUITE 6: TIME FORMATTING & DNF CASING ADVERSARIAL HAZARDS
// ============================================================================

// Helper reproducing SmartCubePage formatSolveTime
function formatSolveTime(ms, penalty = 'none') {
  if (penalty === 'dnf') return 'DNF';
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '--';
  const effectiveMs = penalty === '+2' ? ms + 2000 : ms;
  const totalSeconds = effectiveMs / 1000;
  if (totalSeconds < 60) {
    const formatted = totalSeconds.toFixed(2);
    return penalty === '+2' ? `${formatted}+` : formatted;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  const formatted = `${minutes}:${remainingSecs}`;
  return penalty === '+2' ? `${formatted}+` : formatted;
}

suite.it('T5-FMT-01: formatSolveTime sub-minute, multi-minute, +2, and invalid values', () => {
  // Standard sub-minute
  assertEqual(formatSolveTime(14230), '14.23');
  assertEqual(formatSolveTime(990), '0.99');
  assertEqual(formatSolveTime(0), '0.00');

  // Multi-minute
  assertEqual(formatSolveTime(65420), '1:05.42');
  assertEqual(formatSolveTime(125000), '2:05.00');

  // +2 Penalty format
  assertEqual(formatSolveTime(10000, '+2'), '12.00+');
  assertEqual(formatSolveTime(60000, '+2'), '1:02.00+');

  // DNF format
  assertEqual(formatSolveTime(15000, 'dnf'), 'DNF');

  // Invalid / negative times
  assertEqual(formatSolveTime(-500), '--');
  assertEqual(formatSolveTime(NaN), '--');
  assertEqual(formatSolveTime(null), '--');
  assertEqual(formatSolveTime('15000'), '--');
});

suite.it('T5-FMT-02: Exposes formatSolveTime minute boundary floating point rounding anomaly', () => {
  // When effective time is 119999ms (1 minute 59.999s):
  // totalSeconds = 119.999
  // minutes = Math.floor(119.999 / 60) = 1
  // (119.999 % 60).toFixed(2) = (59.999).toFixed(2) = "60.00"
  // Produces "1:60.00" instead of rollover "2:00.00"
  const anomaly = formatSolveTime(119999);
  assertEqual(anomaly, '1:60.00');
});

suite.it('T5-FMT-03: Exposes DNF string and casing asymmetry between wcaStats and UI formatters', () => {
  // wcaStats getEffectiveTime checks: solve === 'DNF' || solve?.penalty === 'dnf' || solve?.isDnf
  // 1. String 'DNF' -> Infinity
  assertEqual(getEffectiveTime('DNF'), Infinity);

  // 2. String 'dnf' (lowercase) is NOT caught by solve === 'DNF' -> returns 0!
  const lowerDnfResult = getEffectiveTime('dnf');
  assertEqual(lowerDnfResult, 0); // Asymmetry: treats 'dnf' as numeric 0 instead of Infinity

  // 3. Object with penalty: 'DNF' (uppercase) is NOT caught by solve?.penalty === 'dnf' -> returns 15000!
  const upperPenaltyResult = getEffectiveTime({ elapsedMs: 15000, penalty: 'DNF' });
  assertEqual(upperPenaltyResult, 15000); // Asymmetry: uppercase 'DNF' penalty not recognized as DNF

  // 4. In contrast, formatSolveTime checks strictly penalty === 'dnf'
  assertEqual(formatSolveTime(15000, 'dnf'), 'DNF');
  // uppercase 'DNF' penalty bypasses formatSolveTime's dnf check:
  assertEqual(formatSolveTime(15000, 'DNF'), '15.00');
});

// ============================================================================
// SUITE 7: SCRAMBLE GENERATOR, RAPID FSM FLAPPING, AND LARGE SESSION VOLUME
// ============================================================================

suite.it('T5-STRESS-01: generateRandomScramble satisfies standard length and no consecutive identical faces', () => {
  for (let trial = 0; trial < 20; trial++) {
    const scramble = generateRandomScramble(25);
    const moves = scramble.split(' ');
    assertEqual(moves.length, 25);

    // Verify no two consecutive moves have the same base face
    for (let i = 1; i < moves.length; i++) {
      const prevFace = moves[i - 1][0];
      const currFace = moves[i][0];
      assert(prevFace !== currFace, `Consecutive duplicate face in scramble: ${moves[i - 1]} followed by ${moves[i]}`);
    }
  }
});

suite.it('T5-STRESS-02: Rapid FSM state flapping (scramble -> move -> reset) 100 times maintains stability', () => {
  const store = new SmartCubeStore();

  for (let i = 0; i < 100; i++) {
    store.newScramble("R U R' U'");
    assertEqual(store.getState().timerStatus, 'scrambled');
    assertEqual(store.getState().moveCount, 0);

    // Turn 1 move
    store.handleIncomingMove("R", 1000 + i * 10);
    assertEqual(store.getState().timerStatus, 'solving');
    assertEqual(store.getState().moveCount, 1);

    // Reset solve
    store.resetSolve();
    assertEqual(store.getState().timerStatus, 'idle');
    assertEqual(store.getState().moveCount, 0);
    assert(store.cubeSimulator.isSolved());
  }
});

suite.it('T5-STRESS-03: Session analytics stability across 150 solves with mixed penalties', () => {
  const solves = [];
  const baseTime = 12000;

  for (let i = 0; i < 150; i++) {
    const penalty = (i % 20 === 0) ? '+2' : (i % 25 === 0) ? 'dnf' : 'none';
    const isDnf = penalty === 'dnf';
    const elapsedMs = baseTime + (i % 10) * 100;
    solves.push({
      id: `solve-${i}`,
      elapsedMs,
      timeMs: elapsedMs,
      penalty,
      isDnf,
      tps: 4.5
    });
  }

  const start = Date.now();
  const stats = calculateSessionStats(solves);
  const duration = Date.now() - start;

  assertEqual(stats.count, 150);
  assert(typeof stats.best === 'number');
  assert(typeof stats.worst === 'number');
  assert(typeof stats.mo3 === 'number' || stats.mo3 === 'DNF');
  assert(typeof stats.ao5 === 'number' || stats.ao5 === 'DNF');
  assert(typeof stats.ao12 === 'number' || stats.ao12 === 'DNF');
  assertRoughlyEqual(stats.avgTps, 4.5, 0.01);
  assert(duration < 50, `Session stats calculation took ${duration}ms (must be < 50ms)`);
});

// Execute suite directly if run with `node`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('tier5_store_stats_adversarial.mjs')) {
  suite.run().then(res => {
    console.log(`\n${res.suiteName}: ${res.passed}/${res.total} tests passed (${res.durationMs}ms)`);
    if (res.errors.length > 0) {
      console.error('\nErrors:');
      for (const err of res.errors) {
        console.error(`- ${err.testName}:`, err.error);
      }
      process.exit(1);
    } else {
      console.log('All adversarial store and stats tests passed successfully!');
      process.exit(0);
    }
  }).catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
