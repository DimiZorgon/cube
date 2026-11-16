// src/components/SmartCube/SmartCubePbModal.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cross, Paper, Check, ArrowDownBox, Sparkles } from '@getpapillon/papicons';
import { formatSolveTime } from '../../utils/smartCube/chartStats';

/**
 * Formats duration in milliseconds to seconds with 2 decimals (e.g. 1.25s).
 * @param {number|null} ms
 * @returns {string}
 */
function formatSeconds(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '-';
  return `${(ms / 1000).toFixed(2)}s`;
}

export function SmartCubePbModal({ isOpen, onClose, pbSolve, sessionStats, puzzle = '3x3' }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  // Extracted PB metrics
  const effectiveTimeMs = useMemo(() => {
    if (!pbSolve) return null;
    const base = pbSolve.timeMs ?? pbSolve.elapsedMs ?? 0;
    return pbSolve.penalty === '+2' ? base + 2000 : base;
  }, [pbSolve]);

  const bestTimeStr = useMemo(() => {
    if (effectiveTimeMs === null) return '-';
    return formatSolveTime(effectiveTimeMs);
  }, [effectiveTimeMs]);

  const bestAo5Str = useMemo(() => {
    if (sessionStats?.ao5 === null || sessionStats?.ao5 === undefined) return '-';
    if (sessionStats.ao5 === 'DNF') return 'DNF';
    return formatSolveTime(sessionStats.ao5);
  }, [sessionStats]);

  const turns = pbSolve?.moveCount ?? pbSolve?.turns ?? null;
  const tps = pbSolve?.tps ? Number(pbSolve.tps).toFixed(2) : (turns && effectiveTimeMs ? (turns / (effectiveTimeMs / 1000)).toFixed(2) : '-');
  const scramble = pbSolve?.scramble || '';

  const dateStr = useMemo(() => {
    if (!pbSolve) return new Date().toLocaleDateString();
    const ts = pbSolve.timestamp || pbSolve.date;
    return ts ? new Date(ts).toLocaleDateString() : new Date().toLocaleDateString();
  }, [pbSolve]);

  // Phase breakdown splits
  const splits = useMemo(() => {
    const s = pbSolve?.splits || {};
    const getDur = val => {
      if (typeof val === 'number') return val;
      if (typeof val?.durationMs === 'number') return val.durationMs;
      return 0;
    };
    const cross = getDur(s.cross);
    const f2l = getDur(s.f2l);
    const oll = getDur(s.oll);
    const pll = getDur(s.pll);
    const sum = cross + f2l + oll + pll;

    return {
      cross,
      f2l,
      oll,
      pll,
      sum,
      crossPct: sum > 0 ? (cross / sum) * 100 : 25,
      f2lPct: sum > 0 ? (f2l / sum) * 100 : 25,
      ollPct: sum > 0 ? (oll / sum) * 100 : 25,
      pllPct: sum > 0 ? (pll / sum) * 100 : 25,
      f2lBreakdown: s.f2lBreakdown || pbSolve?.f2lBreakdown || null
    };
  }, [pbSolve]);

  // Canvas 2D export drawing
  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pbSolve) return;
    const ctx = canvas.getContext('2d');
    const width = 600;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    // Background gradient (DA Cube Studio)
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#161b1e');
    grad.addColorStop(1, '#22292d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 16);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = '#394144';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Header: CUBE STUDIO
    ctx.fillStyle = '#9eb5aa';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CUBE STUDIO', 30, 42);

    // Header Badge: SMART CUBE 3x3
    ctx.fillStyle = '#2a3337';
    ctx.beginPath();
    ctx.roundRect(width - 150, 24, 120, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SMART CUBE', width - 90, 41);
    ctx.textAlign = 'left';

    // Header divider line
    ctx.strokeStyle = '#2d3539';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 62);
    ctx.lineTo(width - 30, 62);
    ctx.stroke();

    // Central block: SINGLE PB
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SINGLE PB', 30, 86);

    ctx.fillStyle = '#f0f1ed';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(bestTimeStr, 30, 136);

    // Date on the right of big time
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, width - 30, 132);
    ctx.textAlign = 'left';

    // Metrics grid (TURNS, TPS, BEST AO5, SOLVES)
    const colY = 170;
    const cols = [
      { label: 'TURNS', value: turns !== null ? `${turns}` : '-', x: 30 },
      { label: 'TPS', value: tps !== '-' ? `${tps}` : '-', x: 170 },
      { label: 'BEST AO5', value: bestAo5Str, x: 310 },
      { label: 'SOLVES', value: `${sessionStats?.count ?? 1}`, x: 450 }
    ];

    cols.forEach(col => {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(col.label, col.x, colY);

      ctx.fillStyle = '#b9c9bf';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText(col.value, col.x, colY + 22);
    });

    // Divider before CFOP
    ctx.strokeStyle = '#2d3539';
    ctx.beginPath();
    ctx.moveTo(30, 208);
    ctx.lineTo(width - 30, 208);
    ctx.stroke();

    // CFOP Breakdown section
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CFOP BREAKDOWN', 30, 226);

    // Multi-color split bar
    const barX = 30;
    const barY = 236;
    const barW = width - 60;
    const barH = 8;
    const barRadius = 4;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barRadius);
    ctx.clip();

    const phasesConfig = [
      { key: 'cross', color: '#0284c7', pct: splits.crossPct, val: splits.cross, label: 'Cross' },
      { key: 'f2l', color: '#10b981', pct: splits.f2lPct, val: splits.f2l, label: 'F2L' },
      { key: 'oll', color: '#f59e0b', pct: splits.ollPct, val: splits.oll, label: 'OLL' },
      { key: 'pll', color: '#a855f7', pct: splits.pllPct, val: splits.pll, label: 'PLL' }
    ];

    let currentBarX = barX;
    phasesConfig.forEach((p, idx) => {
      const segW = idx === phasesConfig.length - 1
        ? barX + barW - currentBarX
        : (p.pct / 100) * barW;
      ctx.fillStyle = p.color;
      ctx.fillRect(currentBarX, barY, Math.max(0, segW), barH);
      currentBarX += segW;
    });
    ctx.restore();

    // Phase values text below the bar
    const phaseLabelCols = [
      { label: 'C', val: splits.cross, color: '#38bdf8', x: 30 },
      { label: 'F', val: splits.f2l, color: '#34d399', x: 170 },
      { label: 'O', val: splits.oll, color: '#fbbf24', x: 310 },
      { label: 'P', val: splits.pll, color: '#c084fc', x: 450 }
    ];

    phaseLabelCols.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText(`${p.label}:`, p.x, 264);

      ctx.fillStyle = '#f0f1ed';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText(p.val > 0 ? formatSeconds(p.val) : '-', p.x + 20, 264);
    });

    // Divider before footer
    ctx.strokeStyle = '#2d3539';
    ctx.beginPath();
    ctx.moveTo(30, 280);
    ctx.lineTo(width - 30, 280);
    ctx.stroke();

    // Scramble footer and URL (full scramble without truncation)
    ctx.fillStyle = '#64748b';
    if (scramble) {
      const fullText = `Scramble: ${scramble}`;
      const words = fullText.split(/\s+/);
      const maxChars = fullText.length > 130 ? 64 : 58;
      const lines = [];
      let currentLine = '';
      words.forEach(word => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (candidate.length > maxChars && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = candidate;
        }
      });
      if (currentLine) lines.push(currentLine);
      const lineSpacing = lines.length >= 3 ? 11 : 14;
      ctx.font = lines.length >= 3 ? '9px monospace' : '10px monospace';
      lines.forEach((line, idx) => {
        ctx.fillText(line, 30, 298 + idx * lineSpacing);
      });
    }

    ctx.fillStyle = '#9eb5aa';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('cube.noullez.com', width - 30, 342);
    ctx.textAlign = 'left';
  }, [bestTimeStr, bestAo5Str, dateStr, turns, tps, scramble, sessionStats, pbSolve, splits]);

  useEffect(() => {
    if (isOpen && pbSolve) {
      setTimeout(drawCard, 50);
    }
  }, [isOpen, pbSolve, drawCard]);

  if (!isOpen || !pbSolve) return null;

  const handleCopyText = async () => {
    const cfopLine = splits.sum > 0
      ? `🧩 CFOP : C ${formatSeconds(splits.cross)} | F ${formatSeconds(splits.f2l)} | O ${formatSeconds(splits.oll)} | P ${formatSeconds(splits.pll)}`
      : null;

    const text = [
      `🏆 Cube Studio - Record Smart Cube (${puzzle})`,
      `⏱️ Single PB : ${bestTimeStr}`,
      `⚡ Turns : ${turns ?? '-'} | TPS : ${tps}`,
      cfopLine,
      bestAo5Str !== '-' ? `📊 Best Ao5 : ${bestAo5Str}` : null,
      scramble ? `🎲 Scramble : ${scramble}` : null,
      `👉 https://cube.noullez.com/play/smart-cube`
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async blob => {
        if (!blob) return;
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new window.ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 2000);
            return;
          } catch (err) {
            console.warn('ClipboardItem error, downloading fallback:', err);
          }
        }
        handleDownloadImage();
      });
    } catch {
      handleDownloadImage();
    }
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cube-smart-pb.png';
    a.click();
  };

  return (
    <div className="algo-modal-backdrop" onClick={onClose}>
      <div className="pb-card-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pb-card-modal-header">
          <div className="pb-card-modal-title-row">
            <Sparkles size={20} className="pb-card-sparkle-icon" />
            <h3>{t('smartCube.pbCard.title', 'Carte de Record Smart Cube')}</h3>
          </div>
          <button className="algo-modal-close-btn" onClick={onClose} title={t('common.close', 'Fermer')}>
            <Cross size={18} />
          </button>
        </div>

        {/* DOM Visual Card Preview */}
        <div className="pb-card-preview-container">
          <div className="pb-card-visual">
            <div className="pb-card-visual-top">
              <span className="pb-card-brand">CUBE STUDIO</span>
              <span className="pb-card-badge">SMART CUBE</span>
            </div>

            <div className="pb-card-main-stat">
              <span className="pb-card-stat-label">
                {t('smartCube.pbCard.singlePb', 'RECORD PERSONNEL')}
              </span>
              <span className="pb-card-stat-big">{bestTimeStr}</span>
            </div>

            <div className="pb-card-grid">
              <div className="pb-card-grid-item min-w-0">
                <span className="pb-card-sublabel truncate">{t('smartCube.pbCard.turns', 'Mouvements')}</span>
                <span className="pb-card-subval truncate">{turns ?? '-'}</span>
              </div>
              <div className="pb-card-grid-item min-w-0">
                <span className="pb-card-sublabel truncate">{t('smartCube.pbCard.tps', 'TPS')}</span>
                <span className="pb-card-subval truncate">{tps}</span>
              </div>
              <div className="pb-card-grid-item min-w-0">
                <span className="pb-card-sublabel truncate">{t('smartCube.stats.ao5', 'Best Ao5')}</span>
                <span className="pb-card-subval truncate">{bestAo5Str}</span>
              </div>
              <div className="pb-card-grid-item min-w-0">
                <span className="pb-card-sublabel truncate">{t('smartCube.trends.tooltipDate', 'Date')}</span>
                <span className="pb-card-subval text-xs truncate">{dateStr}</span>
              </div>
            </div>

            {/* CFOP Phase breakdown section */}
            <div className="mt-3 pt-3 border-t border-[#2d3539] flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                {t('smartCube.pbCard.cfopBreakdown', 'Décomposition CFOP')}
              </span>
              <div className="w-full h-2 rounded-full bg-[#252b2e] overflow-hidden flex border border-[#394144]/50">
                <div style={{ width: `${splits.crossPct}%` }} className="bg-sky-500 h-full" title="Cross" />
                <div style={{ width: `${splits.f2lPct}%` }} className="bg-emerald-500 h-full" title="F2L" />
                <div style={{ width: `${splits.ollPct}%` }} className="bg-amber-500 h-full" title="OLL" />
                <div style={{ width: `${splits.pllPct}%` }} className="bg-violet-500 h-full" title="PLL" />
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-center">
                <div className="px-1 py-0.5 rounded bg-[#252b2e] border border-[#394144]/60">
                  <span className="text-sky-400 font-bold">C: </span>
                  <span className="text-white">{formatSeconds(splits.cross)}</span>
                </div>
                <div className="px-1 py-0.5 rounded bg-[#252b2e] border border-[#394144]/60">
                  <span className="text-emerald-400 font-bold">F: </span>
                  <span className="text-white">{formatSeconds(splits.f2l)}</span>
                </div>
                <div className="px-1 py-0.5 rounded bg-[#252b2e] border border-[#394144]/60">
                  <span className="text-amber-400 font-bold">O: </span>
                  <span className="text-white">{formatSeconds(splits.oll)}</span>
                </div>
                <div className="px-1 py-0.5 rounded bg-[#252b2e] border border-[#394144]/60">
                  <span className="text-violet-400 font-bold">P: </span>
                  <span className="text-white">{formatSeconds(splits.pll)}</span>
                </div>
              </div>
            </div>

            {scramble && (
              <div className="pb-card-scramble-footer">
                <span className="pb-card-scramble-text">Scramble: {scramble}</span>
              </div>
            )}
          </div>
        </div>

        {/* Offscreen high-res Canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} width={600} height={360} />

        {/* Actions */}
        <div className="pb-card-actions">
          <button className="pb-card-action-btn" onClick={handleCopyText} type="button">
            {copiedText ? <Check size={16} /> : <Paper size={16} />}
            <span>
              {copiedText
                ? t('smartCube.pbCard.textCopied', 'Texte copié !')
                : t('smartCube.pbCard.copyText', 'Copier le texte')}
            </span>
          </button>
          <button className="pb-card-action-btn primary" onClick={handleCopyImage} type="button">
            {copiedImage ? <Check size={16} /> : <Sparkles size={16} />}
            <span>
              {copiedImage
                ? t('smartCube.pbCard.copied', 'Image copiée !')
                : t('smartCube.pbCard.copyImage', "Copier l'image")}
            </span>
          </button>
          <button className="pb-card-action-btn" onClick={handleDownloadImage} type="button">
            <ArrowDownBox size={16} />
            <span>{t('smartCube.pbCard.downloadImage', 'Télécharger PNG')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SmartCubePbModal;
