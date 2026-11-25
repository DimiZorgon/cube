// src/store/useVirtualCubeSessionStore.js
import { create } from 'zustand';
import { getEffectiveTime, safeTps } from '../utils/smartCube/wcaStats.js';

export const VIRTUAL_SESSIONS_STORAGE_KEY = 'rubiks_virtual_sessions_v1';

const EMPTY_SESSIONS = {
  '2x2': [],
  '3x3': [],
  '4x4': [],
  '5x5': []
};

function toPuzzleKey(size) {
  if (typeof size === 'string' && /^\d+x\d+$/.test(size)) {
    return size;
  }
  return `${size}x${size}`;
}

function loadSessions() {
  if (typeof localStorage === 'undefined') {
    return { ...EMPTY_SESSIONS };
  }
  try {
    const raw = localStorage.getItem(VIRTUAL_SESSIONS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_SESSIONS };
    const parsed = JSON.parse(raw);
    return {
      '2x2': Array.isArray(parsed['2x2']) ? parsed['2x2'] : [],
      '3x3': Array.isArray(parsed['3x3']) ? parsed['3x3'] : [],
      '4x4': Array.isArray(parsed['4x4']) ? parsed['4x4'] : [],
      '5x5': Array.isArray(parsed['5x5']) ? parsed['5x5'] : []
    };
  } catch {
    return { ...EMPTY_SESSIONS };
  }
}

function saveSessions(sessions) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(VIRTUAL_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota errors
  }
}

function syncHighScore(puzzleKey, timeMs) {
  if (typeof localStorage === 'undefined') return;
  if (typeof timeMs !== 'number' || timeMs <= 0) return;
  try {
    const highScoreKey = `rubiksHighScore_${puzzleKey}`;
    const existing = localStorage.getItem(highScoreKey);
    const existingNum = existing !== null ? Number(existing) : NaN;
    if (!existing || Number.isNaN(existingNum) || timeMs < existingNum) {
      localStorage.setItem(highScoreKey, String(timeMs));
    }
  } catch {
    // Ignore storage errors
  }
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildVirtualJsonExport(solves = [], puzzleKey = '3x3') {
  return JSON.stringify(
    {
      puzzle: puzzleKey,
      exportedAt: new Date().toISOString(),
      count: solves.length,
      solves
    },
    null,
    2
  );
}

export function buildVirtualCsvExport(solves = [], puzzleKey = '3x3') {
  const headers = [
    'index',
    'puzzle',
    'timestamp',
    'timeMs',
    'effectiveTimeMs',
    'penalty',
    'htm',
    'stm',
    'rawMoveCount',
    'tpsHtm',
    'tpsStm',
    'scramble',
    'moves',
    'rawMoves'
  ];

  const rows = solves.map((solve, idx) => {
    const effective = getEffectiveTime(solve);
    return [
      solves.length - idx,
      solve.puzzleKey || puzzleKey,
      new Date(solve.timestamp).toISOString(),
      solve.timeMs,
      effective === Infinity ? 'DNF' : effective,
      solve.penalty || 'none',
      solve.htm ?? 0,
      solve.stm ?? 0,
      solve.rawMoveCount ?? 0,
      solve.tpsHtm ?? 0,
      solve.tpsStm ?? 0,
      solve.scramble || '',
      solve.moves || '',
      solve.rawMoves || ''
    ]
      .map(csvEscape)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export const useVirtualCubeSessionStore = create((set) => ({
  sessions: loadSessions(),

  recordSolve: (size, solveData) => {
    const numSize = Number(size) || 3;
    const puzzleKey = toPuzzleKey(numSize);
    const timeMs = Math.max(0, Math.round(solveData.timeMs || 0));
    const htm = solveData.htm ?? 0;
    const stm = solveData.stm ?? 0;

    const entry = {
      id: solveData.id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      size: numSize,
      puzzleKey,
      timestamp: solveData.timestamp || Date.now(),
      timeMs,
      scramble: solveData.scramble || '',
      moves: solveData.moves || '',
      rawMoves: solveData.rawMoves || '',
      htm,
      stm,
      rawMoveCount: solveData.rawMoveCount ?? 0,
      tpsHtm: solveData.tpsHtm ?? safeTps(htm, timeMs),
      tpsStm: solveData.tpsStm ?? safeTps(stm, timeMs),
      penalty: 'none',
      isDnf: false
    };

    set((state) => {
      const current = state.sessions[puzzleKey] || [];
      const nextSessions = {
        ...state.sessions,
        [puzzleKey]: [entry, ...current]
      };
      saveSessions(nextSessions);
      return { sessions: nextSessions };
    });

    syncHighScore(puzzleKey, timeMs);
    return entry;
  },

  deleteSolve: (size, id) => {
    const puzzleKey = toPuzzleKey(size);
    set((state) => {
      const current = state.sessions[puzzleKey] || [];
      const nextSessions = {
        ...state.sessions,
        [puzzleKey]: current.filter((solve) => solve.id !== id)
      };
      saveSessions(nextSessions);
      return { sessions: nextSessions };
    });
  },

  clearSession: (size) => {
    const puzzleKey = toPuzzleKey(size);
    set((state) => {
      const nextSessions = {
        ...state.sessions,
        [puzzleKey]: []
      };
      saveSessions(nextSessions);
      return { sessions: nextSessions };
    });
  },

  updatePenalty: (size, id, penalty) => {
    const puzzleKey = toPuzzleKey(size);
    const normalized = penalty === '+2' || penalty === 'dnf' ? penalty : 'none';
    set((state) => {
      const current = state.sessions[puzzleKey] || [];
      const nextSessions = {
        ...state.sessions,
        [puzzleKey]: current.map((solve) =>
          solve.id === id
            ? {
                ...solve,
                penalty: normalized,
                isDnf: normalized === 'dnf'
              }
            : solve
        )
      };
      saveSessions(nextSessions);
      return { sessions: nextSessions };
    });
  }
}));
