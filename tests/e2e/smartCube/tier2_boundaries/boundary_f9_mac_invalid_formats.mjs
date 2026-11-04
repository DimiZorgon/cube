// tests/e2e/smartCube/tier2_boundaries/boundary_f9_mac_invalid_formats.mjs
// Boundary F9: Invalid MAC Address Strings & Format Sanitization (5 tests)

import { createTestSuite, assertThrows, assertEqual } from '../helpers/testUtils.mjs';
import { parseMacAddress } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Boundary F9: Invalid MAC Address Formats');

suite.it('B9-1: Null and undefined MAC inputs throw Invalid MAC address error', () => {
  assertThrows(() => parseMacAddress(null), /Invalid MAC address/);
  assertThrows(() => parseMacAddress(undefined), /Invalid MAC address/);
});

suite.it('B9-2: Non-hexadecimal characters throw format error', () => {
  assertThrows(() => parseMacAddress('GG:HH:II:JJ:KK:LL'), /Invalid MAC address format/);
  assertThrows(() => parseMacAddress('DC:BE:4A:16:14:ZZ'), /Invalid MAC address format/);
});

suite.it('B9-3: Incomplete MAC address (odd length) throws format error', () => {
  assertThrows(() => parseMacAddress('DC:BE:4A:16:14:0'), /Invalid MAC address format/);
});

suite.it('B9-4: Oversized MAC address (>12 hex chars) throws format error', () => {
  assertThrows(() => parseMacAddress('DC:BE:4A:16:14:01:FF'), /Invalid MAC address format/);
});

suite.it('B9-5: Whitespace-padded MAC address with valid chars is handled', () => {
  const sanitize = (m) => m ? m.trim() : m;
  const bytes = parseMacAddress(sanitize('  DC:BE:4A:16:14:01  '));
  assertEqual(bytes.length, 6);
});
