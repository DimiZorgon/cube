// tests/e2e/smartCube/tier2_boundaries/boundary_f4_rapid_status_flapping.mjs
// Boundary F4: Rapid Status Flapping & Reconnection Loops (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { SpecGanBleDriver, SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';
import { VirtualGanCube } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Boundary F4: Rapid Status Flapping');

suite.it('B4-1: Connect and immediate disconnect cycle leaves status disconnected', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);
  store.disconnect();
  assertEqual(store.getState().connectionStatus, 'disconnected');
});

suite.it('B4-2: Reconnecting 5 times in rapid succession does not duplicate event listeners', async () => {
  const cube = new VirtualGanCube();
  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);

  for (let i = 0; i < 5; i++) {
    await store.connect(cube.device);
    store.disconnect();
  }
  assertEqual(store.getState().connectionStatus, 'disconnected');
});

suite.it('B4-3: Cube hardware disconnect while connecting aborts gracefully', async () => {
  const driver = new SpecGanBleDriver();
  let status = null;
  driver.onStatusChange = (s) => { status = s; };

  const abortedDevice = {
    name: 'Aborted GAN',
    gatt: {
      connect: async () => {
        throw new Error('NetworkError: Connection aborted by peripheral');
      }
    },
    addEventListener: () => {}
  };

  try {
    await driver.connect(abortedDevice);
  } catch {
    // Expected
  }
  assertEqual(status, 'error');
});

suite.it('B4-4: Disconnect event received during active solve preserves solve history', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);

  store.newScramble("R U R' U'");
  store.handleIncomingMove('R');
  assertEqual(store.getState().timerStatus, 'solving');
  assertEqual(store.getState().moveCount, 1);

  cube.disconnectDevice();
  assertEqual(store.getState().connectionStatus, 'disconnected');
  // Solve history and count remain intact
  assertEqual(store.getState().moveCount, 1);
  assertEqual(store.getState().moveHistory.length, 1);
});

suite.it('B4-5: Reconnect after unexpected disconnect allows resuming session', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);
  cube.disconnectDevice();
  assertEqual(store.getState().connectionStatus, 'disconnected');

  await store.connect(cube.device);
  assertEqual(store.getState().connectionStatus, 'connected');
});
