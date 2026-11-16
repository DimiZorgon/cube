import { describe, it, expect } from 'vitest';
import {
  CFOP_PHASES,
  VALID_CROSS_FACES,
  F2L_SLOT_NAMES,
  F2L_SLOT_DEFINITIONS,
  isFaceMonochrome,
  isCrossSolved,
  isF2LSolved,
  isOLLSolved,
  isPLLSolved,
  detectSolvePhase,
  detectF2LSlots,
  detectActiveF2LCompletions,
  reconstructF2LBreakdown,
} from '../../../src/utils/smartCube/solvePhaseDetector.js';
