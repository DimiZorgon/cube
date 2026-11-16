import { describe, it, expect, vi, beforeEach } from 'vitest';
import GanBleDriver, {
  GAN_CIC_LIST,
  extractMacFromManufacturerData,
  GattWriteQueue,
  ganBleDriver,
} from '../../../src/utils/smartCube/ganBleDriver.js';
