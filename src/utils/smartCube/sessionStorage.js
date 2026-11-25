// src/utils/smartCube/sessionStorage.js
export const SESSIONS_STORAGE_KEY = 'rubiks_smartcube_sessions_v1';

const MIN_REASONABLE_EPOCH = 1577836800000; // 2020-01-01
const COMPACT_KEEP_TIMINGS_COUNT = 200;

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

export function loadSmartCubeSolves() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let modified = false;
    const sanitized = parsed.map((s) => {
      let ts = Number(s?.timestamp) || Number(s?.date) || 0;
      if (ts < MIN_REASONABLE_EPOCH) {
        const match = typeof s?.id === 'string' && s.id.match(/^solve-(\d+)/);
        const idTs = match ? Number(match[1]) : 0;
        ts = idTs >= MIN_REASONABLE_EPOCH ? idTs : Date.now();
        modified = true;
        return { ...s, timestamp: ts, date: ts };
      }
      return s;
    });

    if (modified) {
      saveSmartCubeSolves(sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
}

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
