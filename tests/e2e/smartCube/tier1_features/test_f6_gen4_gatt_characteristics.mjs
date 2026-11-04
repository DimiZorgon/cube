// tests/e2e/smartCube/tier1_features/test_f6_gen4_gatt_characteristics.mjs
// F6: Gen4 GATT Service & Characteristic Comm (5 tests)

import { createTestSuite, assert, assertEqual, assertThrows } from '../helpers/testUtils.mjs';
import {
  VirtualGanCube,
  GAN_GEN4_SERVICE,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC
} from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('F6: Gen4 GATT Service & Characteristic Comm');

suite.it('F6-1: Primary GATT service resolves with standard Gen4 UUID', async () => {
  const cube = new VirtualGanCube();
  await cube.device.gatt.connect();
  const service = await cube.device.gatt.getPrimaryService(GAN_GEN4_SERVICE);
  assertEqual(service.uuid, GAN_GEN4_SERVICE.toLowerCase());
});

suite.it('F6-2: Primary GATT service resolves with 16-bit alias UUID (0000fff0)', async () => {
  const cube = new VirtualGanCube();
  await cube.device.gatt.connect();
  const service = await cube.device.gatt.getPrimaryService(GAN_GEN4_SERVICE_ALIAS);
  assertEqual(service.uuid, GAN_GEN4_SERVICE_ALIAS.toLowerCase());
});

suite.it('F6-3: Resolves TX command characteristic (0000fff5) with write property', async () => {
  const cube = new VirtualGanCube();
  await cube.device.gatt.connect();
  const service = await cube.device.gatt.getPrimaryService(GAN_GEN4_SERVICE);
  const txChar = await service.getCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC);
  assertEqual(txChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(txChar.properties.write, true);
});

suite.it('F6-4: Resolves RX state characteristic (0000fff6) and starts notifications', async () => {
  const cube = new VirtualGanCube();
  await cube.device.gatt.connect();
  const service = await cube.device.gatt.getPrimaryService(GAN_GEN4_SERVICE);
  const rxChar = await service.getCharacteristic(GAN_GEN4_STATE_CHARACTERISTIC);
  assertEqual(rxChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
  assertEqual(rxChar.properties.notify, true);

  await rxChar.startNotifications();
  assertEqual(rxChar._notificationsActive, true);
});

suite.it('F6-5: Throws NotFoundError when requesting unknown characteristic UUID', async () => {
  const cube = new VirtualGanCube();
  await cube.device.gatt.connect();
  const service = await cube.device.gatt.getPrimaryService(GAN_GEN4_SERVICE);

  await assertThrows(async () => {
    await service.getCharacteristic('0000ffff-0000-1000-8000-00805f9b34fb');
  }, /NotFoundError/);
});
