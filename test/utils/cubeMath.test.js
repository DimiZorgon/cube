import { describe, it, expect } from 'vitest';
import {
  checkIsSolved,
  generateInitialCubies,
  applyRotationToCubies,
  SOLVED_FACELETS,
  isFaceletsSolved,
  expandMoveNotation,
  expandAlgoToOuterMoves,
  CubeStateSimulator,
} from '../../src/utils/cubeMath.js';
