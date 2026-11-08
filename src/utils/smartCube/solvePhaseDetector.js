// src/utils/smartCube/solvePhaseDetector.js
// Monotonic CFOP Solve Phase Detection Engine (Cross -> F2L -> OLL -> PLL -> complete)
// Supports all 6 cross orientations (U, D, F, B, R, L) and automatic cross face detection.

import { isFaceletsSolved, CubeStateSimulator } from '../cubeMath.js';

export const CFOP_PHASES = Object.freeze(['cross', 'f2l', 'oll', 'pll', 'complete']);
export const VALID_CROSS_FACES = Object.freeze(['U', 'D', 'F', 'B', 'R', 'L']);
export const F2L_SLOT_NAMES = Object.freeze(['FR', 'FL', 'BR', 'BL']);

export const F2L_SLOT_DEFINITIONS = Object.freeze({
  D: {
    FR: {
      corner: { stickers: [29, 26, 15], centers: [31, 22, 13] },
      edge: { stickers: [23, 12], centers: [22, 13] }
    },
    FL: {
      corner: { stickers: [27, 24, 44], centers: [31, 22, 40] },
      edge: { stickers: [21, 41], centers: [22, 40] }
    },
    BR: {
      corner: { stickers: [35, 51, 17], centers: [31, 49, 13] },
      edge: { stickers: [48, 14], centers: [49, 13] }
    },
    BL: {
      corner: { stickers: [33, 53, 42], centers: [31, 49, 40] },
      edge: { stickers: [50, 39], centers: [49, 40] }
    }
  },
  U: {
    FR: {
      corner: { stickers: [8, 20, 9], centers: [4, 22, 13] },
      edge: { stickers: [23, 12], centers: [22, 13] }
    },
    FL: {
      corner: { stickers: [6, 18, 38], centers: [4, 22, 40] },
      edge: { stickers: [21, 41], centers: [22, 40] }
    },
    BR: {
      corner: { stickers: [2, 45, 11], centers: [4, 49, 13] },
      edge: { stickers: [48, 14], centers: [49, 13] }
    },
    BL: {
      corner: { stickers: [0, 47, 36], centers: [4, 49, 40] },
      edge: { stickers: [50, 39], centers: [49, 40] }
    }
  }
});

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

export function isFaceMonochrome(facelets, face = 'U') {
  const f = normalizeFacelets(facelets);
  if (f.length !== 54) return false;
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

/**
 * Identifies the solved status of each of the 4 F2L slots (FR, FL, BR, BL).
 *
 * @param {string|string[]} facelets - 54-char facelet string or array
 * @param {'U'|'D'|'auto'} crossFace - Cross face (defaults to 'D')
 * @returns {Array<{ slot: 'FR'|'FL'|'BR'|'BL', solved: boolean, cornerSolved: boolean, edgeSolved: boolean }>}
 */
export function detectF2LSlots(facelets, crossFace = 'D') {
  const f = normalizeFacelets(facelets);
  if (f.length !== 54) {
    return F2L_SLOT_NAMES.map(slot => ({
      slot,
      solved: false,
      cornerSolved: false,
      edgeSolved: false
    }));
  }

  let effectiveFace = crossFace;
  if (effectiveFace === 'auto') {
    effectiveFace = isCrossSolved(f, 'U') && !isCrossSolved(f, 'D') ? 'U' : 'D';
  }

  const defs = F2L_SLOT_DEFINITIONS[effectiveFace] || F2L_SLOT_DEFINITIONS.D;

  return F2L_SLOT_NAMES.map(slot => {
    const def = defs[slot];
    if (!def) {
      return { slot, solved: false, cornerSolved: false, edgeSolved: false };
    }

    const { corner, edge } = def;
    const cornerSolved =
      f[corner.stickers[0]] === f[corner.centers[0]] &&
      f[corner.stickers[1]] === f[corner.centers[1]] &&
      f[corner.stickers[2]] === f[corner.centers[2]];

    const edgeSolved =
      f[edge.stickers[0]] === f[edge.centers[0]] &&
      f[edge.stickers[1]] === f[edge.centers[1]];

    return {
      slot,
      solved: cornerSolved && edgeSolved,
      cornerSolved,
      edgeSolved
    };
  });
}

/**
 * Detects newly completed F2L slots between two consecutive states.
 *
 * @param {Array|object} prevSlots - Previous slots state
 * @param {Array|object} currSlots - Current slots state
 * @param {number} timestamp - Current timestamp in ms
 * @param {number} elapsedMs - Current elapsed solve time in ms
 * @param {number} lastSplitMs - Elapsed time at previous completion in ms
 * @returns {Array<{ slot: string, timestamp: number, durationMs: number, splitMs: number }>}
 */
export function detectActiveF2LCompletions(prevSlots, currSlots, timestamp, elapsedMs, lastSplitMs = 0) {
  if (!Array.isArray(currSlots) || currSlots.length === 0) return [];

  const prevMap = new Map();
  if (Array.isArray(prevSlots)) {
    for (const s of prevSlots) {
      if (s?.slot) prevMap.set(s.slot, !!s.solved);
    }
  } else if (prevSlots && typeof prevSlots === 'object') {
    for (const [k, v] of Object.entries(prevSlots)) {
      prevMap.set(k, typeof v === 'boolean' ? v : !!v?.solved);
    }
  }

  const completions = [];
  let currentSplitMarker = lastSplitMs || 0;

  for (const curr of currSlots) {
    if (!curr?.slot || !curr.solved) continue;
    const wasSolved = prevMap.get(curr.slot) === true;
    if (!wasSolved) {
      const durationMs = Math.max(0, elapsedMs - currentSplitMarker);
      completions.push({
        slot: curr.slot,
        timestamp: timestamp || Date.now(),
        durationMs,
        splitMs: elapsedMs
      });
      currentSplitMarker = elapsedMs;
    }
  }

  return completions;
}

/**
 * Reconstructs the chronological 4 F2L pair completions (F1-F4) by replaying moves from scramble.
 *
 * @param {string} scramble - Scramble sequence
 * @param {Array<{ move: string, timestamp?: number, stepTime?: number }>} moveTimings - Moves with timings
 * @param {string} crossFace - Cross face (defaults to 'D')
 * @returns {Record<string, { slot: string, durationMs: number, splitMs: number, timestamp: number }>}
 */
export function reconstructF2LBreakdown(scramble, moveTimings = [], crossFace = 'D') {
  const sim = new CubeStateSimulator();
  if (scramble) {
    sim.applyMoves(scramble);
  }

  const completedSlots = new Set();
  const f2lBreakdown = {};
  const pairKeys = ['f1', 'f2', 'f3', 'f4'];
  let lastSplitMs = 0;

  let crossResolved = isCrossSolved(sim.getFaceletString(), crossFace);

  const initialSlots = detectF2LSlots(sim.getFaceletString(), crossFace);
  for (const s of initialSlots) {
    if (s.solved && crossResolved) {
      completedSlots.add(s.slot);
      const pairKey = pairKeys[Object.keys(f2lBreakdown).length];
      if (pairKey) {
        f2lBreakdown[pairKey] = {
          slot: s.slot,
          durationMs: 0,
          splitMs: 0,
          timestamp: moveTimings[0]?.timestamp || 0
        };
      }
    }
  }

  for (let i = 0; i < moveTimings.length; i++) {
    const item = moveTimings[i];
    const move = typeof item === 'string' ? item : item.move;
    const timestamp = typeof item === 'object' ? (item.timestamp || 0) : 0;
    const elapsedMs = typeof item === 'object' && item.elapsedMs !== undefined
      ? item.elapsedMs
      : (i > 0 && typeof item === 'object' && moveTimings[0]?.timestamp
        ? item.timestamp - moveTimings[0].timestamp
        : 0);

    sim.applyMove(move);
    const currFacelets = sim.getFaceletString();

    if (!crossResolved && isCrossSolved(currFacelets, crossFace)) {
      crossResolved = true;
      lastSplitMs = elapsedMs;
    }

    const currSlots = detectF2LSlots(currFacelets, crossFace);

    for (const curr of currSlots) {
      if (curr.solved && !completedSlots.has(curr.slot)) {
        completedSlots.add(curr.slot);
        const pairKey = pairKeys[Object.keys(f2lBreakdown).length];
        if (pairKey) {
          const durationMs = Math.max(0, elapsedMs - lastSplitMs);
          f2lBreakdown[pairKey] = {
            slot: curr.slot,
            durationMs,
            splitMs: elapsedMs,
            timestamp
          };
          lastSplitMs = elapsedMs;
        }
      }
    }
  }

  return f2lBreakdown;
}
