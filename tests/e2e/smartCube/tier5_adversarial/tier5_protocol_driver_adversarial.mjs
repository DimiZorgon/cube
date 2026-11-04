// tests/e2e/smartCube/tier5_adversarial/tier5_protocol_driver_adversarial.mjs
// Milestone 5 Phase 2: Tier 5 Adversarial Coverage Hardening
// White-box audit & empirical stress suite for ganBleDriver.js, ganProtocol.js, macAddressUtils.js, aesBlockCipher.js

import {
  createTestSuite,
  assert,
  assertEqual,
  assertDeepEqual,
  assertRoughlyEqual,
  assertThrows,
  SOLVED_FACELETS
} from '../helpers/testUtils.mjs';

import {
  GanBleDriver,
  GattWriteQueue,
  GAN_GEN4_SERVICE,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN3_SERVICE,
  GAN_GEN2_SERVICE,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC,
  GAN_GEN3_COMMAND_CHARACTERISTIC,
  GAN_GEN3_STATE_CHARACTERISTIC,
  GAN_GEN2_COMMAND_CHARACTERISTIC,
  GAN_GEN2_STATE_CHARACTERISTIC
} from '../../../../src/utils/smartCube/ganBleDriver.js';

import * as ganProtocol from '../../../../src/utils/smartCube/ganProtocol.js';
import * as macUtils from '../../../../src/utils/smartCube/macAddressUtils.js';
import * as cipher from '../../../../src/utils/smartCube/aesBlockCipher.js';

import {
  MockBluetoothDevice,
  MockBluetoothRemoteGATTService,
  MockBluetoothRemoteGATTCharacteristic
} from '../mocks/mockWebBluetooth.mjs';

import { VirtualGanCube } from '../mocks/virtualGanCube.mjs';

export const suite = createTestSuite('Tier 5: White-Box Adversarial Protocol & Driver Hardening');

// ===========================================================================
// SECTION 1: ganProtocol.js — BitReader, Packet Decoders & Edge Cases
// ===========================================================================

suite.it('T5.P1: BitReader little-endian vs big-endian bit extraction on unaligned boundaries', () => {
  // Byte 0: 0b10110001 (0xB1), Byte 1: 0b11001010 (0xCA)
  const buf = new Uint8Array([0xB1, 0xCA]);
  const reader = new ganProtocol.BitReader(buf);

  // Big-endian: bits 4..9 spanning across byte 0 and byte 1
  // Byte 0 bits 4..7: 0b0001 (LSBs of byte 0, since bit 0 is MSB in BE indexing)
  // BE: bitIdx 4 -> bitInByte 7 - 4 = 3 -> bit 3 of 0xB1 (0)
  const beWord = reader.getBitWord(0, 8, false);
  assertEqual(beWord, 0xB1, 'BE 8 bits at offset 0 must match byte 0');

  // Little-endian: 8 bits at offset 0
  const leWord = reader.getBitWord(0, 8, true);
  assertEqual(leWord, 0xB1, 'LE 8 bits at offset 0 must match byte 0');

  // LE 16-bit word across 2 bytes: byte 0 (0xB1) + byte 1 (0xCA) << 8 = 0xCAB1 = 51889
  const le16 = reader.getBitWord(0, 16, true);
  assertEqual(le16, (0xCA << 8) | 0xB1, 'LE 16-bit word extraction');

  // BE 16-bit word across 2 bytes: (0xB1 << 8) | 0xCA = 0xB1CA = 45514
  const be16 = reader.getBitWord(0, 16, false);
  assertEqual(be16, (0xB1 << 8) | 0xCA, 'BE 16-bit word extraction');
});

suite.it('T5.P2: BitReader out-of-bounds offset reads zeroes without throwing', () => {
  const buf = new Uint8Array([0xFF, 0xFF]);
  const reader = new ganProtocol.BitReader(buf);

  // Buffer is 16 bits long. Read starting at bit offset 32 (completely out-of-bounds)
  const oobLe = reader.getBitWord(32, 8, true);
  assertEqual(oobLe, 0, 'OOB LE bit read must return 0');

  const oobBe = reader.getBitWord(32, 8, false);
  assertEqual(oobBe, 0, 'OOB BE bit read must return 0');

  // Partially out-of-bounds: bit offset 12, length 8
  const partial = reader.getBitWord(12, 8, true);
  // Bits 12..15 come from buf[1], bits 16..19 are out-of-bounds (0)
  assert(partial >= 0 && partial <= 0xFF, 'Partial OOB returns clamped integer');
});

suite.it('T5.P3: BitReader zero length bit read returns 0', () => {
  const buf = new Uint8Array([0xAA, 0x55]);
  const reader = new ganProtocol.BitReader(buf);

  assertEqual(reader.getBitWord(0, 0, true), 0, 'Zero length LE returns 0');
  assertEqual(reader.getBitWord(0, 0, false), 0, 'Zero length BE returns 0');
});

suite.it('T5.P4: BitReader 32-bit unsigned LE word extraction boundary values (0, max uint32)', () => {
  const buf = new Uint8Array(8);
  // Max 32-bit unsigned: 0xFFFFFFFF
  buf[0] = 0xFF; buf[1] = 0xFF; buf[2] = 0xFF; buf[3] = 0xFF;
  const reader = new ganProtocol.BitReader(buf);

  const maxVal = reader.getBitWord(0, 32, true);
  assertEqual(maxVal, 4294967295, 'Must return unsigned 32-bit integer 4294967295');
  assert(maxVal > 0, 'Must not be treated as signed negative integer -1');

  // Zero 32-bit
  buf[0] = 0; buf[1] = 0; buf[2] = 0; buf[3] = 0;
  assertEqual(reader.getBitWord(0, 32, true), 0, 'Must return 0 for zeroed buffer');
});

suite.it('T5.P5: Move packet (0x01) decoding across all 6 valid faces with CW direction (0)', () => {
  const testFaces = [
    { raw: 2, name: 'U' },
    { raw: 32, name: 'R' },
    { raw: 8, name: 'F' },
    { raw: 1, name: 'D' },
    { raw: 16, name: 'L' },
    { raw: 4, name: 'B' }
  ];

  for (const { raw, name } of testFaces) {
    const buf = new Uint8Array(20);
    buf[0] = 0x01; // MOVE
    // Timestamp LE: 1234ms
    buf[2] = 0xD2; buf[3] = 0x04; buf[4] = 0x00; buf[5] = 0x00;
    // Serial LE: 77
    buf[6] = 0x4D; buf[7] = 0x00;
    // Direction: 0 (CW) -> bits 64..65, RawFace: raw -> bits 66..71
    // Byte 8 = (direction << 6) | rawFace
    buf[8] = (0 << 6) | raw;

    const decoded = ganProtocol.decodeGen4Packet(buf);
    assertEqual(decoded.type, 'MOVE');
    assertEqual(decoded.move, name);
    assertEqual(decoded.face, name);
    assertEqual(decoded.direction, 0);
    assertEqual(decoded.rawFace, raw);
    assertEqual(decoded.cubeTimestamp, 1234);
    assertEqual(decoded.serial, 77);
  }
});

suite.it('T5.P6: Move packet (0x01) decoding across all 6 valid faces with CCW direction (1) yielding prime notation', () => {
  const testFaces = [
    { raw: 2, name: 'U' },
    { raw: 32, name: 'R' },
    { raw: 8, name: 'F' },
    { raw: 1, name: 'D' },
    { raw: 16, name: 'L' },
    { raw: 4, name: 'B' }
  ];

  for (const { raw, name } of testFaces) {
    const buf = new Uint8Array(20);
    buf[0] = 0x01;
    // Direction: 1 (CCW) -> byte 8 = (1 << 6) | raw
    buf[8] = (1 << 6) | raw;

    const decoded = ganProtocol.decodeGen4Packet(buf);
    assertEqual(decoded.type, 'MOVE');
    assertEqual(decoded.move, name + "'");
    assertEqual(decoded.face, name);
    assertEqual(decoded.direction, 1);
  }
});

suite.it('T5.P7: Move packet (0x01) direction values 2 and 3 preserved without crashing', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0x01;
  // Direction = 2, Face = U (2)
  buf[8] = (2 << 6) | 2;
  const decoded2 = ganProtocol.decodeGen4Packet(buf);
  assertEqual(decoded2.type, 'MOVE');
  assertEqual(decoded2.direction, 2);
  assertEqual(decoded2.face, 'U');

  // Direction = 3, Face = R (32)
  buf[8] = (3 << 6) | 32;
  const decoded3 = ganProtocol.decodeGen4Packet(buf);
  assertEqual(decoded3.type, 'MOVE');
  assertEqual(decoded3.direction, 3);
  assertEqual(decoded3.face, 'R');
});

suite.it('T5.P8: Move packet (0x01) throws descriptive error for invalid raw face codes', () => {
  const invalidFaces = [0, 3, 5, 6, 7, 15, 31, 63];
  for (const inv of invalidFaces) {
    const buf = new Uint8Array(20);
    buf[0] = 0x01;
    buf[8] = inv;

    assertThrows(() => {
      ganProtocol.decodeGen4Packet(buf);
    }, /Invalid face code in move packet/);
  }
});

suite.it('T5.P9: Battery packet (0xEF) telemetry nominal values (0%, 50%, 100%)', () => {
  for (const level of [0, 1, 50, 99, 100]) {
    const buf = new Uint8Array(20);
    buf[0] = 0xEF;
    buf[2] = level;
    const decoded = ganProtocol.decodeGen4Packet(buf);
    assertEqual(decoded.type, 'BATTERY');
    assertEqual(decoded.batteryLevel, level);
  }
});

suite.it('T5.P10: Battery packet (0xEF) telemetry clamp values > 100% to 100%', () => {
  for (const overflow of [101, 150, 200, 255]) {
    const buf = new Uint8Array(20);
    buf[0] = 0xEF;
    buf[2] = overflow;
    const decoded = ganProtocol.decodeGen4Packet(buf);
    assertEqual(decoded.type, 'BATTERY');
    assertEqual(decoded.batteryLevel, 100, `Level ${overflow} must clamp to 100`);
  }
});

suite.it('T5.P11: Gyroscope packet (0xEC) quaternion component normalization (+1.0, -1.0, 0.0)', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEC;

  // qw = 0x7FFF (+1.0) -> bytes 2..3
  buf[2] = 0x7F; buf[3] = 0xFF;
  // qx = 0xFFFF (-1.0) -> bytes 4..5
  buf[4] = 0xFF; buf[5] = 0xFF;
  // qy = 0x0000 (0.0)  -> bytes 6..7
  buf[6] = 0x00; buf[7] = 0x00;
  // qz = 0x3FFF (~0.5) -> bytes 8..9
  buf[8] = 0x3F; buf[9] = 0xFF;

  const decoded = ganProtocol.decodeGen4Packet(buf);
  assertEqual(decoded.type, 'GYRO');
  assertRoughlyEqual(decoded.quaternion.qw, 1.0, 0.001);
  assertRoughlyEqual(decoded.quaternion.qx, -1.0, 0.001);
  assertRoughlyEqual(decoded.quaternion.qy, 0.0, 0.001);
  assertRoughlyEqual(decoded.quaternion.qz, 0.5, 0.002);
});

suite.it('T5.P12: Gyroscope packet (0xEC) 4 quaternion components isolation without cross-talk', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEC;

  // Only qx has non-zero value
  buf[4] = 0x7F; buf[5] = 0xFF; // qx = 1.0
  const decoded = ganProtocol.decodeGen4Packet(buf);
  assertRoughlyEqual(decoded.quaternion.qx, 1.0, 0.001);
  assertRoughlyEqual(decoded.quaternion.qw, 0.0, 0.001);
  assertRoughlyEqual(decoded.quaternion.qy, 0.0, 0.001);
  assertRoughlyEqual(decoded.quaternion.qz, 0.0, 0.001);
});

suite.it('T5.P13: Facelets packet (0xED) solved state correctly yields SOLVED_FACELETS (54 characters)', () => {
  const cube = new VirtualGanCube();
  const faceletsPacket = cube.encodeFaceletsPacket();
  const decoded = ganProtocol.decodeGen4Packet(faceletsPacket, cube.sessionKey, cube.sessionIv);

  assertEqual(decoded.type, 'FACELETS');
  assertEqual(decoded.facelets, SOLVED_FACELETS);
  assertEqual(decoded.facelets.length, 54);
  assertDeepEqual(decoded.cp, [0, 1, 2, 3, 4, 5, 6, 7], 'CP must be identity [0..7]');
  assertDeepEqual(decoded.co, [0, 0, 0, 0, 0, 0, 0, 0], 'CO must be zero [0..0]');
  assertDeepEqual(decoded.ep, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'EP must be identity [0..11]');
  assertDeepEqual(decoded.eo, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'EO must be zero [0..0]');
});

suite.it('T5.P14: Facelets packet (0xED) corner twist parity deduction (8th corner CO)', () => {
  const raw = new Uint8Array(20);
  raw[0] = 0xED;
  const decoded = ganProtocol.decodeGen4Packet(raw);
  assertEqual(decoded.type, 'FACELETS');
  // Co sum for all zeros: 8th corner is (3 - 0) % 3 = 0
  assertEqual(decoded.co[7], 0);
});

suite.it('T5.P15: Facelets packet (0xED) scrambled cube yields non-solved facelets and isSolved false', () => {
  const raw = new Uint8Array(20);
  raw[0] = 0xED;
  // Non-solved CP
  raw[4] = 0x20;
  const decoded = ganProtocol.decodeGen4Packet(raw);
  assertEqual(decoded.type, 'FACELETS');
  assert(typeof decoded.facelets === 'string' && decoded.facelets.length === 54, 'Must return 54-char Kociemba facelets');
  assert(decoded.facelets !== SOLVED_FACELETS, 'Scrambled facelets must not equal SOLVED_FACELETS');
});

suite.it('T5.P16: Unknown packet opcodes (0x00, 0x02, 0x99, 0xDF, 0xFC, 0xFF) return UNKNOWN type without throwing', () => {
  const opcodes = [0x00, 0x02, 0x99, 0xDF, 0xFC, 0xFE, 0xFF];
  for (const op of opcodes) {
    const buf = new Uint8Array(20);
    buf[0] = op;
    const decoded = ganProtocol.decodeGen4Packet(buf);
    assertEqual(decoded.type, 'UNKNOWN');
    assertEqual(decoded.eventType, op);
  }
});

suite.it('T5.P17: Face code utility helpers (isValidFaceCode, faceCodeToMove) boundary validation', () => {
  // Valid codes: 2(U), 32(R), 8(F), 1(D), 16(L), 4(B)
  assertEqual(ganProtocol.isValidFaceCode(2), true);
  assertEqual(ganProtocol.isValidFaceCode(32), true);
  assertEqual(ganProtocol.isValidFaceCode(8), true);
  assertEqual(ganProtocol.isValidFaceCode(1), true);
  assertEqual(ganProtocol.isValidFaceCode(16), true);
  assertEqual(ganProtocol.isValidFaceCode(4), true);

  // Invalid codes
  assertEqual(ganProtocol.isValidFaceCode(0), false);
  assertEqual(ganProtocol.isValidFaceCode(-1), false);
  assertEqual(ganProtocol.isValidFaceCode(3), false);
  assertEqual(ganProtocol.isValidFaceCode(64), false);
  assertEqual(ganProtocol.isValidFaceCode(null), false);
  assertEqual(ganProtocol.isValidFaceCode(undefined), false);

  // faceCodeToMove
  assertEqual(ganProtocol.faceCodeToMove(2, 0), 'U');
  assertEqual(ganProtocol.faceCodeToMove(2, 1), "U'");
  assertEqual(ganProtocol.faceCodeToMove(32, 0), 'R');
  assertEqual(ganProtocol.faceCodeToMove(32, 1), "R'");
  assertEqual(ganProtocol.faceCodeToMove(8, 0), 'F');
  assertEqual(ganProtocol.faceCodeToMove(8, 1), "F'");
  assertEqual(ganProtocol.faceCodeToMove(1, 0), 'D');
  assertEqual(ganProtocol.faceCodeToMove(1, 1), "D'");
  assertEqual(ganProtocol.faceCodeToMove(16, 0), 'L');
  assertEqual(ganProtocol.faceCodeToMove(16, 1), "L'");
  assertEqual(ganProtocol.faceCodeToMove(4, 0), 'B');
  assertEqual(ganProtocol.faceCodeToMove(4, 1), "B'");

  // Invalid face code to move returns null
  assertEqual(ganProtocol.faceCodeToMove(99, 0), null);
  assertEqual(ganProtocol.faceCodeToMove(0, 1), null);
});

suite.it('T5.P18: Protocol command constants byte layout and length', () => {
  assertEqual(ganProtocol.COMMAND_REQUEST_FACELETS.length, 20);
  assertEqual(ganProtocol.COMMAND_REQUEST_FACELETS[0], 0xDD);
  assertEqual(ganProtocol.COMMAND_REQUEST_FACELETS[3], 0xED);

  assertEqual(ganProtocol.COMMAND_REQUEST_BATTERY.length, 20);
  assertEqual(ganProtocol.COMMAND_REQUEST_BATTERY[0], 0xDD);
  assertEqual(ganProtocol.COMMAND_REQUEST_BATTERY[3], 0xEF);

  assertEqual(ganProtocol.COMMAND_REQUEST_HARDWARE.length, 20);
  assertEqual(ganProtocol.COMMAND_REQUEST_HARDWARE[0], 0xDF);
  assertEqual(ganProtocol.COMMAND_REQUEST_HARDWARE[1], 0x03);

  assertEqual(ganProtocol.COMMAND_HARDWARE_RESET.length, 20);
  assertEqual(ganProtocol.COMMAND_HARDWARE_RESET[0], 0xD2);
  assertEqual(ganProtocol.COMMAND_HARDWARE_RESET[1], 0x0D);
});


// ===========================================================================
// SECTION 2: macAddressUtils.js — Validation, Formatting & LocalStorage
// ===========================================================================

suite.it('T5.M1: isValidMacAddress validates colon, hyphen, flat hex, and mixed cases', () => {
  const validCases = [
    'DC:BE:4A:16:14:01',
    'dc:be:4a:16:14:01',
    'DC-BE-4A-16-14-01',
    'dc-be-4a-16-14-01',
    'DCBE4A161401',
    'dcbe4a161401',
    '00:11:22:33:44:55',
    'FF:FF:FF:FF:FF:FF',
    '  DC:BE:4A:16:14:01  ' // with trimming
  ];

  for (const mac of validCases) {
    assertEqual(macUtils.isValidMacAddress(mac), true, `Failed on valid MAC: ${mac}`);
  }
});

suite.it('T5.M2: isValidMacAddress rejects non-string inputs (null, undefined, numbers, objects, arrays)', () => {
  const nonStrings = [null, undefined, 123456789012, {}, [], true, false, Symbol('mac')];
  for (const item of nonStrings) {
    assertEqual(macUtils.isValidMacAddress(item), false, `Must reject non-string: ${String(item)}`);
  }
});

suite.it('T5.M3: isValidMacAddress rejects invalid character sets (G-Z, symbols, non-hex)', () => {
  const badChars = [
    'GG:BE:4A:16:14:01',
    'DC:BE:4A:16:14:ZZ',
    'DC:BE:4A:16:14:0?',
    'DC:BE:4A:16:14:0 ',
    'DC_BE_4A_16_14_01'
  ];
  for (const bad of badChars) {
    assertEqual(macUtils.isValidMacAddress(bad), false, `Must reject invalid chars: ${bad}`);
  }
});

suite.it('T5.M4: isValidMacAddress rejects incorrect lengths (< 12 hex digits or > 12 hex digits)', () => {
  const wrongLengths = [
    '',
    '   ',
    'DC:BE:4A:16:14', // 10 hex digits
    'DC:BE:4A:16:14:0', // 11 hex digits
    'DC:BE:4A:16:14:01:02', // 14 hex digits
    '0123456789AB0' // 13 hex digits
  ];
  for (const wl of wrongLengths) {
    assertEqual(macUtils.isValidMacAddress(wl), false, `Must reject length: "${wl}"`);
  }
});

suite.it('T5.M5: formatMacAddress normalizes mixed lowercase/hyphen/flat input to uppercase colon format', () => {
  assertEqual(macUtils.formatMacAddress('dc-be-4a-16-14-01'), 'DC:BE:4A:16:14:01');
  assertEqual(macUtils.formatMacAddress('dcbe4a161401'), 'DC:BE:4A:16:14:01');
  assertEqual(macUtils.formatMacAddress('  dc:be:4a:16:14:01  '), 'DC:BE:4A:16:14:01');
  assertEqual(macUtils.formatMacAddress('001122334455'), '00:11:22:33:44:55');
});

suite.it('T5.M6: formatMacAddress throws descriptive Error on malformed input', () => {
  assertThrows(() => {
    macUtils.formatMacAddress('invalid-mac');
  }, /Invalid MAC address/);

  assertThrows(() => {
    macUtils.formatMacAddress(null);
  }, /Invalid MAC address/);
});

suite.it('T5.M7: parseMacAddress parses MAC string into 6-element integer byte array in [0..255]', () => {
  const parsed = macUtils.parseMacAddress('DC:BE:4A:16:14:01');
  assertDeepEqual(parsed, [0xDC, 0xBE, 0x4A, 0x16, 0x14, 0x01]);

  const zeroes = macUtils.parseMacAddress('00:00:00:00:00:00');
  assertDeepEqual(zeroes, [0, 0, 0, 0, 0, 0]);

  const maxes = macUtils.parseMacAddress('FF:FF:FF:FF:FF:FF');
  assertDeepEqual(maxes, [255, 255, 255, 255, 255, 255]);
});

suite.it('T5.M8: loadCachedMac, saveCachedMac, and clearCachedMac handle undefined localStorage gracefully', () => {
  // Save original localStorage
  const origLs = globalThis.localStorage;
  try {
    delete globalThis.localStorage;
    assertEqual(macUtils.loadCachedMac(), null, 'Must return null when localStorage undefined');
    const saved = macUtils.saveCachedMac('DC:BE:4A:16:14:01');
    assertEqual(saved, 'DC:BE:4A:16:14:01', 'saveCachedMac returns formatted string even if storage is undefined');
    // clearCachedMac should not throw
    macUtils.clearCachedMac();
  } finally {
    if (origLs) globalThis.localStorage = origLs;
  }
});

suite.it('T5.M9: LocalStorage caching round-trip and corrupted entry rejection', () => {
  const mockStorage = new Map();
  const mockLs = {
    getItem: (k) => mockStorage.get(k) ?? null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k)
  };

  const origLs = globalThis.localStorage;
  try {
    globalThis.localStorage = mockLs;

    // 1. Initially null
    assertEqual(macUtils.loadCachedMac(), null);

    // 2. Save valid MAC
    const saved = macUtils.saveCachedMac('dc-be-4a-16-14-01');
    assertEqual(saved, 'DC:BE:4A:16:14:01');
    assertEqual(macUtils.loadCachedMac(), 'DC:BE:4A:16:14:01');

    // 3. Corrupt stored value directly in localStorage
    mockStorage.set(macUtils.STORAGE_KEY_MAC, 'corrupt-not-a-mac');
    assertEqual(macUtils.loadCachedMac(), null, 'Must return null for corrupted storage entry');

    // 4. Save invalid MAC returns null and does not overwrite with garbage
    assertEqual(macUtils.saveCachedMac('invalid-mac'), null);

    // 5. Clear cached MAC
    macUtils.saveCachedMac('DC:BE:4A:16:14:01');
    assertEqual(macUtils.loadCachedMac(), 'DC:BE:4A:16:14:01');
    macUtils.clearCachedMac();
    assertEqual(macUtils.loadCachedMac(), null);
  } finally {
    if (origLs) globalThis.localStorage = origLs;
    else delete globalThis.localStorage;
  }
});


// ===========================================================================
// SECTION 3: aesBlockCipher.js — Cryptographic Invariants & Fuzzing
// ===========================================================================

suite.it('T5.C1: Salt derivation reverses MAC bytes and applies modulo 255 addition', () => {
  const mac = 'DC:BE:4A:16:14:01';
  // Parsed: [0xDC, 0xBE, 0x4A, 0x16, 0x14, 0x01] = [220, 190, 74, 22, 20, 1]
  // Reversed: [1, 20, 22, 74, 190, 220]
  // GAN_BASE_KEY: [0x01, 0x02, 0x42, 0x28, 0x31, 0x91, ...]
  // Expected key[0] = (1 + 1) % 255 = 2
  // Expected key[1] = (2 + 20) % 255 = 22
  // Expected key[2] = (0x42 + 22) % 255 = (66 + 22) = 88
  // Expected key[3] = (0x28 + 74) % 255 = (40 + 74) = 114
  // Expected key[4] = (0x31 + 190) % 255 = (49 + 190) = 239
  // Expected key[5] = (0x91 + 220) % 255 = (145 + 220) = 365 % 255 = 110
  const { key } = cipher.deriveKeyAndIv(mac);
  assertEqual(key[0], 2);
  assertEqual(key[1], 22);
  assertEqual(key[2], 88);
  assertEqual(key[3], 114);
  assertEqual(key[4], 239);
  assertEqual(key[5], 110);
});

suite.it('T5.C2: 16-byte single block AES-128-CBC encryption and decryption round-trip', () => {
  const { key, iv } = cipher.deriveKeyAndIv('DC:BE:4A:16:14:01');
  const plaintext16 = new Uint8Array([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10
  ]);

  const encrypted = cipher.encryptGen4Packet(plaintext16, key, iv);
  assertEqual(encrypted.length, 16);
  assert(encrypted.some((b, i) => b !== plaintext16[i]), 'Ciphertext must differ from plaintext');

  const decrypted = cipher.decryptGen4Packet(encrypted, key, iv);
  assertDeepEqual(Array.from(decrypted), Array.from(plaintext16), 'Decrypted must match plaintext byte-for-byte');
});

suite.it('T5.C3: 20-byte dual block AES-128-CBC encryption with overlapping bytes 4..15 round-trip', () => {
  const { key, iv } = cipher.deriveKeyAndIv('DC:BE:4A:16:14:01');
  const plaintext20 = new Uint8Array(20);
  for (let i = 0; i < 20; i++) plaintext20[i] = (i * 13 + 7) & 0xFF;

  const encrypted = cipher.encryptGen4Packet(plaintext20, key, iv);
  assertEqual(encrypted.length, 20);

  const decrypted = cipher.decryptGen4Packet(encrypted, key, iv);
  assertDeepEqual(Array.from(decrypted), Array.from(plaintext20), '20-byte decrypted must match original plaintext');
});

suite.it('T5.C4: Cryptographic fuzz stress: 500 random 20-byte payloads with arbitrary salts preserve byte identity', () => {
  const randomMacs = [
    '00:11:22:33:44:55',
    'FF:EE:DD:CC:BB:AA',
    '12:34:56:78:9A:BC',
    'DC:BE:4A:16:14:01'
  ];

  for (let iter = 0; iter < 500; iter++) {
    const mac = randomMacs[iter % randomMacs.length];
    const { key, iv } = cipher.deriveKeyAndIv(mac);

    const randomPayload = new Uint8Array(20);
    for (let j = 0; j < 20; j++) {
      randomPayload[j] = Math.floor(Math.random() * 256);
    }

    const encrypted = cipher.encryptGen4Packet(randomPayload, key, iv);
    const decrypted = cipher.decryptGen4Packet(encrypted, key, iv);

    for (let k = 0; k < 20; k++) {
      if (decrypted[k] !== randomPayload[k]) {
        throw new Error(`Fuzz mismatch at iter ${iter}, byte ${k}: expected ${randomPayload[k]}, got ${decrypted[k]}`);
      }
    }
  }
});


// ===========================================================================
// SECTION 4: ganBleDriver.js — Concurrency, Lifecycle & Error Recovery
// ===========================================================================

suite.it('T5.D1: GattWriteQueue strictly serializes 100 concurrent asynchronous writes in FIFO order', async () => {
  const queue = new GattWriteQueue();
  const executionOrder = [];

  const promises = [];
  for (let i = 0; i < 100; i++) {
    const id = i;
    promises.push(
      queue.enqueue(async () => {
        // Yield microtick to allow potential interleaving race conditions
        await new Promise(r => setTimeout(r, 1));
        executionOrder.push(id);
        return id;
      })
    );
  }

  const results = await Promise.all(promises);
  assertEqual(results.length, 100);
  assertEqual(executionOrder.length, 100);

  for (let i = 0; i < 100; i++) {
    assertEqual(executionOrder[i], i, `FIFO order broken at index ${i}`);
    assertEqual(results[i], i, `Return value mismatch at index ${i}`);
  }
});

suite.it('T5.D2: GattWriteQueue error isolation: operation rejection does not block subsequent enqueued operations', async () => {
  const queue = new GattWriteQueue();
  const executionLog = [];

  const p1 = queue.enqueue(async () => {
    executionLog.push('op1');
    return 'res1';
  });

  const p2 = queue.enqueue(async () => {
    executionLog.push('op2-fail');
    throw new Error('GATT write timeout simulated');
  });

  const p3 = queue.enqueue(async () => {
    executionLog.push('op3');
    return 'res3';
  });

  const r1 = await p1;
  assertEqual(r1, 'res1');

  let caughtP2 = false;
  try {
    await p2;
  } catch (err) {
    caughtP2 = true;
    assertEqual(err.message, 'GATT write timeout simulated');
  }
  assertEqual(caughtP2, true, 'p2 must reject with its own error');

  const r3 = await p3;
  assertEqual(r3, 'res3', 'p3 must resolve successfully despite p2 rejection');
  assertDeepEqual(executionLog, ['op1', 'op2-fail', 'op3']);
});

suite.it('T5.D3: GattWriteQueue synchronous throw isolation: sync throws inside task do not break queue', async () => {
  const queue = new GattWriteQueue();

  const p1 = queue.enqueue(() => {
    throw new TypeError('Sync type error');
  });

  const p2 = queue.enqueue(() => 'after sync throw');

  await assertThrows(async () => { await p1; }, /Sync type error/);
  const r2 = await p2;
  assertEqual(r2, 'after sync throw');
});

suite.it('T5.D4: Primary GATT service candidate hierarchy: resolves Gen4 alias when Gen4 primary missing', async () => {
  const dev = new MockBluetoothDevice('dev-alias-only', 'GAN-Alias');
  // Service has ONLY alias UUID (0000fff0)
  const aliasSvc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE_ALIAS, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC, aliasSvc);
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_STATE_CHARACTERISTIC, aliasSvc);
  aliasSvc.addCharacteristic(cmdChar);
  aliasSvc.addCharacteristic(stateChar);
  dev.gatt.addService(aliasSvc);

  const driver = new GanBleDriver();
  const res = await driver.connect(dev);
  assertEqual(res.deviceName, 'GAN-Alias');
  assertEqual(driver.commandChar.uuid, GAN_GEN4_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN4_STATE_CHARACTERISTIC.toLowerCase());
  driver.disconnect();
});

suite.it('T5.D5: Primary GATT service candidate hierarchy: resolves Gen3 when Gen4 and Alias missing', async () => {
  const dev = new MockBluetoothDevice('dev-gen3-only', 'GAN-Gen3');
  // Service has ONLY Gen3 UUID (8653000a)
  const gen3Svc = new MockBluetoothRemoteGATTService(GAN_GEN3_SERVICE, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN3_COMMAND_CHARACTERISTIC, gen3Svc);
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN3_STATE_CHARACTERISTIC, gen3Svc);
  gen3Svc.addCharacteristic(cmdChar);
  gen3Svc.addCharacteristic(stateChar);
  dev.gatt.addService(gen3Svc);

  const driver = new GanBleDriver();
  const res = await driver.connect(dev);
  assertEqual(res.deviceName, 'GAN-Gen3');
  assertEqual(driver.commandChar.uuid, GAN_GEN3_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN3_STATE_CHARACTERISTIC.toLowerCase());
  driver.disconnect();
});

suite.it('T5.D6: Primary GATT service candidate hierarchy: resolves Gen2 when Gen4 and Gen3 missing', async () => {
  const dev = new MockBluetoothDevice('dev-gen2-only', 'GAN-Gen2');
  // Service has ONLY Gen2 UUID (6e400001)
  const gen2Svc = new MockBluetoothRemoteGATTService(GAN_GEN2_SERVICE, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN2_COMMAND_CHARACTERISTIC, gen2Svc);
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN2_STATE_CHARACTERISTIC, gen2Svc);
  gen2Svc.addCharacteristic(cmdChar);
  gen2Svc.addCharacteristic(stateChar);
  dev.gatt.addService(gen2Svc);

  const driver = new GanBleDriver();
  const res = await driver.connect(dev);
  assertEqual(res.deviceName, 'GAN-Gen2');
  assertEqual(driver.commandChar.uuid, GAN_GEN2_COMMAND_CHARACTERISTIC.toLowerCase());
  assertEqual(driver.stateChar.uuid, GAN_GEN2_STATE_CHARACTERISTIC.toLowerCase());
  driver.disconnect();
});

suite.it('T5.D7: Primary GATT service resolution failure: throws NotFoundError when no candidate matches', async () => {
  const dev = new MockBluetoothDevice('dev-unrelated', 'OtherBLE');
  const dummySvc = new MockBluetoothRemoteGATTService('0000180f-0000-1000-8000-00805f9b34fb', dev);
  dev.gatt.addService(dummySvc);

  const driver = new GanBleDriver();
  let statusEmitted = null;
  driver.onStatusChange = (status) => { statusEmitted = status; };

  await assertThrows(async () => {
    await driver.connect(dev);
  }, /NotFoundError: No compatible GAN GATT service/);

  assertEqual(statusEmitted, 'error');
  assertEqual(driver.server, null);
  assertEqual(driver.commandChar, null);
  assertEqual(driver.stateChar, null);
});

suite.it('T5.D8: Error recovery: GATT server connect failure triggers error status, cleans up and rethrows', async () => {
  const dev = new MockBluetoothDevice('dev-conn-fail', 'GAN-Fail');
  dev.gatt.connect = async () => {
    throw new Error('NetworkError: Connection failed to initiate');
  };

  const driver = new GanBleDriver();
  const statusHistory = [];
  driver.onStatusChange = (s) => statusHistory.push(s);

  await assertThrows(async () => {
    await driver.connect(dev);
  }, /Connection failed to initiate/);

  assertDeepEqual(statusHistory, ['connecting', 'error']);
  assertEqual(driver.server, null);
});

suite.it('T5.D9: Error recovery: Characteristic resolution failure triggers error status and cleans up', async () => {
  const dev = new MockBluetoothDevice('dev-bad-char', 'GAN-BadChar');
  const svc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE, dev);
  // Add only command characteristic with write property ONLY (no notify), omit state characteristic
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(
    GAN_GEN4_COMMAND_CHARACTERISTIC,
    svc,
    { read: false, write: true, notify: false }
  );
  svc.addCharacteristic(cmdChar);
  dev.gatt.addService(svc);

  const driver = new GanBleDriver();
  let finalStatus = null;
  driver.onStatusChange = (s) => { finalStatus = s; };

  await assertThrows(async () => {
    await driver.connect(dev);
  }, /NotFoundError/);

  assertEqual(finalStatus, 'error');
  assertEqual(driver.commandChar, null);
  assertEqual(driver.stateChar, null);
});

suite.it('T5.D10: Error recovery: startNotifications failure triggers error status and cleans up', async () => {
  const dev = new MockBluetoothDevice('dev-notify-fail', 'GAN-NotifyFail');
  const svc = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE, dev);
  const cmdChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC, svc);
  const stateChar = new MockBluetoothRemoteGATTCharacteristic(GAN_GEN4_STATE_CHARACTERISTIC, svc);
  stateChar.startNotifications = async () => {
    throw new Error('SecurityError: Notification permission denied');
  };
  svc.addCharacteristic(cmdChar);
  svc.addCharacteristic(stateChar);
  dev.gatt.addService(svc);

  const driver = new GanBleDriver();
  let finalStatus = null;
  driver.onStatusChange = (s) => { finalStatus = s; };

  await assertThrows(async () => {
    await driver.connect(dev);
  }, /SecurityError/);

  assertEqual(finalStatus, 'error');
  assertEqual(driver.commandChar, null);
});

suite.it('T5.D11: Disconnect idempotency: multiple consecutive disconnect() calls are completely safe', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();
  await driver.connect(cube.device);

  const statuses = [];
  driver.onStatusChange = (s) => statuses.push(s);

  driver.disconnect();
  driver.disconnect();
  driver.disconnect();

  assert(statuses.length >= 3, 'Must record at least 3 disconnected transitions');
  assertEqual(statuses.every(s => s === 'disconnected'), true);
  assertEqual(driver.server, null);
});

suite.it('T5.D12: Disconnect on unattached driver: safe no-op without error', () => {
  const driver = new GanBleDriver();
  let status = null;
  driver.onStatusChange = (s) => { status = s; };
  driver.disconnect();
  assertEqual(status, 'disconnected');
});

suite.it('T5.D13: OS-initiated disconnect (gattserverdisconnected event) cleans up GATT state and updates status', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();
  await driver.connect(cube.device);

  let status = null;
  driver.onStatusChange = (s) => { status = s; };

  // Trigger unsolicited hardware disconnect from the device side
  cube.disconnectDevice();

  assertEqual(status, 'disconnected');
  assertEqual(driver.server, null);
  assertEqual(driver.commandChar, null);
  assertEqual(driver.stateChar, null);
});

suite.it('T5.D14: Disconnect while write in progress: queued writes reject with NetworkError', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();
  await driver.connect(cube.device);

  driver.disconnect();

  await assertThrows(async () => {
    await driver.sendCommand(new Uint8Array(20));
  }, /NetworkError: GATT server is disconnected/);
});

suite.it('T5.D15: Zero listener leaks across 50 consecutive connect/disconnect cycles on production driver', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();

  for (let i = 0; i < 50; i++) {
    await driver.connect(cube.device);
    driver.disconnect();
  }

  const devListeners = cube.device._listeners.get('gattserverdisconnected');
  const stateListeners = cube.stateChar._listeners.get('characteristicvaluechanged');

  assertEqual(devListeners ? devListeners.size : 0, 0, 'Device disconnected listeners must be 0');
  assertEqual(stateListeners ? stateListeners.size : 0, 0, 'Characteristic notification listeners must be 0');
});

suite.it('T5.D16: Command dispatch payload verifications (sendHardwareReset, requestFacelets, requestBattery, requestHardware)', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();
  await driver.connect(cube.device);

  let lastWrittenBytes = null;
  cube.commandChar.setWriteHandler(async (bytes) => {
    lastWrittenBytes = new Uint8Array(bytes);
  });

  // 1. sendHardwareReset (0xD2)
  await driver.sendHardwareReset();
  assertEqual(lastWrittenBytes.length, 20);
  assertEqual(lastWrittenBytes[0], 0xD2);
  assertEqual(lastWrittenBytes[1], 0x0D);
  assertEqual(lastWrittenBytes[2], 0x05);
  assertEqual(lastWrittenBytes[7], 0x01);
  assertEqual(lastWrittenBytes[12], 0xAB);

  // 2. requestFacelets (0xDD 0xED)
  await driver.requestFacelets();
  assertEqual(lastWrittenBytes.length, 20);
  assertEqual(lastWrittenBytes[0], 0xDD);
  assertEqual(lastWrittenBytes[1], 0x04);
  assertEqual(lastWrittenBytes[3], 0xED);

  // 3. requestBattery (0xDD 0xEF)
  await driver.requestBattery();
  assertEqual(lastWrittenBytes.length, 20);
  assertEqual(lastWrittenBytes[0], 0xDD);
  assertEqual(lastWrittenBytes[1], 0x04);
  assertEqual(lastWrittenBytes[3], 0xEF);

  // 4. requestHardware (0xDF)
  await driver.requestHardware();
  assertEqual(lastWrittenBytes.length, 20);
  assertEqual(lastWrittenBytes[0], 0xDF);
  assertEqual(lastWrittenBytes[1], 0x03);

  driver.disconnect();
});

suite.it('T5.D17: sendCommand accepts both Uint8Array and Array of numbers', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();
  await driver.connect(cube.device);

  let receivedType = null;
  cube.commandChar.setWriteHandler(async (bytes) => {
    receivedType = bytes.constructor.name;
  });

  // Uint8Array
  await driver.sendCommand(new Uint8Array(20));
  assertEqual(receivedType, 'Uint8Array');

  // Plain number array
  await driver.sendCommand(Array(20).fill(0xAA));
  assertEqual(receivedType, 'Uint8Array');

  driver.disconnect();
});

suite.it('T5.D18: Notification dispatch: encrypted MOVE packet routes to onMove callback with all fields', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver({ macAddress: cube.macAddress });
  await driver.connect(cube.device);

  let moveReceived = null;
  driver.onMove = (data) => { moveReceived = data; };

  cube.emitMove("R'", 9876);

  assert(moveReceived !== null, 'onMove must be invoked');
  assertEqual(moveReceived.move, "R'");
  assertEqual(moveReceived.face, 'R');
  assertEqual(moveReceived.direction, 1);
  assertEqual(moveReceived.timestamp, 9876);
  assert(typeof moveReceived.serial === 'number');

  driver.disconnect();
});

suite.it('T5.D19: Notification dispatch: encrypted BATTERY packet routes to onBattery callback', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver({ macAddress: cube.macAddress });
  await driver.connect(cube.device);

  let batteryReceived = null;
  driver.onBattery = (level) => { batteryReceived = level; };

  cube.emitBattery(73);

  assertEqual(batteryReceived, 73);
  driver.disconnect();
});

suite.it('T5.D20: Notification dispatch: encrypted GYRO packet routes to onGyro callback', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver({ macAddress: cube.macAddress });
  await driver.connect(cube.device);

  let gyroReceived = null;
  driver.onGyro = (quat) => { gyroReceived = quat; };

  cube.emitGyro(1.0, 0.0, 0.0, 0.0);

  assert(Array.isArray(gyroReceived), 'onGyro argument must be array');
  assertEqual(gyroReceived.length, 4);
  assertRoughlyEqual(gyroReceived[3], 1.0, 0.001); // qw is index 3 in [qx, qy, qz, qw]
  driver.disconnect();
});

suite.it('T5.D21: Notification dispatch: encrypted FACELETS packet routes to onFacelets callback', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver({ macAddress: cube.macAddress });
  await driver.connect(cube.device);

  let faceletsReceived = null;
  driver.onFacelets = (f) => { faceletsReceived = f; };

  cube.emitFacelets();

  assertEqual(faceletsReceived, SOLVED_FACELETS);
  driver.disconnect();
});

suite.it('T5.D22: Notification dispatch: unknown packet opcode is silently ignored without crashing driver', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver({ macAddress: cube.macAddress });
  await driver.connect(cube.device);

  let called = false;
  driver.onMove = () => { called = true; };

  // Emit encrypted packet with opcode 0x42
  const unk = new Uint8Array(20);
  unk[0] = 0x42;
  const enc = cipher.encryptGen4Packet(unk, driver.sessionKey, driver.sessionIv);
  cube.stateChar.emitValueNotification(enc);

  assertEqual(called, false, 'No callbacks should trigger for unknown opcode');
  driver.disconnect();
});

suite.it('T5.D23: Notification dispatch: malformed notification event (null/missing value) handled safely', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver();
  await driver.connect(cube.device);

  // Synthesize event with null value
  cube.stateChar.dispatchEvent({
    type: 'characteristicvaluechanged',
    target: { value: null }
  });

  // Synthesize empty event target
  cube.stateChar.dispatchEvent({
    type: 'characteristicvaluechanged',
    target: {}
  });

  // Driver should remain healthy and functional
  assertEqual(driver.device.gatt.connected, true);
  driver.disconnect();
});

suite.it('T5.D24: Notification dispatch: throwing callback error is caught without killing GATT notification loop', async () => {
  const cube = new VirtualGanCube();
  const driver = new GanBleDriver({ macAddress: cube.macAddress });
  await driver.connect(cube.device);

  let move1Received = false;
  let move2Received = false;

  driver.onMove = (data) => {
    if (data.move === 'U') {
      move1Received = true;
      throw new Error('Catastrophic error inside onMove subscriber');
    } else if (data.move === 'R') {
      move2Received = true;
    }
  };

  // Emit move 1 which throws
  cube.emitMove('U', 100);
  assertEqual(move1Received, true);

  // Emit move 2 which must still be delivered
  cube.emitMove('R', 200);
  assertEqual(move2Received, true, 'Subsequent notifications must continue to be processed');

  driver.disconnect();
});

suite.it('T5.D25: Driver setMacAddress updates session key/iv dynamically during active connection', async () => {
  const cubeA = new VirtualGanCube({ macAddress: 'DC:BE:4A:16:14:01' });
  const cubeB = new VirtualGanCube({ macAddress: '00:11:22:33:44:55' });

  const driver = new GanBleDriver({ macAddress: cubeA.macAddress });
  await driver.connect(cubeA.device);

  let receivedMove = null;
  driver.onMove = (d) => { receivedMove = d.move; };

  cubeA.emitMove('F', 100);
  assertEqual(receivedMove, 'F');

  // Dynamically update MAC address to cubeB's MAC
  driver.setMacAddress(cubeB.macAddress);

  // Now emit from cubeB
  const encB = cubeB.encodeMovePacket('B', 200);
  cubeA.stateChar.emitValueNotification(encB);

  assertEqual(receivedMove, 'B', 'Must successfully decode with new MAC session key');
  driver.disconnect();
});

// Self-executing runner hook when invoked directly via node
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tier5_protocol_driver_adversarial.mjs');
if (isMain) {
  console.log('='.repeat(70));
  console.log(' RUNNING TIER 5 WHITE-BOX ADVERSARIAL PROTOCOL & DRIVER AUDIT');
  console.log('='.repeat(70) + '\n');

  suite.run().then((res) => {
    console.log('\n' + '='.repeat(70));
    console.log(` RESULTS: ${res.passed}/${res.total} PASSED | ${res.failed} FAILED | ${res.skipped} SKIPPED`);
    console.log(` EXECUTION TIME: ${res.durationMs} ms`);
    console.log('='.repeat(70));

    if (res.errors.length > 0) {
      console.error('\n🚨 TEST FAILURES ENCOUNTERED:');
      for (const err of res.errors) {
        console.error(`  ✗ ${err.testName}:`);
        console.error(`    ${err.error.stack || err.error.message}\n`);
      }
      process.exit(1);
    } else {
      console.log('\n🎉 ALL 50 TIER 5 WHITE-BOX ADVERSARIAL TESTS PASSED WITHOUT REGRESSION!');
      process.exit(0);
    }
  }).catch((fatal) => {
    console.error('Fatal execution error:', fatal);
    process.exit(1);
  });
}
