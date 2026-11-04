// tests/e2e/smartCube/test_m1_challenger2_stress.mjs
// Challenger 2 Stress Test Suite: Gen4 GATT Service & Characteristic Resolution & Rapid Reconnects

import {
  createTestSuite,
  assert,
  assertEqual
} from './helpers/testUtils.mjs';

import {
  GanBleDriver,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN4_SERVICE,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC
} from '../../../src/utils/smartCube/ganBleDriver.js';

import {
  SmartCubeStore
} from '../../../src/store/useSmartCubeStore.js';

import {
  MockBluetoothDevice,
  MockBluetoothRemoteGATTService,
  MockBluetoothRemoteGATTCharacteristic
} from './mocks/mockWebBluetooth.mjs';

import { VirtualGanCube } from './mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Challenger M1-2: Gen4 GATT Resolution & Rapid Reconnects Stress Suite');

// Global unhandled rejection / uncaught exception tracker for empirical verification
const capturedRejections = [];
const capturedExceptions = [];

process.on('unhandledRejection', (reason) => {
  capturedRejections.push(reason);
});

process.on('uncaughtException', (err) => {
  capturedExceptions.push(err);
});

// ---------------------------------------------------------------------------
// SUITE 1: Gen4 Service & Characteristic Sequential Fallback Resolution
// ---------------------------------------------------------------------------

suite.it('C2.1: Resolves Gen4 alias service and fff5/fff6 when getPrimaryServices() and getCharacteristics() return []', async () => {
  const dev = new MockBluetoothDevice('gan16-stress-1', 'GAN16ui_DE40');

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

  // Strict Windows BLE GATT caching:
  // getPrimaryServices() returns []
  dev.gatt.getPrimaryServices = async () => [];
  // svc.getCharacteristics() returns []
  aliasSvc.getCharacteristics = async () => [];

  const driver = new GanBleDriver();
  let receivedMoves = [];
  let receivedBatteries = [];
  driver.onMove = (m) => receivedMoves.push(m);
  driver.onBattery = (b) => receivedBatteries.push(b);

  const info = await driver.connect(dev);

  assertEqual(info.deviceName, 'GAN16ui_DE40');
  assert(driver.commandChar !== null, 'Command characteristic must be bound');
  assert(driver.stateChar !== null, 'State characteristic must be bound');
  assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.protocolGen, 4, 'Protocol generation must be Gen4');
  assertEqual(driver.stateChar._notificationsActive, true, 'Notifications must be active');

  // Verify notifications actually reach driver callbacks
  // Real Gen4 hardware encrypts all notifications with AES-128-CBC
  const { deriveKeyAndIv, encryptGen4Packet } = await import('./mocks/virtualGanCube.mjs');
  const { key, iv } = deriveKeyAndIv(driver.macAddress);

  // Simulated battery packet: 0xDD 0x04 0xEF 0x4D (77%)
  const batBuf = new Uint8Array(20);
  batBuf[0] = 0xDD;
  batBuf[1] = 0x04;
  batBuf[2] = 0xEF;
  batBuf[3] = 77;
  const encryptedBat = encryptGen4Packet(batBuf, key, iv);
  stateChar.emitValueNotification(encryptedBat);

  assertEqual(receivedBatteries.length, 1);
  assertEqual(receivedBatteries[0], 77);

  driver.disconnect();
  assertEqual(driver.server, null);
  assertEqual(driver.commandChar, null);
  assertEqual(driver.stateChar, null);
});

suite.it('C2.2: Sequential service candidate fallback when prior candidates throw NotFoundError', async () => {
  // Device only responds to candidate GAN_GEN4_SERVICE ('00000010-0000-fff7-fff6-fff5fff4fff0')
  // while GAN_GEN4_SERVICE_ALIAS ('0000fff0-...') throws NotFoundError
  const dev = new MockBluetoothDevice('gan16-stress-fallback', 'GAN16ui_DE40');
  const gen4Svc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(
    '0000fff5-0000-1000-8000-00805f9b34fb',
    gen4Svc,
    { read: false, write: true, notify: false }
  );
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(
    '0000fff6-0000-1000-8000-00805f9b34fb',
    gen4Svc,
    { read: true, write: false, notify: true }
  );
  gen4Svc.addCharacteristic(cmdChar);
  gen4Svc.addCharacteristic(stateChar);
  gen4Svc.getCharacteristics = async () => []; // Empty characteristics array

  dev.gatt.addService(gen4Svc);
  dev.gatt.getPrimaryServices = async () => [];

  // Mock getPrimaryService so that GAN_GEN4_SERVICE_ALIAS throws NotFoundError
  const origGetPrimaryService = dev.gatt.getPrimaryService.bind(dev.gatt);
  dev.gatt.getPrimaryService = async (uuid) => {
    if (uuid.toLowerCase() === GAN_GEN4_SERVICE_ALIAS.toLowerCase()) {
      throw new Error(`NotFoundError: Service ${uuid} not found`);
    }
    return origGetPrimaryService(uuid);
  };

  const driver = new GanBleDriver();
  const info = await driver.connect(dev);

  assertEqual(info.deviceName, 'GAN16ui_DE40');
  assertEqual(driver.protocolGen, 4);
  assert(driver.commandChar !== null);
  assert(driver.stateChar !== null);
  assertEqual(driver.stateChar._notificationsActive, true);

  driver.disconnect();
});

suite.it('C2.3: Sequential characteristic candidate fallback when candidate 1 throws NotFoundError', async () => {
  const dev = new MockBluetoothDevice('gan16-char-fallback', 'GAN16ui_DE40');
  const aliasSvc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE_ALIAS, dev);

  // Characteristic only responds to short 16-bit UUID 'fff5' and 'fff6'
  // while 128-bit full UUID throws NotFoundError
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(
    'fff5',
    aliasSvc,
    { read: false, write: true, notify: false }
  );
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(
    'fff6',
    aliasSvc,
    { read: true, write: false, notify: true }
  );
  aliasSvc.addCharacteristic(cmdChar);
  aliasSvc.addCharacteristic(stateChar);
  aliasSvc.getCharacteristics = async () => [];

  dev.gatt.addService(aliasSvc);
  dev.gatt.getPrimaryServices = async () => [];

  const driver = new GanBleDriver();
  await driver.connect(dev);

  assert(driver.commandChar !== null, 'fff5 must resolve via candidate query');
  assert(driver.stateChar !== null, 'fff6 must resolve via candidate query');
  assertEqual(driver.stateChar._notificationsActive, true);

  driver.disconnect();
});

// ---------------------------------------------------------------------------
// SUITE 2: Rapid Connect/Disconnect Stress & Lifecycle Leak Verification
// ---------------------------------------------------------------------------

suite.it('C2.4: 150 rapid connect/disconnect cycles on GanBleDriver with 0 listener leaks', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();

  const CYCLES = 150;
  for (let i = 0; i < CYCLES; i++) {
    await driver.connect(cube.device);

    const devListenersConn = cube.device._listeners.get('gattserverdisconnected');
    const stateListenersConn = cube.stateChar._listeners.get('characteristicvaluechanged');

    assertEqual(devListenersConn?.size, 1, `Cycle ${i}: gattserverdisconnected must have exactly 1 listener`);
    assertEqual(stateListenersConn?.size, 1, `Cycle ${i}: characteristicvaluechanged must have exactly 1 listener`);

    driver.disconnect();

    const devListenersDisc = cube.device._listeners.get('gattserverdisconnected');
    const stateListenersDisc = cube.stateChar._listeners.get('characteristicvaluechanged');

    assertEqual(devListenersDisc?.size || 0, 0, `Cycle ${i}: gattserverdisconnected must be cleaned up`);
    assertEqual(stateListenersDisc?.size || 0, 0, `Cycle ${i}: characteristicvaluechanged must be cleaned up`);
  }
});

suite.it('C2.5: Rapid connect and disconnect cycles do not trigger unhandled rejections or leak state', async () => {
  const dev = new MockBluetoothDevice('gan16-abort-test', 'GAN16ui_DE40');
  const aliasSvc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE_ALIAS, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC, aliasSvc);
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_STATE_CHARACTERISTIC, aliasSvc);
  aliasSvc.addCharacteristic(cmdChar);
  aliasSvc.addCharacteristic(stateChar);
  dev.gatt.addService(aliasSvc);

  const driver = new GanBleDriver();

  for (let i = 0; i < 20; i++) {
    await driver.connect(dev);
    driver.disconnect();
    assertEqual(driver.server, null);
    assertEqual(driver.stateChar, null);
    assertEqual(driver.commandChar, null);
  }

  // Verify driver can cleanly connect afterwards
  await driver.connect(dev);
  assertEqual(driver.stateChar._notificationsActive, true);
  driver.disconnect();
});

suite.it('C2.6: SmartCubeStore 50 rapid connect/disconnect cycles during post-connect gap pacing', async () => {
  const cube = new VirtualGanCube();
  const store = new SmartCubeStore();

  const CYCLES = 50;
  for (let i = 0; i < CYCLES; i++) {
    // Start connect
    const p = store.connect(cube.device, cube.macAddress);

    // Random small delay between 5ms and 30ms (during post-connect pacing)
    const delayMs = 5 + (i % 25);
    await new Promise(r => setTimeout(r, delayMs));

    // Abruptly disconnect while pacing commands are in-flight
    store.disconnect();

    try {
      await p;
    } catch {
      // Disconnect may cause rejected writes, expected
    }

    assertEqual(store.getState().connectionStatus, 'disconnected');
  }

  // After 50 abortive cycles, perform a full stable connect and verify integrity
  await store.connect(cube.device, cube.macAddress);
  assertEqual(store.getState().connectionStatus, 'connected');
  assertEqual(store.getState().batteryLevel, 98);

  store.disconnect();
  assertEqual(store.getState().connectionStatus, 'disconnected');
});

suite.it('C2.7: High-frequency command write flooding during sudden disconnect does not lock writeQueue', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();
  await driver.connect(cube.device);

  const writes = [];
  const dummyPayload = new Uint8Array(20);
  dummyPayload[0] = 0xDD;

  // Enqueue 30 rapid writes
  for (let i = 0; i < 30; i++) {
    writes.push(driver.sendCommand(dummyPayload).catch(err => err));
  }

  // Sudden disconnect mid-flight
  cube.device.gatt.disconnect();

  const results = await Promise.all(writes);
  // Writes after disconnect should either complete or return NetworkError
  assert(results.length === 30);

  driver.disconnect();

  // Reconnect and verify write queue accepts and executes new writes cleanly
  await driver.connect(cube.device);
  let writeExecuted = false;
  cube.commandChar.setWriteHandler(async () => {
    writeExecuted = true;
  });

  await driver.sendCommand(dummyPayload);
  assertEqual(writeExecuted, true, 'Write queue must remain functional after disconnect flood');

  driver.disconnect();
});

suite.it('C2.8: Empirical watchdog: 0 unhandled rejections and 0 uncaught exceptions recorded', () => {
  assertEqual(capturedRejections.length, 0, `Expected 0 unhandled rejections, got ${capturedRejections.length}: ${capturedRejections.map(r => r?.stack || String(r)).join('; ')}`);
  assertEqual(capturedExceptions.length, 0, `Expected 0 uncaught exceptions, got ${capturedExceptions.length}`);
});

// Run standalone if executed directly
if (process.argv[1]?.endsWith('test_m1_challenger2_stress.mjs')) {
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
