// tests/e2e/smartCube/challenger_m1_stress.mjs
// Adversarial Empirical Stress Test Suite for Milestone 1
// Validates:
// 1. Windows Chrome BLE GATT caching edge cases
// 2. Battery decoding edge cases, boundary values, corruption resilience, and no-NaN invariant
// 3. Post-connect pacing and concurrency resilience

import {
  createTestSuite,
  assert,
  assertEqual,
  assertThrows
} from './helpers/testUtils.mjs';

import {
  GanBleDriver,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN4_SERVICE,
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

export const suite = createTestSuite('Challenger M1: Adversarial Stress & Robustness Audit');

// Helper to construct a standard Gen4 mock device
function createStandardGen4Device(name = 'GAN16ui_DE40', serviceUuid = GAN_GEN4_SERVICE_ALIAS) {
  const dev = new MockBluetoothDevice('gan16ui-stress', name);
  const svc = new MockBluetoothRemoteGATTService(serviceUuid, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_COMMAND_CHARACTERISTIC,
    svc,
    { read: false, write: true, notify: false }
  );
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_STATE_CHARACTERISTIC,
    svc,
    { read: true, write: false, notify: true }
  );
  svc.addCharacteristic(cmdChar);
  svc.addCharacteristic(stateChar);
  dev.gatt.addService(svc);
  return { dev, svc, cmdChar, stateChar };
}

// ---------------------------------------------------------------------------
// SUITE A: Windows Chrome BLE GATT Caching Stress
// ---------------------------------------------------------------------------

suite.it('A1: Windows BLE retry succeeds when getPrimaryServices() returns [] on attempts 1-2, then resolves on attempt 3', async () => {
  const { dev, svc, cmdChar, stateChar } = createStandardGen4Device();
  let callCount = 0;

  // Simulate Windows GATT table build delay: returns [] twice, then resolves
  dev.gatt.getPrimaryServices = async () => {
    callCount++;
    if (callCount < 3) {
      return [];
    }
    return [svc];
  };

  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      bluetooth: {
        requestDevice: async () => dev
      }
    },
    configurable: true,
    writable: true
  });

  try {
    const driver = new GanBleDriver();
    // Connect without passing deviceInstance, simulating real browser hardware connection
    const info = await driver.connect();

    assertEqual(info.deviceName, 'GAN16ui_DE40');
    assertEqual(driver.protocolGen, 4);
    assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
    assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
    assert(callCount >= 2, `Should have retried multiple times before resolving (calls: ${callCount})`);

    driver.disconnect();
  } finally {
    if (originalNavigator !== undefined) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true
      });
    }
  }
});

suite.it('A2: Windows BLE recovers when getPrimaryServices() throws NetworkError before table is ready', async () => {
  const { dev, svc } = createStandardGen4Device();
  let callCount = 0;

  dev.gatt.getPrimaryServices = async () => {
    callCount++;
    if (callCount === 1) {
      throw new Error('NetworkError: GATT service discovery in progress');
    }
    return [svc];
  };

  const driver = new GanBleDriver();
  driver._isRealHardware = true;
  const info = await driver.connect(dev);

  assertEqual(info.deviceName, 'GAN16ui_DE40');
  assertEqual(driver.protocolGen, 4);

  driver.disconnect();
});

suite.it('A3: Windows BLE Fallback B works when getPrimaryServices() permanently returns []', async () => {
  const { dev, svc } = createStandardGen4Device();
  dev.gatt.getPrimaryServices = async () => [];

  const driver = new GanBleDriver();
  const info = await driver.connect(dev);

  assertEqual(info.deviceName, 'GAN16ui_DE40');
  assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());

  driver.disconnect();
});

suite.it('A4: Windows characteristic caching: getCharacteristics() returns [] but individual getCharacteristic() resolves', async () => {
  const { dev, svc } = createStandardGen4Device();
  dev.gatt.getPrimaryServices = async () => [];
  svc.getCharacteristics = async () => [];

  const driver = new GanBleDriver();
  await driver.connect(dev);

  assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar._notificationsActive, true);

  driver.disconnect();
});

suite.it('A5: Partial characteristic caching: getCharacteristics() returns only cmdChar, stateChar resolved individually', async () => {
  const { dev, svc, cmdChar } = createStandardGen4Device();
  dev.gatt.getPrimaryServices = async () => [svc];
  // getCharacteristics returns only cmdChar
  svc.getCharacteristics = async () => [cmdChar];

  const driver = new GanBleDriver();
  await driver.connect(dev);

  assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar._notificationsActive, true);

  driver.disconnect();
});

suite.it('A6: Command characteristic with writeWithoutResponse only (no write) executes sendCommand without error', async () => {
  const dev = new MockBluetoothDevice('gan16ui-nowrite', 'GAN16ui_DE40');
  const svc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE_ALIAS, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_COMMAND_CHARACTERISTIC,
    svc,
    { read: false, write: false, writeWithoutResponse: true, notify: false }
  );
  let writtenBytes = null;
  cmdChar.writeValueWithoutResponse = async (bytes) => { writtenBytes = bytes; };
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_STATE_CHARACTERISTIC,
    svc,
    { read: true, write: false, notify: true }
  );
  svc.addCharacteristic(cmdChar);
  svc.addCharacteristic(stateChar);
  dev.gatt.addService(svc);

  const driver = new GanBleDriver();
  await driver.connect(dev);

  const testPayload = new Uint8Array([0xDD, 0x04, 0x00, 0xEF]);
  await driver.sendCommand(testPayload);

  assert(writtenBytes !== null, 'Command must be written via writeValueWithoutResponse');
  assertEqual(writtenBytes[0], 0xDD);

  driver.disconnect();
});

suite.it('A7: Incompatible device throws descriptive NotFoundError with diagnostic guidance', async () => {
  const dev = new MockBluetoothDevice('unknown-gadget', 'CoffeeMaker');
  dev.gatt.getPrimaryServices = async () => [];

  const driver = new GanBleDriver();
  await assertThrows(async () => {
    await driver.connect(dev);
  }, /NotFoundError: No compatible GAN GATT service found on device CoffeeMaker/);
});

// ---------------------------------------------------------------------------
// SUITE B: Battery Telemetry Decoding & Robustness Stress
// ---------------------------------------------------------------------------

suite.it('B1: Truncated 1-byte 0xEF packet must not produce batteryLevel: NaN', () => {
  const p = new Uint8Array([0xEF]);
  const res = decodeGen4Packet(p);
  assert(!isNaN(res.batteryLevel), `1-byte 0xEF packet returned batteryLevel: NaN (got ${res.batteryLevel})`);
  assertEqual(typeof res.batteryLevel, 'number');
});

suite.it('B2: Truncated 2-byte 0xEF packet must not produce batteryLevel: NaN', () => {
  const p = new Uint8Array([0xEF, 0x07]);
  const res = decodeGen4Packet(p);
  assert(!isNaN(res.batteryLevel), `2-byte 0xEF packet returned batteryLevel: NaN (got ${res.batteryLevel})`);
  assertEqual(typeof res.batteryLevel, 'number');
});

suite.it('B3: Truncated 3-byte 0xDD echo packet [0xDD, 0x00, 0xEF] must not parse opcode 0xEF (239) as 100% battery', () => {
  const p = new Uint8Array([0xDD, 0x00, 0xEF]);
  const res = decodeGen4Packet(p);
  // The packet ends at 0xEF (marker) without a following battery byte.
  // Parsing 0xEF as battery level clamped to 100% is a critical parsing bug.
  assert(res.batteryLevel !== 100 || res.type === 'UNKNOWN', 'Must not interpret 0xEF marker as 100% battery level');
});

suite.it('B4: Multi-byte 0xEF packet with 0% battery at dataLen offset must decode as 0% (not fall through to 100%)', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0x07; // dataLen = 7
  buf[2] = 0xAA; // Non-zero payload byte
  buf[7] = 0;    // Actual battery level = 0%

  const res = decodeGen4Packet(buf);
  assertEqual(res.type, 'BATTERY');
  assertEqual(res.batteryLevel, 0, `Expected 0% battery, but got ${res.batteryLevel}% (likely fell through to byte 2)`);
});

suite.it('B5: Multi-byte 0xEF packet with 0% battery at 1 + dataLen offset must decode as 0% (not fall through to 100%)', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0x07; // dataLen = 7
  buf[2] = 0xAA; // Non-zero payload byte
  buf[8] = 0;    // Actual battery level = 0% at 1 + dataLen

  const res = decodeGen4Packet(buf);
  assertEqual(res.type, 'BATTERY');
  assertEqual(res.batteryLevel, 0, `Expected 0% battery, but got ${res.batteryLevel}% (likely fell through to byte 2)`);
});

suite.it('B6: 0xEF packet with offset 3 when byte 2 is 0 and level is 0% must decode as 0%', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0x01;
  buf[2] = 0x00;
  buf[3] = 0; // 0%

  const res = decodeGen4Packet(buf);
  assertEqual(res.type, 'BATTERY');
  assertEqual(res.batteryLevel, 0);
});

suite.it('B7: Boundary percentages (0%, 1%, 50%, 99%, 100%) on 0xDD echo packet decode accurately', () => {
  const boundaries = [0, 1, 50, 99, 100];
  for (const expected of boundaries) {
    const buf = new Uint8Array(20);
    buf[0] = 0xDD;
    buf[1] = 0x04;
    buf[2] = 0xEF;
    buf[3] = expected;

    const res = decodeGen4Packet(buf);
    assertEqual(res.type, 'BATTERY');
    assertEqual(res.batteryLevel, expected, `Failed for boundary ${expected}%`);
  }
});

suite.it('B8: Battery overflow values (>100% and 255) clamp strictly to 100%', () => {
  const overflows = [101, 150, 255];
  for (const raw of overflows) {
    const buf = new Uint8Array(20);
    buf[0] = 0xDD;
    buf[1] = 0x04;
    buf[2] = 0xEF;
    buf[3] = raw;

    const res = decodeGen4Packet(buf);
    assertEqual(res.type, 'BATTERY');
    assertEqual(res.batteryLevel, 100, `Failed to clamp overflow ${raw}`);
  }
});

suite.it('B9: Corrupted dataLen (e.g. dataLen = 255 exceeding packet buffer) handles safely without crash or NaN', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0xFF; // 255
  buf[2] = 50;

  const res = decodeGen4Packet(buf);
  assertEqual(res.type, 'BATTERY');
  assert(!isNaN(res.batteryLevel), 'Must not produce NaN');
  assertEqual(typeof res.batteryLevel, 'number');
});

suite.it('B10: Driver onBattery notification never injects NaN into store', () => {
  const store = new SmartCubeStore();
  store.driver.onBattery(NaN);
  assert(!isNaN(store.getState().batteryLevel), 'Store batteryLevel must never be NaN');
});

// ---------------------------------------------------------------------------
// SUITE C: Post-Connect Spacing & Concurrency Stress
// ---------------------------------------------------------------------------

suite.it('C1: Rapid disconnect during post-connect gap keeps store in disconnected state', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 75 });
  const store = new SmartCubeStore();

  const connectPromise = store.connect(cube.device, cube.macAddress);
  // Disconnect immediately while post-connect delays are executing
  await new Promise(r => setTimeout(r, 50));
  store.disconnect();

  try {
    await connectPromise;
  } catch {}

  assertEqual(store.getState().connectionStatus, 'disconnected', 'Status must remain disconnected after explicit disconnect');
  assertEqual(store.getState().deviceName, null);
  assertEqual(store.getState().batteryLevel, null);
});

suite.it('C2: Post-connect command spacing enforces minimum 80ms interval on all 3 commands', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 90 });
  const store = new SmartCubeStore();

  const timestamps = [];
  const orig = store.driver.sendCommand.bind(store.driver);
  store.driver.sendCommand = async (cmd) => {
    timestamps.push(Date.now());
    return orig(cmd);
  };

  await store.connect(cube.device, cube.macAddress);

  assertEqual(timestamps.length, 3, 'Must issue hardware, facelet, and battery commands');
  for (let i = 1; i < timestamps.length; i++) {
    const diff = timestamps[i] - timestamps[i - 1];
    assert(diff >= 80, `Interval between command ${i - 1} and ${i} was ${diff}ms, expected >= 80ms`);
  }

  store.disconnect();
});

// Standalone execution runner
if (process.argv[1]?.endsWith('challenger_m1_stress.mjs')) {
  suite.run().then(res => {
    console.log(`\n======================================================================`);
    console.log(`  ${res.suiteName}: ${res.passed}/${res.total} PASSED | ${res.failed} FAILED (${res.durationMs}ms)`);
    console.log(`======================================================================`);
    if (res.errors.length > 0) {
      console.log('\nFAILED TESTS:');
      for (const err of res.errors) {
        console.error(`  ✖ [${err.testName}]:`, err.error.message);
      }
    }
    process.exit(res.failed === 0 ? 0 : 1);
  });
}
