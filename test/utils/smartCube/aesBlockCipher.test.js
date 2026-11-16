import { describe, it, expect } from 'vitest';
import {
  GAN_BASE_KEY,
  GAN_BASE_IV,
  parseMacAddress,
  deriveKeyAndIv,
  encryptGen4Packet,
  decryptGen4Packet,
} from '../../../src/utils/smartCube/aesBlockCipher.js';
