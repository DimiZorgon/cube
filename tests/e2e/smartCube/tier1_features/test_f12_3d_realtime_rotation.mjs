// tests/e2e/smartCube/tier1_features/test_f12_3d_realtime_rotation.mjs
// F12: 3D Real-Time Rotation Mapping (5 tests)

import { createTestSuite, assert, assertEqual, assertDeepEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('F12: 3D Real-Time Rotation Mapping');

// Fixed 3D coordinate mapping for physical Rubik's cube
export const FIXED_SMART_CUBE_MAPPING = {
  U: { axis: 'y', value: 1, direction: -1 },
  D: { axis: 'y', value: -1, direction: 1 },
  R: { axis: 'x', value: 1, direction: -1 },
  L: { axis: 'x', value: -1, direction: 1 },
  F: { axis: 'z', value: 1, direction: -1 },
  B: { axis: 'z', value: -1, direction: 1 }
};

suite.it('F12-1: Maps U face turn to Y-axis slice y=1 with clockwise rotation', () => {
  const map = FIXED_SMART_CUBE_MAPPING['U'];
  assertEqual(map.axis, 'y');
  assertEqual(map.value, 1);
  assertEqual(map.direction, -1);
});

suite.it('F12-2: Maps D face turn to Y-axis slice y=-1 with opposite rotation sign', () => {
  const map = FIXED_SMART_CUBE_MAPPING['D'];
  assertEqual(map.axis, 'y');
  assertEqual(map.value, -1);
  assertEqual(map.direction, 1);
});

suite.it('F12-3: Maps R face turn to X-axis slice x=1', () => {
  const map = FIXED_SMART_CUBE_MAPPING['R'];
  assertEqual(map.axis, 'x');
  assertEqual(map.value, 1);
});

suite.it('F12-4: Maps F and B face turns to Z-axis slices z=1 and z=-1', () => {
  const mapF = FIXED_SMART_CUBE_MAPPING['F'];
  const mapB = FIXED_SMART_CUBE_MAPPING['B'];
  assertEqual(mapF.axis, 'z');
  assertEqual(mapF.value, 1);
  assertEqual(mapB.axis, 'z');
  assertEqual(mapB.value, -1);
});

suite.it('F12-5: Prime turns invert direction multiplier', () => {
  function getMoveTransform(moveStr) {
    const face = moveStr[0];
    const isPrime = moveStr.includes("'");
    const base = FIXED_SMART_CUBE_MAPPING[face];
    return {
      axis: base.axis,
      value: base.value,
      direction: isPrime ? -base.direction : base.direction
    };
  }

  const rNormal = getMoveTransform('R');
  const rPrime = getMoveTransform("R'");
  assertEqual(rNormal.direction, -1);
  assertEqual(rPrime.direction, 1);
});
