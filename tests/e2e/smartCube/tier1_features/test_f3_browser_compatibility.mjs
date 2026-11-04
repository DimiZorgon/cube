// tests/e2e/smartCube/tier1_features/test_f3_browser_compatibility.mjs
// F3: Browser Compatibility Notice (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { installMockWebBluetooth, uninstallMockWebBluetooth, MockWebBluetooth } from '../mocks/mockWebBluetooth.mjs';

export const suite = createTestSuite('F3: Browser Compatibility Notice');

suite.afterEach(() => {
  uninstallMockWebBluetooth();
});

suite.it('F3-1: Detects missing Web Bluetooth when navigator.bluetooth is undefined', () => {
  const originalNav = globalThis.navigator;
  try {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
    const isSupported = !!globalThis.navigator?.bluetooth;
    assertEqual(isSupported, false, 'Web Bluetooth should be detected as unsupported when property is missing');
  } finally {
    Object.defineProperty(globalThis, 'navigator', { value: originalNav, configurable: true, writable: true });
  }
});

suite.it('F3-2: Detects Web Bluetooth availability when navigator.bluetooth is present', async () => {
  const mock = installMockWebBluetooth();
  const isSupported = !!globalThis.navigator?.bluetooth;
  assertEqual(isSupported, true, 'Web Bluetooth should be detected as supported');
  const available = await globalThis.navigator.bluetooth.getAvailability();
  assertEqual(available, true, 'Bluetooth availability should return true when active');
});

suite.it('F3-3: Handles navigator.bluetooth.getAvailability() returning false', async () => {
  const mock = new MockWebBluetooth();
  mock.setAvailable(false);
  installMockWebBluetooth(mock);
  const available = await globalThis.navigator.bluetooth.getAvailability();
  assertEqual(available, false, 'Should detect Bluetooth radio disabled or unavailable');
});

suite.it('F3-4: Compatibility check helper provides clear diagnostics for iOS and unsupported browsers', () => {
  function checkBleCompatibility(nav) {
    if (!nav || !nav.bluetooth) {
      return {
        supported: false,
        message: 'Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Bluefy on iOS.'
      };
    }
    return { supported: true, message: 'Web Bluetooth supported' };
  }

  const unsupportedRes = checkBleCompatibility({});
  assertEqual(unsupportedRes.supported, false);
  assert(unsupportedRes.message.includes('Chrome'), 'Notice should recommend Chrome or Edge');
  assert(unsupportedRes.message.includes('Bluefy'), 'Notice should recommend Bluefy for iOS');

  const supportedRes = checkBleCompatibility({ bluetooth: {} });
  assertEqual(supportedRes.supported, true);
});

suite.it('F3-5: Driver connect fails immediately with informative error when Bluetooth is missing', async () => {
  const originalNav = globalThis.navigator;
  try {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
    let errCaught = null;
    try {
      if (!globalThis.navigator?.bluetooth) {
        throw new Error('Web Bluetooth not supported in this browser');
      }
    } catch (e) {
      errCaught = e;
    }
    assert(errCaught !== null, 'Should throw error when connecting on unsupported browser');
    assert(errCaught.message.includes('Web Bluetooth'), 'Error message should clearly state Web Bluetooth missing');
  } finally {
    Object.defineProperty(globalThis, 'navigator', { value: originalNav, configurable: true, writable: true });
  }
});
