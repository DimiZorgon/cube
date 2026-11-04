// tests/e2e/smartCube/tier2_boundaries/boundary_f11_battery_extreme_values.mjs
// Boundary F11: Battery Level Out-of-Range and Edge Values (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { VirtualGanCube, decodeGen4Packet } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Boundary F11: Battery Extreme Values');

suite.it('B11-1: Handles exactly 100% full battery', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeBatteryPacket(100);
  const dec = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(dec.batteryLevel, 100);
});

suite.it('B11-2: Handles exactly 0% critical low battery', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeBatteryPacket(0);
  const dec = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(dec.batteryLevel, 0);
});

suite.it('B11-3: Clamps 255 (0xFF unsigned max) to 100%', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeBatteryPacket(255);
  const dec = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(dec.batteryLevel, 100);
});

suite.it('B11-4: Clamps negative battery values to 0%', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeBatteryPacket(-20);
  const dec = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(dec.batteryLevel, 0);
});

suite.it('B11-5: Low battery threshold helper flags warning below 15%', () => {
  function isLowBattery(level) {
    return level !== null && level <= 15;
  }
  assertEqual(isLowBattery(10), true);
  assertEqual(isLowBattery(15), true);
  assertEqual(isLowBattery(16), false);
  assertEqual(isLowBattery(null), false);
});
