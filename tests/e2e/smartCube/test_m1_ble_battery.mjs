// tests/e2e/smartCube/test_m1_ble_battery.mjs
// Milestone 1 Verification Suite: Windows Chrome BLE GATT Caching, Gen4 Resolution, and Battery Telemetry

import {
  createTestSuite,
  assert,
  assertEqual,
  assertThrows
} from './helpers/testUtils.mjs';

import {
  GanBleDriver,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC
} from '../../../src/utils/smartCube/ganBleDriver.js';

import {
  decodeGen4Packet
} from '../../../src/utils/smartCube/ganProtocol.js';

import {
  SmartCubeStore,
  POST_CONNECT_GAP_MS
} from '../../../src/store/useSmartCubeStore.js';

import {
  MockBluetoothDevice,
  MockBluetoothRemoteGATTService,
  MockBluetoothRemoteGATTCharacteristic
} from './mocks/mockWebBluetooth.mjs';

import { VirtualGanCube } from './mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Milestone 1: BLE GATT Discovery & Battery Telemetry');

// ---------------------------------------------------------------------------
// SUITE 1: Windows Chrome BLE GATT Caching & Empty getPrimaryServices()
// ---------------------------------------------------------------------------

suite.it('M1.1: Resolves Gen4 alias service and characteristics when getPrimaryServices() returns empty []', async () => {
  const dev = new MockBluetoothDevice('gan16ui-win-test', 'GAN16ui_DE40');

  // Real GAN 16 ui exposes 0000fff0-0000-1000-8000-00805f9b34fb
  const aliasSvc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE_ALIAS, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_COMMAND_CHARACTERISTIC,
    aliasSvc,
    { read: false, write: true, notify: false }
  );
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_STATE_CHARACTERISTIC,
    aliasSvc,
    { read: true, write: false, notify: true }
  );
  aliasSvc.addCharacteristic(cmdChar);
  aliasSvc.addCharacteristic(stateChar);
  dev.gatt.addService(aliasSvc);

  // Simulate Windows BLE GATT caching bug: getPrimaryServices() returns empty array []
  dev.gatt.getPrimaryServices = async () => [];

  const driver = new GanBleDriver();
  const info = await driver.connect(dev);

  assertEqual(info.deviceName, 'GAN16ui_DE40');
  assert(driver.commandChar !== null, 'Command characteristic must be resolved');
  assert(driver.stateChar !== null, 'State characteristic must be resolved');
  assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.protocolGen, 4, 'Protocol generation must be Gen4');
  assertEqual(driver.stateChar._notificationsActive, true, 'Notifications must be active');

  driver.disconnect();
});

suite.it('M1.2: Resolves characteristics when getCharacteristics() returns empty [] (Windows characteristic caching)', async () => {
  const dev = new MockBluetoothDevice('gan16ui-char-cache', 'GAN16ui_DE40');
  const aliasSvc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE_ALIAS, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_COMMAND_CHARACTERISTIC,
    aliasSvc,
    { read: false, write: true, notify: false }
  );
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_STATE_CHARACTERISTIC,
    aliasSvc,
    { read: true, write: false, notify: true }
  );
  aliasSvc.addCharacteristic(cmdChar);
  aliasSvc.addCharacteristic(stateChar);

  // Simulate Windows characteristic caching: getCharacteristics() returns []
  // but getCharacteristic(uuid) succeeds
  aliasSvc.getCharacteristics = async () => [];
  dev.gatt.addService(aliasSvc);
  dev.gatt.getPrimaryServices = async () => [];

  const driver = new GanBleDriver();
  await driver.connect(dev);

  assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar._notificationsActive, true);

  driver.disconnect();
});

suite.it('M1.3: Throws descriptive NotFoundError when device has no compatible GAN services', async () => {
  const dev = new MockBluetoothDevice('unrelated-device', 'SmartToaster');
  dev.gatt.getPrimaryServices = async () => [];

  const driver = new GanBleDriver();
  await assertThrows(async () => {
    await driver.connect(dev);
  }, /NotFoundError: No compatible GAN GATT service found on device SmartToaster/);
});

// ---------------------------------------------------------------------------
// SUITE 2: Gen4 Battery Telemetry Parsing (0xEF and 0xDD echo packets)
// ---------------------------------------------------------------------------

suite.it('M1.4: Parses battery from 0xDD echo packet with subType 0xEF at index 2', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xDD;
  buf[1] = 0x04;
  buf[2] = 0xEF;
  buf[3] = 82; // Battery level = 82%

  const decoded = decodeGen4Packet(buf);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 82);
});

suite.it('M1.5: Parses battery from 0xDD echo packet with subType 0xEF at index 3', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xDD;
  buf[1] = 0x04;
  buf[2] = 0x00;
  buf[3] = 0xEF;
  buf[4] = 64; // Battery level = 64%

  const decoded = decodeGen4Packet(buf);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 64);
});

suite.it('M1.6: Parses 0% critical low battery from 0xDD echo packet', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xDD;
  buf[1] = 0x04;
  buf[2] = 0xEF;
  buf[3] = 0; // Battery level = 0%

  const decoded = decodeGen4Packet(buf);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 0);
});

suite.it('M1.7: Parses battery from 0xEF packet with multi-byte payload at dataLen offset', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0x07; // dataLen = 7
  buf[7] = 76;   // Battery level at index 7

  const decoded = decodeGen4Packet(buf);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 76);
});

suite.it('M1.8: Parses battery from 0xEF packet with multi-byte payload at 1 + dataLen offset', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0x07; // dataLen = 7
  buf[8] = 91;   // Battery level at index 8 (1 + 7)

  const decoded = decodeGen4Packet(buf);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 91);
});

suite.it('M1.9: Parses battery from 0xEF packet with offset 3 when byte 2 is zero', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0x01;
  buf[2] = 0x00;
  buf[3] = 45; // Battery level = 45%

  const decoded = decodeGen4Packet(buf);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 45);
});

suite.it('M1.10: Clamps battery value exceeding 100% to 100% on 0xDD echo packet', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xDD;
  buf[1] = 0x04;
  buf[2] = 0xEF;
  buf[3] = 120; // 120% overflow

  const decoded = decodeGen4Packet(buf);
  assertEqual(decoded.type, 'BATTERY');
  assertEqual(decoded.batteryLevel, 100);
});

// ---------------------------------------------------------------------------
// SUITE 3: Post-Connect Command Spacing & End-to-End Battery Integration
// ---------------------------------------------------------------------------

suite.it('M1.11: POST_CONNECT_GAP_MS is configured to 120ms', () => {
  assertEqual(POST_CONNECT_GAP_MS, 120);
});

suite.it('M1.12: SmartCubeStore connects and spaces post-connect requests', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 88 });
  const store = new SmartCubeStore();

  const commandLog = [];
  const originalSendCommand = store.driver.sendCommand.bind(store.driver);
  store.driver.sendCommand = async (cmd) => {
    commandLog.push({ cmd: cmd[0], sub: cmd[3], time: Date.now() });
    return originalSendCommand(cmd);
  };

  const tStart = Date.now();
  await store.connect(cube.device, cube.macAddress);
  const totalDuration = Date.now() - tStart;

  // 2 gaps of 120ms = minimum ~240ms elapsed
  assert(totalDuration >= 200, `Connect sequence must be paced (took ${totalDuration}ms, expected >= 200ms)`);
  assertEqual(commandLog.length >= 3, true, 'Must execute hardware, facelet, and battery requests');

  // Verify intervals between consecutive commands are paced
  for (let i = 1; i < commandLog.length; i++) {
    const gap = commandLog[i].time - commandLog[i - 1].time;
    assert(gap >= 80, `Gap between cmd ${i - 1} and ${i} must be at least 80ms (got ${gap}ms)`);
  }

  // Verify state
  assertEqual(store.getState().connectionStatus, 'connected');
  assertEqual(store.getState().batteryLevel, 88);

  store.disconnect();
});

// Run standalone if executed directly
if (process.argv[1]?.endsWith('test_m1_ble_battery.mjs')) {
  suite.run().then(res => {
    console.log(`\n======================================================================`);
    console.log(`  ${res.suiteName}: ${res.passed}/${res.total} PASSED | ${res.failed} FAILED (${res.durationMs}ms)`);
    console.log(`======================================================================`);
    if (res.errors.length > 0) {
      for (const err of res.errors) {
        console.error(`  FAIL: ${err.testName}\n  `, err.error);
      }
    }
    process.exit(res.failed === 0 ? 0 : 1);
  });
}
