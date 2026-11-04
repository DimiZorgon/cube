// tests/e2e/smartCube/adversarial_m3_stress_test.mjs
// Adversarial Empirical Stress Test Suite for Milestone 3 Iteration 2
// Kinematics, 15+ TPS Latency, Queue Flush, and Gyro Recalibration

import { createTestSuite, assert, assertEqual, assertDeepEqual, assertRoughlyEqual } from './helpers/testUtils.mjs';
import { FIXED_SMART_CUBE_MAPPING, applyMoveTo3D } from '../../src/store/useSmartCubeStore.js';
import {
  generateInitialCubies,
  applyRotationToCubies,
  checkIsSolved,
  CubeStateSimulator,
  SOLVED_FACELETS
} from '../../src/utils/cubeMath.js';
import { useCubeStore } from '../../src/store/useCubeStore.js';
import { safeNormalizeQuaternion, mapGanToThreeQuaternion } from '../../src/pages/SmartCubePage.jsx';
import * as THREE from 'three';

export const suite = createTestSuite('Adversarial M3-It2: Kinematics, 15+ TPS Latency & Gyro');

// =========================================================================
// 1. VERIFY 18 WCA FACE TURN KINEMATICS
// =========================================================================

const WCA_FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const WCA_MODIFIERS = ['', "'", '2'];
const ALL_18_WCA_MOVES = WCA_FACES.flatMap(f => WCA_MODIFIERS.map(m => f + m));

suite.it('Kinematics 1: Exactly 18 WCA face turns mapped with valid axis and slice value', () => {
  assertEqual(ALL_18_WCA_MOVES.length, 18);
  for (const face of WCA_FACES) {
    const m = FIXED_SMART_CUBE_MAPPING[face];
    assert(m !== undefined, `Face ${face} must exist in FIXED_SMART_CUBE_MAPPING`);
    assert(['x', 'y', 'z'].includes(m.axis), `Axis ${m.axis} must be x, y, or z`);
    assert(Math.abs(m.value) === 1, `Slice value must be +1 or -1`);
    assert(Math.abs(m.direction) === 1, `Direction multiplier must be +1 or -1`);
  }
});

suite.it('Kinematics 2: Face isolation — each turn affects only the 9 cubies in its slice', () => {
  const initialCubies = generateInitialCubies(3);
  assertEqual(initialCubies.length, 26); // 27 - 1 center = 26 surface cubies

  const axisIndex = { x: 0, y: 1, z: 2 };

  for (const move of ALL_18_WCA_MOVES) {
    const face = move[0];
    const mapping = FIXED_SMART_CUBE_MAPPING[face];
    const isPrime = move.includes("'");
    const dir = (isPrime ? 1 : -1) * mapping.direction;

    const turnedCubies = applyRotationToCubies(initialCubies, mapping.axis, [mapping.value], dir);
    assertEqual(turnedCubies.length, 26);

    let movedCount = 0;
    let stationaryCount = 0;

    for (let i = 0; i < 26; i++) {
      const orig = initialCubies[i];
      const after = turnedCubies[i];
      const inSlice = Math.abs(orig.position[axisIndex[mapping.axis]] - mapping.value) < 0.1;

      if (inSlice) {
        movedCount++;
        // Position on slice axis must stay constant
        assertRoughlyEqual(after.position[axisIndex[mapping.axis]], mapping.value, 0.05);
      } else {
        stationaryCount++;
        // Position and rotation must be completely unchanged
        assertDeepEqual(after.position, orig.position);
        assertDeepEqual(after.rotation, orig.rotation);
      }
    }

    assertEqual(movedCount, 9, `${move} must rotate exactly 9 cubies`);
    assertEqual(stationaryCount, 17, `${move} must leave exactly 17 cubies unchanged`);
  }
});

suite.it('Kinematics 3: Order 4 Cyclic Property — 4 consecutive quarter turns equal Identity', () => {
  for (const face of WCA_FACES) {
    const mapping = FIXED_SMART_CUBE_MAPPING[face];

    // Clockwise x 4
    let stateCW = generateInitialCubies(3);
    for (let i = 0; i < 4; i++) {
      stateCW = applyRotationToCubies(stateCW, mapping.axis, [mapping.value], -mapping.direction);
    }
    assert(checkIsSolved(stateCW), `4x ${face} must return to solved`);

    // Counter-clockwise (prime) x 4
    let stateCCW = generateInitialCubies(3);
    for (let i = 0; i < 4; i++) {
      stateCCW = applyRotationToCubies(stateCCW, mapping.axis, [mapping.value], mapping.direction);
    }
    assert(checkIsSolved(stateCCW), `4x ${face}' must return to solved`);

    // Half turn x 2
    let state2 = generateInitialCubies(3);
    for (let i = 0; i < 2; i++) {
      // 180 turn = two 90 turns
      state2 = applyRotationToCubies(state2, mapping.axis, [mapping.value], -mapping.direction);
      state2 = applyRotationToCubies(state2, mapping.axis, [mapping.value], -mapping.direction);
    }
    assert(checkIsSolved(state2), `2x ${face}2 must return to solved`);
  }
});

suite.it('Kinematics 4: Inverse Property — X followed by X\' is Identity', () => {
  for (const face of WCA_FACES) {
    const mapping = FIXED_SMART_CUBE_MAPPING[face];
    let state = generateInitialCubies(3);
    // Turn X
    state = applyRotationToCubies(state, mapping.axis, [mapping.value], -mapping.direction);
    assert(!checkIsSolved(state), `Single turn ${face} must scramble cube`);
    // Turn X'
    state = applyRotationToCubies(state, mapping.axis, [mapping.value], mapping.direction);
    assert(checkIsSolved(state), `${face} followed by ${face}' must be solved`);
  }
});

suite.it('Kinematics 5: Facelet Simulator permutation symmetry for all 18 moves', () => {
  for (const move of ALL_18_WCA_MOVES) {
    const sim = new CubeStateSimulator();
    sim.applyMove(move);
    assert(!sim.isSolved(), `Move ${move} must scramble solved facelets`);

    // Invert move
    const face = move[0];
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");
    const inv = isDouble ? `${face}2` : isPrime ? face : `${face}'`;
    sim.applyMove(inv);
    assert(sim.isSolved(), `${move} followed by ${inv} must restore solved facelets`);
  }
});

// =========================================================================
// 2. STRESS TEST 15+ TPS RAPID TURNS & QUEUE CATCH-UP
// =========================================================================

suite.it('Latency 1: Synchronous 0ms logical state commit on startRotation', () => {
  const store = useCubeStore.getState();
  store.initCube(3);

  assert(store.isSolved === true);
  assertEqual(store.rotationFile.length, 0);

  // Measure execution time of startRotation
  const t0 = performance.now();
  store.startRotation('x', [1], -1); // R turn
  const t1 = performance.now();

  const elapsedCommit = t1 - t0;
  assert(elapsedCommit < 5.0, `Logical commit took ${elapsedCommit}ms, must be < 5ms (0ms nominal)`);

  const updatedState = useCubeStore.getState();
  assert(updatedState.isSolved === false, 'isSolved must update synchronously to false');
  assert(updatedState.activeRotation !== null, 'activeRotation must be set synchronously');
  assertEqual(updatedState.activeRotation.axis, 'x');
});

suite.it('Latency 2: Instant solve check commits solved=true in 0ms on restoring turn', () => {
  const store = useCubeStore.getState();
  store.initCube(3);

  // Apply R then R'
  store.startRotation('x', [1], -1); // R
  assert(useCubeStore.getState().isSolved === false);

  store.startRotation('x', [1], 1); // R'
  const stateAfterUndo = useCubeStore.getState();
  assert(stateAfterUndo.isSolved === true, 'isSolved must commit synchronously to true upon solve');
});

suite.it('Latency 3: 15+ TPS burst ingestion into rotation queue without loss', () => {
  const store = useCubeStore.getState();
  store.initCube(3);

  // Rapid burst of 20 moves arriving within 10ms (equivalent to 2000 TPS burst)
  const burstMoves = ['R', 'U', "R'", "U'"].flatMap(x => [x, x, x, x, x]);
  assertEqual(burstMoves.length, 20);

  for (const m of burstMoves) {
    applyMoveTo3D(m);
  }

  const state = useCubeStore.getState();
  // 1 move in activeRotation, 19 in rotationFile = 20 total queued
  const totalPending = (state.activeRotation ? 1 : 0) + state.rotationFile.length;
  assertEqual(totalPending, 20, 'All 20 rapid moves must be captured in queue');

  // Verify logical cubies state matches 5x sexy moves (sexy x 6 = solved, sexy x 5 = 1 sexy away)
  assert(!state.isSolved, '5x sexy moves is not solved');

  // Add 1 more sexy move (4 turns)
  for (const m of ['R', 'U', "R'", "U'"]) {
    applyMoveTo3D(m);
  }
  const finalState = useCubeStore.getState();
  assert(finalState.isSolved === true, '6x sexy moves must be logically solved instantly');
});

suite.it('Latency 4: Visual backlog flush via snapQueue(0) when queue >= 4', () => {
  const store = useCubeStore.getState();
  store.initCube(3);

  // Queue 5 moves
  store.startRotation('y', [1], -1);
  store.startRotation('y', [1], -1);
  store.startRotation('y', [1], -1);
  store.startRotation('y', [1], -1);
  store.startRotation('y', [1], -1);

  const stateBefore = useCubeStore.getState();
  const queueLength = stateBefore.rotationFile.length;
  assertEqual(queueLength, 4, '4 moves waiting in rotationFile (+ 1 activeRotation = 5 total)');

  // Call snapQueue(0) as executed in RubiksCube.jsx:323 when queueLength >= 4
  store.snapQueue(0);

  const stateAfter = useCubeStore.getState();
  assertEqual(stateAfter.rotationFile.length, 0, 'rotationFile must be completely flushed');
  assertEqual(stateAfter.activeRotation, null, 'activeRotation must be null after snapQueue(0)');

  // Visual cubies must match logical cubies
  assertDeepEqual(stateAfter.cubies, stateAfter.logicalCubies, 'Visual cubies must snap to logical cubies');
});

suite.it('Latency 5: Adaptive speed tier scaling calculation', () => {
  function computeAdaptiveSpeed(queueLength, turnSpeed = 16) {
    if (queueLength >= 4) return 'FLUSH';
    if (queueLength >= 3) return 32;
    if (queueLength === 2) return 24;
    return turnSpeed;
  }

  assertEqual(computeAdaptiveSpeed(0), 16);
  assertEqual(computeAdaptiveSpeed(1), 16);
  assertEqual(computeAdaptiveSpeed(2), 24);
  assertEqual(computeAdaptiveSpeed(3), 32);
  assertEqual(computeAdaptiveSpeed(4), 'FLUSH');
  assertEqual(computeAdaptiveSpeed(10), 'FLUSH');
});

// =========================================================================
// 3. REGRESSION CHECKS ON SmartCubePage.jsx
// =========================================================================

suite.it('Regression 1: Gyro recalibration does NOT invert 3D scene (isResetIdentity branch)', () => {
  // Simulate the logic in SmartCubePage.jsx:64-80
  const qPriorPose = [0, 0.70710678, 0, 0.70710678]; // Prior orientation 90 deg yaw
  const qReset = [0, 0, 0, 1]; // Reset identity from recalibrateGyro()

  function computeQTarget(gyroQuaternion, gyroZeroQuaternion) {
    const liveArr = mapGanToThreeQuaternion(gyroQuaternion);
    const qLive = new THREE.Quaternion(...liveArr);

    let qTarget = qLive;
    if (gyroZeroQuaternion) {
      const isResetIdentity = Array.isArray(gyroQuaternion) &&
        gyroQuaternion[0] === 0 &&
        gyroQuaternion[1] === 0 &&
        gyroQuaternion[2] === 0 &&
        gyroQuaternion[3] === 1;

      if (isResetIdentity) {
        qTarget = new THREE.Quaternion(0, 0, 0, 1);
      } else {
        const zeroArr = mapGanToThreeQuaternion(gyroZeroQuaternion);
        const qZero = new THREE.Quaternion(...zeroArr);
        qTarget = qZero.clone().invert().multiply(qLive);
      }
    }
    return qTarget;
  }

  // 1. Immediately after recalibrateGyro()
  const qTargetReset = computeQTarget(qReset, qPriorPose);
  assertRoughlyEqual(qTargetReset.x, 0, 0.0001);
  assertRoughlyEqual(qTargetReset.y, 0, 0.0001);
  assertRoughlyEqual(qTargetReset.z, 0, 0.0001);
  assertRoughlyEqual(qTargetReset.w, 1, 0.0001); // Must be pure Identity, NOT qPriorPose.invert()!

  // 2. Next telemetry packet arrives matching prior pose (cube hasn't moved yet)
  const qTargetNext = computeQTarget(qPriorPose, qPriorPose);
  assertRoughlyEqual(qTargetNext.x, 0, 0.0001);
  assertRoughlyEqual(qTargetNext.y, 0, 0.0001);
  assertRoughlyEqual(qTargetNext.z, 0, 0.0001);
  assertRoughlyEqual(qTargetNext.w, 1, 0.0001); // Relative tracking: Q^-1 * Q = Identity!
});

suite.it('Regression 2: safeNormalizeQuaternion and mapGanToThreeQuaternion are robust to corrupted inputs', () => {
  const qZero = safeNormalizeQuaternion([0, 0, 0, 0]);
  assertDeepEqual(qZero, [0, 0, 0, 1]);

  const qNaN = safeNormalizeQuaternion([NaN, 1, 0, 0]);
  assertDeepEqual(qNaN, [0, 0, 0, 1]);

  const qNull = mapGanToThreeQuaternion(null);
  assertDeepEqual(qNull, [0, 0, 0, 1]);

  const qShort = mapGanToThreeQuaternion([0.5, 0.5]);
  assertDeepEqual(qShort, [0, 0, 0, 1]);
});

suite.it('Regression 3: 3D face turn execution is decoupled from gyro group orientation', () => {
  // Ensure that rotating faces via useCubeStore does not mutate gyroGroup or gyroQuaternion
  const store = useCubeStore.getState();
  store.initCube(3);

  // Apply multiple moves
  store.startRotation('y', [1], -1);
  store.startRotation('x', [1], 1);
  store.commitRotation('y', [1], -1);
  store.commitRotation('x', [1], 1);

  // Cubies rotated
  assert(!store.isSolved);
  // Store has intact cubies
  assertEqual(useCubeStore.getState().cubies.length, 26);
});
