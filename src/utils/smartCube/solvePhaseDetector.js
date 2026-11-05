// src/utils/smartCube/solvePhaseDetector.js
// Monotonic CFOP Solve Phase Detection Engine (Cross -> F2L -> OLL -> PLL -> complete)
// Supports all 6 cross orientations (U, D, F, B, R, L) and automatic cross face detection.

import { isFaceletsSolved } from '../cubeMath.js';

export const CFOP_PHASES = Object.freeze(['cross', 'f2l', 'oll', 'pll', 'complete']);
export const VALID_CROSS_FACES = Object.freeze(['U', 'D', 'F', 'B', 'R', 'L']);

const PHASE_RANKS = Object.freeze({
  cross: 0,
  f2l: 1,
  oll: 2,
  pll: 3,
  complete: 4
});

const OPPOSITE_FACE = Object.freeze({
  U: 'D',
  D: 'U',
  F: 'B',
  B: 'F',
  R: 'L',
  L: 'R'
});

const FACE_OFFSETS = Object.freeze({
  U: 0,
  R: 9,
  F: 18,
  D: 27,
  L: 36,
  B: 45
});

// Les 12 arêtes du cube avec leurs indices de facettes et les indices de leurs centres respectifs
const ALL_EDGES = Object.freeze([
  // Arêtes U
  { faces: ['U', 'F'], stickers: [7, 19], centers: [4, 22] },
  { faces: ['U', 'R'], stickers: [5, 10], centers: [4, 13] },
  { faces: ['U', 'B'], stickers: [1, 46], centers: [4, 49] },
  { faces: ['U', 'L'], stickers: [3, 37], centers: [4, 40] },
  // Arêtes D
  { faces: ['D', 'F'], stickers: [28, 25], centers: [31, 22] },
  { faces: ['D', 'R'], stickers: [32, 16], centers: [31, 13] },
  { faces: ['D', 'B'], stickers: [34, 52], centers: [31, 49] },
  { faces: ['D', 'L'], stickers: [30, 43], centers: [31, 40] },
  // Arêtes équatoriales (E-slice)
  { faces: ['F', 'L'], stickers: [21, 41], centers: [22, 40] },
  { faces: ['F', 'R'], stickers: [23, 12], centers: [22, 13] },
  { faces: ['B', 'R'], stickers: [48, 14], centers: [49, 13] },
  { faces: ['B', 'L'], stickers: [50, 39], centers: [49, 40] }
]);

// Les 8 coins du cube avec leurs indices de facettes et les indices de leurs centres respectifs
const ALL_CORNERS = Object.freeze([
  // Coins U
  { faces: ['U', 'F', 'L'], stickers: [6, 18, 38], centers: [4, 22, 40] },
  { faces: ['U', 'F', 'R'], stickers: [8, 20, 9],  centers: [4, 22, 13] },
  { faces: ['U', 'B', 'R'], stickers: [2, 45, 11], centers: [4, 49, 13] },
  { faces: ['U', 'B', 'L'], stickers: [0, 47, 36], centers: [4, 49, 40] },
  // Coins D
  { faces: ['D', 'F', 'L'], stickers: [27, 24, 44], centers: [31, 22, 40] },
  { faces: ['D', 'F', 'R'], stickers: [29, 26, 15], centers: [31, 22, 13] },
  { faces: ['D', 'B', 'R'], stickers: [35, 51, 17], centers: [31, 49, 13] },
  { faces: ['D', 'B', 'L'], stickers: [33, 53, 42], centers: [31, 49, 40] }
]);

function normalizeFacelets(facelets) {
  if (typeof facelets === 'string') return facelets;
  if (Array.isArray(facelets)) return facelets.join('');
  return '';
}

function isFaceMonochrome(f, face) {
  const offset = FACE_OFFSETS[face];
  if (offset === undefined) return false;
  const center = f[offset + 4];
  for (let i = 0; i < 9; i++) {
    if (f[offset + i] !== center) return false;
  }
  return true;
}

/**
 * Vérifie si les 4 arêtes de la croix sur `crossFace` sont alignées avec leurs centres.
 */
export function isCrossSolved(facelets, crossFace = 'D') {
  const f = normalizeFacelets(facelets);
  if (f.length !== 54) return false;

  if (crossFace === 'auto') {
    return VALID_CROSS_FACES.some(face => isCrossSolved(f, face));
  }

  if (!OPPOSITE_FACE[crossFace]) return false;

  for (const edge of ALL_EDGES) {
    if (edge.faces.includes(crossFace)) {
      const [s0, s1] = edge.stickers;
      const [c0, c1] = edge.centers;
      if (f[s0] !== f[c0] || f[s1] !== f[c1]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Vérifie si les deux premières couronnes (F2L) sont résolues par rapport à `crossFace`.
 */
export function isF2LSolved(facelets, crossFace = 'D') {
  const f = normalizeFacelets(facelets);
  if (f.length !== 54) return false;

  if (crossFace === 'auto') {
    return VALID_CROSS_FACES.some(face => isF2LSolved(f, face));
  }

  const opposite = OPPOSITE_FACE[crossFace];
  if (!opposite) return false;

  if (!isCrossSolved(f, crossFace)) return false;

  // 4 coins de la première couronne
  for (const corner of ALL_CORNERS) {
    if (corner.faces.includes(crossFace)) {
      const [s0, s1, s2] = corner.stickers;
      const [c0, c1, c2] = corner.centers;
      if (f[s0] !== f[c0] || f[s1] !== f[c1] || f[s2] !== f[c2]) {
        return false;
      }
    }
  }

  // 4 arêtes de la couronne intermédiaire (ni crossFace, ni opposite)
  for (const edge of ALL_EDGES) {
    if (!edge.faces.includes(crossFace) && !edge.faces.includes(opposite)) {
      const [s0, s1] = edge.stickers;
      const [c0, c1] = edge.centers;
      if (f[s0] !== f[c0] || f[s1] !== f[c1]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Vérifie si l'orientation de la dernière couronne (OLL) est résolue par rapport à `crossFace`.
 */
export function isOLLSolved(facelets, crossFace = 'D') {
  const f = normalizeFacelets(facelets);
  if (f.length !== 54) return false;

  if (crossFace === 'auto') {
    return VALID_CROSS_FACES.some(face => isOLLSolved(f, face));
  }

  const opposite = OPPOSITE_FACE[crossFace];
  if (!opposite) return false;

  if (!isF2LSolved(f, crossFace)) return false;

  return isFaceMonochrome(f, opposite);
}

/**
 * Vérifie si la permutation de la dernière couronne (PLL) est résolue.
 */
export function isPLLSolved(facelets, crossFace = 'D') {
  const f = normalizeFacelets(facelets);
  if (f.length !== 54) return false;

  return isOLLSolved(f, crossFace) && isFaceletsSolved(f);
}

function evaluateSingleFacePhase(f, currentRank, face) {
  if (isOLLSolved(f, face)) {
    return Math.max(currentRank, PHASE_RANKS.pll);
  }
  if (isF2LSolved(f, face)) {
    return Math.max(currentRank, PHASE_RANKS.oll);
  }
  if (isCrossSolved(f, face)) {
    return Math.max(currentRank, PHASE_RANKS.f2l);
  }
  return currentRank;
}

/**
 * Détecte la phase CFOP de manière strictement monotone.
 * Si `crossFace === 'auto'`, teste prioritairement U (Blanc) et D (Jaune), puis F, B, R, L,
 * et renvoie également `detectedCrossFace` pour verrouiller l'axe de résolution.
 */
export function detectSolvePhase(facelets, currentPhase = 'cross', crossFace = 'D') {
  const f = normalizeFacelets(facelets);
  const normalizedCurrent = PHASE_RANKS[currentPhase] !== undefined ? currentPhase : 'cross';
  const currentRank = PHASE_RANKS[normalizedCurrent];

  if (currentRank >= PHASE_RANKS.complete) {
    return { phase: 'complete', isAdvance: false, detectedCrossFace: crossFace === 'auto' ? 'U' : crossFace };
  }

  if (f.length !== 54) {
    return { phase: normalizedCurrent, isAdvance: false, detectedCrossFace: null };
  }

  if (isFaceletsSolved(f)) {
    return {
      phase: 'complete',
      isAdvance: currentRank < PHASE_RANKS.complete,
      detectedCrossFace: crossFace === 'auto' ? 'U' : crossFace
    };
  }

  if (crossFace === 'auto') {
    let bestRank = currentRank;
    let bestFace = null;

    // Priorité aux faces U (Blanc) et D (Jaune), puis aux 4 autres faces
    for (const candidateFace of VALID_CROSS_FACES) {
      const rank = evaluateSingleFacePhase(f, currentRank, candidateFace);
      if (rank > bestRank) {
        bestRank = rank;
        bestFace = candidateFace;
      }
    }

    const nextPhase = CFOP_PHASES[bestRank] || normalizedCurrent;
    return {
      phase: nextPhase,
      isAdvance: bestRank > currentRank,
      detectedCrossFace: bestFace
    };
  }

  const targetRank = evaluateSingleFacePhase(f, currentRank, crossFace);
  const nextPhase = CFOP_PHASES[targetRank] || normalizedCurrent;

  return {
    phase: nextPhase,
    isAdvance: targetRank > currentRank,
    detectedCrossFace: targetRank > currentRank ? crossFace : null
  };
}