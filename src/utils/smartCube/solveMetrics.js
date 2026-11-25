// src/utils/smartCube/solveMetrics.js
import { safeTps } from './wcaStats.js';

const FACE_AXIS = Object.freeze({
  U: 'y',
  D: 'y',
  R: 'x',
  L: 'x',
  F: 'z',
  B: 'z'
});

const REGRIP_FACES = new Set(['F', 'B', 'D', 'L']);

const PHASE_LABELS = Object.freeze({
  cross: 'Cross',
  f2l: 'F2L',
  oll: 'OLL',
  pll: 'PLL'
});

function getPhaseAtElapsed(relMs, phaseSplits = {}) {
  const crossEnd = phaseSplits?.cross?.splitMs ?? Infinity;
  const f2lEnd = phaseSplits?.f2l?.splitMs ?? Infinity;
  const ollEnd = phaseSplits?.oll?.splitMs ?? Infinity;
  if (relMs <= crossEnd) return 'cross';
  if (relMs <= f2lEnd) return 'f2l';
  if (relMs <= ollEnd) return 'oll';
  return 'pll';
}

function getMoveRelMs(entry, fallbackStartTs) {
  if (typeof entry?.relMs === 'number' && Number.isFinite(entry.relMs)) {
    return Math.max(0, entry.relMs);
  }
  return Math.max(0, (entry?.timestamp ?? fallbackStartTs) - fallbackStartTs);
}

function normalizeQuat(q) {
  if (!Array.isArray(q) || q.length < 4) return null;
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (!Number.isFinite(len) || len < 1e-6) return null;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

function quatAngleDeg(q1, q2) {
  const a = normalizeQuat(q1);
  const b = normalizeQuat(q2);
  if (!a || !b) return 0;
  const dot = Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]));
  return 2 * Math.acos(dot) * (180 / Math.PI);
}

export function resolveMoveTiming({
  moveData,
  explicitTimestamp = null,
  prevMoveEntry = null,
  solveStartWallMs = 0
} = {}) {
  const cubeTs =
    moveData && typeof moveData === 'object' && typeof moveData.timestamp === 'number' && Number.isFinite(moveData.timestamp)
      ? moveData.timestamp
      : null;

  if (cubeTs !== null && prevMoveEntry && typeof prevMoveEntry.cubeTimestamp === 'number') {
    const delta = (cubeTs - prevMoveEntry.cubeTimestamp) >>> 0;
    if (delta <= 60000) {
      const stepTime = delta;
      const relMs = (prevMoveEntry.relMs ?? 0) + delta;
      const baseWall = solveStartWallMs || prevMoveEntry.timestamp || Date.now();
      const timestamp = baseWall + relMs;
      return { timestamp, relMs, stepTime, cubeTimestamp: cubeTs };
    }
  }

  const now = explicitTimestamp ?? (!prevMoveEntry && solveStartWallMs ? solveStartWallMs : Date.now());
  const prevTs = prevMoveEntry ? prevMoveEntry.timestamp : now;
  const stepTime = Math.max(0, now - prevTs);
  const relMs = solveStartWallMs
    ? Math.max(0, now - solveStartWallMs)
    : (prevMoveEntry ? (prevMoveEntry.relMs ?? 0) + stepTime : 0);

  return {
    timestamp: now,
    relMs,
    stepTime,
    cubeTimestamp: cubeTs
  };
}

export function enrichPhaseSplits(phaseSplits = {}, moveHistory = []) {
  const splits = phaseSplits && typeof phaseSplits === 'object' ? { ...phaseSplits } : {};
  const history = Array.isArray(moveHistory) ? moveHistory : [];
  let cursor = 0;

  for (const phase of ['cross', 'f2l', 'oll', 'pll']) {
    const entry = splits[phase];
    if (!entry || typeof entry !== 'object') continue;

    const durationMs = Math.max(0, Number(entry.durationMs) || 0);
    const count = Math.max(0, Number(entry.moveCount ?? entry.moves) || 0);

    if (entry.skipped || count === 0) {
      splits[phase] = {
        ...entry,
        startMoveIndex: null,
        endMoveIndex: null,
        recognitionMs: 0,
        executionMs: durationMs,
        executionTps: 0
      };
      continue;
    }

    const startMoveIndex = cursor;
    const endMoveIndex = cursor + count - 1;
    cursor += count;

    const firstStep = Number(history[startMoveIndex]?.stepTime) || 0;
    const recognitionMs = phase === 'cross'
      ? 0
      : Math.min(durationMs, Math.max(0, firstStep));
    const executionMs = Math.max(0, durationMs - recognitionMs);
    const executionTps = safeTps(count, executionMs);

    splits[phase] = {
      ...entry,
      startMoveIndex,
      endMoveIndex,
      recognitionMs,
      executionMs,
      executionTps
    };
  }

  if (phaseSplits?.f2lBreakdown) {
    splits.f2lBreakdown = phaseSplits.f2lBreakdown;
  }

  return splits;
}

export function detectRegrips(moveHistory = [], gyroSamples = [], phaseSplits = {}) {
  const moves = Array.isArray(moveHistory) ? moveHistory : [];
  const startTs = moves[0]?.timestamp ?? 0;
  const items = [];

  if (Array.isArray(gyroSamples) && gyroSamples.length >= 2) {
    let winStart = 0;
    let lastRegripMs = -Infinity;

    for (let i = 1; i < gyroSamples.length; i++) {
      const curr = gyroSamples[i];
      if (!curr || typeof curr.relMs !== 'number' || !Array.isArray(curr.q)) continue;

      while (winStart < i && (curr.relMs - (gyroSamples[winStart]?.relMs ?? 0)) > 600) {
        winStart++;
      }

      let maxAngle = 0;
      for (let j = winStart; j < i; j++) {
        const prev = gyroSamples[j];
        if (!prev || typeof prev.relMs !== 'number' || !Array.isArray(prev.q)) continue;
        if (curr.relMs - prev.relMs < 0) continue;
        const angle = quatAngleDeg(prev.q, curr.q);
        if (angle > maxAngle) maxAngle = angle;
      }

      if (maxAngle >= 40 && (lastRegripMs === -Infinity || curr.relMs - lastRegripMs >= 350)) {
        let moveIndex = null;
        if (moves.length > 0) {
          let bestDiff = Infinity;
          for (let mIdx = 0; mIdx < moves.length; mIdx++) {
            const diff = Math.abs(getMoveRelMs(moves[mIdx], startTs) - curr.relMs);
            if (diff < bestDiff) {
              bestDiff = diff;
              moveIndex = mIdx + 1;
            }
          }
        }

        items.push({
          atMs: curr.relMs,
          moveIndex,
          phase: getPhaseAtElapsed(curr.relMs, phaseSplits),
          source: 'gyro',
          angleDeg: Math.round(maxAngle)
        });
        lastRegripMs = curr.relMs;
      }
    }

    return { count: items.length, items };
  }

  for (let i = 1; i < moves.length; i++) {
    const prevMove = moves[i - 1];
    const currMove = moves[i];
    const prevFace = prevMove?.move?.[0];
    const currFace = currMove?.move?.[0];
    const stepTime = Number(currMove?.stepTime) || 0;

    if (
      stepTime >= 260 &&
      prevFace &&
      currFace &&
      FACE_AXIS[prevFace] !== FACE_AXIS[currFace] &&
      (REGRIP_FACES.has(prevFace) || REGRIP_FACES.has(currFace))
    ) {
      const relMs = getMoveRelMs(currMove, startTs);
      items.push({
        atMs: relMs,
        moveIndex: i + 1,
        phase: getPhaseAtElapsed(relMs, phaseSplits),
        source: 'heuristic',
        angleDeg: null
      });
    }
  }

  return { count: items.length, items };
}

export function buildAnnotatedReconstruction(solve) {
  if (!solve || typeof solve !== 'object') {
    return { segments: [], text: '' };
  }

  let allMoves = [];
  if (Array.isArray(solve.moveTimings) && solve.moveTimings.length > 0) {
    allMoves = solve.moveTimings.map(m => (typeof m === 'string' ? m : m?.move)).filter(Boolean);
  } else if (typeof solve.moves === 'string' && solve.moves.trim()) {
    allMoves = solve.moves.trim().split(/\s+/).filter(Boolean);
  } else if (Array.isArray(solve.moves)) {
    allMoves = solve.moves.filter(Boolean);
  }

  const rawSplits = solve.splits || {};
  const needsEnrich = rawSplits.cross && rawSplits.cross.startMoveIndex === undefined;
  const splits = needsEnrich
    ? enrichPhaseSplits(rawSplits, Array.isArray(solve.moveTimings) && solve.moveTimings.length > 0
      ? solve.moveTimings
      : allMoves.map(m => ({ move: m })))
    : rawSplits;

  const f2lBreakdown = solve.f2lBreakdown || splits.f2lBreakdown || rawSplits.f2lBreakdown || {};
  const pairKeys = ['f1', 'f2', 'f3', 'f4'];
  const hasF2LPairIndices = pairKeys.some((k) => {
    const p = f2lBreakdown[k];
    return p && typeof p.startMoveIndex === 'number' && typeof p.endMoveIndex === 'number' && p.endMoveIndex >= p.startMoveIndex;
  });

  const segments = [];

  const pushPhaseSegment = (phaseKey, label) => {
    const entry = splits[phaseKey];
    if (!entry || entry.skipped) return;
    if (typeof entry.startMoveIndex !== 'number' || typeof entry.endMoveIndex !== 'number') return;
    const segMoves = allMoves.slice(entry.startMoveIndex, entry.endMoveIndex + 1);
    if (segMoves.length === 0) return;
    const durationMs = Math.max(0, Number(entry.durationMs) || 0);
    segments.push({
      key: phaseKey,
      label,
      phase: phaseKey,
      moves: segMoves,
      moveCount: segMoves.length,
      durationMs,
      tps: entry.tps ?? safeTps(segMoves.length, durationMs)
    });
  };

  pushPhaseSegment('cross', PHASE_LABELS.cross);

  if (hasF2LPairIndices) {
    for (const k of pairKeys) {
      const pair = f2lBreakdown[k];
      if (!pair || typeof pair.startMoveIndex !== 'number' || typeof pair.endMoveIndex !== 'number') continue;
      if (pair.endMoveIndex < pair.startMoveIndex) continue;
      const segMoves = allMoves.slice(pair.startMoveIndex, pair.endMoveIndex + 1);
      if (segMoves.length === 0) continue;
      const durationMs = Math.max(0, Number(pair.durationMs) || 0);
      segments.push({
        key: k,
        label: pair.slot ? `${k.toUpperCase()} (${pair.slot})` : k.toUpperCase(),
        phase: 'f2l',
        slot: pair.slot || null,
        moves: segMoves,
        moveCount: segMoves.length,
        durationMs,
        tps: pair.tps ?? safeTps(segMoves.length, durationMs)
      });
    }
  } else {
    pushPhaseSegment('f2l', PHASE_LABELS.f2l);
  }

  pushPhaseSegment('oll', PHASE_LABELS.oll);
  pushPhaseSegment('pll', PHASE_LABELS.pll);

  const totalMs = Math.max(0, Number(solve.elapsedMs ?? solve.timeMs) || 0);
  const totalMoves = Number(solve.moveCount) || allMoves.length;
  const totalTps = solve.tps ?? safeTps(totalMoves, totalMs);

  const lines = [];
  if (solve.scramble) {
    lines.push(`// Scramble: ${solve.scramble}`);
  }
  lines.push(`// Time: ${(totalMs / 1000).toFixed(2)}s | ${totalMoves} moves | ${Number(totalTps || 0).toFixed(2)} TPS`);

  for (const seg of segments) {
    lines.push(`${seg.moves.join(' ')} // ${seg.label} (${(seg.durationMs / 1000).toFixed(2)}s, ${seg.moveCount}m)`);
  }

  return {
    segments,
    text: lines.join('\n')
  };
}
