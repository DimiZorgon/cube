// src/utils/smartCube/aesBlockCipher.js
// AES-128-CBC block cipher wrapper around aes-js for GAN Gen4 Bluetooth protocol.

import aesjs from 'aes-js';

// Base Key and IV per GAN Gen2/Gen3/Gen4 specification
export const GAN_BASE_KEY = Object.freeze([
  0x01, 0x02, 0x42, 0x28, 0x31, 0x91, 0x16, 0x07,
  0x20, 0x05, 0x18, 0x54, 0x42, 0x11, 0x12, 0x53
]);

export const GAN_BASE_IV = Object.freeze([
  0x11, 0x03, 0x32, 0x28, 0x21, 0x01, 0x76, 0x27,
  0x20, 0x95, 0x78, 0x14, 0x32, 0x12, 0x02, 0x43
]);

const CbcMode = aesjs.ModeOfOperation?.cbc || aesjs.default?.ModeOfOperation?.cbc;

/**
 * Parses MAC address string (e.g. "DC:BE:4A:16:14:01", "dc-be-4a-16-14-01", "dcbe4a161401")
 * into a 6-byte array of numbers.
 * @param {string} macStr
 * @returns {number[]} Array of 6 bytes [0xDC, 0xBE, 0x4A, 0x16, 0x14, 0x01]
 */
export function parseMacAddress(macStr) {
  if (!macStr || typeof macStr !== 'string') {
    throw new Error(`Invalid MAC address: ${macStr}`);
  }
  const clean = macStr.replace(/[:-]/g, '').trim();
  if (clean.length !== 12 || !/^[0-9a-fA-F]{12}$/.test(clean)) {
    throw new Error(`Invalid MAC address format: ${macStr}`);
  }
  const bytes = [];
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Derives session AES key and IV by adding reversed MAC bytes modulo 255 (% 0xFF).
 * @param {string} macAddress
 * @returns {{ key: Uint8Array, iv: Uint8Array }}
 */
export function deriveKeyAndIv(macAddress) {
  const macBytes = parseMacAddress(macAddress);
  const salt = [...macBytes].reverse();
  const key = new Uint8Array(GAN_BASE_KEY);
  const iv = new Uint8Array(GAN_BASE_IV);

  for (let i = 0; i < 6; i++) {
    key[i] = (key[i] + salt[i]) % 0xFF;
    iv[i]  = (iv[i]  + salt[i]) % 0xFF;
  }
  return { key, iv };
}

/**
 * Encrypts 16 or 20-byte packet using AES-128-CBC.
 * Encrypts chunk 0 (0..15), then chunk 4 (4..19).
 * Overlapping bytes 4..15 are encrypted twice.
 * @param {Uint8Array|number[]} data - 16 or 20 bytes
 * @param {Uint8Array} key - 16-byte session key
 * @param {Uint8Array} iv - 16-byte session IV
 * @returns {Uint8Array}
 */
export function encryptGen4Packet(data, key, iv) {
  const res = new Uint8Array(data);

  // Chunk 0: 0..15
  const cipher0 = new CbcMode(key, iv);
  const enc0 = cipher0.encrypt(res.subarray(0, 16));
  res.set(enc0, 0);

  // Chunk 4: (res.length - 16) .. res.length
  if (res.length > 16) {
    const cipher4 = new CbcMode(key, iv);
    const enc4 = cipher4.encrypt(res.subarray(res.length - 16, res.length));
    res.set(enc4, res.length - 16);
  }

  return res;
}

/**
 * Decrypts 16 or 20-byte packet using AES-128-CBC.
 * Decrypts chunk 4 (4..19) first, then chunk 0 (0..15) in inverted order.
 * @param {Uint8Array|number[]} data - 16 or 20 bytes
 * @param {Uint8Array} key - 16-byte session key
 * @param {Uint8Array} iv - 16-byte session IV
 * @returns {Uint8Array}
 */
export function decryptGen4Packet(data, key, iv) {
  const res = new Uint8Array(data);

  // Inverted order: chunk 4 first
  if (res.length > 16) {
    const cipher4 = new CbcMode(key, iv);
    const dec4 = cipher4.decrypt(res.subarray(res.length - 16, res.length));
    res.set(dec4, res.length - 16);
  }

  // Chunk 0 second
  const cipher0 = new CbcMode(key, iv);
  const dec0 = cipher0.decrypt(res.subarray(0, 16));
  res.set(dec0, 0);

  return res;
}
