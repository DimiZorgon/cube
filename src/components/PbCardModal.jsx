// src/components/PbCardModal.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Cross, Paper, Check, ArrowDownBox, Sparkles } from '@getpapillon/papicons';
import { formatTimerValue } from '../utils/timerUtils';

export function PbCardModal({ isOpen, onClose, puzzle, stats, latestSolve }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const bestTime = stats?.best?.time !== null && stats?.best?.time !== undefined
    ? formatTimerValue(stats.best.time)
    : '-';
  const bestAo5 = stats?.best?.ao5 !== null && stats?.best?.ao5 !== undefined
    ? (stats.best.ao5 === 'DNF' ? 'DNF' : formatTimerValue(stats.best.ao5))
    : '-';
  const bestAo12 = stats?.best?.ao12 !== null && stats?.best?.ao12 !== undefined
    ? (stats.best.ao12 === 'DNF' ? 'DNF' : formatTimerValue(stats.best.ao12))
    : '-';

  const scramble = latestSolve?.scramble || '';
  const dateStr = new Date().toLocaleDateString();

  // Dessin sur Canvas pour l'export image PNG
  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 600;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    // Fond dégradé sombre DA Cube Studio
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#161b1e');
    grad.addColorStop(1, '#22292d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 16);
    ctx.fill();

    // Bordure subtile
    ctx.strokeStyle = '#394144';
    ctx.lineWidth = 2;
    ctx.stroke();

    // En-tête : CUBE STUDIO + Puzzle
    ctx.fillStyle = '#9eb5aa';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CUBE STUDIO', 30, 45);

    // Badge puzzle à droite
    ctx.fillStyle = '#2a3337';
    ctx.beginPath();
    ctx.roundRect(width - 140, 26, 110, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${puzzle} WCA`, width - 85, 45);
    ctx.textAlign = 'left';

    // Ligne séparatrice
    ctx.strokeStyle = '#2d3539';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 68);
    ctx.lineTo(width - 30, 68);
    ctx.stroke();

    // Bloc central : SINGLE PB
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SINGLE PB', 30, 102);

    ctx.fillStyle = '#f0f1ed';
    ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(bestTime, 30, 158);

    // Grille métriques : Ao5, Ao12, Solves
    const colY = 220;
    const cols = [
      { label: 'BEST AO5', value: bestAo5, x: 30 },
      { label: 'BEST AO12', value: bestAo12, x: 190 },
      { label: 'SOLVES', value: `${stats?.validCount || 0}/${stats?.totalCount || 0}`, x: 350 },
      { label: 'DATE', value: dateStr, x: 470 }
    ];

    cols.forEach(col => {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(col.label, col.x, colY);

      ctx.fillStyle = '#b9c9bf';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText(col.value, col.x, colY + 30);
    });

    // Ligne séparatrice basse
    ctx.strokeStyle = '#2d3539';
    ctx.beginPath();
    ctx.moveTo(30, 285);
    ctx.lineTo(width - 30, 285);
    ctx.stroke();

    // Pied de carte : Scramble tronqué & URL
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    const cleanScramble = scramble.length > 55 ? scramble.slice(0, 52) + '...' : scramble;
    ctx.fillText(cleanScramble ? `Scramble: ${cleanScramble}` : '', 30, 315);

    ctx.fillStyle = '#9eb5aa';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('cube.noullez.com', width - 30, 315);
    ctx.textAlign = 'left';
  }, [bestTime, bestAo5, bestAo12, stats, puzzle, scramble, dateStr]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCard, 50);
    }
  }, [isOpen, drawCard]);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    const text = [
      `🏆 Cube Studio - Record Personnel (${puzzle})`,
      `⏱️ Single PB : ${bestTime}`,
      `📊 Best Ao5 : ${bestAo5} | Best Ao12 : ${bestAo12}`,
      stats?.validCount ? `🎯 Solves : ${stats.validCount}` : null,
      scramble ? `🎲 Scramble : ${scramble}` : null,
      `👉 https://cube.noullez.com/timer`
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
    a.download = `cube-studio-pb-${puzzle}.png`;
    a.click();
  };

  return (
    <div className="algo-modal-backdrop" onClick={onClose}>
      <div className="pb-card-modal-content" onClick={e => e.stopPropagation()}>
        <div className="pb-card-modal-header">
          <div className="pb-card-modal-title-row">
            <Sparkles size={20} className="pb-card-sparkle-icon" />
            <h3>{t('timer.pbCard.title', { defaultValue: 'Carte de Record (PB)' })}</h3>
          </div>
          <button className="algo-modal-close-btn" onClick={onClose} title={t('common.close')}>
            <Cross size={18} />
          </button>
        </div>

        {/* Aperçu visuel de la carte */}
        <div className="pb-card-preview-container">
          <div className="pb-card-visual">
            <div className="pb-card-visual-top">
              <span className="pb-card-brand">CUBE STUDIO</span>
              <span className="pb-card-badge">{puzzle} WCA</span>
            </div>

            <div className="pb-card-main-stat">
              <span className="pb-card-stat-label">
                {t('timer.pbCard.singlePb', { defaultValue: 'SINGLE PB' })}
              </span>
              <span className="pb-card-stat-big">{bestTime}</span>
            </div>

            <div className="pb-card-grid">
              <div className="pb-card-grid-item">
                <span className="pb-card-sublabel">
                  {t('timer.pbCard.bestAo5', { defaultValue: 'BEST AO5' })}
                </span>
                <span className="pb-card-subval">{bestAo5}</span>
              </div>
              <div className="pb-card-grid-item">
                <span className="pb-card-sublabel">
                  {t('timer.pbCard.bestAo12', { defaultValue: 'BEST AO12' })}
                </span>
                <span className="pb-card-subval">{bestAo12}</span>
              </div>
              <div className="pb-card-grid-item">
                <span className="pb-card-sublabel">
                  {t('timer.pbCard.totalSolves', { defaultValue: 'SOLVES' })}
                </span>
                <span className="pb-card-subval">
                  {stats?.validCount || 0}/{stats?.totalCount || 0}
                </span>
              </div>
            </div>

            {scramble && (
              <div className="pb-card-scramble-footer">
                <span className="pb-card-scramble-text">Scramble: {scramble}</span>
              </div>
            )}
          </div>
        </div>

        {/* Canvas masqué pour le rendu PNG haute fidélité */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Boutons d'action */}
        <div className="pb-card-actions">
          <button className="pb-card-action-btn" onClick={handleCopyText}>
            {copiedText ? <Check size={16} /> : <Paper size={16} />}
            <span>
              {copiedText
                ? t('timer.pbCard.copied', { defaultValue: 'Copié !' })
                : t('timer.pbCard.copyText', { defaultValue: 'Copier le texte' })}
            </span>
          </button>
          <button className="pb-card-action-btn primary" onClick={handleCopyImage}>
            {copiedImage ? <Check size={16} /> : <Sparkles size={16} />}
            <span>
              {copiedImage
                ? t('timer.pbCard.copied', { defaultValue: 'Image copiée !' })
                : t('timer.pbCard.copyImage', { defaultValue: "Copier l'image" })}
            </span>
          </button>
          <button className="pb-card-action-btn" onClick={handleDownloadImage}>
            <ArrowDownBox size={16} />
            <span>{t('timer.pbCard.downloadImage', { defaultValue: 'Télécharger PNG' })}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
