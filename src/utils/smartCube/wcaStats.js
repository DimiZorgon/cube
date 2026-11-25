// src/utils/smartCube/wcaStats.js
/**
 * Pure WCA Statistics and TPS Math Utilities
 * Conforms strictly to WCA Regulations 9f and Speedcubing standards.
 */

/**
 * Calculates Turns Per Second (TPS) safely avoiding division by zero,
 * negative numbers, sub-millisecond edge cases, or invalid types.
 *
 * @param {number} moves - Number of turns made
 * @param {number} elapsedMs - Time elapsed in milliseconds
 * @returns {number} TPS rounded to 2 decimal places
 */
export function safeTps(moves, elapsedMs) {
  if (typeof moves !== 'number' || moves <= 0 || isNaN(moves) || !isFinite(moves)) return 0;
  if (typeof elapsedMs !== 'number' || elapsedMs <= 0 || isNaN(elapsedMs) || !isFinite(elapsedMs)) return 0;

  const sec = elapsedMs / 1000;
  const tps = moves / sec;
  if (!isFinite(tps) || isNaN(tps)) return 0;
  return Number(tps.toFixed(2));
}

/**
 * Calculates effective solve time in milliseconds accounting for penalties:
 * - 'dnf' / 'DNF' / isDnf -> Infinity
 * - '+2' -> elapsedMs + 2000
 * - otherwise -> elapsedMs or timeMs
 *
 * @param {number|object|string} solve
 * @returns {number} Effective time in ms, or Infinity for DNF
 */
export function getEffectiveTime(solve) {
  if (solve === 'DNF' || solve?.penalty === 'dnf' || solve?.isDnf) {
    return Infinity;
  }
  const base = typeof solve === 'number'
    ? solve
    : (solve?.elapsedMs ?? solve?.timeMs ?? 0);

  if (solve?.penalty === '+2') {
    return base + 2000;
  }
  return base;
}

/**
 * Computes a WCA trimmed average of `size` solves according to WCA Regulations 9f8/9f9:
 * - Trims `ceil(size * 0.05)` fastest and slowest solves (1 for 5/12, 3 for 50, 5 for 100).
 * - Returns 'DNF' if `dnfCount > trimCount`.
 * - Returns null if fewer than `size` solves.
 *
 * @param {Array<number|object|string>} solves
 * @param {number} size
 * @returns {number|string|null} Rounded average in ms, 'DNF', or null
 */
export function calculateWcaTrimmedAverage(solves, size) {
  if (!solves || !size || size <= 0 || solves.length < size) return null;
  const trimCount = Math.ceil(size * 0.05);
  const keptCount = size - trimCount * 2;
  if (keptCount <= 0) return null;

  const slice = solves.slice(-size);
  const dnfCount = slice.filter(s => s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf).length;
  if (dnfCount > trimCount) return 'DNF';

  const times = slice.map(getEffectiveTime).sort((a, b) => a - b);
  const trimmed = times.slice(trimCount, size - trimCount);
  const sum = trimmed.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / trimmed.length);
}

/**
 * Computes WCA Average of 5 (Ao5) according to WCA Regulation 9f8.
 *
 * @param {Array<number|object|string>} solves
 * @returns {number|string|null} Rounded average in ms, 'DNF', or null
 */
export function calculateWcaAo5(solves) {
  return calculateWcaTrimmedAverage(solves, 5);
}

/**
 * Computes WCA Average of 12 (Ao12) according to WCA Regulation 9f9.
 *
 * @param {Array<number|object|string>} solves
 * @returns {number|string|null} Rounded average in ms, 'DNF', or null
 */
export function calculateWcaAo12(solves) {
  return calculateWcaTrimmedAverage(solves, 12);
}

/**
 * Computes WCA Average of 50 (Ao50).
 *
 * @param {Array<number|object|string>} solves
 * @returns {number|string|null} Rounded average in ms, 'DNF', or null
 */
export function calculateWcaAo50(solves) {
  return calculateWcaTrimmedAverage(solves, 50);
}

/**
 * Computes WCA Average of 100 (Ao100).
 *
 * @param {Array<number|object|string>} solves
 * @returns {number|string|null} Rounded average in ms, 'DNF', or null
 */
export function calculateWcaAo100(solves) {
  return calculateWcaTrimmedAverage(solves, 100);
}

/**
 * Computes WCA Mean of 3 (Mo3) according to WCA Regulation 9f7:
 * - Arithmetic mean of the 3 solves.
 * - Any DNF (1 or more) results in 'DNF'.
 * - Returns null if fewer than 3 solves.
 *
 * @param {Array<number|object|string>} solves
 * @returns {number|string|null} Rounded mean in ms, 'DNF', or null
 */
export function calculateWcaMo3(solves) {
  if (!solves || solves.length < 3) return null;
  const last3 = solves.slice(-3);
  const dnfCount = last3.filter(s => s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf).length;
  if (dnfCount >= 1) return 'DNF';

  const times = last3.map(getEffectiveTime);
  const sum = times.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / 3);
}

/**
 * Computes complete summary statistics for a session.
 *
 * @param {Array<number|object|string>} solves
 * @returns {{ count: number, best: number|null, worst: number|null, mo3: number|string|null, ao5: number|string|null, ao12: number|string|null, ao50: number|string|null, ao100: number|string|null, avgTps: number|null }}
 */
export function calculateSessionStats(solves) {
  if (!solves || solves.length === 0) {
    return {
      count: 0,
      best: null,
      worst: null,
      mo3: null,
      ao5: null,
      ao12: null,
      ao50: null,
      ao100: null,
      avgTps: null
    };
  }

  const validTimes = solves
    .filter(s => s !== 'DNF' && s?.penalty !== 'dnf' && !s?.isDnf)
    .map(getEffectiveTime);

  const best = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const worst = validTimes.length > 0 ? Math.max(...validTimes) : null;
  const mo3 = calculateWcaMo3(solves);
  const ao5 = calculateWcaAo5(solves);
  const ao12 = calculateWcaAo12(solves);
  const ao50 = calculateWcaAo50(solves);
  const ao100 = calculateWcaAo100(solves);

  const validTps = solves
    .map(s => (typeof s === 'object' ? s?.tps : null))
    .filter(t => typeof t === 'number' && t > 0);

  const avgTps = validTps.length > 0
    ? Number((validTps.reduce((a, b) => a + b, 0) / validTps.length).toFixed(2))
    : null;

  return {
    count: solves.length,
    best,
    worst,
    mo3,
    ao5,
    ao12,
    ao50,
    ao100,
    avgTps
  };
}
