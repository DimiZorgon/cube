// tests/e2e/smartCube/tier2_boundaries/boundary_f14_gyro_gimbal_extremes.mjs
// Boundary F14: Extreme Gyro Quaternions & Degenerate Orientations (5 tests)

import { createTestSuite, assert, assertEqual, assertRoughlyEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('Boundary F14: Gyro Gimbal Extremes');

function safeNormalizeQuaternion([x, y, z, w]) {
  if ([x, y, z, w].some(v => typeof v !== 'number' || isNaN(v))) {
    return [0, 0, 0, 1]; // fallback identity
  }
  const lenSq = x * x + y * y + z * z + w * w;
  if (lenSq < 0.000001) {
    return [0, 0, 0, 1];
  }
  const invLen = 1 / Math.sqrt(lenSq);
  return [x * invLen, y * invLen, z * invLen, w * invLen];
}

suite.it('B14-1: Zero-magnitude quaternion [0,0,0,0] falls back safely to identity', () => {
  const norm = safeNormalizeQuaternion([0, 0, 0, 0]);
  assertEqual(norm[0], 0);
  assertEqual(norm[1], 0);
  assertEqual(norm[2], 0);
  assertEqual(norm[3], 1);
});

suite.it('B14-2: Quaternion containing NaN coordinates falls back safely to identity', () => {
  const norm = safeNormalizeQuaternion([NaN, 0, 0, 1]);
  assertEqual(norm[0], 0);
  assertEqual(norm[3], 1);
});

suite.it('B14-3: 180-degree roll orientation (x=1, w=0) normalizes without division errors', () => {
  const norm = safeNormalizeQuaternion([1, 0, 0, 0]);
  assertRoughlyEqual(norm[0], 1, 0.001);
  assertRoughlyEqual(norm[3], 0, 0.001);
});

suite.it('B14-4: Negative identity quaternion [0, 0, 0, -1] represents same spatial orientation', () => {
  const norm = safeNormalizeQuaternion([0, 0, 0, -1]);
  assertRoughlyEqual(norm[3], -1, 0.001);
});

suite.it('B14-5: High-speed spinning quaternion sequence retains unit length', () => {
  let angle = 0;
  for (let i = 0; i < 36; i++) {
    angle += 0.1;
    const raw = [Math.sin(angle), 0, Math.cos(angle), 0];
    const norm = safeNormalizeQuaternion(raw);
    const len = Math.sqrt(norm[0] ** 2 + norm[1] ** 2 + norm[2] ** 2 + norm[3] ** 2);
    assertRoughlyEqual(len, 1.0, 0.001);
  }
});
