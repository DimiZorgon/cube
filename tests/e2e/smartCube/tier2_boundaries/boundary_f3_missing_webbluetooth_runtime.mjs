// tests/e2e/smartCube/tier2_boundaries/boundary_f3_missing_webbluetooth_runtime.mjs
// Boundary F3: Missing Web Bluetooth Runtime Exceptions (5 tests)

import { createTestSuite, assert, assertEqual, assertThrows } from '../helpers/testUtils.mjs';
import { SpecGanBleDriver } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('Boundary F3: Missing Web Bluetooth Runtime Exceptions');

suite.it('B3-1: Connect throws clean error when navigator is undefined', async () => {
  const driver = new SpecGanBleDriver();
  const origNav = globalThis.navigator;
  try {
    delete globalThis.navigator;
    await assertThrows(async () => {
      await driver.connect();
    }, /Web Bluetooth not supported/);
  } finally {
    globalThis.navigator = origNav;
  }
});

suite.it('B3-2: Connect throws clean error when navigator.bluetooth is null', async () => {
  const driver = new SpecGanBleDriver();
  const origNav = globalThis.navigator;
  try {
    globalThis.navigator = { bluetooth: null };
    await assertThrows(async () => {
      await driver.connect();
    }, /Web Bluetooth not supported/);
  } finally {
    globalThis.navigator = origNav;
  }
});

suite.it('B3-3: RequestDevice throwing SecurityError (permissions policy) is handled', async () => {
  const driver = new SpecGanBleDriver();
  const origNav = globalThis.navigator;
  try {
    globalThis.navigator = {
      bluetooth: {
        requestDevice: async () => {
          throw new Error('SecurityError: Web Bluetooth access denied by Permissions Policy');
        }
      }
    };
    await assertThrows(async () => {
      await driver.connect();
    }, /Permissions Policy/);
  } finally {
    globalThis.navigator = origNav;
  }
});

suite.it('B3-4: Driver onStatusChange is notified of error when Bluetooth throws', async () => {
  const driver = new SpecGanBleDriver();
  let statusReported = null;
  driver.onStatusChange = (st) => { statusReported = st; };

  const origNav = globalThis.navigator;
  try {
    globalThis.navigator = {};
    try {
      await driver.connect();
    } catch {
      // Expected
    }
    assertEqual(statusReported, 'error');
  } finally {
    globalThis.navigator = origNav;
  }
});

suite.it('B3-5: Multiple subsequent connect attempts on unsupported platform do not corrupt driver', async () => {
  const driver = new SpecGanBleDriver();
  const origNav = globalThis.navigator;
  try {
    globalThis.navigator = {};
    for (let i = 0; i < 3; i++) {
      try {
        await driver.connect();
      } catch {
        // Expected
      }
    }
    assertEqual(driver.device, null);
    assertEqual(driver.server, null);
  } finally {
    globalThis.navigator = origNav;
  }
});
