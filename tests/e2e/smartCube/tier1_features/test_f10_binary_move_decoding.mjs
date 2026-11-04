// tests/e2e/smartCube/tier1_features/test_f10_binary_move_decoding.mjs
// F10: Binary Move Decoding (URFDLB) (5 tests)

import { createTestSuite, assertEqual, assertThrows, BitWriter } from '../helpers/testUtils.mjs';
import { VirtualGanCube, decodeGen4Packet, encryptGen4Packet } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('F10: Binary Move Decoding (URFDLB)');

suite.it('F10-1: Decodes clockwise face turns U, R, F, D, L, B', () => {
  const cube = new VirtualGanCube();
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'];

  for (const face of faces) {
    const packet = cube.encodeMovePacket(face);
    const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
    assertEqual(decoded.type, 'MOVE');
    assertEqual(decoded.move, face);
    assertEqual(decoded.direction, 0);
  }
});

suite.it('F10-2: Decodes counter-clockwise face turns with prime suffix', () => {
  const cube = new VirtualGanCube();
  const primeMoves = ["U'", "R'", "F'", "D'", "L'", "B'"];

  for (const move of primeMoves) {
    const packet = cube.encodeMovePacket(move);
    const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
    assertEqual(decoded.type, 'MOVE');
    assertEqual(decoded.move, move);
    assertEqual(decoded.direction, 1);
  }
});

suite.it('F10-3: Decodes millisecond timestamp from bits 16..47 (LE)', () => {
  const cube = new VirtualGanCube();
  const expectedTs = 9876543;
  const packet = cube.encodeMovePacket('R', expectedTs);
  const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.cubeTimestamp, expectedTs);
});

suite.it('F10-4: Decodes serial sequence counter from bits 48..63 (LE)', () => {
  const cube = new VirtualGanCube();
  cube.serialCounter = 42;
  const packet = cube.encodeMovePacket('F');
  const decoded = decodeGen4Packet(packet, cube.sessionKey, cube.sessionIv);
  assertEqual(decoded.serial, 42);
});

suite.it('F10-5: Throws error when packet contains unknown face bit pattern', () => {
  const cube = new VirtualGanCube();
  const writer = new BitWriter(20);
  writer.buf[0] = 0x01; // Move opcode
  writer.setBitWord(66, 6, 63); // 63 is not a valid face code
  const badPacket = encryptGen4Packet(writer.toUint8Array(), cube.sessionKey, cube.sessionIv);

  assertThrows(() => {
    decodeGen4Packet(badPacket, cube.sessionKey, cube.sessionIv);
  }, /Invalid face code/);
});
