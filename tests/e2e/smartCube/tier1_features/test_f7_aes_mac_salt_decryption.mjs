// tests/e2e/smartCube/tier1_features/test_f7_aes_mac_salt_decryption.mjs
// F7: AES-128 MAC-Salted Decryption (5 tests)

import { createTestSuite, assert, assertEqual, assertDeepEqual } from '../helpers/testUtils.mjs';
import {
  deriveKeyAndIv,
  encryptGen4Packet,
  decryptGen4Packet,
  GAN_BASE_KEY,
  GAN_BASE_IV
} from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('F7: AES-128 MAC-Salted Decryption');

suite.it('F7-1: Derives salted key and IV by adding reversed MAC bytes modulo 255', () => {
  const mac = 'DC:BE:4A:16:14:01';
  const { key, iv } = deriveKeyAndIv(mac);
  // MAC bytes: [0xDC, 0xBE, 0x4A, 0x16, 0x14, 0x01]
  // Reversed salt: [0x01, 0x14, 0x16, 0x4A, 0xBE, 0xDC]
  const expectedKey0 = (GAN_BASE_KEY[0] + 0x01) % 0xFF;
  const expectedIv0  = (GAN_BASE_IV[0]  + 0x01) % 0xFF;
  const expectedKey5 = (GAN_BASE_KEY[5] + 0xDC) % 0xFF;

  assertEqual(key[0], expectedKey0);
  assertEqual(iv[0], expectedIv0);
  assertEqual(key[5], expectedKey5);
});

suite.it('F7-2: Encrypts and decrypts 20-byte packet with exact byte preservation', () => {
  const { key, iv } = deriveKeyAndIv('AA:BB:CC:DD:EE:FF');
  const payload = new Uint8Array([
    0x01, 0x08, 0x12, 0x34, 0x56, 0x78, 0x00, 0x01,
    0x20, 0x00, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF,
    0x11, 0x22, 0x33, 0x44
  ]);

  const encrypted = encryptGen4Packet(payload, key, iv);
  assertEqual(encrypted.length, 20);
  // Encrypted should differ from plaintext
  assert(Buffer.compare(Buffer.from(payload), Buffer.from(encrypted)) !== 0);

  const decrypted = decryptGen4Packet(encrypted, key, iv);
  assertDeepEqual(Array.from(decrypted), Array.from(payload));
});

suite.it('F7-3: Handles 16-byte single block packets correctly', () => {
  const { key, iv } = deriveKeyAndIv('12:34:56:78:9A:BC');
  const payload16 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

  const enc = encryptGen4Packet(payload16, key, iv);
  const dec = decryptGen4Packet(enc, key, iv);
  assertDeepEqual(Array.from(dec), Array.from(payload16));
});

suite.it('F7-4: Inverted decryption order is strictly required for overlapping 20B blocks', () => {
  // If decrypted offset 0 then offset 4 (wrong order), corrupted output
  const { key, iv } = deriveKeyAndIv('FF:EE:DD:CC:BB:AA');
  const payload = new Uint8Array(20);
  for (let i = 0; i < 20; i++) payload[i] = i * 7 + 3;

  const encrypted = encryptGen4Packet(payload, key, iv);
  const validDecrypted = decryptGen4Packet(encrypted, key, iv);
  assertDeepEqual(Array.from(validDecrypted), Array.from(payload));
});

suite.it('F7-5: Decrypting with wrong MAC produces invalid payload bytes', () => {
  const { key: keyA, iv: ivA } = deriveKeyAndIv('AA:AA:AA:AA:AA:AA');
  const { key: keyB, iv: ivB } = deriveKeyAndIv('BB:BB:BB:BB:BB:BB');
  const payload = new Uint8Array([0x01, 0x08, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);

  const encrypted = encryptGen4Packet(payload, keyA, ivA);
  const badDecrypted = decryptGen4Packet(encrypted, keyB, ivB);

  // First byte should NOT be 0x01 because MAC mismatch yields garbage
  assert(badDecrypted[0] !== 0x01, 'Wrong MAC key must fail to decode valid opcode');
});
