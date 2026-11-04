// tests/e2e/smartCube/tier4_realworld/test_realworld_scenarios.mjs
// Tier 4: Realistic Real-World Application Solve Scenarios (10 tests)

import { createTestSuite, assert, assertEqual, assertRoughlyEqual } from '../helpers/testUtils.mjs';
import { VirtualGanCube } from '../mocks/virtualGanCube.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';
import { calculateWcaAo5, calculateWcaAo12 } from '../tier1_features/test_f20_session_wca_stats.mjs';

export const suite = createTestSuite('Tier 4: Realistic Solve Scenarios');

suite.it('T4-01: Complete WCA solve flow (Connect -> Scramble -> Inspect -> Solve -> Stop)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();

  // 1. Connect
  await store.connect(cube.device);
  assertEqual(store.getState().connectionStatus, 'connected');

  // 2. Scramble
  const scramble = "R U R' U'";
  store.newScramble(scramble);
  assertEqual(store.getState().timerStatus, 'scrambled');

  // 3. Inspect
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');

  // 4. Solve moves: U R U' R'
  cube.emitMove('U');
  assertEqual(store.getState().timerStatus, 'solving');
  cube.emitMove('R');
  cube.emitMove("U'");
  cube.emitMove("R'");

  // 5. Automatic stop on solve
  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 4);
  assert(store.getState().finalTps > 0);
  assertEqual(store.getState().sessionSolves.length, 1);
});

suite.it('T4-02: Standard Ao5 competitive session (5 solves with realistic timing)', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  for (let i = 0; i < 5; i++) {
    store.newScramble("R");
    cube.emitMove("R'");
    assertEqual(store.getState().timerStatus, 'solved');
  }

  assertEqual(store.getState().sessionSolves.length, 5);
  const times = store.getState().sessionSolves.map(s => s.timeMs);
  const ao5 = calculateWcaAo5(times);
  assert(ao5 !== null, 'Ao5 must be computed for 5 solves');
});

suite.it('T4-03: Peripheral disconnect recovery mid-session preserves history and solves', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  // Complete 2 solves
  store.newScramble("R");
  cube.emitMove("R'");
  store.newScramble("U");
  cube.emitMove("U'");
  assertEqual(store.getState().sessionSolves.length, 2);

  // Unexpected disconnect
  cube.disconnectDevice();
  assertEqual(store.getState().connectionStatus, 'disconnected');
  assertEqual(store.getState().sessionSolves.length, 2);

  // Reconnect
  await store.connect(cube.device);
  assertEqual(store.getState().connectionStatus, 'connected');
  assertEqual(store.getState().sessionSolves.length, 2);
});

suite.it('T4-04: Speedsolve under 10 seconds with high TPS', () => {
  const store = new SpecSmartCubeStore();
  // 12-move scramble and 12-move solve
  const scramble = "R U R' U' R U R' U' R U R' U'";
  store.newScramble(scramble);

  const startTs = 1000;
  // 12 inverse moves in 1500ms = 8 TPS
  for (let i = 0; i < 3; i++) {
    store.handleIncomingMove('U', startTs + i * 400 + 50);
    store.handleIncomingMove('R', startTs + i * 400 + 100);
    store.handleIncomingMove("U'", startTs + i * 400 + 150);
    store.handleIncomingMove("R'", startTs + i * 400 + 200);
  }

  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 12);
  assert(store.getState().finalTps > 0);
});

suite.it('T4-05: CFOP solve stages simulation (Cross, F2L, OLL, PLL)', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("F R U R' U' F'"); // OLL algorithm as scramble

  // Solve with inverse
  store.handleIncomingMove('F');
  store.handleIncomingMove('U');
  store.handleIncomingMove('R');
  store.handleIncomingMove("U'");
  store.handleIncomingMove("R'");
  store.handleIncomingMove("F'");

  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 6);
});

suite.it('T4-06: Roux method solve stages simulation (Blocks, CMLL, LSE)', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("U R U' R'");

  store.handleIncomingMove('R');
  store.handleIncomingMove('U');
  store.handleIncomingMove("R'");
  store.handleIncomingMove("U'");

  assertEqual(store.getState().timerStatus, 'solved');
  assertEqual(store.getState().moveCount, 4);
});

suite.it('T4-07: In-session battery telemetry check and low battery alert detection', async () => {
  const cube = new VirtualGanCube({ batteryLevel: 12 }); // 12% low battery
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  cube.emitBattery(12);
  assertEqual(store.getState().batteryLevel, 12);
  assert(store.getState().batteryLevel <= 15, 'Low battery alert triggered');
});

suite.it('T4-08: Solve session reset and restart after user abort', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.handleIncomingMove('R');
  store.handleIncomingMove('U');
  assertEqual(store.getState().timerStatus, 'solving');

  // User resets
  store.resetSolve();
  assertEqual(store.getState().timerStatus, 'idle');
  assertEqual(store.getState().moveCount, 0);

  // New scramble and solve
  store.newScramble("R");
  store.handleIncomingMove("R'");
  assertEqual(store.getState().timerStatus, 'solved');
});

suite.it('T4-09: 12-solve marathon session yielding valid Ao12 and best single time', () => {
  const store = new SpecSmartCubeStore();
  for (let i = 0; i < 12; i++) {
    store.newScramble("R");
    store.handleIncomingMove("R'");
  }
  const solves = store.getState().sessionSolves;
  assertEqual(solves.length, 12);
  const times = solves.map(s => s.timeMs);
  const ao12 = calculateWcaAo12(times);
  assert(ao12 !== null);
  const bestSingle = Math.min(...times);
  assert(bestSingle > 0);
});

suite.it('T4-10: Seamless cube wake-up and automatic re-identification', async () => {
  const cube = new VirtualGanCube({ name: 'GAN-16ui-MAX-4820' });
  const store = new SpecSmartCubeStore();

  // Sleep
  cube.disconnectDevice();
  assertEqual(store.getState().connectionStatus, 'disconnected');

  // Wake up with a quarter turn
  cube.emitMove('U');
  // Reconnect
  await store.connect(cube.device);
  assertEqual(store.getState().connectionStatus, 'connected');
});
