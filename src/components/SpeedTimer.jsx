// src/components/SpeedTimer.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Timer as TimerIcon,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { createCaseCubies, getStickerColor } from '../utils/algoParser';

const STORAGE_KEY = 'rubiks_cstimer_sessions_v1';

const PUZZLE_TYPES = [
  { id: '2x2x2', label: '2x2x2', size: 2, length: 11 },
  { id: '3x3x3', label: '3x3x3', size: 3, length: 20 },
  { id: '4x4x4', label: '4x4x4', size: 4, length: 40 }
];

// Générateur de mélange WCA sans mouvements redondants
function generateWcaScramble(puzzleId = '3x3x3') {
  const puzzle = PUZZLE_TYPES.find(p => p.id === puzzleId) || PUZZLE_TYPES[1];
  const modifiers = ['', "'", '2'];

  const faces2x2 = ['R', 'U', 'F'];
  const faces3x3 = ['R', 'L', 'U', 'D', 'F', 'B'];
  const faces4x4 = ['R', 'L', 'U', 'D', 'F', 'B', 'Rw', 'Uw', 'Fw'];

  const pool =
    puzzle.size === 2 ? faces2x2 : puzzle.size === 4 ? faces4x4 : faces3x3;

  const getAxis = moveBase => {
    const first = moveBase[0];
    if (first === 'R' || first === 'L') return 'x';
    if (first === 'U' || first === 'D') return 'y';
    return 'z';
  };

  const moves = [];
  let lastBase = '';
  let secondLastBase = '';
  let lastAxis = '';

  for (let i = 0; i < puzzle.length; i++) {
    let candidate = '';
    let candidateAxis = '';
    do {
      candidate = pool[Math.floor(Math.random() * pool.length)];
      candidateAxis = getAxis(candidate);
    } while (
      candidate === lastBase ||
      (candidateAxis === lastAxis && candidate === secondLastBase)
    );

    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    moves.push(`${candidate}${mod}`);

    secondLastBase = lastBase;
    lastBase = candidate;
    lastAxis = candidateAxis;
  }

  return moves.join(' ');
}

// Formatage du temps en secondes ou MM:SS.cc (style csTimer)
function formatTimerValue(ms, penalty = null) {
  if (penalty === 'DNF') return 'DNF';
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '-';

  const effectiveMs = penalty === '+2' ? ms + 2000 : ms;
  const totalSeconds = Math.floor(effectiveMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((effectiveMs % 1000) / 10)
    .toString()
    .padStart(2, '0');

  const formatted =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, '0')}.${centis}`
      : `${seconds}.${centis}`;

  return penalty === '+2' ? `${formatted}+` : formatted;
}

// Temps effectif d'un solve en ms (Infinity si DNF)
function getEffectiveTime(solve) {
  if (!solve) return null;
  if (solve.penalty === 'DNF') return Infinity;
  return solve.penalty === '+2' ? solve.time + 2000 : solve.time;
}

// Calcul officiel WCA d'une moyenne élaguée (ao5, ao12) : retire le meilleur et le pire
function computeTrimmedAverage(solvesSlice, expectedCount) {
  if (!solvesSlice || solvesSlice.length < expectedCount) return null;
  const window = solvesSlice.slice(0, expectedCount);
  const values = window.map(getEffectiveTime);
  const dnfCount = values.filter(v => v === Infinity).length;

  if (dnfCount >= 2) return 'DNF';

  const sorted = [...values].sort((a, b) => a - b);
  // On retire le plus petit (index 0) et le plus grand (index N-1)
  const trimmed = sorted.slice(1, expectedCount - 1);
  const sum = trimmed.reduce((acc, v) => acc + v, 0);
  return sum / trimmed.length;
}

// Calcul d'une moyenne arithmétique simple (mo3)
function computeMeanOf3(solvesSlice) {
  if (!solvesSlice || solvesSlice.length < 3) return null;
  const window = solvesSlice.slice(0, 3);
  const values = window.map(getEffectiveTime);
  if (values.some(v => v === Infinity)) return 'DNF';
  return (values[0] + values[1] + values[2]) / 3;
}

// Aperçu 2D du patron du mélange (Blanc en haut, Vert devant)
function ScrambleNetPreview({ size, scramble }) {
  const cubies = useMemo(
    () =>
      createCaseCubies({
        size,
        alg: '',
        setup: scramble,
        yellowTop: false,
        maskMode: 'full',
        applySetup: true
      }),
    [size, scramble]
  );

  const outer = (size - 1) / 2;
  const coords = Array.from({ length: size }, (_, i) => i - outer);
  const cell = size === 4 ? 11 : size === 2 ? 20 : 14;
  const facePx = size * cell;
  const gap = 4;

  const getFaceColorMatrix = faceId => {
    const rows = [];
    for (let r = 0; r < size; r++) {
      const rowColors = [];
      for (let c = 0; c < size; c++) {
        let color = '#525866';
        if (faceId === 'U') {
          color = getStickerColor(cubies, coords[c], outer, coords[r], 0, 1, 0);
        } else if (faceId === 'D') {
          color = getStickerColor(cubies, coords[c], -outer, coords[size - 1 - r], 0, -1, 0);
        } else if (faceId === 'F') {
          color = getStickerColor(cubies, coords[c], coords[size - 1 - r], outer, 0, 0, 1);
        } else if (faceId === 'B') {
          color = getStickerColor(cubies, coords[size - 1 - c], coords[size - 1 - r], -outer, 0, 0, -1);
        } else if (faceId === 'L') {
          color = getStickerColor(cubies, -outer, coords[size - 1 - r], coords[c], -1, 0, 0);
        } else if (faceId === 'R') {
          color = getStickerColor(cubies, outer, coords[size - 1 - r], coords[size - 1 - c], 1, 0, 0);
        }
        rowColors.push(color);
      }
      rows.push(rowColors);
    }
    return rows;
  };

  const facesLayout = [
    { id: 'U', row: 0, col: 1 },
    { id: 'L', row: 1, col: 0 },
    { id: 'F', row: 1, col: 1 },
    { id: 'R', row: 1, col: 2 },
    { id: 'B', row: 1, col: 3 },
    { id: 'D', row: 2, col: 1 }
  ];

  const width = 4 * facePx + 3 * gap + 12;
  const height = 3 * facePx + 2 * gap + 12;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {facesLayout.map(f => {
        const matrix = getFaceColorMatrix(f.id);
        const fx = 6 + f.col * (facePx + gap);
        const fy = 6 + f.row * (facePx + gap);
        return (
          <g key={f.id} transform={`translate(${fx}, ${fy})`}>
            {matrix.map((rowArr, r) =>
              rowArr.map((colHex, c) => (
                <rect
                  key={`${r}_${c}`}
                  x={c * cell}
                  y={r * cell}
                  width={cell}
                  height={cell}
                  fill={colHex}
                  stroke="#0f172a"
                  strokeWidth="1.4"
                  rx="1.5"
                />
              ))
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function SpeedTimer({ onBack }) {
  const { t } = useTranslation();
  const [puzzleId, setPuzzleId] = useState('3x3x3');
  const [sessionId, setSessionId] = useState('1');
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);

  // Historique des mélanges pour supporter "last / next scramble" comme sur csTimer
  const [scrambleHistory, setScrambleHistory] = useState(() => [generateWcaScramble('3x3x3')]);
  const [scrambleIdx, setScrambleIdx] = useState(0);
  const currentScramble = scrambleHistory[scrambleIdx] || '';

  // Sessions sauvegardées dans localStorage
  const [allSessions, setAllSessions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
  }, [allSessions]);

  const sessionKey = `${puzzleId}_s${sessionId}`;
  // Liste des solves du plus récent (index 0) au plus ancien
  const solves = useMemo(() => allSessions[sessionKey] || [], [allSessions, sessionKey]);

  // États du chronomètre : 'idle' | 'holding' | 'ready' | 'running'
  const [timerStatus, setTimerStatus] = useState('idle');
  const [displayTime, setDisplayTime] = useState(0);

  const statusRef = useRef('idle');
  useEffect(() => {
    statusRef.current = timerStatus;
  }, [timerStatus]);

  const holdTimeoutRef = useRef(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef(null);
  const justStoppedRef = useRef(false);

  const nextScramble = useCallback(
    (targetPuzzle = puzzleId) => {
      if (scrambleIdx < scrambleHistory.length - 1 && targetPuzzle === puzzleId) {
        setScrambleIdx(idx => idx + 1);
      } else {
        const newScr = generateWcaScramble(targetPuzzle);
        setScrambleHistory(prev => [...prev, newScr]);
        setScrambleIdx( scrambleHistory.length );
      }
    },
    [puzzleId, scrambleIdx, scrambleHistory.length]
  );

  const handlePuzzleChange = newPuzzleId => {
    setPuzzleId(newPuzzleId);
    const firstScr = generateWcaScramble(newPuzzleId);
    setScrambleHistory([firstScr]);
    setScrambleIdx(0);
    setDisplayTime(0);
  };

  // Boucle de rafraîchissement haute précision pendant la résolution
  useEffect(() => {
    if (timerStatus === 'running') {
      const update = () => {
        setDisplayTime(performance.now() - startTimeRef.current);
        rafRef.current = requestAnimationFrame(update);
      };
      rafRef.current = requestAnimationFrame(update);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [timerStatus]);

  const stopTimer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const finalMs = Math.max(10, Math.round(performance.now() - startTimeRef.current));
    setDisplayTime(finalMs);
    setTimerStatus('idle');
    justStoppedRef.current = true;

    const newSolve = {
      id: Date.now().toString(),
      time: finalMs,
      penalty: null,
      scramble: currentScramble,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAllSessions(prev => ({
      ...prev,
      [sessionKey]: [newSolve, ...(prev[sessionKey] || [])]
    }));

    // Génère automatiquement le mélange suivant
    const newScr = generateWcaScramble(puzzleId);
    setScrambleHistory(prev => [...prev, newScr]);
    setScrambleIdx(prev => prev + 1);
  }, [currentScramble, puzzleId, sessionKey]);

  const beginHold = useCallback(() => {
    if (statusRef.current === 'running') {
      stopTimer();
      return;
    }
    if (statusRef.current !== 'idle') return;

    setTimerStatus('holding');
    setDisplayTime(0);

    clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = setTimeout(() => {
      if (statusRef.current === 'holding') {
        setTimerStatus('ready');
      }
    }, 300);
  }, [stopTimer]);

  const releaseHold = useCallback(() => {
    clearTimeout(holdTimeoutRef.current);

    if (justStoppedRef.current) {
      justStoppedRef.current = false;
      return;
    }

    if (statusRef.current === 'ready') {
      startTimeRef.current = performance.now();
      setTimerStatus('running');
    } else if (statusRef.current === 'holding') {
      setTimerStatus('idle');
    }
  }, []);

  // Gestion de la barre Espace (comme sur csTimer)
  useEffect(() => {
    const onKeyDown = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (statusRef.current === 'running') {
        e.preventDefault();
        stopTimer();
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          document.activeElement.blur();
        }
        beginHold();
      }
    };

    const onKeyUp = e => {
      if (e.code === 'Space') {
        e.preventDefault();
        releaseHold();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [beginHold, releaseHold, stopTimer]);

  // Gestion des pénalités (+2, DNF, Supprimer)
  const togglePenalty = (solveId, penaltyType) => {
    setAllSessions(prev => {
      const list = prev[sessionKey] || [];
      return {
        ...prev,
        [sessionKey]: list.map(s =>
          s.id === solveId
            ? { ...s, penalty: s.penalty === penaltyType ? null : penaltyType }
            : s
        )
      };
    });
  };

  const deleteSolve = solveId => {
    setAllSessions(prev => {
      const list = prev[sessionKey] || [];
      return {
        ...prev,
        [sessionKey]: list.filter(s => s.id !== solveId)
      };
    });
  };

  const clearCurrentSession = () => {
    setAllSessions(prev => ({
      ...prev,
      [sessionKey]: []
    }));
    setDisplayTime(0);
  };

  // Calcul des statistiques en temps réel (Current & Best pour time, mo3, ao5, ao12)
  const stats = useMemo(() => {
    const count = solves.length;
    const validSolves = solves.filter(s => s.penalty !== 'DNF');

    // Moyenne globale de la session
    const sessionMean =
      validSolves.length > 0
        ? validSolves.reduce((acc, s) => acc + getEffectiveTime(s), 0) / validSolves.length
        : null;

    // Calcul pour chaque solve de son ao5 et ao12 à cet instant
    const solvesWithAverages = solves.map((s, idx) => {
      const sliceFromHere = solves.slice(idx);
      return {
        ...s,
        mo3: computeMeanOf3(sliceFromHere),
        ao5: computeTrimmedAverage(sliceFromHere, 5),
        ao12: computeTrimmedAverage(sliceFromHere, 12)
      };
    });

    const currentSolve = solvesWithAverages[0] || null;

    const getBestMetric = key => {
      const numericVals = solvesWithAverages
        .map(s => (key === 'time' ? getEffectiveTime(s) : s[key]))
        .filter(v => typeof v === 'number' && v !== Infinity);
      return numericVals.length > 0 ? Math.min(...numericVals) : null;
    };

    return {
      totalCount: count,
      validCount: validSolves.length,
      sessionMean,
      solvesWithAverages,
      current: {
        time: currentSolve ? getEffectiveTime(currentSolve) : null,
        timePenalty: currentSolve ? currentSolve.penalty : null,
        mo3: currentSolve ? currentSolve.mo3 : null,
        ao5: currentSolve ? currentSolve.ao5 : null,
        ao12: currentSolve ? currentSolve.ao12 : null
      },
      best: {
        time: getBestMetric('time'),
        mo3: getBestMetric('mo3'),
        ao5: getBestMetric('ao5'),
        ao12: getBestMetric('ao12')
      }
    };
  }, [solves]);

  const currentPuzzleObj = PUZZLE_TYPES.find(p => p.id === puzzleId) || PUZZLE_TYPES[1];
  const latestSolve = solves[0] || null;

  const handleCopyScramble = () => {
    navigator.clipboard.writeText(currentScramble);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleExportCsTimer = () => {
    if (!solves || solves.length === 0) {
      alert(t('timer.noSolvesToExport'));
      return;
    }

    const csSolves = [...solves].reverse().map(s => {
      const penaltyCode = s.penalty === '+2' ? 2000 : s.penalty === 'DNF' ? -1 : 0;
      const timeMs = s.time;
      const timestampSec = Math.floor((Number(s.id) || Date.now()) / 1000);
      return [
        [penaltyCode, timeMs],
        s.scramble || '',
        '',
        timestampSec
      ];
    });

    const exportData = {
      [`session${sessionId}`]: csSolves,
      properties: {
        sessionData: JSON.stringify({
          [sessionId]: {
            name: `${puzzleId} - Session ${sessionId}`,
            opt: {}
          }
        })
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cstimer_export_${puzzleId}_session${sessionId}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cstimer-layout">
      {/* PANNEAU LATÉRAL GAUCHE (Sessions, Tableau Current/Best & Historique façon csTimer) */}
      <aside className="cstimer-sidebar">
        <div className="cstimer-brand-bar">
          <div className="cstimer-logo-badge">
            <TimerIcon size={20} />
            <span>CubeTimer</span>
          </div>
          <button className="trainer-icon-btn" onClick={onBack} title={t('timer.backToMenu')}>
            <ArrowLeft size={16} />
            <span>{t('timer.menu')}</span>
          </button>
        </div>

        {/* Sélecteur de Session */}
        <div className="cstimer-session-row">
          <label htmlFor="session-select" className="cstimer-session-label">
            {t('timer.session')}
          </label>
          <select
            id="session-select"
            className="cstimer-select"
            value={sessionId}
            onChange={e => setSessionId(e.target.value)}
          >
            <option value="1">1 - {t('timer.session.standard')}</option>
            <option value="2">2 - {t('timer.session.practice')}</option>
            <option value="3">3 - {t('timer.session.warmup')}</option>
          </select>
          <button
            className="cstimer-mini-icon-btn"
            onClick={handleExportCsTimer}
            title={t('timer.exportCsTimer')}
          >
            <Download size={15} />
          </button>
          <button
            className="cstimer-mini-icon-btn danger"
            onClick={clearCurrentSession}
            title={t('timer.clearSession')}
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Tableau récapitulatif Current / Best (time, mo3, ao5, ao12) */}
        <div className="cstimer-summary-card">
          <table className="cstimer-summary-table">
            <thead>
              <tr>
                <th></th>
                <th>{t('timer.current')}</th>
                <th>{t('timer.best')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="metric-name">{t('timer.metric.time')}</td>
                <td className="metric-val">
                  {latestSolve ? formatTimerValue(latestSolve.time, latestSolve.penalty) : '-'}
                </td>
                <td className="metric-val best">
                  {stats.best.time !== null ? formatTimerValue(stats.best.time) : '-'}
                </td>
              </tr>
              <tr>
                <td className="metric-name">{t('timer.metric.mo3')}</td>
                <td className="metric-val">
                  {stats.current.mo3 === 'DNF'
                    ? 'DNF'
                    : stats.current.mo3 !== null
                    ? formatTimerValue(stats.current.mo3)
                    : '-'}
                </td>
                <td className="metric-val best">
                  {stats.best.mo3 !== null ? formatTimerValue(stats.best.mo3) : '-'}
                </td>
              </tr>
              <tr>
                <td className="metric-name">{t('timer.metric.ao5')}</td>
                <td className="metric-val">
                  {stats.current.ao5 === 'DNF'
                    ? 'DNF'
                    : stats.current.ao5 !== null
                    ? formatTimerValue(stats.current.ao5)
                    : '-'}
                </td>
                <td className="metric-val best">
                  {stats.best.ao5 !== null ? formatTimerValue(stats.best.ao5) : '-'}
                </td>
              </tr>
              <tr>
                <td className="metric-name">{t('timer.metric.ao12')}</td>
                <td className="metric-val">
                  {stats.current.ao12 === 'DNF'
                    ? 'DNF'
                    : stats.current.ao12 !== null
                    ? formatTimerValue(stats.current.ao12)
                    : '-'}
                </td>
                <td className="metric-val best">
                  {stats.best.ao12 !== null ? formatTimerValue(stats.best.ao12) : '-'}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="cstimer-solve-mean-box">
            <div>
              {t('timer.solves')} <strong>{stats.validCount}/{stats.totalCount}</strong>
            </div>
            <div>
              {t('timer.mean')}{' '}
              <strong>
                {stats.sessionMean !== null ? formatTimerValue(stats.sessionMean) : 'DNF'}
              </strong>
            </div>
          </div>
        </div>

        {/* Liste de l'historique des temps (time | ao5 | ao12) */}
        <div className="cstimer-history-wrapper">
          <table className="cstimer-history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('timer.metric.time')}</th>
                <th>{t('timer.metric.ao5')}</th>
                <th>{t('timer.metric.ao12')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stats.solvesWithAverages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="cstimer-empty-history">
                    {t('timer.emptyHistory')}
                  </td>
                </tr>
              ) : (
                stats.solvesWithAverages.map((item, idx) => {
                  const num = stats.totalCount - idx;
                  return (
                    <tr key={item.id}>
                      <td className="hist-num">{num}</td>
                      <td className="hist-time">
                        {formatTimerValue(item.time, item.penalty)}
                      </td>
                      <td className="hist-avg">
                        {item.ao5 === 'DNF'
                          ? 'DNF'
                          : item.ao5 !== null
                          ? formatTimerValue(item.ao5)
                          : '-'}
                      </td>
                      <td className="hist-avg">
                        {item.ao12 === 'DNF'
                          ? 'DNF'
                          : item.ao12 !== null
                          ? formatTimerValue(item.ao12)
                          : '-'}
                      </td>
                      <td className="hist-actions">
                        <button
                          className={`hist-pen-btn ${item.penalty === '+2' ? 'active' : ''}`}
                          onClick={() => togglePenalty(item.id, '+2')}
                          title={t('timer.penaltyPlus2')}
                        >
                          +2
                        </button>
                        <button
                          className={`hist-pen-btn dnf ${item.penalty === 'DNF' ? 'active' : ''}`}
                          onClick={() => togglePenalty(item.id, 'DNF')}
                          title="DNF"
                        >
                          DNF
                        </button>
                        <button
                          className="hist-del-btn"
                          onClick={() => deleteSolve(item.id)}
                          title={t('timer.deleteTime')}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </aside>

      {/* ZONE PRINCIPALE : BARRE DE MÉLANGE EN HAUT + CHRONOMÈTRE GÉANT AU CENTRE */}
      <div className="cstimer-main">
        {/* Barre supérieure du mélange WCA */}
        <header className="cstimer-scramble-bar">
          <div className="cstimer-scramble-controls">
            <span className="cstimer-wca-badge">WCA</span>
            <select
              className="cstimer-select"
              value={puzzleId}
              onChange={e => handlePuzzleChange(e.target.value)}
            >
              {PUZZLE_TYPES.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <div className="cstimer-scramble-nav">
              <button
                className="cstimer-nav-link"
                disabled={scrambleIdx <= 0}
                onClick={() => setScrambleIdx(i => Math.max(0, i - 1))}
              >
                <ChevronLeft size={15} />
                <span>{t('timer.previousScramble')}</span>
              </button>
              <span className="cstimer-nav-sep">/</span>
              <button className="cstimer-nav-link accent" onClick={() => nextScramble()}>
                <span>{t('timer.nextScramble')}</span>
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              className="cstimer-mini-icon-btn"
              onClick={handleCopyScramble}
              title={t('timer.copyScramble')}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>

            <button
              className="cstimer-mini-icon-btn"
              onClick={() => setShowPreview(v => !v)}
              title={showPreview ? t('timer.hidePreview') : t('timer.showPreview')}
            >
              {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="cstimer-scramble-text">{currentScramble}</div>
        </header>

        {/* Zone interactive du chronomètre (Cliquer/Maintenir ou Barre Espace) */}
        <main
          className={`cstimer-arena status-${timerStatus}`}
          onPointerDown={e => {
            if (e.target.closest('button')) return;
            beginHold();
          }}
          onPointerUp={e => {
            if (e.target.closest('button')) return;
            releaseHold();
          }}
        >
          <div className="cstimer-center-stack">
            <div className={`cstimer-giant-digits status-${timerStatus}`}>
              {timerStatus === 'running' || displayTime > 0
                ? formatTimerValue(
                    displayTime,
                    timerStatus === 'idle' && latestSolve && latestSolve.time === displayTime
                      ? latestSolve.penalty
                      : null
                  )
                : '0.00'}
            </div>


            {/* Affichage central ao5 / ao12 comme sur csTimer */}
            <div className="cstimer-center-averages">
              <div className="cstimer-center-avg-line">
                {t('timer.averageAo5')}{' '}
                <span>
                  {stats.current.ao5 === 'DNF'
                    ? 'DNF'
                    : stats.current.ao5 !== null
                    ? formatTimerValue(stats.current.ao5)
                    : '-'}
                </span>
              </div>
              <div className="cstimer-center-avg-line">
                {t('timer.averageAo12')}{' '}
                <span>
                  {stats.current.ao12 === 'DNF'
                    ? 'DNF'
                    : stats.current.ao12 !== null
                    ? formatTimerValue(stats.current.ao12)
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Aperçu 2D du mélange en bas à droite */}
          {showPreview && timerStatus !== 'running' && (
            <div className="cstimer-net-preview-box" onClick={e => e.stopPropagation()}>
              <div className="cstimer-net-preview-title">
                {t('timer.scramblePreview', { puzzle: currentPuzzleObj.label })}
              </div>
              <ScrambleNetPreview size={currentPuzzleObj.size} scramble={currentScramble} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}