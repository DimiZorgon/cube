import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEY_MAC,
  isValidMacAddress,
  formatMacAddress,
  parseMacAddress,
  loadCachedMac,
  saveCachedMac,
  clearCachedMac,
} from '../../../src/utils/smartCube/macAddressUtils.js';
