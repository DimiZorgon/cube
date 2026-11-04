// tests/e2e/smartCube/mocks/virtualGanCube.mjs
// Virtual GAN 16 ui Smart Cube BLE simulator emitting authentic encrypted Gen4 packets.

import crypto from 'node:crypto';
import {
  MockBluetoothDevice,
  MockBluetoothRemoteGATTService,
  MockBluetoothRemoteGATTCharacteristic
} from './mockWebBluetooth.mjs';
import { BitWriter, BitReader, CubeStateSimulator, SOLVED_FACELETS } from '../helpers/testUtils.mjs';

export const GAN_GEN4_SERVICE = '00000010-0000-fff7-fff6-fff5fff4fff0';
export const GAN_GEN4_SERVICE_ALIAS = '0000fff0-0000-1000-8000-00805f9b34fb';
export const GAN_GEN4_COMMAND_CHARACTERISTIC = '0000fff5-0000-1000-8000-00805f9b34fb';
export const GAN_GEN4_STATE_CHARACTERISTIC   = '0000fff6-0000-1000-8000-00805f9b34fb';

export const GAN_BASE_KEY = Object.freeze([
  0x01, 0x02, 0x42, 0x28, 0x31, 0x91, 0x16, 0x07,
  0x20, 0x05, 0x18, 0x54, 0x42, 0x11, 0x12, 0x53
]);

export const GAN_BASE_IV = Object.freeze([
  0x11, 0x03, 0x32, 0x28, 0x21, 0x01, 0x76, 0x27,
  0x20, 0x95, 0x78, 0x14, 0x32, 0x12, 0x02, 0x43
]);

// Face mapping per Gen4 protocol: [2, 32, 8, 1, 16, 4] -> URFDLB
export const FACE_CODES = [2, 32, 8, 1, 16, 4];
export const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'];

export function parseMacAddress(macStr) {
  if (!macStr || typeof macStr !== 'string') {
    throw new Error(`Invalid MAC address: ${macStr}`);
  }
  const clean = macStr.replace(/[:-]/g, '');
  if (clean.length !== 12 || !/^[0-9a-fA-F]{12}$/.test(clean)) {
    throw new Error(`Invalid MAC address format: ${macStr}`);
  }
  const bytes = [];
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return bytes;
}

export function deriveKeyAndIv(macAddress) {
  const macBytes = parseMacAddress(macAddress);
  const salt = [...macBytes].reverse();
  const key = Buffer.from(GAN_BASE_KEY);
  const iv = Buffer.from(GAN_BASE_IV);

  for (let i = 0; i < 6; i++) {
    key[i] = (key[i] + salt[i]) % 0xFF;
    iv[i]  = (iv[i]  + salt[i]) % 0xFF;
  }
  return { key, iv };
}

export function encryptGen4Packet(data20, key, iv) {
  const res = Buffer.from(data20);
  // Encrypt chunk 0 (0..15)
  let c1 = crypto.createCipheriv('aes-128-cbc', key, iv);
  c1.setAutoPadding(false);
  c1.update(res.subarray(0, 16)).copy(res, 0);

  // Encrypt chunk 4 (4..19)
  if (res.length > 16) {
    let c2 = crypto.createCipheriv('aes-128-cbc', key, iv);
    c2.setAutoPadding(false);
    c2.update(res.subarray(res.length - 16)).copy(res, res.length - 16);
  }
  return new Uint8Array(res);
}

export function decryptGen4Packet(data20, key, iv) {
  if (!data20 || data20.length < 16) {
    throw new Error('Invalid buffer length for AES-128 decryption (must be at least 16 bytes)');
  }
  const res = Buffer.from(data20);
  // Reverse order: chunk 4 first, then chunk 0
  if (res.length > 16) {
    let d1 = crypto.createDecipheriv('aes-128-cbc', key, iv);
    d1.setAutoPadding(false);
    d1.update(res.subarray(res.length - 16)).copy(res, res.length - 16);
  }
  let d2 = crypto.createDecipheriv('aes-128-cbc', key, iv);
  d2.setAutoPadding(false);
  d2.update(res.subarray(0, 16)).copy(res, 0);
  return new Uint8Array(res);
}

// -------------------------------------------------------------
// Reference Gen4 Packet Parser & Oracle
// -------------------------------------------------------------
export function decodeGen4Packet(packet20, key, iv) {
  const decrypted = decryptGen4Packet(packet20, key, iv);
  const eventType = decrypted[0];

  if (eventType === 0x01) {
    // Move event
    const reader = new BitReader(decrypted);
    const cubeTimestamp = reader.getBitWord(16, 32, true);
    const serial = reader.getBitWord(48, 16, true);
    const direction = reader.getBitWord(64, 2); // 0 = CW, 1 = CCW
    const rawFace = reader.getBitWord(66, 6);
    const faceIndex = FACE_CODES.indexOf(rawFace);
    if (faceIndex === -1) {
      throw new Error(`Invalid face code in move packet: ${rawFace}`);
    }
    const face = FACE_NAMES[faceIndex];
    const move = face + (direction === 1 ? "'" : '');

    return {
      type: 'MOVE',
      cubeTimestamp,
      serial,
      direction,
      face,
      move,
      rawFace,
      decrypted
    };
  } else if (eventType === 0xEF) {
    // Battery event
    const batteryLevel = Math.min(decrypted[2], 100);
    return {
      type: 'BATTERY',
      batteryLevel,
      decrypted
    };
  } else if (eventType === 0xEC) {
    // Gyro event
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
  } else if (eventType === 0xED) {
    // Facelets event
    const reader = new BitReader(decrypted);
    const serial = reader.getBitWord(16, 16, true);
    return {
      type: 'FACELETS',
      serial,
      decrypted
    };
  } else if (eventType === 0x99 || eventType === 0x00) {
    return {
      type: 'UNKNOWN',
      eventType,
      decrypted
    };
  }

  throw new Error(`Corrupted packet opcode: 0x${eventType?.toString(16)}`);
}

// -------------------------------------------------------------
// Virtual GAN 16 ui BLE Device Simulator
// -------------------------------------------------------------
export class VirtualGanCube {
  constructor(options = {}) {
    this.name = options.name || 'GAN-16ui-MAX-4820';
    this.macAddress = options.macAddress || 'DC:BE:4A:16:14:01';
    this.batteryLevel = options.batteryLevel ?? 98;
    this.serialCounter = 0;
    this.startTime = Date.now();
    this.cubeSimulator = new CubeStateSimulator(SOLVED_FACELETS);

    const { key, iv } = deriveKeyAndIv(this.macAddress);
    this.sessionKey = key;
    this.sessionIv = iv;

    this.device = new MockBluetoothDevice(`gan-dev-${Date.now()}`, this.name);
    this._setupGatt();
  }

  _setupGatt() {
    this.primaryService = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE, this.device, true);
    // Alias service for compatibility
    this.aliasService = new MockBluetoothRemoteGATTService(GAN_GEN4_SERVICE_ALIAS, this.device, true);

    this.commandChar = new MockBluetoothRemoteGATTCharacteristic(
      GAN_GEN4_COMMAND_CHARACTERISTIC,
      this.primaryService,
      { read: false, write: true, notify: false }
    );

    this.stateChar = new MockBluetoothRemoteGATTCharacteristic(
      GAN_GEN4_STATE_CHARACTERISTIC,
      this.primaryService,
      { read: true, write: false, notify: true }
    );

    this.commandChar.setWriteHandler(async (bytes) => {
      await this._handleCommandWrite(bytes);
    });

    this.primaryService.addCharacteristic(this.commandChar);
    this.primaryService.addCharacteristic(this.stateChar);

    this.aliasService.addCharacteristic(this.commandChar);
    this.aliasService.addCharacteristic(this.stateChar);

    this.device.gatt.addService(this.primaryService);
    this.device.gatt.addService(this.aliasService);
  }

  async _handleCommandWrite(bytes) {
    const opcode = bytes[0];
    if (opcode === 0xDD) {
      // Request facelets or battery
      const subType = bytes[3];
      if (subType === 0xEF) {
        this.emitBattery(this.batteryLevel);
      } else if (subType === 0xED) {
        this.emitFacelets();
      }
    } else if (opcode === 0xD2) {
      // Hardware reset
      this.cubeSimulator = new CubeStateSimulator(SOLVED_FACELETS);
      this.serialCounter = 0;
      this.emitFacelets();
    } else if (opcode === 0xDF) {
      // Hardware request -> emit hardware info packet
      const hwBuf = new Uint8Array(20);
      hwBuf[0] = 0xFC;
      Buffer.from('GAN 16 ui').copy(Buffer.from(hwBuf.buffer), 2);
      this.stateChar.emitValueNotification(hwBuf);
    }
  }

  encodeMovePacket(moveNotation, timestamp = Date.now() - this.startTime) {
    const move = moveNotation.trim();
    const face = move[0];
    const isPrime = move.includes("'");
    const faceIndex = FACE_NAMES.indexOf(face);
    if (faceIndex === -1) {
      throw new Error(`Unknown face in move: ${moveNotation}`);
    }

    const rawFace = FACE_CODES[faceIndex];
    const direction = isPrime ? 1 : 0;
    const serial = this.serialCounter++;

    const writer = new BitWriter(20);
    writer.buf[0] = 0x01; // eventType Move
    writer.buf[1] = 0x08; // payload length / flags
    writer.setBitWord(16, 32, timestamp, true); // timestamp LE
    writer.setBitWord(48, 16, serial, true);    // serial LE
    writer.setBitWord(64, 2, direction);        // direction
    writer.setBitWord(66, 6, rawFace);          // face code

    return encryptGen4Packet(writer.toUint8Array(), this.sessionKey, this.sessionIv);
  }

  encodeBatteryPacket(level = this.batteryLevel) {
    const raw = new Uint8Array(20);
    raw[0] = 0xEF;
    raw[1] = 0x01;
    raw[2] = Math.max(0, Math.min(100, level));
    return encryptGen4Packet(raw, this.sessionKey, this.sessionIv);
  }

  encodeGyroPacket(qw = 1, qx = 0, qy = 0, qz = 0) {
    const writer = new BitWriter(20);
    writer.buf[0] = 0xEC;
    writer.buf[1] = 0x08;

    const encodeQuat = (val) => {
      const sign = val < 0 ? 1 : 0;
      const mag = Math.min(0x7FFF, Math.round(Math.abs(val) * 0x7FFF));
      return (sign << 15) | mag;
    };

    writer.setBitWord(16, 16, encodeQuat(qw));
    writer.setBitWord(32, 16, encodeQuat(qx));
    writer.setBitWord(48, 16, encodeQuat(qy));
    writer.setBitWord(64, 16, encodeQuat(qz));

    return encryptGen4Packet(writer.toUint8Array(), this.sessionKey, this.sessionIv);
  }

  encodeFaceletsPacket() {
    const raw = new Uint8Array(20);
    raw[0] = 0xED;
    raw[1] = 0x10;
    const writer = new BitWriter(20);
    writer.buf[0] = 0xED;
    writer.setBitWord(16, 16, this.serialCounter, true);
    // Solved CP: 0, 1, 2, 3, 4, 5, 6
    for (let i = 0; i < 7; i++) {
      writer.setBitWord(32 + i * 3, 3, i);
    }
    // Solved EP: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    for (let i = 0; i < 11; i++) {
      writer.setBitWord(69 + i * 4, 4, i);
    }
    return encryptGen4Packet(writer.toUint8Array(), this.sessionKey, this.sessionIv);
  }

  // Interaction triggers
  emitMove(moveNotation, timestamp) {
    this.cubeSimulator.applyMove(moveNotation);
    const encryptedPacket = this.encodeMovePacket(moveNotation, timestamp);
    this.stateChar.emitValueNotification(encryptedPacket);
    return encryptedPacket;
  }

  emitBattery(level = this.batteryLevel) {
    this.batteryLevel = level;
    const packet = this.encodeBatteryPacket(level);
    this.stateChar.emitValueNotification(packet);
    return packet;
  }

  emitGyro(qw, qx, qy, qz) {
    const packet = this.encodeGyroPacket(qw, qx, qy, qz);
    this.stateChar.emitValueNotification(packet);
    return packet;
  }

  emitFacelets() {
    const packet = this.encodeFaceletsPacket();
    this.stateChar.emitValueNotification(packet);
    return packet;
  }

  disconnectDevice() {
    this.device.gatt.disconnect();
  }

  applyMovesSequence(movesArray, intervalMs = 20) {
    return new Promise((resolve) => {
      let idx = 0;
      const interval = setInterval(() => {
        if (idx >= movesArray.length) {
          clearInterval(interval);
          resolve();
          return;
        }
        this.emitMove(movesArray[idx]);
        idx++;
      }, intervalMs);
    });
  }
}
