// src/utils/smartCube/solvePhaseDetector.js
// Monotonic CFOP Solve Phase Detection Engine (Cross -> F2L -> OLL -> PLL -> complete).

import { isFaceletsSolved } from '../cubeMath.js';

export const CFOP_PHASES = Object.freeze(['cross', 'f2l', 'oll', 'pll', 'complete']);

const PHASE_RANKS = Object.freeze({
  cross: 0,
  f2l: 1,
  oll: 2,
  pll: 3,
  complete: 4
});

/**
 * Checks whether the 4 cross edges match their adjacent centers.
 * Standard orientation: D face (White cross on bottom).
 * Edges: DF, DR, DB, DL.
 */
export function isCrossSolved(facelets, crossFace = 'D') {
  const f = typeof facelets === 'string' ? facelets : (Array.isArray(facelets) ? facelets.join('') : '');
  if (f.length !== 54) return false;

  if (crossFace === 'D') {
    // Centers: U=4, R=13, F=22, D=31, L=40, B=49
    // DF: f[28] === f[31] && f[25] === f[22]
    // DR: f[32] === f[31] && f[16] === f[13]
    // DB: f[34] === f[31] && f[52] === f[49]
    // DL: f[30] === f[31] && f[43] === f[40]
    return (
      f[28] === f[31] && f[25] === f[22] &&
      f[32] === f[31] && f[16] === f[13] &&
      f[34] === f[31] && f[52] === f[49] &&
      f[30] === f[31] && f[43] === f[40]
    );
  }

  // Fallback for unsupported crossFace
  return false;
}

/**
 * Checks whether First Two Layers (F2L) are solved.
 * Cross solved + 4 first-layer corners (DFL, DFR, DBR, DBL) + 4 middle edges (FL, FR, BR, BL).
 */
export function isF2LSolved(facelets, crossFace = 'D') {
  const f = typeof facelets === 'string' ? facelets : (Array.isArray(facelets) ? facelets.join('') : '');
  if (f.length !== 54) return false;

  if (!isCrossSolved(f, crossFace)) return false;

  if (crossFace === 'D') {
    // 4 first-layer corners:
    // DFL: D=27, F=24, L=44
    // DFR: D=29, F=26, R=15
    // DBR: D=35, B=51, R=17
    // DBL: D=33, B=53, L=42
    const cornersSolved = (
      f[27] === f[31] && f[24] === f[22] && f[44] === f[40] &&
      f[29] === f[31] && f[26] === f[22] && f[15] === f[13] &&
      f[35] === f[31] && f[51] === f[49] && f[17] === f[13] &&
      f[33] === f[31] && f[53] === f[49] && f[42] === f[40]
    );
    if (!cornersSolved) return false;

    // 4 middle-layer edges:
    // FL: F=21, L=41
    // FR: F=23, R=12
    // BR: B=48, R=14
    // BL: B=50, L=39
    const middleEdgesSolved = (
      f[21] === f[22] && f[41] === f[40] &&
      f[23] === f[22] && f[12] === f[13] &&
      f[48] === f[49] && f[14] === f[13] &&
      f[50] === f[49] && f[39] === f[40]
    );
    return middleEdgesSolved;
  }

  return false;
}

/**
 * Checks whether Orientation of Last Layer (OLL) is solved.
 * F2L solved + all 9 stickers of U face match U center.
 */
export function isOLLSolved(facelets, crossFace = 'D') {
  const f = typeof facelets === 'string' ? facelets : (Array.isArray(facelets) ? facelets.join('') : '');
  if (f.length !== 54) return false;

  if (!isF2LSolved(f, crossFace)) return false;

  if (crossFace === 'D') {
    const centerU = f[4];
    for (let i = 0; i < 9; i++) {
      if (f[i] !== centerU) return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks whether Permutation of Last Layer (PLL) is solved.
 * OLL solved + all 54 facelets match their centers (isFaceletsSolved).
 */
export function isPLLSolved(facelets, crossFace = 'D') {
  const f = typeof facelets === 'string' ? facelets : (Array.isArray(facelets) ? facelets.join('') : '');
  if (f.length !== 54) return false;

  return isOLLSolved(f, crossFace) && isFaceletsSolved(f);
}

/**
 * Detects CFOP solve phase with monotonic forward progression.
 * Never regresses to an earlier phase once passed.
 * Automatically handles step skips (OLL skip -> PLL, PLL skip -> complete).
 *
 * @param {string|string[]} facelets 54-facelet representation
 * @param {'cross'|'f2l'|'oll'|'pll'|'complete'} [currentPhase='cross'] Current solve phase
 * @param {'D'} [crossFace='D'] Face used for cross
 * @returns {{ phase: 'cross'|'f2l'|'oll'|'pll'|'complete', isAdvance: boolean }}
 */
export function detectSolvePhase(facelets, currentPhase = 'cross', crossFace = 'D') {
  const f = typeof facelets === 'string' ? facelets : (Array.isArray(facelets) ? facelets.join('') : '');
  const normalizedCurrent = PHASE_RANKS[currentPhase] !== undefined ? currentPhase : 'cross';
  const currentRank = PHASE_RANKS[normalizedCurrent];

  if (currentRank >= PHASE_RANKS.complete) {
    return { phase: 'complete', isAdvance: false };
  }

  if (f.length !== 54) {
    return { phase: normalizedCurrent, isAdvance: false };
  }

  // 1. Complete check: if all facelets match centers, solve is finished.
  if (isFaceletsSolved(f)) {
    return {
      phase: 'complete',
      isAdvance: currentRank < PHASE_RANKS.complete
    };
  }

  // 2. Check if OLL condition is satisfied (F2L solved + U face oriented)
  // This means OLL milestone is passed -> solver is in 'pll' phase (or OLL skipped).
  if (isOLLSolved(f, crossFace)) {
    const targetRank = PHASE_RANKS.pll;
    const nextPhase = targetRank > currentRank ? 'pll' : normalizedCurrent;
    return {
      phase: nextPhase,
      isAdvance: nextPhase !== normalizedCurrent
    };
  }

  // 3. Check if F2L condition is satisfied (Cross solved + 4 corners + 4 mid edges)
  // This means F2L milestone is passed -> solver is in 'oll' phase.
  if (isF2LSolved(f, crossFace)) {
    const targetRank = PHASE_RANKS.oll;
    const nextPhase = targetRank > currentRank ? 'oll' : normalizedCurrent;
    return {
      phase: nextPhase,
      isAdvance: nextPhase !== normalizedCurrent
    };
  }

  // 4. Check if Cross condition is satisfied (4 cross edges match centers)
  // This means Cross milestone is passed -> solver is in 'f2l' phase.
  if (isCrossSolved(f, crossFace)) {
    const targetRank = PHASE_RANKS.f2l;
    const nextPhase = targetRank > currentRank ? 'f2l' : normalizedCurrent;
    return {
      phase: nextPhase,
      isAdvance: nextPhase !== normalizedCurrent
    };
  }

  // No condition satisfied: retain current monotonic phase
  return { phase: normalizedCurrent, isAdvance: false };
}
