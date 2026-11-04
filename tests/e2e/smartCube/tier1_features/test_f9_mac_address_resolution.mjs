// tests/e2e/smartCube/tier1_features/test_f9_mac_address_resolution.mjs
// F9: MAC Address Resolution & Modal (5 tests)

import { createTestSuite, assert, assertEqual, assertDeepEqual, assertThrows } from '../helpers/testUtils.mjs';
import { parseMacAddress } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('F9: MAC Address Resolution & Modal');

suite.it('F9-1: Parses standard colon-separated MAC address into 6 bytes', () => {
  const bytes = parseMacAddress('DC:BE:4A:16:14:01');
  assertEqual(bytes.length, 6);
  assertDeepEqual(bytes, [0xDC, 0xBE, 0x4A, 0x16, 0x14, 0x01]);
});

suite.it('F9-2: Parses hyphen-separated MAC address without delimiters', () => {
  const bytes = parseMacAddress('dc-be-4a-16-14-01');
  assertDeepEqual(bytes, [0xDC, 0xBE, 0x4A, 0x16, 0x14, 0x01]);
});

suite.it('F9-3: Parses raw continuous 12-char hex string', () => {
  const bytes = parseMacAddress('A1B2C3D4E5F6');
  assertDeepEqual(bytes, [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6]);
});

suite.it('F9-4: Throws error on malformed or too short MAC address', () => {
  assertThrows(() => parseMacAddress('invalid-mac'), /Invalid MAC address/);
  assertThrows(() => parseMacAddress('12:34:56'), /Invalid MAC address/);
  assertThrows(() => parseMacAddress(''), /Invalid MAC address/);
});

suite.it('F9-5: Mock localStorage cache stores and retrieves paired MAC', () => {
  const mockStorage = new Map();
  const STORAGE_KEY = 'gan_smart_cube_mac';

  function saveMac(mac) {
    mockStorage.set(STORAGE_KEY, mac.toUpperCase());
  }
  function loadMac() {
    return mockStorage.get(STORAGE_KEY) || null;
  }

  saveMac('dc:be:4a:16:14:01');
  assertEqual(loadMac(), 'DC:BE:4A:16:14:01');
});
