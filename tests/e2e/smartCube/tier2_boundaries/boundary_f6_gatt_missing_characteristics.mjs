// tests/e2e/smartCube/tier2_boundaries/boundary_f6_gatt_missing_characteristics.mjs
// Boundary F6: Corrupted or Incomplete GATT Trees (5 tests)

import { createTestSuite, assert, assertEqual, assertThrows } from '../helpers/testUtils.mjs';
import {
  MockBluetoothDevice,
  MockBluetoothRemoteGATTService,
  MockBluetoothRemoteGATTCharacteristic
} from '../mocks/mockWebBluetooth.mjs';
import { GAN_GEN4_SERVICE, GAN_GEN4_COMMAND_CHARACTERISTIC } from '../mocks/virtualGanCube.mjs';
import { SpecGanBleDriver } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('Boundary F6: Missing GATT Characteristics');

suite.it('B6-1: Fails cleanly when GATT service has missing TX command characteristic', async () => {
  const dev = new MockBluetoothDevice('dev-corrupt-tx', 'GAN-BadTX');
  const svc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE, dev);
  // Only add non-command characteristic
  dev.gatt.addService(svc);

  const driver = new SpecGanBleDriver();
  await assertThrows(async () => {
    await driver.connect(dev);
  }, /NotFoundError/);
});

suite.it('B6-2: Fails cleanly when GATT service has missing RX state characteristic', async () => {
  const dev = new MockBluetoothDevice('dev-corrupt-rx', 'GAN-BadRX');
  const svc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE, dev);
  // Add only TX characteristic
  const txChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC, svc);
  svc.addCharacteristic(txChar);
  dev.gatt.addService(svc);

  const driver = new SpecGanBleDriver();
  await assertThrows(async () => {
    await driver.connect(dev);
  }, /NotFoundError/);
});

suite.it('B6-3: Fails when GATT primary service UUID does not exist on device', async () => {
  const dev = new MockBluetoothDevice('dev-wrong-service', 'GAN-WrongSvc');
  // Add unrelated service
  const svc = new MockBluetoothRemoteGATTService('12345678-0000-0000-0000-000000000000', dev);
  dev.gatt.addService(svc);

  const driver = new SpecGanBleDriver();
  await assertThrows(async () => {
    await driver.connect(dev);
  }, /NotFoundError/);
});

suite.it('B6-4: StartNotifications failing on RX characteristic reports error', async () => {
  const dev = new MockBluetoothDevice('dev-rx-notify-fail', 'GAN-FailNotify');
  const svc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE, dev);
  const txChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC, svc);
  const rxChar = new MockBluetoothRemoteGATTCharacteristic('0000fff6-0000-1000-8000-00805f9b34fb', svc);
  rxChar.startNotifications = async () => {
    throw new Error('NotSupportedError: Notifications disabled by GATT server');
  };

  svc.addCharacteristic(txChar);
  svc.addCharacteristic(rxChar);
  dev.gatt.addService(svc);

  const driver = new SpecGanBleDriver();
  await assertThrows(async () => {
    await driver.connect(dev);
  }, /Notifications disabled/);
});

suite.it('B6-5: Characteristic value read on disconnected server throws NetworkError', async () => {
  const char = new MockBluetoothRemoteGATTCharacteristic('0000fff6-0000-1000-8000-00805f9b34fb', null);
  await assertThrows(async () => {
    await char.readValue();
  }, /NetworkError/);
});
