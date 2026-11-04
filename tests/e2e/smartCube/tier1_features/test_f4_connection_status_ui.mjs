// tests/e2e/smartCube/tier1_features/test_f4_connection_status_ui.mjs
// F4: BLE Connection Status UI (5 tests)

import { createTestSuite, assertEqual } from '../helpers/testUtils.mjs';
import { SpecGanBleDriver, SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';
import { VirtualGanCube } from '../mocks/virtualGanCube.mjs';
import { installMockWebBluetooth, uninstallMockWebBluetooth } from '../mocks/mockWebBluetooth.mjs';

export const suite = createTestSuite('F4: BLE Connection Status UI');

suite.afterEach(() => {
  uninstallMockWebBluetooth();
});

suite.it('F4-1: Initial connection status is disconnected', () => {
  const store = new SpecSmartCubeStore();
  assertEqual(store.getState().connectionStatus, 'disconnected', 'Initial state must be disconnected');
});

suite.it('F4-2: Transitions to connecting then connected on successful GATT connection', async () => {
  const mockBle = installMockWebBluetooth();
  const cube = new VirtualGanCube();
  mockBle.registerDevice(cube.device);

  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);

  const statusHistory = [];
  driver.onStatusChange = (status) => {
    statusHistory.push(status);
    store.getState().connectionStatus = status;
  };

  await store.connect(cube.device);
  assertEqual(store.getState().connectionStatus, 'connected');
  assertEqual(statusHistory[0], 'connecting');
  assertEqual(statusHistory[1], 'connected');
});

suite.it('F4-3: Transitions to disconnected when peripheral disconnects', async () => {
  const cube = new VirtualGanCube();
  const driver = new SpecGanBleDriver();
  const store = new SpecSmartCubeStore(driver);

  await store.connect(cube.device);
  assertEqual(store.getState().connectionStatus, 'connected');

  cube.disconnectDevice();
  assertEqual(store.getState().connectionStatus, 'disconnected');
});

suite.it('F4-4: Transitions to error status when connection fails', async () => {
  const driver = new SpecGanBleDriver();
  let reportedStatus = null;
  let reportedError = null;

  driver.onStatusChange = (status, err) => {
    reportedStatus = status;
    reportedError = err;
  };

  const failingDevice = {
    name: 'Broken Cube',
    gatt: {
      connect: async () => { throw new Error('Bluetooth connection timed out'); }
    },
    addEventListener: () => {}
  };

  try {
    await driver.connect(failingDevice);
  } catch {
    // Expected
  }

  assertEqual(reportedStatus, 'error');
  assertEqual(reportedError, 'Bluetooth connection timed out');
});

suite.it('F4-5: Explicit disconnect action transitions status back to disconnected', async () => {
  const cube = new VirtualGanCube();
  const store = new SpecSmartCubeStore();
  await store.connect(cube.device);
  assertEqual(store.getState().connectionStatus, 'connected');

  store.disconnect();
  assertEqual(store.getState().connectionStatus, 'disconnected');
});
