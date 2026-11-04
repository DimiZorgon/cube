// src/utils/smartCube/macAddressUtils.js

export const STORAGE_KEY_MAC = 'gan_smart_cube_mac';

/**
 * Validates whether a string is a valid 6-byte MAC address.
 * Formats: 00:11:22:33:44:55, 00-11-22-33-44-55, or 001122334455
 * @param {string} macStr
 * @returns {boolean}
 */
export function isValidMacAddress(macStr) {
  if (!macStr || typeof macStr !== 'string') return false;
  const clean = macStr.trim().replace(/[:-]/g, '');
  return clean.length === 12 && /^[0-9a-fA-F]{12}$/.test(clean);
}

/**
 * Normalizes a MAC string into standard uppercase colon-separated format (XX:XX:XX:XX:XX:XX).
 * @param {string} macStr
 * @returns {string}
 */
export function formatMacAddress(macStr) {
  if (!isValidMacAddress(macStr)) {
    throw new Error(`Invalid MAC address: ${macStr}`);
  }
  const clean = macStr.trim().replace(/[:-]/g, '').toUpperCase();
  const parts = [];
  for (let i = 0; i < 12; i += 2) {
    parts.push(clean.slice(i, i + 2));
  }
  return parts.join(':');
}

/**
 * Parses a MAC string into an array of 6 numbers [0xDC, 0xBE, ...].
 * @param {string} macStr
 * @returns {number[]}
 */
export function parseMacAddress(macStr) {
  const formatted = formatMacAddress(macStr);
  return formatted.split(':').map(part => parseInt(part, 16));
}

/**
 * Loads cached MAC address from localStorage.
 * @returns {string|null}
 */
export function loadCachedMac() {
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY_MAC);
      if (cached && isValidMacAddress(cached)) {
        return formatMacAddress(cached);
      }
    }
  } catch {
    // Ignore localStorage access errors (e.g. incognito)
  }
  return null;
}

/**
 * Saves MAC address to localStorage.
 * @param {string} macStr
 * @returns {string|null}
 */
export function saveCachedMac(macStr) {
  try {
    const formatted = formatMacAddress(macStr);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MAC, formatted);
    }
    return formatted;
  } catch {
    return null;
  }
}

/**
 * Clears cached MAC address from localStorage.
 */
export function clearCachedMac() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_MAC);
    }
  } catch {
    // Ignore
  }
}
