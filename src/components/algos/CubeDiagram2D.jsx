// src/components/algos/CubeDiagram2D.jsx
import React, { useMemo } from 'react';
import { createCaseCubies, getStickerColor } from '../../utils/algoParser';

export function CubeDiagram2D({
  size = 3,
  alg = '',
  setup = null,
  yellowTop = true,
  maskMode = 'full',
  view = 'top', // 'top' | 'iso'
  arrows = [],
  width = 135,
  height = 135
}) {
  const cubies = useMemo(
    () => createCaseCubies({ size, alg, setup, yellowTop, maskMode, applySetup: true }),
    [size, alg, setup, yellowTop, maskMode]
  );

  const coords = size === 2 ? [-0.5, 0.5] : [-1, 0, 1];
  const outer = size === 2 ? 0.5 : 1;

  if (view === 'iso') {
    // Sommet central (cx, cy) = coin Avant-Haut-Droit (+X, +Y, +Z)
    const cx = 70;
    const cy = 70;
    const n = size;
    const scale = size === 2 ? 29 : 19.5;
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);

    // u : de Droite (+X, u=0) vers Gauche (-X, u=n) -> haut-gauche
    // w : de Avant (+Z, w=0) vers Arrière (-Z, w=n) -> haut-droite
    // v : de Haut (+Y, v=0) vers Bas (-Y, v=n) -> bas vertical
    const projectIso = (u, v, w) => ({
      x: cx + (w - u) * cos30 * scale,
      y: cy - (u + w) * sin30 * scale + v * scale
    });

    const polyPoints = pts => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const topPolys = [];
    const frontPolys = [];
    const rightPolys = [];

    // Face U (Haut, y = +outer, v = 0)
    for (let zi = 0; zi < n; zi++) {
      for (let xi = 0; xi < n; xi++) {
        const xVal = coords[xi];
        const zVal = coords[zi];
        const color = getStickerColor(cubies, xVal, outer, zVal, 0, 1, 0);
        const u0 = n - 1 - xi;
        const u1 = n - xi;
        const w0 = n - 1 - zi;
        const w1 = n - zi;
        const pts = [
          projectIso(u0, 0, w0),
          projectIso(u1, 0, w0),
          projectIso(u1, 0, w1),
          projectIso(u0, 0, w1)
        ];
        topPolys.push({ key: `U_${xi}_${zi}`, points: polyPoints(pts), color });
      }
    }

    // Face F (Avant, z = +outer, w = 0)
    for (let yi = 0; yi < n; yi++) {
      for (let xi = 0; xi < n; xi++) {
        const xVal = coords[xi];
        const yVal = coords[n - 1 - yi];
        const color = getStickerColor(cubies, xVal, yVal, outer, 0, 0, 1);
        const u0 = n - 1 - xi;
        const u1 = n - xi;
        const v0 = yi;
        const v1 = yi + 1;
        const pts = [
          projectIso(u0, v0, 0),
          projectIso(u1, v0, 0),
          projectIso(u1, v1, 0),
          projectIso(u0, v1, 0)
        ];
        frontPolys.push({ key: `F_${xi}_${yi}`, points: polyPoints(pts), color });
      }
    }

    // Face R (Droite, x = +outer, u = 0)
    for (let yi = 0; yi < n; yi++) {
      for (let zi = 0; zi < n; zi++) {
        const zVal = coords[zi];
        const yVal = coords[n - 1 - yi];
        const color = getStickerColor(cubies, outer, yVal, zVal, 1, 0, 0);
        const w0 = n - 1 - zi;
        const w1 = n - zi;
        const v0 = yi;
        const v1 = yi + 1;
        const pts = [
          projectIso(0, v0, w0),
          projectIso(0, v0, w1),
          projectIso(0, v1, w1),
          projectIso(0, v1, w0)
        ];
        rightPolys.push({ key: `R_${zi}_${yi}`, points: polyPoints(pts), color });
      }
    }

    return (
      <svg width={width} height={height} viewBox="0 0 140 140" className="cube-svg-diagram">
        {topPolys.map(p => (
          <polygon key={p.key} points={p.points} fill={p.color} stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        ))}
        {frontPolys.map(p => (
          <polygon key={p.key} points={p.points} fill={p.color} stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        ))}
        {rightPolys.map(p => (
          <polygon key={p.key} points={p.points} fill={p.color} stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        ))}
      </svg>
    );
  }

  // Vue du dessus ('top') pour OLL / PLL / PBL
  const n = size;
  const pad = 20;
  const cellSize = (140 - pad * 2) / n;
  const sideThick = 11;

  const getCellCenter = (row, col) => ({
    x: pad + col * cellSize + cellSize / 2,
    y: pad + row * cellSize + cellSize / 2
  });

  const markerId = `arrow_${Math.random().toString(36).slice(2, 9)}`;  return ( <svg width={width} height={height} viewBox="0 0 140 140" className="cube-svg-diagram"> <defs> <marker id={`${markerId}_end`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#111" />
        </marker>
      </defs>

      {coords.map((xVal, col) => {
        const backColor = getStickerColor(cubies, xVal, outer, -outer, 0, 0, -1);
        const frontColor = getStickerColor(cubies, xVal, outer, outer, 0, 0, 1);
        return (
          <React.Fragment key={`tb_${col}`}> <rect x={pad + col * cellSize} y={pad - sideThick - 2} width={cellSize} height={sideThick} fill={backColor} stroke="#111" strokeWidth="1.8" /> <rect x={pad + col * cellSize} y={pad + n * cellSize + 2} width={cellSize} height={sideThick} fill={frontColor} stroke="#111" strokeWidth="1.8" /> </React.Fragment> ); })}  {coords.map((zVal, row) => { const leftColor = getStickerColor(cubies, -outer, outer, zVal, -1, 0, 0); const rightColor = getStickerColor(cubies, outer, outer, zVal, 1, 0, 0); return ( <React.Fragment key={`lr_${row}`}>
            <rect
              x={pad - sideThick - 2}
              y={pad + row * cellSize}
              width={sideThick}
              height={cellSize}
              fill={leftColor}
              stroke="#111"
              strokeWidth="1.8"
            />
            <rect
              x={pad + n * cellSize + 2}
              y={pad + row * cellSize}
              width={sideThick}
              height={cellSize}
              fill={rightColor}
              stroke="#111"
              strokeWidth="1.8"
            />
          </React.Fragment>
        );
      })}

      {coords.map((zVal, row) =>
        coords.map((xVal, col) => {
          const topColor = getStickerColor(cubies, xVal, outer, zVal, 0, 1, 0);
          return (
            <rect
              key={`u_${row}_${col}`}
              x={pad + col * cellSize}
              y={pad + row * cellSize}
              width={cellSize}
              height={cellSize}
              fill={topColor}
              stroke="#111"
              strokeWidth="2.2"
            />
          );
        })
      )}

      {arrows.map((arr, idx) => {
        const p1 = getCellCenter(arr.from[0], arr.from[1]);
        const p2 = getCellCenter(arr.to[0], arr.to[1]);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const shrinkStart = arr.bi ? 7 : 4;
        const shrinkEnd = 7;

        const x1 = p1.x + (dx / len) * shrinkStart;
        const y1 = p1.y + (dy / len) * shrinkStart;
        const x2 = p2.x - (dx / len) * shrinkEnd;
        const y2 = p2.y - (dy / len) * shrinkEnd;

        return (
          <line
            key={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#111"
            strokeWidth="3.2"
            strokeLinecap="round"
            markerEnd={`url(#${markerId}_end)`} markerStart={arr.bi ? `url(#${markerId}_end)` : undefined}
          />
        );
      })}
    </svg>
  );
}