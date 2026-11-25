// src/utils/smartCube/sessionStorage.js
import { createStore, get as idbGet, set as idbSet } from 'idb-keyval';

export const SESSIONS_STORAGE_KEY = 'rubiks_smartcube_sessions_v1';
export const IDB_DB_NAME = 'cube_smartcube_db';
export const IDB_STORE_NAME = 'smartcube_store';
export const IDB_SOLVES_KEY = 'smartcube_solves_v2';
export const IDB_COUNTER_KEY = 'smartcube_next_solve_number';
export const IDB_MIGRATED_KEY = 'smartcube_migrated_v1';

const MIN_REASONABLE_EPOCH = 1577836800000; // 2020-01-01
const COMPACT_KEEP_TIMINGS_COUNT = 200;

let defaultIdbStore = null;

function getDefaultIdbStore() {
  if (typeof indexedDB === 'undefined') return null;
  if (!defaultIdbStore) {
    defaultIdbStore = createStore(IDB_DB_NAME, IDB_STORE_NAME);
  }
  return defaultIdbStore;
}

function isQuotaError(err) {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    /quota/i.test(err.message || '')
  );
}

/** Normalizes timestamps on a single solve entry while preserving all other fields. */
export function sanitizeSolveEntry(solve) {
  if (!solve || typeof solve !== 'object') return solve;
  let ts = Number(solve.timestamp) || Number(solve.date) || 0;
  if (ts < MIN_REASONABLE_EPOCH) {
    const match = typeof solve.id === 'string' && solve.id.match(/^solve-(\d+)/);
    const idTs = match ? Number(match[1]) : 0;
    ts = idTs >= MIN_REASONABLE_EPOCH ? idTs : Date.now();
    return { ...solve, timestamp: ts, date: ts };
  }
  if (solve.timestamp !== ts || solve.date !== ts) {
    return { ...solve, timestamp: ts, date: ts };
  }
  return solve;
}

/**
 * Ensures every solve has a positive integer solveNumber and computes the next
 * monotonic counter value without altering already-assigned solveNumbers.
 */
export function assignMissingSolveNumbers(solves, startCounter = 1) {
  const list = Array.isArray(solves) ? solves : [];
  let maxAssigned = 0;
  for (const s of list) {
    if (typeof s?.solveNumber === 'number' && Number.isInteger(s.solveNumber) && s.solveNumber > 0) {
      if (s.solveNumber > maxAssigned) maxAssigned = s.solveNumber;
    }
  }

  let cursor = Math.max(1, Number.isInteger(startCounter) ? startCounter : 1);
  let modified = false;

  const updated = list.map((s) => {
    if (!s || typeof s !== 'object') return s;
    if (typeof s.solveNumber === 'number' && Number.isInteger(s.solveNumber) && s.solveNumber > 0) {
      return s;
    }
    while (cursor <= maxAssigned) {
      cursor++;
    }
    const assigned = cursor;
    cursor++;
    if (assigned > maxAssigned) maxAssigned = assigned;
    modified = true;
    return { ...s, solveNumber: assigned };
  });

  const nextSolveNumber = Math.max(
    Number.isInteger(startCounter) && startCounter > 0 ? startCounter : 1,
    maxAssigned + 1,
    cursor
  );

  return { solves: updated, nextSolveNumber, modified };
}

/**
 * Smart deduplicating merge for JSON import:
 * - Deduplicates strictly by `id` (existing solves win).
 * - Assigns fresh monotonic `solveNumber`s to newly added solves without colliding
 *   with existing or previously deleted numbers.
 */
export function mergeImportedSolves(existingSolves, importedSolves, nextSolveNumber = 1) {
  const existing = Array.isArray(existingSolves) ? existingSolves : [];
  const incoming = Array.isArray(importedSolves) ? importedSolves : [];

  const existingIds = new Set(
    existing.map((s) => (s && typeof s.id === 'string' ? s.id : null)).filter(Boolean)
  );

  let maxExistingNum = 0;
  for (const s of existing) {
    if (typeof s?.solveNumber === 'number' && Number.isInteger(s.solveNumber) && s.solveNumber > maxExistingNum) {
      maxExistingNum = s.solveNumber;
    }
  }

  let counter = Math.max(
    1,
    Number.isInteger(nextSolveNumber) ? nextSolveNumber : 1,
    maxExistingNum + 1
  );

  const added = [];
  let skippedCount = 0;

  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object') {
      skippedCount++;
      continue;
    }
    const sanitized = sanitizeSolveEntry(raw);
    const id = typeof sanitized.id === 'string' && sanitized.id.trim()
      ? sanitized.id.trim()
      : `solve-${sanitized.timestamp}-${Math.random().toString(36).slice(2, 7)}`;

    if (existingIds.has(id)) {
      skippedCount++;
      continue;
    }

    existingIds.add(id);
    const solveNumber = counter;
    counter++;
    added.push({
      ...sanitized,
      id,
      solveNumber
    });
  }

  const merged = [...existing, ...added].sort((a, b) => {
    const ta = Number(a?.timestamp ?? a?.date) || 0;
    const tb = Number(b?.timestamp ?? b?.date) || 0;
    if (ta !== tb) return ta - tb;
    return (Number(a?.solveNumber) || 0) - (Number(b?.solveNumber) || 0);
  });

  return {
    solves: merged,
    addedCount: added.length,
    skippedCount,
    nextSolveNumber: counter
  };
}

/**
 * Legacy synchronous loader from localStorage.
 * Kept for backwards compatibility and Node verification tests.
 */
export function loadSmartCubeSolves() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let modified = false;
    const sanitized = parsed.map((s) => {
      const next = sanitizeSolveEntry(s);
      if (next !== s) modified = true;
      return next;
    });

    if (modified) {
      saveSmartCubeSolves(sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
}

/**
 * Legacy synchronous saver to localStorage (with 200-solve compaction fallback).
 * Kept for backwards compatibility and Node verification tests.
 */
export function saveSmartCubeSolves(solves) {
  if (typeof localStorage === 'undefined') {
    return { ok: false, compacted: false };
  }

  const list = Array.isArray(solves) ? solves : [];
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(list));
    return { ok: true, compacted: false };
  } catch (err) {
    if (isQuotaError(err) && list.length > COMPACT_KEEP_TIMINGS_COUNT) {
      const cutoff = list.length - COMPACT_KEEP_TIMINGS_COUNT;
      const compacted = list.map((solve, idx) => {
        if (idx < cutoff && solve && typeof solve === 'object' && 'moveTimings' in solve) {
          const { moveTimings: _dropped, ...rest } = solve;
          return rest;
        }
        return solve;
      });
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(compacted));
        return { ok: true, compacted: true };
      } catch (retryErr) {
        return { ok: false, compacted: true, error: retryErr };
      }
    }
    return { ok: false, compacted: false, error: err };
  }
}

/**
 * Loads Smart Cube solves from IndexedDB (with one-shot migration from legacy localStorage).
 * Accepts an optional `customStore` for unit testing.
 */
export async function loadSmartCubeSolvesAsync(customStore = null) {
  const store = customStore || getDefaultIdbStore();
  if (!store) {
    const legacy = loadSmartCubeSolves();
    const { solves, nextSolveNumber } = assignMissingSolveNumbers(legacy, 1);
    return { solves, nextSolveNumber };
  }

  try {
    const [migrated, existingIdbSolves, storedCounter] = await Promise.all([
      idbGet(IDB_MIGRATED_KEY, store),
      idbGet(IDB_SOLVES_KEY, store),
      idbGet(IDB_COUNTER_KEY, store)
    ]);

    if (!migrated) {
      const legacy = loadSmartCubeSolves();
      const baseList = Array.isArray(existingIdbSolves) && existingIdbSolves.length > 0
        ? existingIdbSolves
        : legacy;

      const sanitized = baseList.map(sanitizeSolveEntry);
      const startCounter = typeof storedCounter === 'number' && storedCounter > 0 ? storedCounter : 1;
      const { solves, nextSolveNumber } = assignMissingSolveNumbers(sanitized, startCounter);

      await Promise.all([
        idbSet(IDB_SOLVES_KEY, solves, store),
        idbSet(IDB_COUNTER_KEY, nextSolveNumber, store),
        idbSet(IDB_MIGRATED_KEY, true, store)
      ]);

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(SESSIONS_STORAGE_KEY);
        } catch {
          // ignore localStorage cleanup errors
        }
      }

      return { solves, nextSolveNumber };
    }

    const rawSolves = Array.isArray(existingIdbSolves) ? existingIdbSolves : [];
    let needsPersist = false;
    const sanitized = rawSolves.map((s) => {
      const next = sanitizeSolveEntry(s);
      if (next !== s) needsPersist = true;
      return next;
    });

    const startCounter = typeof storedCounter === 'number' && storedCounter > 0 ? storedCounter : 1;
    const { solves, nextSolveNumber, modified } = assignMissingSolveNumbers(sanitized, startCounter);

    if (needsPersist || modified || nextSolveNumber !== storedCounter) {
      await Promise.all([
        idbSet(IDB_SOLVES_KEY, solves, store),
        idbSet(IDB_COUNTER_KEY, nextSolveNumber, store)
      ]);
    }

    return { solves, nextSolveNumber };
  } catch {
    const legacy = loadSmartCubeSolves();
    const { solves, nextSolveNumber } = assignMissingSolveNumbers(legacy, 1);
    return { solves, nextSolveNumber };
  }
}

/**
 * Persists the complete solves list (preserving full moveTimings) and nextSolveNumber to IndexedDB.
 */
export async function saveSmartCubeSolvesAsync(solves, nextSolveNumber = null, customStore = null) {
  const list = Array.isArray(solves) ? solves : [];
  const store = customStore || getDefaultIdbStore();
  if (!store) {
    return saveSmartCubeSolves(list);
  }

  try {
    const ops = [idbSet(IDB_SOLVES_KEY, list, store)];
    if (typeof nextSolveNumber === 'number' && Number.isInteger(nextSolveNumber) && nextSolveNumber > 0) {
      ops.push(idbSet(IDB_COUNTER_KEY, nextSolveNumber, store));
    }
    await Promise.all(ops);
    return { ok: true, compacted: false };
  } catch (err) {
    return { ok: false, compacted: false, error: err };
  }
}

/**
 * Retrieves a single solve by its persistent `solveNumber` from IndexedDB.
 */
export async function getSmartCubeSolveByNumberAsync(solveNumber, customStore = null) {
  const target = Number(solveNumber);
  if (!Number.isInteger(target) || target <= 0) return null;
  const { solves } = await loadSmartCubeSolvesAsync(customStore);
  return solves.find((s) => Number(s?.solveNumber) === target) || null;
}
