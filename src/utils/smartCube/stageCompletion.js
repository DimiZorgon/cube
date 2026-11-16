// src/utils/smartCube/stageCompletion.js
// Stage Completion Evaluation Engine for CFOP Smart Cube Training
// Evaluates completion of F2L pair placement, OLL monochrome yellow face, and PLL full cube solve.

import { isFaceletsSolved } from '../cubeMath.js';
import { isFaceMonochrome, detectF2LSlots, isF2LSolved } from './solvePhaseDetector.js';

/**
 * Normalizes stage string to standard CFOP stage identifier: 'f2l' | 'oll' | 'pll'.
 * @param {string} stage
 * @returns {'f2l' | 'oll' | 'pll' | 'unknown'}
 */
export function normalizeStage(stage) {
  if (!stage || typeof stage !== 'string') return 'unknown';
  const clean = stage.trim().toLowerCase();
  if (clean.includes('f2l')) return 'f2l';
  if (clean.includes('oll')) return 'oll';
  if (clean.includes('pll')) return 'pll';
  return 'unknown';
}

/**
 * Checks whether target F2L slot (default 'FR') or all F2L is solved.
 *
 * @param {string|string[]} facelets
 * @param {object} [targetCase]
 * @returns {boolean}
 */
export function isF2LStageCompleted(facelets, targetCase = null) {
  if (!facelets) return false;
  const crossFace = targetCase?.crossFace || 'D';
  const targetSlot = (targetCase?.slot || 'FR').toUpperCase();

  const slots = detectF2LSlots(facelets, crossFace);
  const foundSlot = slots.find(s => s.slot === targetSlot);

  if (foundSlot && foundSlot.solved) {
    return true;
  }

  // Fallback: check if entire F2L is solved
  return isF2LSolved(facelets, crossFace);
}

/**
 * Checks whether OLL stage is completed (U-face is monochrome).
 *
 * @param {string|string[]} facelets
 * @param {string} [face='U']
 * @returns {boolean}
 */
export function isOLLStageCompleted(facelets, face = 'U') {
  if (!facelets) return false;
  return isFaceMonochrome(facelets, face);
}

/**
 * Checks whether PLL stage is completed (entire cube is fully solved).
 *
 * @param {string|string[]} facelets
 * @returns {boolean}
 */
export function isPLLStageCompleted(facelets) {
  if (!facelets) return false;
  return isFaceletsSolved(facelets);
}

/**
 * Evaluates whether the CFOP training stage objective has been met.
 *
 * @param {string|string[]} facelets - Current 54-char facelet string
 * @param {'f2l'|'oll'|'pll'|string} stage - Target stage ('f2l', 'oll', 'pll', etc.)
 * @param {object} [targetCase] - Case metadata (optional slot, category, alg)
 * @returns {{ completed: boolean, stage: string, reason: string }}
 */
export function isStageObjectiveMet(facelets, stage, targetCase = null) {
  if (!facelets) {
    return { completed: false, stage: stage || 'unknown', reason: 'Missing facelet representation' };
  }

  const normalized = normalizeStage(stage || targetCase?.category);

  switch (normalized) {
    case 'f2l': {
      const targetSlot = (targetCase?.slot || 'FR').toUpperCase();
      const completed = isF2LStageCompleted(facelets, targetCase);
      return {
        completed,
        stage: 'f2l',
        reason: completed
          ? `F2L pair placed in slot ${targetSlot}`
          : `Slot ${targetSlot} not yet solved`
      };
    }

    case 'oll': {
      const face = targetCase?.ollFace || 'U';
      const completed = isOLLStageCompleted(facelets, face);
      return {
        completed,
        stage: 'oll',
        reason: completed
          ? `Yellow ${face} face is monochrome`
          : `${face} face is not yet monochrome`
      };
    }

    case 'pll': {
      const completed = isPLLStageCompleted(facelets);
      return {
        completed,
        stage: 'pll',
        reason: completed
          ? 'Cube is fully solved'
          : 'Cube is not yet fully solved'
      };
    }

    default:
      return {
        completed: false,
        stage: normalized,
        reason: `Unknown or unsupported CFOP stage: ${stage}`
      };
  }
}
