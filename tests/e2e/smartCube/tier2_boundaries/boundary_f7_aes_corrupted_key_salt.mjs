// tests/e2e/smartCube/tier2_boundaries/boundary_f7_aes_corrupted_key_salt.mjs
// Boundary F7: Corrupted AES Salt, Corrupted IV, and Truncated Buffers (5 tests)

import { createTestSuite, assert, assertEqual, assertThrows } from '../helpers/testUtils.mjs';
import {
  deriveKeyAndIv,
  encryptGen4Packet,
  decryptGen4Packet,
  decodeGen4Packet,
  VirtualGanCube
} from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Boundary F7: Corrupted AES Key, Salt, and Buffers');

suite.it('B7-1: Single bit flip in MAC address salt causes decryption failure', () => {
  const cube = new VirtualGanCube({ macAddress: 'DC:BE:4A:16:14:01' });
  const packet = cube.encodeMovePacket('R');

  // Single bit changed in MAC address
  const { key: badKey, iv: badIv } = deriveKeyAndIv('DC:BE:4A:16:14:00');
  const badDecrypted = decryptGen4Packet(packet, badKey, badIv);

  // Decrypted opcode should not match 0x01
  assert(badDecrypted[0] !== 0x01, 'Corrupted salt must invalidate opcode byte');
});

suite.it('B7-2: 1-byte corrupted IV produces corrupted first plaintext block', () => {
  const { key, iv } = deriveKeyAndIv('AA:BB:CC:DD:EE:FF');
  const payload = new Uint8Array([0x01, 0x08, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const encrypted = encryptGen4Packet(payload, key, iv);

  const corruptedIv = Buffer.from(iv);
  corruptedIv[0] ^= 0x01; // flip 1 bit in IV
  const decrypted = decryptGen4Packet(encrypted, key, corruptedIv);

  assert(decrypted[0] !== 0x01, 'Corrupted IV should corrupt initial decrypted byte');
});

suite.it('B7-3: Truncated buffer under 16 bytes is handled safely', () => {
  const { key, iv } = deriveKeyAndIv('AA:BB:CC:DD:EE:FF');
  const truncated = new Uint8Array([0x01, 0x08, 0x03]);
  // Decrypt on buffer < 16 bytes should throw because AES block size is 16
  assertThrows(() => {
    decryptGen4Packet(truncated, key, iv);
  });
});

suite.it('B7-4: Buffer of 17 bytes (between 16 and 20) is decrypted via overlapping chunks', () => {
  const { key, iv } = deriveKeyAndIv('AA:BB:CC:DD:EE:FF');
  const payload17 = new Uint8Array(17).fill(0x55);
  const enc = encryptGen4Packet(payload17, key, iv);
  const dec = decryptGen4Packet(enc, key, iv);
  assertEqual(dec.length, 17);
  assertEqual(dec[0], 0x55);
  assertEqual(dec[16], 0x55);
});

suite.it('B7-5: Tampered ciphertext in the overlap region (bytes 4..15) corrupts decode', () => {
  const cube = new VirtualGanCube();
  const validPacket = cube.encodeMovePacket('U');
  // Tamper byte 10 in ciphertext
  const tampered = new Uint8Array(validPacket);
  tampered[10] ^= 0xFF;

  assertThrows(() => {
    decodeGen4Packet(tampered, cube.sessionKey, cube.sessionIv);
  });
});
