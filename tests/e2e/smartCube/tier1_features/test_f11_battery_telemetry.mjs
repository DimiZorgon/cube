// tests/e2e/smartCube/tier1_features/test_f11_battery_telemetry.mjs
// F11: Battery Level Telemetry (5 tests)

import { createTestSuite, assertEqual } from '../helpers/testUtils.mjs';
import { VirtualGanCube, decodeGen4Packet } from '../mocks/virtualGanCube.mjs';
import { SpecGanBleDriver, SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F11: Battery Level Telemetry');

suite.it('F11-1: Decodes battery level percentage from opcode 0xEF', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeBatteryPacket(85);
  const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 85);
});

suite.it('F11-2: Clamps battery value to 100% when hardware reports overcharge', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeBatteryPacket(115);
  const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.batteryLevel, 100, 'Battery must be clamped to 100%');
});

suite.it('F11-3: Handles 0% empty battery telemetry', () => {
  const cube = new VirtualGanCube();
  const packet = cube.encodeBatteryPacket(0);
  const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.batteryLevel, 0);
});

suite.it('F11-4: Propagates battery level through driver callback to store', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 78 });
  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);

  await store.connect(cube.device);
  cube.emitBattery(78);

  assertEqual(store.getState().batteryLevel, 78);
});

suite.it('F11-5: Driver requestBattery sends 0xDD opcode and receives telemetry', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 92 });
  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);

  await store.connect(cube.device);
  await driver.requestBattery();

  assertEqual(store.getState().batteryLevel, 92);
});
