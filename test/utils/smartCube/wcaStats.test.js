import { describe, it, expect } from 'vitest';
import {
  safeTps,
  getEffectiveTime,
  calculateWcaAo5,
  calculateWcaAo12,
  calculateWcaMo3,
  calculateSessionStats,
} from '../../../src/utils/smartCube/wcaStats.js';
