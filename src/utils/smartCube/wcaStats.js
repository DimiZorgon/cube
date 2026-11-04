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
 * Computes WCA Average of 5 (Ao5) according to WCA Regulation 9f8:
 * - Trims the fastest (min) and slowest (max) times.
 * - Averages the remaining 3 times.
 * - Single DNF is treated as the worst time (trimmed).
 * - 2 or more DNFs results in 'DNF'.
 * - Returns null if fewer than 5 solves.
 *
 * @param {Array<number|object|string>} solves
 * @returns {number|string|null} Rounded average in ms, 'DNF', or null
 */
export function calculateWcaAo5(solves) {
  if (!solves || solves.length < 5) return null;
  const last5 = solves.slice(-5);
  const dnfCount = last5.filter(s => s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf).length;
  if (dnfCount >= 2) return 'DNF';

  const times = last5.map(getEffectiveTime).sort((a, b) => a - b);
  // Remove min (index 0) and max (index 4), average middle 3 (indices 1, 2, 3)
  const middle3 = times.slice(1, 4);
  const sum = middle3.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / 3);
}

/**
 * Computes WCA Average of 12 (Ao12) according to WCA Regulation 9f9:
 * - Trims the fastest (min) and slowest (max) times.
 * - Averages the remaining 10 times.
 * - Single DNF is treated as worst (trimmed).
 * - 2 or more DNFs results in 'DNF'.
 * - Returns null if fewer than 12 solves.
 *
 * @param {Array<number|object|string>} solves
 * @returns {number|string|null} Rounded average in ms, 'DNF', or null
 */
export function calculateWcaAo12(solves) {
  if (!solves || solves.length < 12) return null;
  const last12 = solves.slice(-12);
  const dnfCount = last12.filter(s => s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf).length;
  if (dnfCount >= 2) return 'DNF';

  const times = last12.map(getEffectiveTime).sort((a, b) => a - b);
  // Remove min (index 0) and max (index 11), average middle 10 (indices 1 to 10)
  const middle10 = times.slice(1, 11);
  const sum = middle10.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / 10);
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
 * @returns {{ count: number, best: number|null, worst: number|null, mo3: number|string|null, ao5: number|string|null, ao12: number|string|null, avgTps: number|null }}
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
    avgTps
  };
}
