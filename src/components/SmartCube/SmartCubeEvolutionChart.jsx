// src/components/SmartCube/SmartCubeEvolutionChart.jsx
import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  computeEvolutionChartData,
  formatSolveTime,
  formatChartTimestamp
} from '../../utils/smartCube/chartStats';

/**
 * Format deltas with explicit +/- sign.
 * @param {number|null} deltaMs
 * @returns {string}
 */
function formatDelta(deltaMs) {
  if (deltaMs === null || deltaMs === undefined) return '-';
  const sec = (deltaMs / 1000).toFixed(2);
  return deltaMs > 0 ? `+${sec}s` : `${sec}s`;
}

const RANGE_OPTIONS = [
  { value: 50, key: 'smartCube.trends.last50', fallback: 'Derniers 50' },
  { value: 100, key: 'smartCube.trends.last100', fallback: 'Derniers 100' },
  { value: 200, key: 'smartCube.trends.last200', fallback: 'Derniers 200' },
  { value: 'all', key: 'smartCube.trends.rangeAll', fallback: 'Tout' }
];

export function SmartCubeEvolutionChart({ sessionSolves = [] }) {
  const { t } = useTranslation();
  const [rangeLimit, setRangeLimit] = useState(50);
  const [visibleSeries, setVisibleSeries] = useState({
    single: true,
    pb: true,
    ao5: true,
    ao12: true
  });
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const svgRef = useRef(null);

  const toggleSeries = (key) => {
    setVisibleSeries(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.single && !next.pb && !next.ao5 && !next.ao12) {
        return prev;
      }
      return next;
    });
  };

  // Compute aggregated chart points over the entire session first (so rolling Ao5/Ao12/PB are exact)
  const allData = useMemo(() => {
    return computeEvolutionChartData(sessionSolves, 'count');
  }, [sessionSolves]);

  // Slice to selected range
  const data = useMemo(() => {
    if (rangeLimit === 'all' || allData.length <= rangeLimit) return allData;
    return allData.slice(-rangeLimit);
  }, [allData, rangeLimit]);

  // Extract all valid numeric curve points for Y-axis scaling
  const validValues = useMemo(() => {
    const vals = [];
    for (const d of data) {
      if (visibleSeries.single && d.timeMs !== null && typeof d.timeMs === 'number') vals.push(d.timeMs);
      if (visibleSeries.pb && d.pbMs !== null && typeof d.pbMs === 'number') vals.push(d.pbMs);
      if (visibleSeries.ao5 && d.ao5Ms !== null && typeof d.ao5Ms === 'number') vals.push(d.ao5Ms);
      if (visibleSeries.ao12 && d.ao12Ms !== null && typeof d.ao12Ms === 'number') vals.push(d.ao12Ms);
    }
    if (vals.length === 0) {
      for (const d of data) {
        if (d.timeMs !== null && typeof d.timeMs === 'number') vals.push(d.timeMs);
        if (d.pbMs !== null && typeof d.pbMs === 'number') vals.push(d.pbMs);
      }
    }
    return vals;
  }, [data, visibleSeries]);

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const margin = { top: 20, right: 20, bottom: 32, left: 52 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Y-Scale calculations
  const { yMin, ySpan } = useMemo(() => {
    if (validValues.length === 0) {
      return { yMin: 0, yMax: 10000, ySpan: 10000 };
    }
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    if (min === max) {
      const padding = Math.max(1000, min * 0.2);
      return {
        yMin: Math.max(0, min - padding),
        yMax: min + padding,
        ySpan: padding * 2
      };
    }
    const rawSpan = max - min;
    const padding = rawSpan * 0.12;
    const computedMin = Math.max(0, Math.floor(min - padding));
    const computedMax = Math.ceil(max + padding);
    return {
      yMin: computedMin,
      yMax: computedMax,
      ySpan: Math.max(100, computedMax - computedMin)
    };
  }, [validValues]);

  // Coordinate mappers (X-axis strictly by solve count)
  const getY = useMemo(() => {
    return (val) => {
      if (val === null || val === undefined || isNaN(val)) return null;
      const normalized = (val - yMin) / ySpan;
      return margin.top + plotHeight - normalized * plotHeight;
    };
  }, [yMin, ySpan, margin.top, plotHeight]);

  const getX = useMemo(() => {
    const count = data.length;
    if (count <= 1) {
      return () => margin.left + plotWidth / 2;
    }
    return (idx) => margin.left + (idx / (count - 1)) * plotWidth;
  }, [data.length, margin.left, plotWidth]);

  // Generate polyline points strings
  const singlePoints = useMemo(() => {
    if (!visibleSeries.single) return '';
    const pts = [];
    data.forEach((d, i) => {
      if (d.timeMs !== null) {
        const x = getX(i);
        const y = getY(d.timeMs);
        if (x !== null && y !== null) pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }, [data, getX, getY, visibleSeries.single]);

  const pbPoints = useMemo(() => {
    if (!visibleSeries.pb) return '';
    const pts = [];
    data.forEach((d, i) => {
      if (d.pbMs !== null) {
        const x = getX(i);
        const y = getY(d.pbMs);
        if (x !== null && y !== null) pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }, [data, getX, getY, visibleSeries.pb]);

  const ao5Points = useMemo(() => {
    if (!visibleSeries.ao5) return '';
    const pts = [];
    data.forEach((d, i) => {
      if (d.ao5Ms !== null) {
        const x = getX(i);
        const y = getY(d.ao5Ms);
        if (x !== null && y !== null) pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }, [data, getX, getY, visibleSeries.ao5]);

  const ao12Points = useMemo(() => {
    if (!visibleSeries.ao12) return '';
    const pts = [];
    data.forEach((d, i) => {
      if (d.ao12Ms !== null) {
        const x = getX(i);
        const y = getY(d.ao12Ms);
        if (x !== null && y !== null) pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }, [data, getX, getY, visibleSeries.ao12]);

  // Y-axis grid ticks (4 horizontal lines)
  const yTicks = useMemo(() => {
    return [0, 0.333, 0.666, 1].map(frac => {
      const val = yMin + frac * ySpan;
      const y = margin.top + plotHeight - frac * plotHeight;
      return { val, y };
    });
  }, [yMin, ySpan, margin.top, plotHeight]);

  // X-axis tick points (strictly by solve number #N)
  const xTicks = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length === 1) {
      return [{ index: 0, x: getX(0), label: `#${data[0].solveNumber}` }];
    }
    const maxTicks = Math.min(5, data.length);
    const step = (data.length - 1) / (maxTicks - 1);
    const ticks = [];
    for (let i = 0; i < maxTicks; i++) {
      const idx = Math.min(data.length - 1, Math.round(i * step));
      if (!ticks.some(tk => tk.index === idx)) {
        const d = data[idx];
        ticks.push({ index: idx, x: getX(idx), label: `#${d.solveNumber}` });
      }
    }
    return ticks;
  }, [data, getX]);

  // Pointer event handler for interactive hover
  const handlePointerMove = (e) => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const svgX = clientX * scaleX;

    // Find the closest data index along X
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const x = getX(i);
      const diff = Math.abs(x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIndex(closestIdx);
  };

  const handlePointerLeave = () => {
    setHoveredIndex(null);
  };

  // Hover point metrics
  const hoveredPoint = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;
  const hoveredSvgX = hoveredIndex !== null && hoveredPoint ? getX(hoveredIndex) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Top Legend & Interactive Series Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
          {t('smartCube.trends.bySolve', '# Résolution')}
        </span>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => toggleSeries('single')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              visibleSeries.single
                ? 'bg-[#252b2e] border-[#38bdf8]/60 text-white'
                : 'bg-[#1b2023] border-[#394144] text-slate-500'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" />
            <span>{t('smartCube.trends.single', 'Une fois')}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('pb')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              visibleSeries.pb
                ? 'bg-[#252b2e] border-[#34d399]/60 text-white'
                : 'bg-[#1b2023] border-[#394144] text-slate-500'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-[#34d399]" />
            <span>{t('smartCube.trends.pb', 'PB')}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('ao5')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              visibleSeries.ao5
                ? 'bg-[#252b2e] border-[#fbbf24]/60 text-white'
                : 'bg-[#1b2023] border-[#394144] text-slate-500'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-[#fbbf24]" />
            <span>{t('smartCube.trends.ao5', 'AO5')}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('ao12')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              visibleSeries.ao12
                ? 'bg-[#252b2e] border-[#c084fc]/60 text-white'
                : 'bg-[#1b2023] border-[#394144] text-slate-500'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-[#c084fc]" />
            <span>{t('smartCube.trends.ao12', 'AO12')}</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas & Tooltip Container */}
      {data.length < 2 ? (
        <div className="text-xs text-[#64748b] italic py-8 text-center bg-[#252b2e] rounded-xl border border-[#394144]">
          {t('smartCube.trends.empty', 'Enregistrez au moins 2 résolutions pour afficher la courbe d’évolution.')}
        </div>
      ) : validValues.length === 0 ? (
        <div className="text-xs text-[#64748b] py-8 text-center bg-[#252b2e] rounded-xl border border-[#394144]">
          {t('smartCube.trends.notEnoughValid', 'Pas assez de temps valides')}
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 sm:h-56 bg-[#252b2e] rounded-xl border border-[#394144] select-none touch-none"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            {/* Horizontal Grid lines and Y labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={tick.y}
                  x2={svgWidth - margin.right}
                  y2={tick.y}
                  stroke="#333f44"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={margin.left - 8}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatSolveTime(tick.val)}
                </text>
              </g>
            ))}

            {/* X-axis tick labels */}
            {xTicks.map((tick, i) => (
              <g key={i}>
                <text
                  x={tick.x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Curves */}
            {/* 1. Single Solves Curve */}
            {singlePoints && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={singlePoints}
              />
            )}

            {/* 2. Progressive PB Curve */}
            {pbPoints && (
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pbPoints}
              />
            )}

            {/* 3. Rolling Ao5 Curve */}
            {ao5Points && (
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 2"
                points={ao5Points}
              />
            )}

            {/* 4. Rolling Ao12 Curve */}
            {ao12Points && (
              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 3"
                points={ao12Points}
              />
            )}

            {/* Hover Crosshair and point dots */}
            {hoveredPoint && (
              <g>
                {/* Vertical crosshair */}
                <line
                  x1={hoveredSvgX}
                  y1={margin.top}
                  x2={hoveredSvgX}
                  y2={margin.top + plotHeight}
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />

                {/* Point dot on Single */}
                {visibleSeries.single && hoveredPoint.timeMs !== null && (
                  <circle
                    cx={hoveredSvgX}
                    cy={getY(hoveredPoint.timeMs)}
                    r="4.5"
                    fill="#38bdf8"
                    stroke="#161b1e"
                    strokeWidth="2"
                  />
                )}

                {/* Point dot on PB */}
                {visibleSeries.pb && hoveredPoint.pbMs !== null && (
                  <circle
                    cx={hoveredSvgX}
                    cy={getY(hoveredPoint.pbMs)}
                    r="3.5"
                    fill="#34d399"
                    stroke="#161b1e"
                    strokeWidth="1.5"
                  />
                )}

                {/* Point dot on Ao5 */}
                {visibleSeries.ao5 && hoveredPoint.ao5Ms !== null && (
                  <circle
                    cx={hoveredSvgX}
                    cy={getY(hoveredPoint.ao5Ms)}
                    r="3.5"
                    fill="#fbbf24"
                    stroke="#161b1e"
                    strokeWidth="1.5"
                  />
                )}

                {/* Point dot on Ao12 */}
                {visibleSeries.ao12 && hoveredPoint.ao12Ms !== null && (
                  <circle
                    cx={hoveredSvgX}
                    cy={getY(hoveredPoint.ao12Ms)}
                    r="3.5"
                    fill="#c084fc"
                    stroke="#161b1e"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            )}

            {/* Invisible overlay for pointer tracking across full plot */}
            <rect
              x={margin.left}
              y={margin.top}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              className="cursor-crosshair"
            />
          </svg>

          {/* Interactive Hover Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="absolute z-20 pointer-events-none p-2.5 rounded-lg bg-[#161b1e]/95 border border-[#41494c] shadow-xl backdrop-blur-sm text-xs font-sans text-slate-200 flex flex-col gap-1 min-w-[190px]"
              style={{
                top: '12px',
                left: hoveredSvgX > svgWidth * 0.55 ? '16px' : 'auto',
                right: hoveredSvgX > svgWidth * 0.55 ? 'auto' : '16px'
              }}
            >
              <div className="flex items-center justify-between border-b border-[#394144] pb-1 text-[11px]">
                <span className="font-bold text-[#9eb5aa]">
                  {t('smartCube.history.solveNumber', { number: hoveredPoint.solveNumber })}
                </span>
                <span className="text-[#94a3b8] font-mono text-[10px]">
                  {formatChartTimestamp(hoveredPoint.timestamp, 'short')}
                </span>
              </div>

              {/* Solve Time & Penalty */}
              <div className="flex items-center justify-between font-mono pt-0.5">
                <span className="text-[#94a3b8]">{t('smartCube.trends.single', 'Une fois')}:</span>
                <span className="font-bold text-base text-white">
                  {hoveredPoint.formattedTime}
                  {hoveredPoint.penalty === '+2' && <span className="text-amber-400 text-xs ml-1">+2</span>}
                </span>
              </div>

              {/* PB & Rolling Averages */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono border-t border-[#2d3539] pt-1">
                <div className="flex justify-between">
                  <span className="text-emerald-400">PB:</span>
                  <span>{hoveredPoint.formattedPb}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">Ao5:</span>
                  <span>{hoveredPoint.formattedAo5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">Ao12:</span>
                  <span>{hoveredPoint.formattedAo12}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-300">TPS:</span>
                  <span>{hoveredPoint.tps ? Number(hoveredPoint.tps).toFixed(2) : '-'}</span>
                </div>
              </div>

              {/* Deltas vs Previous & vs PB */}
              <div className="flex items-center justify-between text-[11px] font-mono border-t border-[#2d3539] pt-1">
                <div className="flex items-center gap-1">
                  <span className="text-[#94a3b8]">{t('smartCube.trends.deltaPrev', 'vs préc')}:</span>
                  <span className={`font-bold ${
                    hoveredPoint.deltaPrev === null ? 'text-slate-400' :
                    hoveredPoint.deltaPrev <= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatDelta(hoveredPoint.deltaPrev)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#94a3b8]">{t('smartCube.trends.deltaPb', 'vs PB')}:</span>
                  <span className={`font-bold ${
                    hoveredPoint.deltaPb === null ? 'text-slate-400' :
                    hoveredPoint.deltaPb === 0 ? 'text-yellow-300' : 'text-amber-400'
                  }`}>
                    {hoveredPoint.deltaPb === 0 ? 'PB!' : formatDelta(hoveredPoint.deltaPb)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Range Selector: Derniers 50 | Derniers 100 | Derniers 200 | Tout */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#1b2023] p-1 rounded-xl border border-[#394144]">
        {RANGE_OPTIONS.map(opt => {
          const isActive = rangeLimit === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                setRangeLimit(opt.value);
                setHoveredIndex(null);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center ${
                isActive
                  ? 'bg-[#9eb5aa] text-[#1b2023]'
                  : 'text-slate-300 hover:text-white hover:bg-[#252b2e]'
              }`}
            >
              {t(opt.key, opt.fallback)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SmartCubeEvolutionChart;
