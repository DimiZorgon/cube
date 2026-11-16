import { describe, it, expect } from 'vitest';
import {
  normalizeStage,
  isF2LStageCompleted,
  isOLLStageCompleted,
  isPLLStageCompleted,
  isStageObjectiveMet,
} from '../../../src/utils/smartCube/stageCompletion.js';
