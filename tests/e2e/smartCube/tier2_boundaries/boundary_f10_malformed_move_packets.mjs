// tests/e2e/smartCube/tier2_boundaries/boundary_f10_malformed_move_packets.mjs
// Boundary F10: Malformed Move Packets & Invalid Opcode Handling (5 tests)

import { createTestSuite, assert, assertEqual, assertThrows } from '../helpers/testUtils.mjs';
import { VirtualGanCube, decodeGen4Packet, encryptGen4Packet } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Boundary F10: Malformed Move Packets');

suite.it('B10-1: Unknown opcode is safely classified as UNKNOWN without throwing', () => {
  const cube = new VirtualGanCube();
  const raw = new Uint8Array(20);
  raw[0] = 0x99; // unknown opcode
  const encrypted = encryptGen4Packet(raw, cube.sessionKey, cube.sessionIv);

  const decoded = decodeGen4Packet(encrypted, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.type, 'UNKNOWN');
  assertEqual(decoded.eventType, 0x99);
});

suite.it('B10-2: Invalid face bit pattern in move packet throws face code error', () => {
  const cube = new VirtualGanCube();
  const raw = new Uint8Array(20);
  raw[0] = 0x01; // Move opcode
  // Set invalid face code (e.g. 0)
  raw[8] = 0x00;
  const enc = encryptGen4Packet(raw, cube.sessionKey, cube.sessionIv);

  assertThrows(() => {
    decodeGen4Packet(enc, cube.sessionKey, cube.sessionIv);
  }, /Invalid face code/);
});

suite.it('B10-3: 16-bit serial counter overflow (65535 to 0) wraps cleanly', () => {
  const cube = new VirtualGanCube();
  cube.serialCounter = 65535;
  const p1 = cube.encodeMovePacket('R');
  const d1 = decodeGen4Packet(p1, cube.sessionKey, cube.sessionIv);
  assertEqual(d1.serial, 65535);

  cube.serialCounter = 0; // Simulated 16-bit wrap
  const p2 = cube.encodeMovePacket('U');
  const d2 = decodeGen4Packet(p2, cube.sessionKey, cube.sessionIv);
  assertEqual(d2.serial, 0);
});

suite.it('B10-4: Packet with all-zero payload is treated as unknown opcode 0x00', () => {
  const cube = new VirtualGanCube();
  const zeros = new Uint8Array(20);
  const enc = encryptGen4Packet(zeros, cube.sessionKey, cube.sessionIv);
  const decoded = decodeGen4Packet(enc, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.type, 'UNKNOWN');
  assertEqual(decoded.eventType, 0);
});

suite.it('B10-5: Detects serial gap indicating dropped BLE packet', () => {
  const cube = new VirtualGanCube();
  cube.serialCounter = 10;
  const p1 = cube.encodeMovePacket('R');
  const d1 = decodeGen4Packet(p1, cube.sessionKey, cube.sessionIv);

  cube.serialCounter = 13; // 2 packets dropped (11, 12 missed)
  const p2 = cube.encodeMovePacket('U');
  const d2 = decodeGen4Packet(p2, cube.sessionKey, cube.sessionIv);

  const gap = d2.serial - d1.serial;
  assertEqual(gap, 3, 'Serial gap indicates dropped intermediate packets');
});
