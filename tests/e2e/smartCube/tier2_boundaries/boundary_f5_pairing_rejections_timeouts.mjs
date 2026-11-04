// tests/e2e/smartCube/tier2_boundaries/boundary_f5_pairing_rejections_timeouts.mjs
// Boundary F5: Pairing Rejections, Timeouts, and Device Not Found (5 tests)

import { createTestSuite, assert, assertEqual, assertThrows } from '../helpers/testUtils.mjs';
import { installMockWebBluetooth, uninstallMockWebBluetooth, MockWebBluetooth } from '../mocks/mockWebBluetooth.mjs';

export const suite = createTestSuite('Boundary F5: Pairing Rejections & Timeouts');

suite.afterEach(() => {
  uninstallMockWebBluetooth();
});

suite.it('B5-1: Rejection with NotFoundError when no Bluetooth device is in range', async () => {
  const mockBle = installMockWebBluetooth(new MockWebBluetooth());
  // No devices registered
  await assertThrows(async () => {
    await globalThis.navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GAN' }]
    });
  }, /NotFoundError/);
});

suite.it('B5-2: User rejects browser Bluetooth permission prompt', async () => {
  const mockBle = installMockWebBluetooth(new MockWebBluetooth());
  mockBle.setNextPairingRejection(new Error('NotAllowedError: Bluetooth permission denied by user'));

  await assertThrows(async () => {
    await globalThis.navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GAN' }]
    });
  }, /NotAllowedError/);
});

suite.it('B5-3: Timeout while waiting for user selection in device picker', async () => {
  const mockBle = installMockWebBluetooth(new MockWebBluetooth());
  mockBle.setNextPairingRejection(new Error('TimeoutError: Device selection timed out'));

  await assertThrows(async () => {
    await globalThis.navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GAN' }]
    });
  }, /TimeoutError/);
});

suite.it('B5-4: Empty filters object throws TypeError per Web Bluetooth specification', async () => {
  installMockWebBluetooth();
  await assertThrows(async () => {
    await globalThis.navigator.bluetooth.requestDevice({});
  }, /TypeError/);
});

suite.it('B5-5: User dismisses picker with escape key', async () => {
  const mockBle = installMockWebBluetooth();
  mockBle.setNextPairingRejection(new Error('NotFoundError: User cancelled the requestDevice() chooser'));

  await assertThrows(async () => {
    await globalThis.navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GAN' }]
    });
  }, /User cancelled/);
});
