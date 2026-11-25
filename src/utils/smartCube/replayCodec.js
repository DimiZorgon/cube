// src/utils/smartCube/replayCodec.js
import { CubeStateSimulator } from '../cubeMath.js';
import { advanceSolvePhases, analyzeSolvePauses } from '../../store/useSmartCubeStore.js';
import { detectRegrips } from './solveMetrics.js';
import { safeTps } from './wcaStats.js';
import { localizedPath } from '../../routes/routeConfig.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressDeflateRaw(bytes) {
  if (typeof CompressionStream !== 'function') {
    return { compressed: false, bytes };
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  return { compressed: true, bytes: new Uint8Array(buf) };
}

async function decompressDeflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('DecompressionStream is not supported in this environment.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

function extractMovesAndDeltas(solve) {
  if (Array.isArray(solve?.moveTimings) && solve.moveTimings.length > 0) {
    const moves = [];
    const deltas = [];
    let prevRelMs = 0;

    for (let i = 0; i < solve.moveTimings.length; i++) {
      const item = solve.moveTimings[i];
      const mv = typeof item === 'string' ? item.trim() : String(item?.move || '').trim();
      if (!mv) continue;

      let stepTime = 0;
      if (typeof item === 'object' && item !== null) {
        if (typeof item.stepTime === 'number' && Number.isFinite(item.stepTime) && item.stepTime >= 0) {
          stepTime = Math.round(item.stepTime);
        } else if (typeof item.relMs === 'number' && Number.isFinite(item.relMs)) {
          stepTime = Math.max(0, Math.round(item.relMs - prevRelMs));
          prevRelMs = item.relMs;
        } else if (i > 0 && typeof item.timestamp === 'number' && typeof solve.moveTimings[i - 1]?.timestamp === 'number') {
          stepTime = Math.max(0, Math.round(item.timestamp - solve.moveTimings[i - 1].timestamp));
        }
      }

      moves.push(mv);
      deltas.push(stepTime);
    }

    return { moves, deltas };
  }

  const moves = typeof solve?.moves === 'string'
    ? solve.moves.trim().split(/\s+/).filter(Boolean)
    : Array.isArray(solve?.moves)
    ? solve.moves.map(m => String(m || '').trim()).filter(Boolean)
    : [];

  return { moves, deltas: [] };
}

/**
 * Encodes a solve into a compact URL-safe string (`deflate-raw` + base64url, with `u.` fallback).
 */
export async function encodeReplayPayload(solve) {
  if (!solve || typeof solve !== 'object') {
    throw new Error('Résolution invalide pour le partage.');
  }

  const { moves, deltas } = extractMovesAndDeltas(solve);
  if (moves.length === 0) {
    throw new Error('Aucun mouvement à encoder pour ce replay.');
  }

  const elapsedMs = Math.max(1, Math.round(Number(solve.elapsedMs ?? solve.timeMs) || 0));
  const penalty = solve.penalty === '+2' || solve.penalty === 'dnf' ? solve.penalty : (solve.isDnf ? 'dnf' : 'none');
  const timestamp = Number(solve.timestamp ?? solve.date) || Date.now();

  const payload = {
    v: 1,
    s: String(solve.scramble || '').trim(),
    m: moves.join(' '),
    e: elapsedMs,
    p: penalty,
    d: timestamp
  };

  if (deltas.length === moves.length) {
    payload.t = deltas;
  }
  if (typeof solve.solveNumber === 'number' && Number.isInteger(solve.solveNumber) && solve.solveNumber > 0) {
    payload.n = solve.solveNumber;
  }

  const rawBytes = textEncoder.encode(JSON.stringify(payload));
  const { compressed, bytes } = await compressDeflateRaw(rawBytes);
  const b64 = bytesToBase64Url(bytes);
  return compressed ? b64 : `u.${b64}`;
}

/**
 * Decodes a `?d=...` replay payload and recomputes CFOP splits, F2L breakdown,
 * pauses, heuristic regrips, and TPS deterministically client-side.
 */
export async function decodeReplayPayload(encoded) {
  if (typeof encoded !== 'string' || !encoded.trim()) {
    throw new Error('Paramètre de replay manquant.');
  }

  const token = encoded.trim();
  let jsonStr;

  if (token.startsWith('u.')) {
    const rawBytes = base64UrlToBytes(token.slice(2));
    jsonStr = textDecoder.decode(rawBytes);
  } else {
    const compressedBytes = base64UrlToBytes(token);
    const rawBytes = await decompressDeflateRaw(compressedBytes);
    jsonStr = textDecoder.decode(rawBytes);
  }

  const payload = JSON.parse(jsonStr);
  if (!payload || payload.v !== 1 || typeof payload.m !== 'string') {
    throw new Error('Format de replay non pris en charge.');
  }

  const movesArr = payload.m.trim().split(/\s+/).filter(Boolean);
  if (movesArr.length === 0) {
    throw new Error('Séquence de mouvements vide.');
  }

  const scramble = typeof payload.s === 'string' ? payload.s.trim() : '';
  const elapsedMs = Math.max(1, Math.round(Number(payload.e) || 1));
  const penalty = payload.p === '+2' || payload.p === 'dnf' ? payload.p : 'none';
  const baseTs = Number(payload.d) || Date.now();
  const hasDeltas = Array.isArray(payload.t) && payload.t.length === movesArr.length;
  const fallbackStep = movesArr.length > 1 ? Math.round(elapsedMs / movesArr.length) : elapsedMs;

  const moveTimings = [];
  let runningRelMs = 0;

  for (let i = 0; i < movesArr.length; i++) {
    const stepTime = hasDeltas
      ? Math.max(0, Math.round(Number(payload.t[i]) || 0))
      : (i === 0 ? 0 : fallbackStep);

    runningRelMs = i === 0 ? stepTime : runningRelMs + stepTime;
    moveTimings.push({
      move: movesArr[i],
      stepTime,
      relMs: runningRelMs,
      timestamp: baseTs + runningRelMs
    });
  }

  // Replay through CubeStateSimulator to reconstruct CFOP splits & 4 F2L pairs
  const sim = new CubeStateSimulator();
  if (scramble) {
    sim.applyMoves(scramble);
  }

  let phaseState = {
    currentPhase: 'cross',
    phaseSplits: {},
    phaseSteps: [],
    lastPhaseSplitMs: 0,
    lastPhaseMoves: 0,
    crossFace: 'auto',
    f2lBreakdown: {},
    completedF2LSlots: [],
    lastF2LSplitMs: 0,
    lastF2LMoves: 0
  };

  for (let i = 0; i < moveTimings.length; i++) {
    const entry = moveTimings[i];
    sim.applyMove(entry.move);
    const isLast = i === moveTimings.length - 1;
    const stepElapsed = isLast ? Math.max(entry.relMs, elapsedMs) : entry.relMs;

    phaseState = advanceSolvePhases({
      currentPhase: phaseState.currentPhase,
      facelets: sim.getFaceletString(),
      elapsedMs: stepElapsed,
      currentMoveCount: i + 1,
      lastPhaseSplitMs: phaseState.lastPhaseSplitMs,
      lastPhaseMoves: phaseState.lastPhaseMoves,
      phaseSplits: phaseState.phaseSplits,
      phaseSteps: phaseState.phaseSteps,
      crossFace: phaseState.crossFace,
      forceComplete: isLast && sim.isSolved(),
      f2lBreakdown: phaseState.f2lBreakdown,
      completedF2LSlots: phaseState.completedF2LSlots,
      lastF2LSplitMs: phaseState.lastF2LSplitMs,
      lastF2LMoves: phaseState.lastF2LMoves,
      moveHistory: moveTimings.slice(0, i + 1),
      timestamp: entry.timestamp
    });
  }

  if (phaseState.currentPhase !== 'complete') {
    phaseState = advanceSolvePhases({
      currentPhase: phaseState.currentPhase,
      facelets: sim.getFaceletString(),
      elapsedMs: Math.max(runningRelMs, elapsedMs),
      currentMoveCount: moveTimings.length,
      lastPhaseSplitMs: phaseState.lastPhaseSplitMs,
      lastPhaseMoves: phaseState.lastPhaseMoves,
      phaseSplits: phaseState.phaseSplits,
      phaseSteps: phaseState.phaseSteps,
      crossFace: phaseState.crossFace,
      forceComplete: true,
      f2lBreakdown: phaseState.f2lBreakdown,
      completedF2LSlots: phaseState.completedF2LSlots,
      lastF2LSplitMs: phaseState.lastF2LSplitMs,
      lastF2LMoves: phaseState.lastF2LMoves,
      moveHistory: moveTimings,
      timestamp: baseTs + elapsedMs
    });
  }

  const pauses = analyzeSolvePauses(moveTimings, phaseState.phaseSplits);
  const regrips = detectRegrips(moveTimings, [], phaseState.phaseSplits);
  const tps = safeTps(moveTimings.length, elapsedMs);

  return {
    id: `shared-${baseTs}-${moveTimings.length}`,
    solveNumber: typeof payload.n === 'number' && Number.isInteger(payload.n) && payload.n > 0 ? payload.n : null,
    timestamp: baseTs,
    date: baseTs,
    elapsedMs,
    timeMs: elapsedMs,
    moveCount: moveTimings.length,
    tps,
    scramble,
    moves: movesArr.join(' '),
    moveTimings,
    pauses,
    regrips,
    crossFace: phaseState.crossFace || 'auto',
    penalty,
    isDnf: penalty === 'dnf',
    splits: phaseState.phaseSplits,
    f2lBreakdown: phaseState.f2lBreakdown,
    steps: phaseState.phaseSteps,
    isShared: true
  };
}

/**
 * Builds an absolute shareable replay URL containing the compressed `?d=...` payload.
 */
export async function buildReplayShareUrl(solve, origin, lang = 'fr') {
  const encoded = await encodeReplayPayload(solve);
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = localizedPath('/smart-cube/replay', lang === 'en' ? 'en' : 'fr');
  return `${baseOrigin}${path}?d=${encoded}`;
}
