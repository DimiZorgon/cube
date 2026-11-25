// src/pages/SmartCubeReplayPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Link as LinkIcon,
  Check,
  Paper,
  AlertTriangle
} from '@getpapillon/papicons';
import { SolveReplayPlayer } from '../components/SmartCube/SolveReplayPlayer';
import { F2LBreakdownView } from '../components/SmartCube/F2LBreakdownView';
import {
  useSmartCubeStore,
  CFOP_PHASE_ORDER,
  CFOP_PHASE_NAMES,
  analyzeSolvePauses
} from '../store/useSmartCubeStore';
import { getSmartCubeSolveByNumberAsync } from '../utils/smartCube/sessionStorage';
import { decodeReplayPayload, buildReplayShareUrl } from '../utils/smartCube/replayCodec';
import { paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

const PHASE_SHORT_LABELS = {
  cross: 'C',
  f2l: 'F',
  oll: 'O',
  pll: 'P'
};

const PHASE_BAR_COLORS = {
  cross: 'bg-sky-600',
  f2l: 'bg-[#385a49]',
  oll: 'bg-amber-600',
  pll: 'bg-violet-600'
};

const PHASE_BADGE_STYLES = {
  cross: 'border-[#41494c] bg-[#252b2e] text-sky-300',
  f2l: 'border-[#41494c] bg-[#252b2e] text-[#9eb5aa]',
  oll: 'border-[#41494c] bg-[#252b2e] text-amber-300',
  pll: 'border-[#41494c] bg-[#252b2e] text-violet-300'
};

function formatSolveTime(ms, penalty = 'none') {
  if (penalty === 'dnf') return 'DNF';
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '--';
  const effectiveMs = penalty === '+2' ? ms + 2000 : ms;
  const totalSeconds = effectiveMs / 1000;
  if (totalSeconds < 60) {
    const formatted = totalSeconds.toFixed(2);
    return penalty === '+2' ? `${formatted}+` : formatted;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  const formatted = `${minutes}:${remainingSecs}`;
  return penalty === '+2' ? `${formatted}+` : formatted;
}

function formatSplitSeconds(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '--';
  return `${(ms / 1000).toFixed(2)}s`;
}

function computeFluencyScore(totalMs, pauses) {
  if (!totalMs || totalMs <= 0) return 100;
  const pauseMs = pauses?.totalPauseMs || 0;
  const pauseCount = pauses?.count || 0;
  const ratio = pauseMs / totalMs;
  return Math.max(15, Math.min(100, Math.round(100 - ratio * 70 - pauseCount * 2)));
}

function buildSolveAnalysis(solve) {
  if (!solve) return null;
  const totalMs = Math.max(1, solve.elapsedMs ?? solve.timeMs ?? 1);
  const splitsObj = solve.splits || {};
  const breakdown = CFOP_PHASE_ORDER.map(phase => {
    const s = splitsObj[phase] || {
      phase,
      name: CFOP_PHASE_NAMES[phase],
      durationMs: 0,
      moveCount: 0,
      moves: 0,
      tps: 0,
      recognitionMs: 0,
      executionMs: 0,
      executionTps: 0,
      skipped: true
    };
    const durationMs = Number(s.durationMs) || 0;
    const moves = Number(s.moves ?? s.moveCount) || 0;
    const recognitionMs = Number(s.recognitionMs) || 0;
    const executionMs = typeof s.executionMs === 'number' ? s.executionMs : Math.max(0, durationMs - recognitionMs);
    const executionTps = Number(s.executionTps) || 0;
    const pct = Math.min(100, Math.max(0, Math.round((durationMs / totalMs) * 100)));
    return {
      phase,
      shortLabel: PHASE_SHORT_LABELS[phase],
      name: CFOP_PHASE_NAMES[phase],
      durationMs,
      moves,
      tps: Number(s.tps) || 0,
      recognitionMs,
      executionMs,
      executionTps,
      skipped: Boolean(s.skipped),
      pct
    };
  });

  const pauses = solve.pauses || analyzeSolvePauses(solve.moveTimings || [], splitsObj);
  const regrips = solve.regrips || { count: 0, items: [] };
  const fluency = computeFluencyScore(totalMs, pauses);

  return {
    solve,
    totalMs,
    breakdown,
    pauses,
    regrips,
    fluency
  };
}

export function SmartCubeReplayPage() {
  const { t, i18n } = useTranslation();
  const { solveNum } = useParams();
  const [searchParams] = useSearchParams();
  const sharedDataParam = searchParams.get('d');
  useSeo('smartCubeReplay');

  const hydrateSolves = useSmartCubeStore(state => state.hydrateSolves);

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not_found' | 'invalid_link'
  const [solve, setSolve] = useState(null);
  const [source, setSource] = useState('local'); // 'local' | 'shared'
  const [shareCopied, setShareCopied] = useState(false);
  const [scrambleCopied, setScrambleCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSolve() {
      setStatus('loading');
      setSolve(null);

      if (sharedDataParam) {
        try {
          const decoded = await decodeReplayPayload(sharedDataParam);
          if (cancelled) return;
          setSolve(decoded);
          setSource('shared');
          setStatus('ready');
        } catch {
          if (cancelled) return;
          setStatus('invalid_link');
        }
        return;
      }

      if (solveNum) {
        try {
          const { solves } = await hydrateSolves();
          if (cancelled) return;
          const targetNum = Number(solveNum);
          let found = Array.isArray(solves)
            ? solves.find(s => Number(s?.solveNumber) === targetNum) || null
            : null;

          if (!found && Number.isInteger(targetNum) && targetNum > 0) {
            found = await getSmartCubeSolveByNumberAsync(targetNum);
          }

          if (cancelled) return;
          if (found) {
            setSolve(found);
            setSource('local');
            setStatus('ready');
          } else {
            setStatus('not_found');
          }
        } catch {
          if (cancelled) return;
          setStatus('not_found');
        }
        return;
      }

      setStatus('not_found');
    }

    loadSolve();
    return () => {
      cancelled = true;
    };
  }, [hydrateSolves, sharedDataParam, solveNum]);

  const analysis = useMemo(() => buildSolveAnalysis(solve), [solve]);

  const formattedDate = useMemo(() => {
    const ts = Number(solve?.timestamp ?? solve?.date);
    if (!ts || Number.isNaN(ts)) return null;
    try {
      return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(ts));
    } catch {
      return null;
    }
  }, [i18n.language, solve?.date, solve?.timestamp]);

  const handleShare = async () => {
    if (!solve) return;
    try {
      const shareUrl = await buildReplayShareUrl(
        solve,
        typeof window !== 'undefined' ? window.location.origin : '',
        i18n.language
      );
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // ignore clipboard/share errors
    }
  };

  const handleCopyScramble = async () => {
    if (!solve?.scramble) return;
    try {
      await navigator.clipboard.writeText(solve.scramble);
      setScrambleCopied(true);
      setTimeout(() => setScrambleCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const focusClass = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9eb5aa]';

  const rightPanelHeader = analysis ? (
    <div className="flex flex-col gap-3">
      {/* Hero Metrics Card */}
      <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#94a3b8] uppercase font-bold">
              {t('smartCube.analysis.title', 'Détails de la résolution')}
            </span>
            {analysis.solve.penalty === '+2' && (
              <span className="px-1.5 py-0.5 rounded bg-amber-600/20 border border-amber-500/50 text-[10px] font-bold text-amber-300">
                +2
              </span>
            )}
            {(analysis.solve.penalty === 'dnf' || analysis.solve.isDnf) && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600/20 border border-rose-500/50 text-[10px] font-bold text-rose-300">
                DNF
              </span>
            )}
          </div>
          <div className="text-3xl font-mono tabular-nums font-extrabold text-white mt-0.5">
            {formatSolveTime(analysis.totalMs, analysis.solve.penalty)}
          </div>
        </div>

        <div className="flex items-center gap-2 text-center">
          <div className="px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144]">
            <div className="text-[10px] text-[#94a3b8] uppercase font-bold">
              {t('smartCube.history.colSteps', 'Étapes')}
            </div>
            <div className="text-sm font-mono tabular-nums font-bold text-white">
              {analysis.solve.moveCount ?? 0}
            </div>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144]">
            <div className="text-[10px] text-[#94a3b8] uppercase font-bold">TPS</div>
            <div className="text-sm font-mono tabular-nums font-bold text-[#9eb5aa]">
              {Number(analysis.solve.tps || 0).toFixed(2)}
            </div>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144]">
            <div className="text-[10px] text-[#94a3b8] uppercase font-bold">
              {t('smartCube.history.colFluency', 'Fluence')}
            </div>
            <div className="text-sm font-mono tabular-nums font-bold text-slate-200">
              {analysis.fluency}
            </div>
          </div>
        </div>
      </div>

      {/* CFOP Breakdown */}
      <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-[#9eb5aa]">
          {t('smartCube.cfop.title', 'Décomposition CFOP (Cross • F2L • OLL • PLL)')}
        </div>

        <div className="w-full h-2.5 rounded-full bg-[#252b2e] overflow-hidden flex border border-[#394144]">
          {analysis.breakdown.map(item => (
            item.pct > 0 && (
              <div
                key={item.phase}
                style={{ width: `${item.pct}%` }}
                className={`${PHASE_BAR_COLORS[item.phase]} h-full`}
              />
            )
          ))}
        </div>

        <div className="grid grid-cols-4 text-[11px] font-bold text-[#94a3b8] px-2 pt-1">
          <span>Phase</span>
          <span className="text-right">Temps</span>
          <span className="text-right">Étapes</span>
          <span className="text-right">TPS</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {analysis.breakdown.map(item => (
            <div
              key={item.phase}
              className="grid grid-cols-4 items-center px-2.5 py-2 rounded-lg bg-[#252b2e] border border-[#394144]/70 font-mono tabular-nums text-xs"
            >
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${PHASE_BADGE_STYLES[item.phase]}`}>
                  {item.shortLabel}
                </span>
                <span className="font-sans font-semibold text-slate-200">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-white">
                  {item.skipped ? 'Skip' : formatSplitSeconds(item.durationMs)}
                </div>
                {!item.skipped && (item.recognitionMs > 0 || item.phase !== 'cross') && (
                  <div className="text-[10px] text-[#94a3b8]">
                    {t('smartCube.analysis.recognition', 'Rec.')} {(item.recognitionMs / 1000).toFixed(2)}s / {t('smartCube.analysis.execution', 'Exéc.')} {(item.executionMs / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
              <span className="text-right text-slate-300">{item.moves}</span>
              <div className="text-right">
                <div className="text-emerald-400">{item.tps.toFixed(2)}</div>
                {!item.skipped && item.executionTps > 0 && item.recognitionMs > 0 && (
                  <div className="text-[10px] text-[#94a3b8]">{item.executionTps.toFixed(1)} ex</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144] text-xs">
          <span className="text-[#94a3b8] font-semibold">
            {t('smartCube.analysis.pauses', 'Hésitations (>450ms)')}
          </span>
          {analysis.pauses.count === 0 ? (
            <span className="font-mono text-emerald-400 font-semibold">
              {t('smartCube.analysis.noPauses', 'Aucune pause')}
            </span>
          ) : (
            <span className="font-mono tabular-nums text-amber-300">
              {analysis.pauses.count} pause(s) • {(analysis.pauses.totalPauseMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144] text-xs">
          <span className="text-[#94a3b8] font-semibold">
            {t('smartCube.analysis.regrips', 'Regrips détectés')}
          </span>
          {analysis.regrips.count === 0 ? (
            <span className="font-mono text-emerald-400 font-semibold">
              {t('smartCube.analysis.noRegrips', 'Aucun regrip détecté')}
            </span>
          ) : (
            <span className="font-mono tabular-nums text-sky-300">
              {analysis.regrips.count} regrip(s)
            </span>
          )}
        </div>
      </div>

      {/* F2L Pairs */}
      <F2LBreakdownView solve={analysis.solve} />

      {/* WCA Scramble */}
      {analysis.solve.scramble && (
        <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
              {t('smartCube.telemetry.scramble', 'Mélange WCA')}
            </span>
            <button
              type="button"
              onClick={handleCopyScramble}
              aria-live="polite"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-[#252b2e] border border-[#394144] hover:border-[#9eb5aa] text-[11px] font-semibold text-[#f0f1ed] cursor-pointer ${focusClass}`}
            >
              {scrambleCopied ? <Check size={12} /> : <Paper size={12} />}
              <span>{scrambleCopied ? t('smartCube.replay.copied', 'Copié') : t('smartCube.replay.copy', 'Copier')}</span>
            </button>
          </div>
          <div className="font-mono text-xs sm:text-sm text-slate-200 select-text break-words">
            {analysis.solve.scramble}
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="min-h-[100dvh] w-full bg-[#1b2023] text-[#f0f1ed] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 min-h-14 py-2 bg-[#202629] border-b border-[#394144]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to={paths.smartCube()}
            className={`inline-flex items-center justify-center min-w-11 min-h-11 sm:min-w-0 sm:min-h-9 px-3 rounded-lg bg-[#252b2e] border border-[#41494c] text-[#f0f1ed] hover:border-[#9eb5aa] transition-colors shrink-0 text-xs font-semibold ${focusClass}`}
          >
            <ArrowLeft size={16} />
            <span className="ml-1.5">{t('smartCube.replay.backToCube', 'Smart Cube')}</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h1 className="text-sm sm:text-base font-extrabold text-white truncate">
              {t('smartCube.replay.title', 'Replay 3D du solve')}
            </h1>

            {solve?.solveNumber && (
              <span className="px-2 py-0.5 rounded-full bg-[#252b2e] border border-[#41494c] font-mono tabular-nums text-xs font-bold text-[#9eb5aa]">
                #{solve.solveNumber}
              </span>
            )}

            {source === 'shared' && (
              <span className="px-2 py-0.5 rounded-full bg-sky-950/60 border border-sky-700/50 text-[11px] font-semibold text-sky-300">
                {t('smartCube.replay.sharedBadge', 'Replay partagé')}
              </span>
            )}

            {formattedDate && (
              <span className="hidden md:inline text-xs text-[#94a3b8]">
                {formattedDate}
              </span>
            )}
          </div>
        </div>

        {status === 'ready' && solve && (
          <button
            type="button"
            onClick={handleShare}
            aria-live="polite"
            className={`min-h-11 sm:min-h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-lg bg-[#9eb5aa] hover:bg-[#b9c9bf] text-[#1b2023] text-xs font-bold cursor-pointer transition-colors shrink-0 ${focusClass}`}
          >
            {shareCopied ? <Check size={15} /> : <LinkIcon size={15} />}
            <span>
              {shareCopied
                ? t('smartCube.replay.linkCopied', 'Lien copié !')
                : t('smartCube.replay.share', 'Partager')}
            </span>
          </button>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-5">
        {status === 'loading' && (
          <div className="rounded-xl bg-[#202629] border border-[#394144] p-8 text-center text-sm text-[#94a3b8]">
            {t('smartCube.replay.loading', 'Chargement du replay...')}
          </div>
        )}

        {(status === 'not_found' || status === 'invalid_link') && (
          <div className="max-w-lg mx-auto mt-8 rounded-xl bg-[#202629] border border-[#394144] p-6 flex flex-col items-center text-center gap-4">
            <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <AlertTriangle size={22} />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-white">
                {status === 'invalid_link'
                  ? t('smartCube.replay.invalidLinkTitle', 'Lien de replay invalide')
                  : t('smartCube.replay.notFoundTitle', 'Résolution introuvable')}
              </h2>
              <p className="text-xs sm:text-sm text-[#94a3b8]">
                {status === 'invalid_link'
                  ? t('smartCube.replay.invalidLinkDesc', 'Ce lien partagé est corrompu ou incomplet.')
                  : t('smartCube.replay.notFoundDesc', 'Cette résolution n’existe pas dans l’historique local de ce navigateur.')}
              </p>
            </div>
            <Link
              to={paths.smartCube()}
              className={`min-h-11 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-[#9eb5aa] hover:bg-[#b9c9bf] text-xs font-bold text-[#1b2023] ${focusClass}`}
            >
              <ArrowLeft size={15} />
              <span>{t('smartCube.replay.backToCube', 'Retour au Smart Cube')}</span>
            </Link>
          </div>
        )}

        {status === 'ready' && solve && (
          <SolveReplayPlayer
            solve={solve}
            layout="split"
            enableKeyboardShortcuts={true}
            rightPanelHeader={rightPanelHeader}
          />
        )}
      </main>
    </div>
  );
}

export default SmartCubeReplayPage;
