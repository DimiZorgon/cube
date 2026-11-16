// src/utils/smartCube/ganProtocol.js
// GAN Gen4 BLE bitstream packet encoder/decoder and GATT protocol constants.

import {
  deriveKeyAndIv,
  encryptGen4Packet,
  decryptGen4Packet,
  GAN_BASE_KEY,
  GAN_BASE_IV,
  parseMacAddress
} from './aesBlockCipher.js';

// Re-export crypto utilities for contract adapters
export { deriveKeyAndIv, parseMacAddress, GAN_BASE_KEY, GAN_BASE_IV };
export const encryptPacket = encryptGen4Packet;
export const decryptPacket = decryptGen4Packet;

// GATT UUID Definitions
export const GAN_GEN4_SERVICE = '00000010-0000-fff7-fff6-fff5fff4fff0';
export const GAN_GEN4_SERVICE_SIG = '00000010-0000-1000-8000-00805f9b34fb';
export const GAN_GEN4_SERVICE_ALIAS = '0000fff0-0000-1000-8000-00805f9b34fb';
export const GAN_GEN4_COMMAND_CHARACTERISTIC = '0000fff5-0000-1000-8000-00805f9b34fb';
export const GAN_GEN4_STATE_CHARACTERISTIC   = '0000fff6-0000-1000-8000-00805f9b34fb';

// Gen2 / Gen3 UUIDs for backward-compatibility reference
export const GAN_GEN3_SERVICE = '8653000a-43e6-47b7-9cb0-5fc21d4ae340';
export const GAN_GEN3_COMMAND_CHARACTERISTIC = '8653000c-43e6-47b7-9cb0-5fc21d4ae340';
export const GAN_GEN3_STATE_CHARACTERISTIC   = '8653000b-43e6-47b7-9cb0-5fc21d4ae340';

export const GAN_GEN2_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dc4179';
export const GAN_GEN2_SERVICE_ALT = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const GAN_GEN2_COMMAND_CHARACTERISTIC = '28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4';
export const GAN_GEN2_STATE_CHARACTERISTIC   = '28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4';

export const BLE_DEVICE_INFO_SERVICE = '0000180a-0000-1000-8000-00805f9b34fb';
export const BLE_BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';

export const GAN_SERVICES = [
  GAN_GEN4_SERVICE,
  GAN_GEN4_SERVICE_SIG,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC,
  '0000fff7-0000-1000-8000-00805f9b34fb',
  GAN_GEN3_SERVICE,
  GAN_GEN3_COMMAND_CHARACTERISTIC,
  GAN_GEN3_STATE_CHARACTERISTIC,
  GAN_GEN2_SERVICE,
  GAN_GEN2_SERVICE_ALT,
  GAN_GEN2_COMMAND_CHARACTERISTIC,
  GAN_GEN2_STATE_CHARACTERISTIC,
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee0-0000-1000-8000-00805f9b34fb',
  '00001000-0000-1000-8000-00805f9b34fb',
  '0783b03e-7735-b5a0-1760-a305d2795cb0',
  '0000aadb-0000-1000-8000-00805f9b34fb',
  '0000aaaa-0000-1000-8000-00805f9b34fb',
  BLE_DEVICE_INFO_SERVICE,
  BLE_BATTERY_SERVICE,
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb'
];

/**
 * Normalizes any 16-bit, 32-bit, or 128-bit UUID to lowercase 128-bit canonical string.
 * @param {string|number} uuid
 * @returns {string}
 */
export function toUuid128(uuid) {
  if (typeof uuid === 'number') {
    return `0000${uuid.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`.toLowerCase();
  }
  const str = String(uuid || '').trim();
  if (/^(0x)?[0-9a-fA-F]{4}$/.test(str)) {
    const hex = str.replace(/^0x/i, '').padStart(4, '0');
    return `0000${hex}-0000-1000-8000-00805f9b34fb`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{8}$/.test(str)) {
    return `${str}-0000-1000-8000-00805f9b34fb`.toLowerCase();
  }
  return str.toLowerCase();
}

const CORNER_FACELET_MAP = [
  [8, 9, 20],   // URF
  [6, 18, 38],  // UFL
  [0, 36, 47],  // ULB
  [2, 45, 11],  // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51]  // DRB
];

const EDGE_FACELET_MAP = [
  [5, 10],  // UR
  [7, 19],  // UF
  [3, 37],  // UL
  [1, 46],  // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14]  // BR
];

export function toKociembaFacelets(cp, co, ep, eo) {
  const faces = 'URFDLB';
  const facelets = [];
  for (let i = 0; i < 54; i++) {
    facelets[i] = faces[Math.floor(i / 9)];
  }
  for (let i = 0; i < 8; i++) {
    for (let p = 0; p < 3; p++) {
      const targetIdx = CORNER_FACELET_MAP[i]?.[(p + (co[i] || 0)) % 3];
      const sourceCorner = cp[i] ?? 0;
      const sourceFaceIdx = CORNER_FACELET_MAP[sourceCorner]?.[p] ?? 0;
      const sourceFace = faces[Math.floor(sourceFaceIdx / 9)] || 'U';
      if (typeof targetIdx === 'number') {
        facelets[targetIdx] = sourceFace;
      }
    }
  }
  for (let i = 0; i < 12; i++) {
    for (let p = 0; p < 2; p++) {
      const targetIdx = EDGE_FACELET_MAP[i]?.[(p + (eo[i] || 0)) % 2];
      const sourceEdge = ep[i] ?? 0;
      const sourceFaceIdx = EDGE_FACELET_MAP[sourceEdge]?.[p] ?? 0;
      const sourceFace = faces[Math.floor(sourceFaceIdx / 9)] || 'U';
      if (typeof targetIdx === 'number') {
        facelets[targetIdx] = sourceFace;
      }
    }
  }
  return facelets.join('');
}

// Face Mapping (Gen4 Protocol: [2, 32, 8, 1, 16, 4] -> URFDLB)
export const FACE_CODES = Object.freeze([2, 32, 8, 1, 16, 4]);
export const FACE_NAMES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);
export const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

// Pre-built Host -> Cube Commands (20 bytes)
export const COMMAND_REQUEST_FACELETS = new Uint8Array([
  0xDD, 0x04, 0x00, 0xED, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
]);

export const COMMAND_REQUEST_BATTERY = new Uint8Array([
  0xDD, 0x04, 0x00, 0xEF, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
]);

export const COMMAND_REQUEST_HARDWARE = new Uint8Array([
  0xDF, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
]);

export const COMMAND_HARDWARE_RESET = new Uint8Array([
  0xD2, 0x0D, 0x05, 0x39, 0x77, 0x00, 0x00, 0x01,
  0x23, 0x45, 0x67, 0x89, 0xAB, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
]);

/**
 * Validates if face code exists in Gen4 table.
 * @param {number} rawFace
 * @returns {boolean}
 */
export function isValidFaceCode(rawFace) {
  return FACE_CODES.includes(rawFace);
}

/**
 * Converts raw face code and direction to standard notation (e.g. 2, 0 -> "U", 32, 1 -> "R'").
 * @param {number} rawFace
 * @param {number} direction
 * @returns {string|null}
 */
export function faceCodeToMove(rawFace, direction) {
  const idx = FACE_CODES.indexOf(rawFace);
  if (idx === -1) return null;
  return FACE_NAMES[idx] + (direction === 1 ? "'" : '');
}

/**
 * BitReader utility for arbitrary bit-length LE and BE word extraction.
 */
export class BitReader {
  constructor(buffer) {
    this.buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  }

  getBitWord(offset, length, littleEndian = false) {
    let val = 0;
    if (littleEndian) {
      for (let i = 0; i < length; i++) {
        const bitIdx = offset + i;
        const byteIdx = Math.floor(bitIdx / 8);
        const bitInByte = bitIdx % 8;
        const bit = (this.buf[byteIdx] >> bitInByte) & 1;
        val |= (bit << i);
      }
    } else {
      for (let i = 0; i < length; i++) {
        const bitIdx = offset + i;
        const byteIdx = Math.floor(bitIdx / 8);
        const bitInByte = 7 - (bitIdx % 8);
        const bit = (this.buf[byteIdx] >> bitInByte) & 1;
        val = (val << 1) | bit;
      }
    }
    return val >>> 0;
  }
}

/**
 * Decodes 20-byte Gen4 packet (decrypts if key/iv provided).
 * @param {Uint8Array} packet20
 * @param {Uint8Array} [key]
 * @param {Uint8Array} [iv]
 */
export function decodeGen4Packet(packet20, key, iv) {
  const decrypted = (key && iv) ? decryptGen4Packet(packet20, key, iv) : new Uint8Array(packet20);
  const eventType = decrypted[0];

  if (eventType === 0x01) {
    // Move event (can contain multiple 72-bit move chunks in a single BLE notification)
    const reader = new BitReader(decrypted);
    const msgBitLen = decrypted.length * 8;
    const moves = [];
    let off = 0;

    while (off + 72 <= msgBitLen && reader.getBitWord(off, 8) === 0x01) {
      const cubeTimestamp = reader.getBitWord(off + 16, 32, true);
      const serial = reader.getBitWord(off + 48, 16, true);
      const direction = reader.getBitWord(off + 64, 2); // 0 = CW, 1 = CCW
      const rawFace = reader.getBitWord(off + 66, 6);
      const faceIndex = FACE_CODES.indexOf(rawFace);

      if (faceIndex === -1) {
        if (off === 0) {
          throw new Error(`Invalid face code in move packet: ${rawFace}`);
        }
        break;
      }

      const face = FACE_NAMES[faceIndex];
      const move = face + (direction === 1 ? "'" : '');
      moves.push({
        type: 'MOVE',
        cubeTimestamp,
        serial,
        direction,
        face,
        move,
        rawFace
      });
      off += 72;
    }

    const first = moves[0];
    return {
      ...first,
      moves,
      decrypted
    };
  }

  const isBatteryEcho = eventType === 0xDD && [1, 2, 3].some(idx => decrypted[idx] === 0xEF && idx + 1 < decrypted.length);
  if (eventType === 0xEF || isBatteryEcho) {
    let rawLevel = 0;
    if (eventType === 0xEF) {
      const dataLen = decrypted[1];
      if (dataLen > 1 && (1 + dataLen) < decrypted.length && decrypted[1 + dataLen] > 0 && decrypted[1 + dataLen] <= 100) {
        rawLevel = decrypted[1 + dataLen];
      } else if (dataLen > 1 && dataLen < decrypted.length && decrypted[dataLen] > 0 && decrypted[dataLen] <= 100) {
        rawLevel = decrypted[dataLen];
      } else if (dataLen > 1 && ((1 + dataLen) < decrypted.length || dataLen < decrypted.length)) {
        rawLevel = 0;
      } else if (decrypted[2] === 0 && decrypted.length > 3 && decrypted[3] >= 0 && decrypted[3] <= 100) {
        rawLevel = decrypted[3];
      } else {
        rawLevel = decrypted[2] ?? 0;
      }
    } else {
      // 0xDD echo packet: locate 0xEF marker, next byte is battery level
      const subIndices = [1, 2, 3];
      const efIdx = subIndices.find(idx => decrypted[idx] === 0xEF && idx + 1 < decrypted.length);
      rawLevel = efIdx !== undefined ? decrypted[efIdx + 1] : 0;
    }
    const batteryLevel = isNaN(rawLevel) ? 0 : Math.max(0, Math.min(100, Math.round(rawLevel)));
    return {
      type: 'BATTERY',
      batteryLevel,
      decrypted
    };
  }

  if (eventType === 0xEC) {
    // Gyroscope event
    const reader = new BitReader(decrypted);
    const parseQuatComponent = (offset) => {
      const q = reader.getBitWord(offset, 16);
      return (1 - (q >> 15) * 2) * (q & 0x7FFF) / 0x7FFF;
    };
    const qw = parseQuatComponent(16);
    const qx = parseQuatComponent(32);
    const qy = parseQuatComponent(48);
    const qz = parseQuatComponent(64);

    return {
      type: 'GYRO',
      quaternion: { qw, qx, qy, qz },
      decrypted
    };
  }

  if (eventType === 0xED) {
    // Facelets event
    const reader = new BitReader(decrypted);
    const serial = reader.getBitWord(16, 16, true);

    // CP (7 x 3 bits)
    const cp = [];
    let cpSum = 0;
    for (let i = 0; i < 7; i++) {
      const val = reader.getBitWord(32 + i * 3, 3);
      cp.push(val);
      cpSum += val;
    }
    cp.push(28 - cpSum);

    // CO (7 x 2 bits)
    const co = [];
    let coSum = 0;
    for (let i = 0; i < 7; i++) {
      const val = reader.getBitWord(53 + i * 2, 2);
      co.push(val);
      coSum += val;
    }
    co.push((3 - (coSum % 3)) % 3);

    // EP (11 x 4 bits)
    const ep = [];
    let epSum = 0;
    for (let i = 0; i < 11; i++) {
      const val = reader.getBitWord(69 + i * 4, 4);
      ep.push(val);
      epSum += val;
    }
    ep.push(66 - epSum);

    // EO (11 x 1 bit)
    const eo = [];
    let eoSum = 0;
    for (let i = 0; i < 11; i++) {
      const val = reader.getBitWord(113 + i, 1);
      eo.push(val);
      eoSum += val;
    }
    eo.push((2 - (eoSum % 2)) % 2);

    const isSolved = cp.every((v, i) => v === i) &&
                     co.every(v => v === 0) &&
                     ep.every((v, i) => v === i) &&
                     eo.every(v => v === 0);

    const facelets = isSolved ? SOLVED_FACELETS : toKociembaFacelets(cp, co, ep, eo);

    return {
      type: 'FACELETS',
      serial,
      cp,
      co,
      ep,
      eo,
      facelets,
      decrypted
    };
  }

  return {
    type: 'UNKNOWN',
    eventType,
    decrypted
  };
}

/**
 * Decodes 20-byte Gen2 packet (Nordic UART service 6e400001-...).
 * @param {Uint8Array} packet20
 * @param {Uint8Array} [key]
 * @param {Uint8Array} [iv]
 */
export function decodeGen2Packet(packet20, key, iv) {
  const decrypted = (key && iv) ? decryptGen4Packet(packet20, key, iv) : new Uint8Array(packet20);
  const reader = new BitReader(decrypted);
  const mode = reader.getBitWord(0, 4);

  if (mode === 0x01) {
    const parseQuat = (off) => {
      const q = reader.getBitWord(off, 16);
      return (1 - (q >> 15) * 2) * (q & 0x7FFF) / 0x7FFF;
    };
    return {
      type: 'GYRO',
      quaternion: {
        qw: parseQuat(4),
        qx: parseQuat(20),
        qy: parseQuat(36),
        qz: parseQuat(52)
      },
      decrypted
    };
  }

  if (mode === 0x02) {
    const serial = reader.getBitWord(4, 8);
    const faceIdx = reader.getBitWord(12, 4);
    const direction = reader.getBitWord(16, 1);
    const cubeTimestamp = reader.getBitWord(47, 16);
    if (faceIdx >= 0 && faceIdx < 6) {
      const face = FACE_NAMES[faceIdx];
      const move = face + (direction === 1 ? "'" : '');
      return { type: 'MOVE', cubeTimestamp, serial, direction, face, move, decrypted };
    }
  }

  if (mode === 0x04) {
    const serial = reader.getBitWord(4, 8);
    const cp = [];
    let cpSum = 0;
    for (let i = 0; i < 7; i++) {
      const v = reader.getBitWord(12 + i * 3, 3);
      cp.push(v);
      cpSum += v;
    }
    cp.push(28 - cpSum);
    const co = [];
    let coSum = 0;
    for (let i = 0; i < 7; i++) {
      const v = reader.getBitWord(33 + i * 2, 2);
      co.push(v);
      coSum += v;
    }
    co.push((3 - (coSum % 3)) % 3);
    const ep = [];
    let epSum = 0;
    for (let i = 0; i < 11; i++) {
      const v = reader.getBitWord(47 + i * 4, 4);
      ep.push(v);
      epSum += v;
    }
    ep.push(66 - epSum);
    const eo = [];
    let eoSum = 0;
    for (let i = 0; i < 11; i++) {
      const v = reader.getBitWord(91 + i, 1);
      eo.push(v);
      eoSum += v;
    }
    eo.push((2 - (eoSum % 2)) % 2);
    const isSolved = cp.every((v, i) => v === i) &&
                     co.every(v => v === 0) &&
                     ep.every((v, i) => v === i) &&
                     eo.every(v => v === 0);
    const facelets = isSolved ? SOLVED_FACELETS : toKociembaFacelets(cp, co, ep, eo);
    return { type: 'FACELETS', serial, cp, co, ep, eo, facelets, decrypted };
  }

  if (mode === 0x09) {
    const batteryLevel = Math.max(0, Math.min(100, reader.getBitWord(8, 8)));
    return { type: 'BATTERY', batteryLevel, decrypted };
  }

  return { type: 'UNKNOWN', eventType: mode, decrypted };
}

/**
 * Decodes 16/20-byte Gen3 packet (service 8653000a-...).
 * @param {Uint8Array} packet
 * @param {Uint8Array} [key]
 * @param {Uint8Array} [iv]
 */
export function decodeGen3Packet(packet, key, iv) {
  const decrypted = (key && iv) ? decryptGen4Packet(packet, key, iv) : new Uint8Array(packet);
  const reader = new BitReader(decrypted);
  const magic = reader.getBitWord(0, 8);
  const mode = reader.getBitWord(8, 8);
  const len = reader.getBitWord(16, 8);

  if (magic !== 0x55 || len <= 0) {
    return { type: 'UNKNOWN', eventType: mode, decrypted };
  }

  if (mode === 0x01) {
    const cubeTimestamp = reader.getBitWord(24, 32, true);
    const serial = reader.getBitWord(56, 16, true);
    const direction = reader.getBitWord(72, 2);
    const rawFace = reader.getBitWord(74, 6);
    const faceIndex = FACE_CODES.indexOf(rawFace);
    if (faceIndex !== -1) {
      const face = FACE_NAMES[faceIndex];
      const move = face + (direction === 1 ? "'" : '');
      return { type: 'MOVE', cubeTimestamp, serial, direction, face, move, rawFace, decrypted };
    }
  }

  if (mode === 0x02) {
    const serial = reader.getBitWord(24, 16, true);
    const cp = [];
    let cpSum = 0;
    for (let i = 0; i < 7; i++) {
      const v = reader.getBitWord(40 + i * 3, 3);
      cp.push(v);
      cpSum += v;
    }
    cp.push(28 - cpSum);
    const co = [];
    let coSum = 0;
    for (let i = 0; i < 7; i++) {
      const v = reader.getBitWord(61 + i * 2, 2);
      co.push(v);
      coSum += v;
    }
    co.push((3 - (coSum % 3)) % 3);
    const ep = [];
    let epSum = 0;
    for (let i = 0; i < 11; i++) {
      const v = reader.getBitWord(77 + i * 4, 4);
      ep.push(v);
      epSum += v;
    }
    ep.push(66 - epSum);
    const eo = [];
    let eoSum = 0;
    for (let i = 0; i < 11; i++) {
      const v = reader.getBitWord(121 + i, 1);
      eo.push(v);
      eoSum += v;
    }
    eo.push((2 - (eoSum % 2)) % 2);
    const isSolved = cp.every((v, i) => v === i) &&
                     co.every(v => v === 0) &&
                     ep.every((v, i) => v === i) &&
                     eo.every(v => v === 0);
    const facelets = isSolved ? SOLVED_FACELETS : toKociembaFacelets(cp, co, ep, eo);
    return { type: 'FACELETS', serial, cp, co, ep, eo, facelets, decrypted };
  }

  if (mode === 0x03 || mode === 0x10) {
    const batteryLevel = Math.max(0, Math.min(100, reader.getBitWord(24, 8)));
    return { type: 'BATTERY', batteryLevel, decrypted };
  }

  return { type: 'UNKNOWN', eventType: mode, decrypted };
}

// Alias for adapter compatibility
export const decodePacket = decodeGen4Packet;
