// src/components/SmartCube/F2LBreakdownView.jsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { reconstructF2LBreakdown } from '../../utils/smartCube/solvePhaseDetector';

function formatSeconds(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '-';
  return `${(ms / 1000).toFixed(2)}s`;
}

const SLOT_STYLES = {
  FR: 'bg-emerald-900/40 text-emerald-300 border-emerald-600/50',
  FL: 'bg-sky-900/40 text-sky-300 border-sky-600/50',
  BR: 'bg-indigo-900/40 text-indigo-300 border-indigo-600/50',
  BL: 'bg-amber-900/40 text-amber-300 border-amber-600/50'
};

const PAIR_BAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-amber-500'
];

export function F2LBreakdownView({ solve }) {
  const { t } = useTranslation();

  const pairsData = useMemo(() => {
    if (!solve) return null;

    // Check stored f2lBreakdown on splits or root
    let breakdown = solve.splits?.f2lBreakdown || solve.f2lBreakdown;

    // If not directly present, attempt reconstruction from scramble + moveTimings
    if ((!breakdown || Object.keys(breakdown).length === 0) && solve.scramble && Array.isArray(solve.moveTimings) && solve.moveTimings.length > 0) {
      try {
        breakdown = reconstructF2LBreakdown(solve.scramble, solve.moveTimings);
      } catch {
        breakdown = null;
      }
    }

    if (!breakdown || typeof breakdown !== 'object') return null;

    const keys = ['f1', 'f2', 'f3', 'f4'];
    const items = [];
    let totalDuration = 0;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const entry = breakdown[k];
      if (entry && entry.slot) {
        const dur = typeof entry.durationMs === 'number' ? entry.durationMs : 0;
        totalDuration += dur;
        items.push({
          id: k,
          label: k.toUpperCase(),
          slot: entry.slot,
          durationMs: dur,
          splitMs: typeof entry.splitMs === 'number' ? entry.splitMs : null,
          timestamp: entry.timestamp
        });
      }
    }

    if (items.length === 0) return null;

    return {
      items,
      totalDuration
    };
  }, [solve]);

  if (!pairsData) {
    return null;
  }

  const { items, totalDuration } = pairsData;

  return (
    <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9eb5aa]">
          {t('smartCube.f2l.title', 'Détail des 4 paires F2L')}
        </span>
        <span className="font-mono text-xs font-bold text-slate-300">
          Total F2L : {formatSeconds(totalDuration)}
        </span>
      </div>

      {/* Relative duration progress bar */}
      {totalDuration > 0 && items.length > 1 && (
        <div className="w-full h-2 rounded-full bg-[#252b2e] overflow-hidden flex border border-[#394144]/60">
          {items.map((item, idx) => {
            const pct = Math.max(0, Math.min(100, (item.durationMs / totalDuration) * 100));
            return (
              <div
                key={item.id}
                style={{ width: `${pct}%` }}
                className={`${PAIR_BAR_COLORS[idx % PAIR_BAR_COLORS.length]} h-full`}
                title={`${item.label} (${item.slot}): ${formatSeconds(item.durationMs)} (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>
      )}

      {/* Grid columns header */}
      <div className="grid grid-cols-4 text-[11px] font-bold text-[#94a3b8] px-2 pt-0.5">
        <span>{t('smartCube.f2l.pair', 'Paire')}</span>
        <span>{t('smartCube.f2l.slot', 'Emplacement')}</span>
        <span className="text-right">{t('smartCube.f2l.duration', 'Temps')}</span>
        <span className="text-right">{t('smartCube.f2l.split', 'Cumul')}</span>
      </div>

      {/* 4 F2L Pairs rows */}
      <div className="flex flex-col gap-1.5">
        {items.map((item, idx) => {
          const slotBadgeStyle = SLOT_STYLES[item.slot] || 'bg-[#252b2e] text-slate-300 border-[#394144]';
          return (
            <div
              key={item.id}
              className="grid grid-cols-4 items-center px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144]/70 font-mono text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${PAIR_BAR_COLORS[idx % PAIR_BAR_COLORS.length]}`} />
                <span className="font-bold text-white">{item.label}</span>
              </div>

              <div>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border ${slotBadgeStyle}`}>
                  {item.slot}
                </span>
              </div>

              <div className="text-right font-bold text-emerald-400">
                {formatSeconds(item.durationMs)}
              </div>

              <div className="text-right text-[#94a3b8]">
                {item.splitMs !== null ? formatSeconds(item.splitMs) : '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default F2LBreakdownView;
