// tests/e2e/smartCube/tier1_features/test_f5_ble_pairing_filter.mjs
// F5: Web Bluetooth Discovery & Pairing Filter (5 tests)

import { createTestSuite, assert, assertEqual, assertThrows } from '../helpers/testUtils.mjs';
import { installMockWebBluetooth, uninstallMockWebBluetooth, MockBluetoothDevice } from '../mocks/mockWebBluetooth.mjs';
import { VirtualGanCube, GAN_GEN4_SERVICE } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('F5: Web Bluetooth Discovery & Pairing Filter');

suite.afterEach(() => {
  uninstallMockWebBluetooth();
});

suite.it('F5-1: Filters match devices with GAN prefix', async () => {
  const mockBle = installMockWebBluetooth();
  const ganCube = new VirtualGanCube({ name: 'GAN-16ui-MAX-9999' });
  mockBle.registerDevice(ganCube.device);

  const device = await globalThis.navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'GAN' }],
    optionalServices: [GAN_GEN4_SERVICE]
  });

  assertEqual(device.name, 'GAN-16ui-MAX-9999');
});

suite.it('F5-2: Filters match devices with Monster Go (MG) prefix', async () => {
  const mockBle = installMockWebBluetooth();
  const mgCube = new MockBluetoothDevice('dev-mg', 'MG-3Ai-1234');
  mockBle.registerDevice(mgCube);

  const device = await globalThis.navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'GAN' }, { namePrefix: 'MG' }],
    optionalServices: [GAN_GEN4_SERVICE]
  });

  assertEqual(device.name, 'MG-3Ai-1234');
});

suite.it('F5-3: Filters match devices with AiCube prefix', async () => {
  const mockBle = installMockWebBluetooth();
  const aiCube = new MockBluetoothDevice('dev-ai', 'AiCube-356i');
  mockBle.registerDevice(aiCube);

  const device = await globalThis.navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'GAN' }, { namePrefix: 'MG' }, { namePrefix: 'AiCube' }],
    optionalServices: [GAN_GEN4_SERVICE]
  });

  assertEqual(device.name, 'AiCube-356i');
});

suite.it('F5-4: Rejects non-smart-cube devices not matching filters', async () => {
  const mockBle = installMockWebBluetooth();
  const headphones = new MockBluetoothDevice('dev-audio', 'Sony-WH-1000XM5');
  mockBle.registerDevice(headphones);

  await assertThrows(async () => {
    await globalThis.navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GAN' }, { namePrefix: 'MG' }, { namePrefix: 'AiCube' }],
      optionalServices: [GAN_GEN4_SERVICE]
    });
  }, /NotFoundError/);
});

suite.it('F5-5: Handles user cancellation in device chooser', async () => {
  const mockBle = installMockWebBluetooth();
  mockBle.setNextPairingRejection(new Error('NotFoundError: User cancelled the requestDevice() chooser'));

  await assertThrows(async () => {
    await globalThis.navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GAN' }],
      optionalServices: [GAN_GEN4_SERVICE]
    });
  }, /User cancelled/);
});
