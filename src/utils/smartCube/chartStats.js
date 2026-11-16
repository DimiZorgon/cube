// src/utils/smartCube/chartStats.js
// Mathematical engine for Smart Cube history evolution charts
// Implements progressive PB tracking, rolling WCA averages (Ao5, Ao12), and deltas.

import { getEffectiveTime, calculateWcaAo5, calculateWcaAo12, safeTps } from './wcaStats.js';

/**
 * Formats a time in milliseconds into standard speedcubing notation (ss.cc or m:ss.cc).
 * @param {number|string|null} ms
 * @returns {string}
 */
export function formatSolveTime(ms) {
  if (ms === null || ms === undefined) return '-';
  if (ms === 'DNF' || ms === Infinity) return 'DNF';
  if (typeof ms !== 'number' || isNaN(ms)) return '-';

  const totalSec = ms / 1000;
  const minutes = Math.floor(totalSec / 60);
  const remSec = totalSec % 60;

  if (minutes > 0) {
    const secStr = remSec.toFixed(2).padStart(5, '0');
    return `${minutes}:${secStr}`;
  }
  return remSec.toFixed(2);
}

/**
 * Computes progressive best single solve time at each solve index.
 * The PB curve is monotonically non-increasing.
 *
 * @param {Array<number|object|string>} solves
 * @returns {Array<number|null>} Array of cumulative PB in ms (or null)
 */
export function computeProgressivePb(solves) {
  if (!Array.isArray(solves) || solves.length === 0) return [];

  let currentPb = Infinity;
  return solves.map(solve => {
    const isDnf = solve === 'DNF' || solve?.penalty === 'dnf' || solve?.isDnf;
    if (!isDnf) {
      const eff = getEffectiveTime(solve);
      if (typeof eff === 'number' && isFinite(eff) && eff < currentPb) {
        currentPb = eff;
      }
    }
    return isFinite(currentPb) ? currentPb : null;
  });
}

/**
 * Computes WCA-style rolling average across all solve indices.
 *
 * @param {Array<number|object|string>} solves - Array of solves
 * @param {number} [windowSize=5] - 5 for Ao5, 12 for Ao12
 * @returns {Array<number|string|null>} Array of rolling averages
 */
export function computeRollingAverage(solves, windowSize = 5) {
  if (!Array.isArray(solves) || solves.length === 0) return [];

  return solves.map((_, index) => {
    if (index + 1 < windowSize) return null;
    const slice = solves.slice(index + 1 - windowSize, index + 1);

    if (windowSize === 5) {
      return calculateWcaAo5(slice);
    }
    if (windowSize === 12) {
      return calculateWcaAo12(slice);
    }

    // Generic trimmed average for custom window size (drop 1 min, 1 max)
    const dnfCount = slice.filter(s => s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf).length;
    if (dnfCount >= 2) return 'DNF';

    const times = slice.map(getEffectiveTime).sort((a, b) => a - b);
    const trimmed = times.slice(1, times.length - 1);
    const sum = trimmed.reduce((acc, t) => acc + t, 0);
    return Math.round(sum / trimmed.length);
  });
}

/**
 * Calculates time deltas relative to previous solve and relative to PB.
 *
 * @param {number|object|string} currentSolve
 * @param {number|object|string|null} previousSolve
 * @param {number|null} currentPb
 * @returns {{ deltaPrev: number|null, deltaPb: number|null }}
 */
export function calculateDeltas(currentSolve, previousSolve, currentPb) {
  const isCurrDnf = currentSolve === 'DNF' || currentSolve?.penalty === 'dnf' || currentSolve?.isDnf;
  const currTime = isCurrDnf ? null : getEffectiveTime(currentSolve);

  let deltaPrev = null;
  if (previousSolve !== null && previousSolve !== undefined && currTime !== null) {
    const isPrevDnf = previousSolve === 'DNF' || previousSolve?.penalty === 'dnf' || previousSolve?.isDnf;
    if (!isPrevDnf) {
      const prevTime = getEffectiveTime(previousSolve);
      if (typeof prevTime === 'number' && isFinite(prevTime)) {
        deltaPrev = currTime - prevTime;
      }
    }
  }

  let deltaPb = null;
  if (currTime !== null && typeof currentPb === 'number' && isFinite(currentPb)) {
    deltaPb = currTime - currentPb;
  }

  return { deltaPrev, deltaPb };
}

/**
 * Formats a timestamp for chart X-axis and tooltips.
 *
 * @param {number|Date} timestamp
 * @param {'date'|'time'|'datetime'|'short'} [mode='datetime']
 * @returns {string}
 */
export function formatChartTimestamp(timestamp, mode = 'datetime') {
  if (!timestamp) return '';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';

  const pad = n => String(n).padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());

  switch (mode) {
    case 'date':
      return `${d}/${m}`;
    case 'time':
      return `${h}:${min}`;
    case 'short':
      return `${d}/${m} ${h}:${min}`;
    case 'datetime':
    default:
      return `${date.toLocaleDateString()} ${h}:${min}`;
  }
}

/**
 * Prepares aggregated dataset for the Smart Cube Evolution Chart.
 *
 * @param {Array<object>} sessionSolves - Solves array from store
 * @param {'count'|'date'} [xAxisMode='count'] - Axis scale mode
 * @returns {Array<object>} Points dataset ready for rendering
 */
export function prepareEvolutionChartData(sessionSolves, xAxisMode = 'count') {
  if (!Array.isArray(sessionSolves) || sessionSolves.length === 0) return [];

  const progressivePbs = computeProgressivePb(sessionSolves);
  const rollingAo5s = computeRollingAverage(sessionSolves, 5);
  const rollingAo12s = computeRollingAverage(sessionSolves, 12);

  let previousValidSolve = null;

  return sessionSolves.map((solve, index) => {
    const isDnf = solve === 'DNF' || solve?.penalty === 'dnf' || solve?.isDnf;
    const penalty = solve?.penalty || 'none';
    const effectiveTime = isDnf ? null : getEffectiveTime(solve);
    const pbMs = progressivePbs[index] ?? null;
    const ao5Val = rollingAo5s[index] ?? null;
    const ao12Val = rollingAo12s[index] ?? null;

    const { deltaPrev, deltaPb } = calculateDeltas(solve, previousValidSolve, pbMs);
    if (!isDnf) {
      previousValidSolve = solve;
    }

    const timestamp = Number(solve?.timestamp) || Number(solve?.date) || Date.now();
    const moveCount = typeof solve?.moveCount === 'number' ? solve.moveCount : null;
    const tps = Number(solve?.tps) || (moveCount && effectiveTime ? safeTps(moveCount, effectiveTime) : null);
    const scramble = typeof solve?.scramble === 'string' ? solve.scramble : '';

    return {
      index,
      solveNumber: index + 1,
      solve,
      timestamp,
      dateStr: formatChartTimestamp(timestamp, xAxisMode === 'date' ? 'date' : 'datetime'),
      timeMs: effectiveTime,
      formattedTime: formatSolveTime(effectiveTime !== null ? effectiveTime : (isDnf ? 'DNF' : null)),
      isDnf,
      penalty,
      pbMs,
      formattedPb: formatSolveTime(pbMs),
      ao5Ms: typeof ao5Val === 'number' ? ao5Val : null,
      ao5Dnf: ao5Val === 'DNF',
      formattedAo5: formatSolveTime(ao5Val),
      ao12Ms: typeof ao12Val === 'number' ? ao12Val : null,
      ao12Dnf: ao12Val === 'DNF',
      formattedAo12: formatSolveTime(ao12Val),
      scramble,
      tps,
      moveCount,
      deltaPrev,
      deltaPb
    };
  });
}

// Alias for interface contract parity
export const computeEvolutionChartData = prepareEvolutionChartData;
