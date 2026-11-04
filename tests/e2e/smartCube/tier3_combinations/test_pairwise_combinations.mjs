// tests/e2e/smartCube/tier3_combinations/test_pairwise_combinations.mjs
// Tier 3: Pairwise Cross-Feature Integration Tests (20 tests)

import { createTestSuite, assert, assertEqual, assertRoughlyEqual } from '../helpers/testUtils.mjs';
import { VirtualGanCube } from '../mocks/virtualGanCube.mjs';
import { SpecGanBleDriver, SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';
import { calculateWcaAo5, calculateWcaAo12 } from '../tier1_features/test_f20_session_wca_stats.mjs';

export const suite = createTestSuite('Tier 3: Pairwise Cross-Feature Integration');

suite.it('T3-01: Move decoding during concurrent gyro telemetry streaming (F10 x F14)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  cube.emitGyro(0.707, 0, 0.707, 0);
  cube.emitMove('R');
  cube.emitGyro(1, 0, 0, 0);
  cube.emitMove('U');

  assertEqual(store.getState().moveCount, 2);
  assert(store.getState().gyroQuaternion !== null);
});

suite.it('T3-02: Peripheral disconnect during active solving timer preserves timer data (F4 x F16)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  store.newScramble("R U R' U'");
  cube.emitMove('R');
  assertEqual(store.getState().timerStatus, 'solving');

  cube.disconnectDevice();
  assertEqual(store.getState().connectionStatus, 'disconnected');
  assertEqual(store.getState().moveCount, 1);
});

suite.it('T3-03: Battery telemetry received during fast move burst (F11 x F13)', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 88 });
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  cube.emitMove('R');
  cube.emitBattery(88);
  cube.emitMove('U');

  assertEqual(store.getState().moveCount, 2);
  assertEqual(store.getState().batteryLevel, 88);
});

suite.it('T3-04: Solve detection occurring while cube is tilted 90 degrees (F14 x F17)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  store.newScramble("R");
  cube.emitGyro(0, 1, 0, 0); // 90 degree tilt
  cube.emitMove("R'"); // Restores solve

  assertEqual(store.getState().timerStatus, 'solved');
});

suite.it('T3-05: Hardware reset command (0xD2) sent while moves in flight (F8 x F10)', async () => {
  const cube = new VirtualGanCube();
  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);
  await store.connect(cube.device);

  cube.emitMove('R');
  await driver.sendHardwareReset();

  assertEqual(cube.serialCounter, 0);
});

suite.it('T3-06: Scrambling while previous solve is already in solved state (F16 x F18)', async () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R");
  store.handleIncomingMove("R'");
  assertEqual(store.getState().timerStatus, 'solved');

  store.newScramble("F R U R' U' F'");
  assertEqual(store.getState().timerStatus, 'scrambled');
  assertEqual(store.getState().moveCount, 0);
});

suite.it('T3-07: Reconnection while timer is stopped preserves final TPS (F4 x F19)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  store.newScramble("R");
  store.handleIncomingMove("R'");
  const tps = store.getState().finalTps;

  cube.disconnectDevice();
  await store.connect(cube.device);
  assertEqual(store.getState().finalTps, tps);
});

suite.it('T3-08: Manual MAC address entry with advertisement fallback (F5 x F9)', () => {
  const mac = 'DC:BE:4A:16:14:01';
  const driver = new SpecGanBleDriver();
  driver.setMacAddress(mac);
  assertEqual(driver.macAddress, mac);
  assert(driver.sessionKey !== null);
});

suite.it('T3-09: Inspection started then peripheral disconnects (F4 x F16)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  store.newScramble("R U R' U'");
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');

  cube.disconnectDevice();
  assertEqual(store.getState().connectionStatus, 'disconnected');
});

suite.it('T3-10: High-speed solve (15+ TPS) completing under 2 seconds (F13 x F19)', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  const startTs = 1000;
  // 4 inverse moves in 200ms = 20 TPS
  store.handleIncomingMove('U', startTs);
  store.handleIncomingMove('R', startTs + 50);
  store.handleIncomingMove("U'", startTs + 100);
  store.handleIncomingMove("R'", startTs + 200);

  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 4);
});

suite.it('T3-11: Rapid alternation between U and U\' maintaining monochromatic check (F12 x F17)', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("U");
  store.handleIncomingMove('U'); // U2
  assertEqual(store.cubeSimulator.isSolved(), false);

  store.handleIncomingMove("U'");
  store.handleIncomingMove("U'");
  assertEqual(store.cubeSimulator.isSolved(), true);
});

suite.it('T3-12: Ao5 computation triggers immediately after 5th solve completes (F18 x F20)', () => {
  const store = new SpecSmartCubeStore();
  for (let i = 0; i < 5; i++) {
    store.newScramble("R");
    store.handleIncomingMove("R'");
  }
  assertEqual(store.getState().sessionSolves.length, 5);
  const times = store.getState().sessionSolves.map(s => s.timeMs);
  const ao5 = calculateWcaAo5(times);
  assert(ao5 !== null, 'Ao5 must be computed after 5 solves');
});

suite.it('T3-13: Move tape history maintains order while receiving rapid gyro packets (F14 x F15)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  cube.emitMove('F');
  cube.emitGyro(0, 0, 0, 1);
  cube.emitMove('R');
  cube.emitGyro(0, 0, 0, 1);
  cube.emitMove('U');

  assertEqual(store.getState().moveCount, 3);
  assertEqual(store.getState().moveHistory[0].move, 'F');
  assertEqual(store.getState().moveHistory[1].move, 'R');
  assertEqual(store.getState().moveHistory[2].move, 'U');
});

suite.it('T3-14: Battery telemetry request through write queue during move events (F8 x F11)', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 94 });
  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);
  await store.connect(cube.device);

  const writePromise = driver.requestBattery();
  cube.emitMove('R');
  await writePromise;

  assertEqual(store.getState().batteryLevel, 94);
  assertEqual(store.getState().moveCount, 1);
});

suite.it('T3-15: Status reflects error if reconnect fails on unsupported browser (F3 x F4)', async () => {
  const origNav = globalThis.navigator;
  try {
    globalThis.navigator = {};
    const driver = new SpecGanBleDriver();
    let status = null;
    driver.onStatusChange = (s) => { status = s; };
    try { await driver.connect(); } catch {}
    assertEqual(status, 'error');
  } finally {
    globalThis.navigator = origNav;
  }
});

suite.it('T3-16: Scramble of 20 WCA moves updates logical cube state correctly (F12 x F16)', () => {
  const store = new SpecSmartCubeStore();
  const wcaScramble = "D2 B2 F2 R2 U' L2 D B2 R2 D B2 R' D' F U R' B' L' R2 U2";
  store.newScramble(wcaScramble);
  assertEqual(store.getState().timerStatus, 'scrambled');
  assertEqual(store.cubeSimulator.isSolved(), false);
});

suite.it('T3-17: Solve detected via facelets event (0xED) instead of move event (F6 x F17)', async () => {
  const cube = new VirtualGanCube();
  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);
  await store.connect(cube.device);

  store.state.timerStatus = 'solving';
  cube.emitFacelets(); // emits solved facelets

  assertEqual(store.getState().timerStatus, 'solved');
});

suite.it('T3-18: ResetSolve while in active solving state resets all metrics to zero (F15 x F19)', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.handleIncomingMove('R');
  store.handleIncomingMove('U');
  assertEqual(store.getState().timerStatus, 'solving');

  store.resetSolve();
  assertEqual(store.getState().timerStatus, 'idle');
  assertEqual(store.getState().moveCount, 0);
  assertEqual(store.getState().elapsedMs, 0);
  assertEqual(store.getState().currentTps, 0);
});

suite.it('T3-19: Gyro recalibration while moves are being executed (F14 x F15)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  cube.emitMove('R');
  store.recalibrateGyro();
  cube.emitMove('U');

  assertEqual(store.getState().moveCount, 2);
  assertEqual(store.getState().gyroQuaternion[3], 1);
});

suite.it('T3-20: 12 consecutive solves produce both Ao5 and Ao12 (F19 x F20)', () => {
  const store = new SpecSmartCubeStore();
  for (let i = 0; i < 12; i++) {
    store.newScramble("R");
    store.handleIncomingMove("R'");
  }
  const times = store.getState().sessionSolves.map(s => s.timeMs);
  assertEqual(times.length, 12);
  assert(calculateWcaAo5(times) !== null);
  assert(calculateWcaAo12(times) !== null);
});
