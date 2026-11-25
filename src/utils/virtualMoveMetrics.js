// src/utils/virtualMoveMetrics.js

const AXIS_FACES = {
  x: { pos: 'R', neg: 'L', slice: 'M', slicePositiveDir: -1 },
  y: { pos: 'U', neg: 'D', slice: 'E', slicePositiveDir: -1 },
  z: { pos: 'F', neg: 'B', slice: 'S', slicePositiveDir: 1 }
};

function normalizeSlices(sliceArr) {
  const raw = Array.isArray(sliceArr) ? sliceArr : [sliceArr];
  const unique = [];
  for (const val of raw) {
    const num = Number(val);
    if (Number.isNaN(num)) continue;
    const snapped = Math.round(num * 2) / 2;
    if (!unique.some(s => Math.abs(s - snapped) < 0.05)) {
      unique.push(snapped);
    }
  }
  return unique;
}

function slicesMatch(slices, targets) {
  if (slices.length !== targets.length) return false;
  return targets.every(t => slices.some(s => Math.abs(s - t) < 0.1));
}

function formatFaceMove(face, isPrime) {
  return isPrime ? `${face}'` : face;
}

export function rotationToCanonicalMove(axis, sliceArr, direction, size = 3) {
  const faceSpec = AXIS_FACES[axis];
  if (!faceSpec) return null;

  const slices = normalizeSlices(sliceArr);
  if (slices.length === 0) return null;

  const dir = direction >= 0 ? 1 : -1;
  const outer = (size - 1) / 2;
  const inner = size === 5 ? 1 : size === 4 ? 0.5 : 0;

  const allLayers = Array.from({ length: size }, (_, i) => i - outer);
  if (slicesMatch(slices, allLayers)) {
    return formatFaceMove(axis, dir !== 1);
  }

  if (slicesMatch(slices, [outer])) {
    return formatFaceMove(faceSpec.pos, dir !== 1);
  }
  if (slicesMatch(slices, [-outer])) {
    return formatFaceMove(faceSpec.neg, dir !== -1);
  }

  if (size === 5) {
    if (slicesMatch(slices, [2, 1, 0])) {
      return formatFaceMove(`3${faceSpec.pos}w`, dir !== 1);
    }
    if (slicesMatch(slices, [-2, -1, 0])) {
      return formatFaceMove(`3${faceSpec.neg}w`, dir !== -1);
    }
  }

  if (size >= 3) {
    if (slicesMatch(slices, [outer, inner])) {
      return formatFaceMove(`${faceSpec.pos}w`, dir !== 1);
    }
    if (slicesMatch(slices, [-outer, -inner])) {
      return formatFaceMove(`${faceSpec.neg}w`, dir !== -1);
    }
  }

  const isCenterSlice =
    size === 4 ? slicesMatch(slices, [-0.5, 0.5]) : slicesMatch(slices, [0]);
  if (isCenterSlice) {
    return formatFaceMove(faceSpec.slice, dir !== faceSpec.slicePositiveDir);
  }

  if (size >= 4) {
    if (slicesMatch(slices, [inner])) {
      return formatFaceMove(`2${faceSpec.pos}`, dir !== 1);
    }
    if (slicesMatch(slices, [-inner])) {
      return formatFaceMove(`2${faceSpec.neg}`, dir !== -1);
    }
  }

  return null;
}

function parseMoveToken(token) {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([32]?[RLUDFB]w?|[MES]|[rludfb])(['2])?$/);
  if (!match) return null;

  let base = match[1];
  const mod = match[2] || '';

  if (/^[rludfb]$/.test(base)) {
    base = `${base.toUpperCase()}w`;
  }

  const turns = mod === '2' ? 2 : mod === "'" ? 3 : 1;
  return { base, turns };
}

function isSliceMove(move) {
  return /^(?:[MES]|2[RLUDFB])(?:['2])?$/.test(move);
}

export function computeMoveMetrics(rawMoves = []) {
  const tokens = (
    typeof rawMoves === 'string'
      ? rawMoves.trim().split(/\s+/)
      : Array.isArray(rawMoves)
      ? rawMoves
      : []
  )
    .map(m => (typeof m === 'string' ? m.trim() : ''))
    .filter(Boolean);

  const nonRotationMoves = tokens.filter(m => !/^[xyz]['2]?$/i.test(m));
  const stack = [];

  for (const token of nonRotationMoves) {
    const parsed = parseMoveToken(token);
    if (!parsed) continue;
    const top = stack[stack.length - 1];
    if (top && top.base === parsed.base) {
      const nextTurns = (top.turns + parsed.turns) % 4;
      if (nextTurns === 0) {
        stack.pop();
      } else {
        top.turns = nextTurns;
      }
    } else {
      stack.push({ base: parsed.base, turns: parsed.turns });
    }
  }

  const simplifiedMoves = stack.map(({ base, turns }) =>
    turns === 1 ? base : turns === 2 ? `${base}2` : `${base}'`
  );

  const htm = simplifiedMoves.reduce((sum, move) => sum + (isSliceMove(move) ? 2 : 1), 0);
  const stm = simplifiedMoves.length;

  return {
    htm,
    stm,
    rawCount: nonRotationMoves.length,
    simplifiedMoves,
    simplifiedString: simplifiedMoves.join(' '),
    rawString: tokens.join(' ')
  };
}
