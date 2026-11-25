// src/components/VirtualCubeHistoryModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownBox,
  ArrowLeft,
  Check,
  Clock,
  Cross,
  Paper,
  Trash
} from '@getpapillon/papicons';
import {
  buildVirtualCsvExport,
  buildVirtualJsonExport,
  useVirtualCubeSessionStore
} from '../store/useVirtualCubeSessionStore';
import { calculateSessionStats } from '../utils/smartCube/wcaStats';
import { formatTimerValue } from '../utils/timerUtils';

function formatStatMs(val) {
  if (val === 'DNF') return 'DNF';
  if (val === null || val === undefined) return '-';
  return formatTimerValue(val);
}

function formatSolveDisplay(solve) {
  if (!solve) return '-';
  const penaltyFlag = solve.penalty === 'dnf' || solve.isDnf ? 'DNF' : solve.penalty === '+2' ? '+2' : null;
  return formatTimerValue(solve.timeMs, penaltyFlag);
}

function formatTimestamp(ts) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString([], {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function CopyFieldButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#394144] bg-[#1b2023] px-2.5 py-1.5 text-xs font-semibold text-[#f0f1ed] hover:border-[#9eb5aa] disabled:opacity-40 min-h-[36px]"
    >
      {copied ? <Check size={14} className="text-[#4ade80]" /> : <Paper size={14} />}
      <span>{copied ? 'Copié !' : label}</span>
    </button>
  );
}

export function VirtualCubeHistoryModal({ isOpen, onClose, size }) {
  const puzzleKey = `${size}x${size}`;
  const solves = useVirtualCubeSessionStore((state) => state.sessions[puzzleKey] || []);
  const deleteSolve = useVirtualCubeSessionStore((state) => state.deleteSolve);
  const clearSession = useVirtualCubeSessionStore((state) => state.clearSession);
  const updatePenalty = useVirtualCubeSessionStore((state) => state.updatePenalty);

  const [selectedSolveId, setSelectedSolveId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedSolveId(null);
      return;
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedSolveId) {
          setSelectedSolveId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, selectedSolveId]);

  const stats = useMemo(() => {
    const chronological = [...solves].reverse();
    const wca = calculateSessionStats(chronological);
    const validSolves = solves.filter((s) => s.penalty !== 'dnf' && !s.isDnf);
    const avgHtm =
      validSolves.length > 0
        ? (validSolves.reduce((sum, s) => sum + (s.htm || 0), 0) / validSolves.length).toFixed(1)
        : '-';
    const avgStm =
      validSolves.length > 0
        ? (validSolves.reduce((sum, s) => sum + (s.stm || 0), 0) / validSolves.length).toFixed(1)
        : '-';
    return {
      ...wca,
      validCount: validSolves.length,
      avgHtm,
      avgStm
    };
  }, [solves]);

  const selectedSolve = useMemo(
    () => solves.find((s) => s.id === selectedSolveId) || null,
    [solves, selectedSolveId]
  );

  if (!isOpen) return null;

  const handleTogglePenalty = (e, solve, targetPenalty) => {
    e.stopPropagation();
    const nextPenalty = solve.penalty === targetPenalty ? 'none' : targetPenalty;
    updatePenalty(size, solve.id, nextPenalty);
  };

  const handleDelete = (e, solveId) => {
    e.stopPropagation();
    if (selectedSolveId === solveId) setSelectedSolveId(null);
    deleteSolve(size, solveId);
  };

  const handleClear = () => {
    if (solves.length === 0) return;
    if (window.confirm(`Effacer tous les temps de la session ${puzzleKey} ?`)) {
      setSelectedSolveId(null);
      clearSession(size);
    }
  };

  const handleExportJson = () => {
    if (solves.length === 0) return;
    triggerDownload(
      buildVirtualJsonExport(solves, puzzleKey),
      `virtual_cube_${puzzleKey}_${Date.now()}.json`,
      'application/json'
    );
  };

  const handleExportCsv = () => {
    if (solves.length === 0) return;
    triggerDownload(
      buildVirtualCsvExport(solves, puzzleKey),
      `virtual_cube_${puzzleKey}_${Date.now()}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Historique ${puzzleKey}`}
    >
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#1b2023] text-[#f0f1ed] sm:h-auto sm:max-h-[88dvh] sm:max-w-2xl sm:rounded-xl sm:border sm:border-[#394144] sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#394144] bg-[#202629] px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedSolve ? (
              <button
                type="button"
                onClick={() => setSelectedSolveId(null)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#394144] bg-[#252b2e] px-2.5 text-sm font-semibold text-[#f0f1ed] hover:border-[#9eb5aa]"
              >
                <ArrowLeft size={16} />
                <span>Retour</span>
              </button>
            ) : (
              <Clock size={18} className="shrink-0 text-[#9eb5aa]" />
            )}
            <h2 className="truncate text-base font-bold sm:text-lg">
              {selectedSolve
                ? `Résolution #${solves.length - solves.findIndex((s) => s.id === selectedSolve.id)}`
                : `Historique ${puzzleKey}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-[#394144] bg-[#252b2e] text-[#f0f1ed] hover:border-[#9eb5aa]"
          >
            <Cross size={16} />
          </button>
        </header>

        {selectedSolve ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#394144] bg-[#202629] p-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#9eb5aa]">
                  Temps final
                </div>
                <div className="mt-0.5 font-mono text-3xl font-extrabold text-[#f0f1ed]">
                  {formatSolveDisplay(selectedSolve)}
                </div>
                <div className="mt-1 text-xs text-[#94a3b8]">
                  {formatTimestamp(selectedSolve.timestamp)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleTogglePenalty(e, selectedSolve, '+2')}
                  className={`min-h-[40px] rounded-md border px-3 text-xs font-bold ${
                    selectedSolve.penalty === '+2'
                      ? 'border-[#facc15] bg-[#facc15]/20 text-[#facc15]'
                      : 'border-[#394144] bg-[#252b2e] text-[#f0f1ed] hover:border-[#9eb5aa]'
                  }`}
                >
                  +2
                </button>
                <button
                  type="button"
                  onClick={(e) => handleTogglePenalty(e, selectedSolve, 'dnf')}
                  className={`min-h-[40px] rounded-md border px-3 text-xs font-bold ${
                    selectedSolve.penalty === 'dnf' || selectedSolve.isDnf
                      ? 'border-red-400 bg-red-500/20 text-red-300'
                      : 'border-[#394144] bg-[#252b2e] text-[#f0f1ed] hover:border-[#9eb5aa]'
                  }`}
                >
                  DNF
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, selectedSolve.id)}
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-[#394144] bg-[#252b2e] text-red-300 hover:border-red-400"
                  title="Supprimer"
                >
                  <Trash size={15} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-[#394144] bg-[#252b2e] p-3">
                <div className="text-[11px] font-semibold uppercase text-[#9eb5aa]">HTM</div>
                <div className="mt-0.5 font-mono text-lg font-bold">{selectedSolve.htm ?? 0}</div>
              </div>
              <div className="rounded-lg border border-[#394144] bg-[#252b2e] p-3">
                <div className="text-[11px] font-semibold uppercase text-[#9eb5aa]">STM</div>
                <div className="mt-0.5 font-mono text-lg font-bold">{selectedSolve.stm ?? 0}</div>
              </div>
              <div className="rounded-lg border border-[#394144] bg-[#252b2e] p-3">
                <div className="text-[11px] font-semibold uppercase text-[#9eb5aa]">TPS (HTM)</div>
                <div className="mt-0.5 font-mono text-lg font-bold">
                  {Number(selectedSolve.tpsHtm || 0).toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg border border-[#394144] bg-[#252b2e] p-3">
                <div className="text-[11px] font-semibold uppercase text-[#9eb5aa]">TPS (STM)</div>
                <div className="mt-0.5 font-mono text-lg font-bold">
                  {Number(selectedSolve.tpsStm || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-[#394144] bg-[#252b2e] p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#9eb5aa]">
                    Mélange WCA
                  </span>
                  <CopyFieldButton text={selectedSolve.scramble} label="Copier" />
                </div>
                <p className="break-words font-mono text-xs leading-relaxed text-[#f0f1ed]">
                  {selectedSolve.scramble || 'Aucun mélange enregistré'}
                </p>
              </div>

              <div className="rounded-lg border border-[#394144] bg-[#252b2e] p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#9eb5aa]">
                    Mouvements simplifiés ({selectedSolve.stm ?? 0} STM)
                  </span>
                  <CopyFieldButton text={selectedSolve.moves} label="Copier" />
                </div>
                <p className="break-words font-mono text-xs leading-relaxed text-[#f0f1ed]">
                  {selectedSolve.moves || '-'}
                </p>
              </div>

              <div className="rounded-lg border border-[#394144] bg-[#252b2e] p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#9eb5aa]">
                    Mouvements bruts ({selectedSolve.rawMoveCount ?? 0} coups)
                  </span>
                  <CopyFieldButton text={selectedSolve.rawMoves} label="Copier" />
                </div>
                <p className="break-words font-mono text-xs leading-relaxed text-[#cbd5e1]">
                  {selectedSolve.rawMoves || '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 border-b border-[#394144] bg-[#202629] px-4 py-3 sm:grid-cols-7">
              <div className="rounded-md bg-[#252b2e] px-2.5 py-2 text-center">
                <div className="text-[10px] font-semibold uppercase text-[#9eb5aa]">Solves</div>
                <div className="font-mono text-sm font-bold">
                  {stats.validCount}/{stats.count}
                </div>
              </div>
              <div className="rounded-md bg-[#252b2e] px-2.5 py-2 text-center">
                <div className="text-[10px] font-semibold uppercase text-[#9eb5aa]">PB</div>
                <div className="font-mono text-sm font-bold text-[#9eb5aa]">
                  {formatStatMs(stats.best)}
                </div>
              </div>
              <div className="rounded-md bg-[#252b2e] px-2.5 py-2 text-center">
                <div className="text-[10px] font-semibold uppercase text-[#9eb5aa]">Mo3</div>
                <div className="font-mono text-sm font-bold">{formatStatMs(stats.mo3)}</div>
              </div>
              <div className="rounded-md bg-[#252b2e] px-2.5 py-2 text-center">
                <div className="text-[10px] font-semibold uppercase text-[#9eb5aa]">Ao5</div>
                <div className="font-mono text-sm font-bold">{formatStatMs(stats.ao5)}</div>
              </div>
              <div className="rounded-md bg-[#252b2e] px-2.5 py-2 text-center">
                <div className="text-[10px] font-semibold uppercase text-[#9eb5aa]">Ao12</div>
                <div className="font-mono text-sm font-bold">{formatStatMs(stats.ao12)}</div>
              </div>
              <div className="rounded-md bg-[#252b2e] px-2.5 py-2 text-center">
                <div className="text-[10px] font-semibold uppercase text-[#9eb5aa]">Avg HTM</div>
                <div className="font-mono text-sm font-bold">{stats.avgHtm}</div>
              </div>
              <div className="rounded-md bg-[#252b2e] px-2.5 py-2 text-center col-span-3 sm:col-span-1">
                <div className="text-[10px] font-semibold uppercase text-[#9eb5aa]">Avg STM</div>
                <div className="font-mono text-sm font-bold">{stats.avgStm}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#394144] bg-[#1b2023] px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={solves.length === 0}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#394144] bg-[#252b2e] px-3 text-xs font-semibold text-[#f0f1ed] hover:border-[#9eb5aa] disabled:opacity-40"
                >
                  <ArrowDownBox size={14} />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={solves.length === 0}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#394144] bg-[#252b2e] px-3 text-xs font-semibold text-[#f0f1ed] hover:border-[#9eb5aa] disabled:opacity-40"
                >
                  <ArrowDownBox size={14} />
                  <span>Export CSV</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleClear}
                disabled={solves.length === 0}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#394144] bg-[#252b2e] px-3 text-xs font-semibold text-red-300 hover:border-red-400 disabled:opacity-40"
              >
                <Trash size={14} />
                <span>Vider la session</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {solves.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[#394144] bg-[#202629] px-4 text-center text-sm text-[#94a3b8]">
                  Aucune résolution enregistrée pour le {puzzleKey}.
                </div>
              ) : (
                <>
                  {/* Cartes mobile */}
                  <div className="space-y-2.5 sm:hidden">
                    {solves.map((solve, idx) => {
                      const num = solves.length - idx;
                      return (
                        <div
                          key={solve.id}
                          onClick={() => setSelectedSolveId(solve.id)}
                          className="cursor-pointer rounded-lg border border-[#394144] bg-[#252b2e] p-3 active:border-[#9eb5aa]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-baseline gap-2.5">
                              <span className="text-xs font-semibold text-[#9eb5aa]">#{num}</span>
                              <span className="font-mono text-xl font-extrabold">
                                {formatSolveDisplay(solve)}
                              </span>
                            </div>
                            <span className="text-xs text-[#94a3b8]">
                              {formatTimestamp(solve.timestamp)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="font-mono text-xs text-[#cbd5e1]">
                              HTM {solve.htm ?? 0} · STM {solve.stm ?? 0}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleTogglePenalty(e, solve, '+2')}
                                className={`min-h-[44px] min-w-[44px] rounded-md border px-2 text-xs font-bold ${
                                  solve.penalty === '+2'
                                    ? 'border-[#facc15] bg-[#facc15]/20 text-[#facc15]'
                                    : 'border-[#394144] bg-[#202629] text-[#f0f1ed]'
                                }`}
                              >
                                +2
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleTogglePenalty(e, solve, 'dnf')}
                                className={`min-h-[44px] min-w-[44px] rounded-md border px-2 text-xs font-bold ${
                                  solve.penalty === 'dnf' || solve.isDnf
                                    ? 'border-red-400 bg-red-500/20 text-red-300'
                                    : 'border-[#394144] bg-[#202629] text-[#f0f1ed]'
                                }`}
                              >
                                DNF
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, solve.id)}
                                aria-label="Supprimer"
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#394144] bg-[#202629] text-red-300"
                              >
                                <Trash size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tableau desktop */}
                  <div className="hidden overflow-hidden rounded-lg border border-[#394144] bg-[#202629] sm:block">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#394144] bg-[#252b2e] text-xs uppercase text-[#9eb5aa]">
                          <th className="px-3 py-2.5 font-semibold">#</th>
                          <th className="px-3 py-2.5 font-semibold">Temps</th>
                          <th className="px-3 py-2.5 font-semibold">HTM</th>
                          <th className="px-3 py-2.5 font-semibold">STM</th>
                          <th className="px-3 py-2.5 font-semibold">Date</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solves.map((solve, idx) => {
                          const num = solves.length - idx;
                          return (
                            <tr
                              key={solve.id}
                              onClick={() => setSelectedSolveId(solve.id)}
                              className="cursor-pointer border-b border-[#394144]/60 last:border-b-0 hover:bg-[#252b2e]"
                            >
                              <td className="px-3 py-2.5 font-mono text-xs text-[#9eb5aa]">
                                #{num}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-bold text-[#f0f1ed]">
                                {formatSolveDisplay(solve)}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-[#cbd5e1]">
                                {solve.htm ?? 0}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-[#cbd5e1]">
                                {solve.stm ?? 0}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-[#94a3b8]">
                                {formatTimestamp(solve.timestamp)}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => handleTogglePenalty(e, solve, '+2')}
                                    className={`min-h-[32px] rounded border px-2 text-xs font-bold ${
                                      solve.penalty === '+2'
                                        ? 'border-[#facc15] bg-[#facc15]/20 text-[#facc15]'
                                        : 'border-[#394144] bg-[#1b2023] text-[#f0f1ed] hover:border-[#9eb5aa]'
                                    }`}
                                  >
                                    +2
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleTogglePenalty(e, solve, 'dnf')}
                                    className={`min-h-[32px] rounded border px-2 text-xs font-bold ${
                                      solve.penalty === 'dnf' || solve.isDnf
                                        ? 'border-red-400 bg-red-500/20 text-red-300'
                                        : 'border-[#394144] bg-[#1b2023] text-[#f0f1ed] hover:border-[#9eb5aa]'
                                    }`}
                                  >
                                    DNF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, solve.id)}
                                    title="Supprimer"
                                    className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded border border-[#394144] bg-[#1b2023] text-red-300 hover:border-red-400"
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
