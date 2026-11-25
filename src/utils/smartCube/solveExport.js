// src/utils/smartCube/solveExport.js
import { getEffectiveTime } from './wcaStats.js';

const CSV_HEADERS = [
  'id',
  'date_iso',
  'time_ms',
  'penalty',
  'effective_ms',
  'moves_count',
  'tps',
  'fluency',
  'pauses_count',
  'pauses_ms',
  'regrips_count',
  'cross_ms',
  'cross_moves',
  'cross_tps',
  'f2l_ms',
  'f2l_moves',
  'f2l_tps',
  'f2l1_ms',
  'f2l2_ms',
  'f2l3_ms',
  'f2l4_ms',
  'oll_ms',
  'oll_moves',
  'oll_tps',
  'oll_rec_ms',
  'pll_ms',
  'pll_moves',
  'pll_tps',
  'pll_rec_ms',
  'scramble',
  'moves'
];

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function computeFluency(solve) {
  if (typeof solve?.fluency === 'number' && Number.isFinite(solve.fluency)) {
    return solve.fluency;
  }
  const totalMs = Number(solve?.elapsedMs ?? solve?.timeMs) || 0;
  if (totalMs <= 0 || !solve?.pauses) return '';
  const pauseMs = Number(solve.pauses.totalPauseMs) || 0;
  const pauseCount = Number(solve.pauses.count) || 0;
  return Math.max(15, Math.min(100, Math.round(100 - (pauseMs / totalMs) * 70 - pauseCount * 2)));
}

export function buildFullJsonExport(solves) {
  const safeSolves = Array.isArray(solves) ? solves : [];
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: 'cube-smartcube',
    count: safeSolves.length,
    solves: safeSolves
  };
}

export function buildCsvExport(solves) {
  const safeSolves = Array.isArray(solves) ? solves : [];
  const rows = [CSV_HEADERS.join(',')];

  for (const solve of safeSolves) {
    if (!solve || typeof solve !== 'object') continue;
    const ts = Number(solve.timestamp ?? solve.date) || 0;
    const dateIso = ts > 0 ? new Date(ts).toISOString() : '';
    const timeMs = solve.elapsedMs ?? solve.timeMs ?? '';
    const penalty = solve.penalty ?? (solve.isDnf ? 'dnf' : 'none');
    const eff = getEffectiveTime(solve);
    const effectiveMs = eff === Infinity ? 'DNF' : eff;
    const splits = solve.splits || {};
    const f2lBreakdown = solve.f2lBreakdown || splits.f2lBreakdown || {};
    const movesStr = Array.isArray(solve.moves) ? solve.moves.join(' ') : (solve.moves ?? '');

    const row = [
      solve.id ?? '',
      dateIso,
      timeMs,
      penalty,
      effectiveMs,
      solve.moveCount ?? '',
      solve.tps ?? '',
      computeFluency(solve),
      solve.pauses?.count ?? '',
      solve.pauses?.totalPauseMs ?? '',
      solve.regrips?.count ?? '',
      splits.cross?.durationMs ?? '',
      splits.cross?.moveCount ?? splits.cross?.moves ?? '',
      splits.cross?.tps ?? '',
      splits.f2l?.durationMs ?? '',
      splits.f2l?.moveCount ?? splits.f2l?.moves ?? '',
      splits.f2l?.tps ?? '',
      f2lBreakdown.f1?.durationMs ?? '',
      f2lBreakdown.f2?.durationMs ?? '',
      f2lBreakdown.f3?.durationMs ?? '',
      f2lBreakdown.f4?.durationMs ?? '',
      splits.oll?.durationMs ?? '',
      splits.oll?.moveCount ?? splits.oll?.moves ?? '',
      splits.oll?.tps ?? '',
      splits.oll?.recognitionMs ?? '',
      splits.pll?.durationMs ?? '',
      splits.pll?.moveCount ?? splits.pll?.moves ?? '',
      splits.pll?.tps ?? '',
      splits.pll?.recognitionMs ?? '',
      solve.scramble ?? '',
      movesStr
    ];

    rows.push(row.map(escapeCsvCell).join(','));
  }

  return `\uFEFF${rows.join('\r\n')}`;
}

export function buildCsTimerExport(solves, sessionName = 'Smart Cube - 3x3x3') {
  const safeSolves = Array.isArray(solves) ? solves : [];
  const entries = safeSolves.map((solve) => {
    const rawTime = Math.round(Number(solve?.elapsedMs ?? solve?.timeMs) || 0);
    const isDnf = solve === 'DNF' || solve?.penalty === 'dnf' || solve?.isDnf;
    const penaltyCode = isDnf ? -1 : (solve?.penalty === '+2' ? 2000 : 0);
    const tsSec = Math.floor((Number(solve?.timestamp ?? solve?.date) || Date.now()) / 1000);
    return [[penaltyCode, rawTime], solve?.scramble || '', '', tsSec];
  });

  const nowSec = Math.floor(Date.now() / 1000);
  return {
    session1: entries,
    properties: {
      sessionData: JSON.stringify({
        1: {
          name: sessionName,
          opt: { scrType: '333' },
          rank: 1,
          date: [nowSec, nowSec]
        }
      }),
      session: 1,
      sessionN: 1
    }
  };
}

export function downloadBlobFile(content, filename, mimeType = 'text/plain;charset=utf-8') {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
    return false;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  return true;
}

/**
 * Validates and normalizes solves imported from a JSON export (`{ solves: [...] }` or `[...]`).
 * Throws an Error when the JSON is malformed or contains no valid solves.
 */
export function parseImportedSolvesJson(rawInput) {
  let parsed = rawInput;
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch {
      throw new Error('JSON invalide : impossible de lire le fichier.');
    }
  }

  const candidateList = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray(parsed.solves)
    ? parsed.solves
    : null;

  if (!candidateList) {
    throw new Error('Format JSON non reconnu : tableau "solves" attendu.');
  }

  const normalized = [];
  for (const item of candidateList) {
    if (!item || typeof item !== 'object') continue;

    const rawTime = Number(item.elapsedMs ?? item.timeMs);
    if (!Number.isFinite(rawTime) || rawTime <= 0) continue;

    const movesStr = Array.isArray(item.moves)
      ? item.moves.map(m => (typeof m === 'string' ? m.trim() : String(m?.move || '').trim())).filter(Boolean).join(' ')
      : typeof item.moves === 'string'
      ? item.moves.trim()
      : Array.isArray(item.moveTimings)
      ? item.moveTimings.map(m => (typeof m === 'string' ? m.trim() : String(m?.move || '').trim())).filter(Boolean).join(' ')
      : '';

    const scrambleStr = typeof item.scramble === 'string' ? item.scramble.trim() : '';
    if (!movesStr && !scrambleStr) continue;

    const ts = Number(item.timestamp ?? item.date) || Date.now();
    const penalty = item.penalty === '+2' || item.penalty === 'dnf' ? item.penalty : (item.isDnf ? 'dnf' : 'none');
    const moveCount = Number(item.moveCount) || (movesStr ? movesStr.split(/\s+/).filter(Boolean).length : 0);
    const tps = Number(item.tps) || (moveCount > 0 && rawTime > 0 ? Number((moveCount / (rawTime / 1000)).toFixed(2)) : 0);

    normalized.push({
      ...item,
      id: typeof item.id === 'string' && item.id.trim()
        ? item.id.trim()
        : `solve-${ts}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: ts,
      date: ts,
      elapsedMs: rawTime,
      timeMs: rawTime,
      penalty,
      isDnf: penalty === 'dnf',
      scramble: scrambleStr,
      moves: movesStr,
      moveCount,
      tps
    });
  }

  if (normalized.length === 0) {
    throw new Error('Aucune résolution valide trouvée dans le fichier JSON.');
  }

  return normalized;
}
