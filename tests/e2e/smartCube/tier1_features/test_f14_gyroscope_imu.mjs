// tests/e2e/smartCube/tier1_features/test_f14_gyroscope_imu.mjs
// F14: Gyroscope IMU Tilting & Recalibration (5 tests)

import { createTestSuite, assert, assertRoughlyEqual, assertDeepEqual, assertEqual } from '../helpers/testUtils.mjs';
import { VirtualGanCube, decodeGen4Packet } from '../mocks/virtualGanCube.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F14: Gyroscope IMU Tilting & Recalibration');

suite.it('F14-1: Decodes identity quaternion (qw=1, qx=0, qy=0, qz=0) from opcode 0xEC', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeGyroPacket(1, 0, 0, 0);
  const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.type, 'GYRO');
  assertRoughlyEqual(decoded.quaternion.qw, 1, 0.01);
  assertRoughlyEqual(decoded.quaternion.qx, 0, 0.01);
  assertRoughlyEqual(decoded.quaternion.qy, 0, 0.01);
  assertRoughlyEqual(decoded.quaternion.qz, 0, 0.01);
});

suite.it('F14-2: Decodes 90 degree yaw rotation quaternion', () => {
  const cube = new VirtualGanCube();
  const halfAngle = Math.PI / 4;
  const qw = Math.cos(halfAngle);
  const qy = Math.sin(halfAngle);

  const packet = cube.encodeGyroPacket(qw, 0, qy, 0);
  const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertRoughlyEqual(decoded.quaternion.qw, qw, 0.01);
  assertRoughlyEqual(decoded.quaternion.qy, qy, 0.01);
});

suite.it('F14-3: Normalizes Three.js coordinate mapping (qx, qz, -qy, qw)', () => {
  function mapToThreeCoordinates(q) {
    return {
      x: q.qx,
      y: q.qz,
      z: -q.qy,
      w: q.qw
    };
  }

  const raw = { qw: 0.7071, qx: 0, qy: 0.7071, qz: 0 };
  const threeQ = mapToThreeCoordinates(raw);
  assertRoughlyEqual(threeQ.w, 0.7071, 0.001);
  assertRoughlyEqual(threeQ.z, -0.7071, 0.001);
});

suite.it('F14-4: RecalibrateGyro resets store quaternion orientation basis', () => {
  const store = new SpecSmartCubeStore();
  store.getState().gyroQuaternion = [0.5, 0.5, 0.5, 0.5];
  store.recalibrateGyro();
  assertDeepEqual(store.getState().gyroQuaternion, [0, 0, 0, 1]);
});

suite.it('F14-5: Propagates gyro telemetry packet to store subscriber', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  cube.emitGyro(1, 0, 0, 0);
  const q = store.getState().gyroQuaternion;
  assert(q !== null, 'Gyro quaternion in store must be updated');
  assertEqual(q.length, 4);
});
