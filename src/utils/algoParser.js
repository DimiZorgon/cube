// src/utils/algoParser.js
import * as THREE from 'three';
import { generateInitialCubies } from './cubeMath';

export const STANDARD_COLORS = {
  right: '#B71234',  // Rouge (+X)
  left: '#ff9900',   // Orange (-X)
  up: '#FFFFFF',     // Blanc (+Y)
  down: '#fbff00',   // Jaune (-Y)
  front: '#009B48',  // Vert (+Z)
  back: '#0003ad',   // Bleu (-Z)
  core: '#1C1C1C',   // Noir interne
  grey: '#525866'    // Facette grisée
};

const LOCAL_NORMALS = [
  new THREE.Vector3(1, 0, 0),  // 0: +X (right)
  new THREE.Vector3(-1, 0, 0), // 1: -X (left)
  new THREE.Vector3(0, 1, 0),  // 2: +Y (up)
  new THREE.Vector3(0, -1, 0), // 3: -Y (down)
  new THREE.Vector3(0, 0, 1),  // 4: +Z (front)
  new THREE.Vector3(0, 0, -1)  // 5: -Z (back)
];

export function parseAlgoTokens(algString) {
  if (!algString) return [];
  const normalized = algString.replace(/[’‘`]/g, "'").trim();
  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const tokens = [];
  let inBrackets = false;

  for (const raw of rawTokens) {
    if (raw.includes('[')) inBrackets = true;
    const cleanMove = raw.replace(/[()[\]]/g, '');
    if (cleanMove) {
      tokens.push({
        display: raw,
        move: cleanMove,
        isOptional: inBrackets
      });
    }
    if (raw.includes(']')) inBrackets = false;
  }
  return tokens;
}

export function invertSingleMove(move) {
  if (!move) return '';
  if (move.endsWith("2'") || move.endsWith('2')) {
    return move.replace("2'", '2');
  }
  if (move.endsWith("'")) {
    return move.slice(0, -1);
  }
  return `${move}'`;
}

export function invertAlgo(algString, includeOptional = false) {
  const tokens = parseAlgoTokens(algString).filter(t => includeOptional || !t.isOptional);
  return tokens
    .slice()
    .reverse()
    .map(t => invertSingleMove(t.move))
    .join(' ');
}

export function getMoveParams(move, size = 3) {
  if (!move) return null;
  const isDouble = move.includes('2');
  const isPrime = move.includes("'");
  const base = move.replace(/[2']/g, '');

  const outer = size === 2 ? 0.5 : 1;
  const allLayers = size === 2 ? [-0.5, 0.5] : [-1, 0, 1];
  const widePos = size === 2 ? [0.5] : [1, 0];
  const wideNeg = size === 2 ? [-0.5] : [-1, 0];

  let axis = 'y';
  let value = [outer];
  let baseDir = 1;

  switch (base) {
    case 'R': axis = 'x'; value = [outer]; baseDir = 1; break;
    case 'L': axis = 'x'; value = [-outer]; baseDir = -1; break;
    case 'U': axis = 'y'; value = [outer]; baseDir = 1; break;
    case 'D': axis = 'y'; value = [-outer]; baseDir = -1; break;
    case 'F': axis = 'z'; value = [outer]; baseDir = 1; break;
    case 'B': axis = 'z'; value = [-outer]; baseDir = -1; break;

    case 'r':
    case 'Rw': axis = 'x'; value = widePos; baseDir = 1; break;
    case 'l':
    case 'Lw': axis = 'x'; value = wideNeg; baseDir = -1; break;
    case 'u':
    case 'Uw': axis = 'y'; value = widePos; baseDir = 1; break;
    case 'd':
    case 'Dw': axis = 'y'; value = wideNeg; baseDir = -1; break;
    case 'f':
    case 'Fw': axis = 'z'; value = widePos; baseDir = 1; break;
    case 'b':
    case 'Bw': axis = 'z'; value = wideNeg; baseDir = -1; break;

    case 'M': axis = 'x'; value = [0]; baseDir = -1; break;
    case 'E': axis = 'y'; value = [0]; baseDir = -1; break;
    case 'S': axis = 'z'; value = [0]; baseDir = 1; break;

    case 'x': axis = 'x'; value = allLayers; baseDir = 1; break;
    case 'y': axis = 'y'; value = allLayers; baseDir = 1; break;
    case 'z': axis = 'z'; value = allLayers; baseDir = 1; break;
    default:
      return null;
  }

  const direction = isPrime ? -baseDir : baseDir;
  const quarterTurns = isDouble ? 2 : 1;

  return { axis, value, direction, quarterTurns };
}

export function applyQuarterTurn(cubies, axis, value, direction) {
  const dicoAxis = { x: 0, y: 1, z: 2 };
  const axisVector = new THREE.Vector3(
    axis === 'x' ? 1 : 0,
    axis === 'y' ? 1 : 0,
    axis === 'z' ? 1 : 0
  );

  return cubies.map(c => {
    const pos = c.position[dicoAxis[axis]];
    const isMoving = value.some(v => Math.abs(pos - v) < 0.1);
    if (!isMoving) return c;

    const dummy = new THREE.Object3D();
    dummy.position.set(...c.position);
    dummy.rotation.set(...c.rotation);
    dummy.position.applyAxisAngle(axisVector, -direction * (Math.PI / 2));
    dummy.position.x = Math.round(dummy.position.x * 2) / 2;
    dummy.position.y = Math.round(dummy.position.y * 2) / 2;
    dummy.position.z = Math.round(dummy.position.z * 2) / 2;
    dummy.rotateOnWorldAxis(axisVector, -direction * (Math.PI / 2));

    return {
      ...c,
      position: [dummy.position.x, dummy.position.y, dummy.position.z],
      rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z]
    };
  });
}

export function applyMoveInstant(cubies, move, size = 3) {
  const params = getMoveParams(move, size);
  if (!params) return cubies;
  let result = cubies;
  for (let i = 0; i < params.quarterTurns; i++) {
    result = applyQuarterTurn(result, params.axis, params.value, params.direction);
  }
  return result;
}

export function applyAlgoInstant(cubies, algString, size = 3, includeOptional = false) {
  const tokens = parseAlgoTokens(algString).filter(t => includeOptional || !t.isOptional);
  let result = cubies;
  for (const token of tokens) {
    result = applyMoveInstant(result, token.move, size);
  }
  return result;
}

export function getBaseCubieColors(initialPosition) {
  const [ix, iy, iz] = initialPosition;
  return [
    ix > 0.1 ? STANDARD_COLORS.right : STANDARD_COLORS.core,
    ix < -0.1 ? STANDARD_COLORS.left : STANDARD_COLORS.core,
    iy > 0.1 ? STANDARD_COLORS.up : STANDARD_COLORS.core,
    iy < -0.1 ? STANDARD_COLORS.down : STANDARD_COLORS.core,
    iz > 0.1 ? STANDARD_COLORS.front : STANDARD_COLORS.core,
    iz < -0.1 ? STANDARD_COLORS.back : STANDARD_COLORS.core
  ];
}

export function createCaseCubies({
  size = 3,
  alg = '',
  setup = null,
  yellowTop = true,
  maskMode = 'full',
  applySetup = true
}) {
  let cubies = generateInitialCubies(size);

  if (yellowTop) {
    cubies = applyAlgoInstant(cubies, "x2 y'", size, true);
  }

  const outer = size === 2 ? 0.5 : 1;
  // Quand yellowTop = true, la 1ère couronne blanche est en bas (-outer). Sinon elle est en haut (+outer).
  const firstLayerY = yellowTop ? -outer : outer;

  cubies = cubies.map(c => {
    const baseColors = getBaseCubieColors(c.initialPosition);
    const [px, py, pz] = c.position;
    const euler = new THREE.Euler(c.rotation[0], c.rotation[1], c.rotation[2]);

    const faceColors = baseColors.map((col, idx) => {
      if (col === STANDARD_COLORS.core) return col;

      const worldNormal = LOCAL_NORMALS[idx].clone().applyEuler(euler);
      const isUpSticker = worldNormal.y > 0.9;

      if (maskMode === 'oll') {
        if (Math.abs(py - outer) < 0.1) {
          return isUpSticker ? col : STANDARD_COLORS.grey;
        }
        return col;
      }

      if (maskMode === 'f2l') {
        const isFrontRightPair = px > 0.1 && pz > 0.1 && py < 0.1;
        if (isFrontRightPair) return col;
        if (Math.abs(py - outer) < 0.1) {
          const isCenter = Math.abs(px) < 0.1 && Math.abs(pz) < 0.1;
          return isCenter ? col : STANDARD_COLORS.grey;
        }
        return col;
      }

      if (maskMode === 'cross') {
        const zeros = [px, py, pz].filter(v => Math.abs(v) < 0.1).length;
        const isCenter = zeros === 2;
        const isCrossEdge = Math.abs(py - firstLayerY) < 0.1 && zeros === 1;
        return (isCenter || isCrossEdge) ? col : STANDARD_COLORS.grey;
      }

      if (maskMode === 'first_layer') {
        const zeros = [px, py, pz].filter(v => Math.abs(v) < 0.1).length;
        const isCenter = size === 3 && zeros === 2;
        if (Math.abs(py - firstLayerY) < 0.1 || isCenter) return col;
        return STANDARD_COLORS.grey;
      }

      if (maskMode === 'f2l_all') {
        const zeros = [px, py, pz].filter(v => Math.abs(v) < 0.1).length;
        const isCenter = zeros === 2;
        if (py < 0.1 || isCenter) return col;
        return STANDARD_COLORS.grey;
      }

      return col;
    });

    return { ...c, faceColors };
  });

  if (applySetup) {
    const setupMoves = setup !== null ? setup : invertAlgo(alg, false);
    cubies = applyAlgoInstant(cubies, setupMoves, size, true);
  }

  return cubies;
}

export function getStickerColor(cubies, x, y, z, nx, ny, nz) {
  const cubie = cubies.find(
    c =>
      Math.abs(c.position[0] - x) < 0.1 &&
      Math.abs(c.position[1] - y) < 0.1 &&
      Math.abs(c.position[2] - z) < 0.1
  );
  if (!cubie) return STANDARD_COLORS.grey;

  const colors = cubie.faceColors || getBaseCubieColors(cubie.initialPosition);
  const euler = new THREE.Euler(cubie.rotation[0], cubie.rotation[1], cubie.rotation[2]);
  const targetNormal = new THREE.Vector3(nx, ny, nz);

  for (let i = 0; i < 6; i++) {
    const worldNormal = LOCAL_NORMALS[i].clone().applyEuler(euler);
    if (worldNormal.dot(targetNormal) > 0.9) {
      return colors[i];
    }
  }
  return STANDARD_COLORS.grey;
}