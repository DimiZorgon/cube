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

export function invertAlgo(algString, includeOptional = true) {
  const tokens = parseAlgoTokens(algString).filter(t => includeOptional || !t.isOptional);
  return tokens
    .slice()
    .reverse()
    .map(t => invertSingleMove(t.move))
    .join(' ');
}

export function getMoveParams(move, size = 3) {
  if (!move) return null;

  let working = move;
  let isInnerSlice = false;
  if (/^2[RLUDFB]/i.test(working)) {
    isInnerSlice = true;
    working = working.slice(1);
  }

  const isDouble = working.includes('2');
  const isPrime = working.includes("'");
  const base = working.replace(/[2']/g, '');

  const outer = (size - 1) / 2;
  const inner = size === 4 ? 0.5 : 0;
  const allLayers = Array.from({ length: size }, (_, i) => i - outer);
  const widePos = size === 2 ? [0.5] : [outer, inner];
  const wideNeg = size === 2 ? [-0.5] : [-outer, -inner];

  let axis = 'y';
  let value = [outer];
  let baseDir = 1;

  if (isInnerSlice) {
    switch (base.toUpperCase()) {
      case 'R': axis = 'x'; value = [inner]; baseDir = 1; break;
      case 'L': axis = 'x'; value = [-inner]; baseDir = -1; break;
      case 'U': axis = 'y'; value = [inner]; baseDir = 1; break;
      case 'D': axis = 'y'; value = [-inner]; baseDir = -1; break;
      case 'F': axis = 'z'; value = [inner]; baseDir = 1; break;
      case 'B': axis = 'z'; value = [-inner]; baseDir = -1; break;
      default: return null;
    }
  } else {
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

      case 'M': axis = 'x'; value = size === 4 ? [-0.5, 0.5] : [0]; baseDir = -1; break;
      case 'E': axis = 'y'; value = size === 4 ? [-0.5, 0.5] : [0]; baseDir = -1; break;
      case 'S': axis = 'z'; value = size === 4 ? [-0.5, 0.5] : [0]; baseDir = 1; break;

      case 'x': axis = 'x'; value = allLayers; baseDir = 1; break;
      case 'y': axis = 'y'; value = allLayers; baseDir = 1; break;
      case 'z': axis = 'z'; value = allLayers; baseDir = 1; break;
      default:
        return null;
    }
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
  const outer = Math.max(Math.abs(ix), Math.abs(iy), Math.abs(iz), 0.5);
  const threshold = outer - 0.1;

  return [
    ix > threshold ? STANDARD_COLORS.right : STANDARD_COLORS.core,
    ix < -threshold ? STANDARD_COLORS.left : STANDARD_COLORS.core,
    iy > threshold ? STANDARD_COLORS.up : STANDARD_COLORS.core,
    iy < -threshold ? STANDARD_COLORS.down : STANDARD_COLORS.core,
    iz > threshold ? STANDARD_COLORS.front : STANDARD_COLORS.core,
    iz < -threshold ? STANDARD_COLORS.back : STANDARD_COLORS.core
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
    const orientAlg = maskMode === 'f2l' ? 'x2 y' : "x2 y'";
    cubies = applyAlgoInstant(cubies, orientAlg, size, true);
  }

  const outer = (size - 1) / 2;
  const firstLayerY = yellowTop ? -outer : outer;

  // Détection automatique des pièces échangées pour les modes Blindfolded (bld_edge, bld_corner, bld_swap)
  const swappedCubieIds = new Set();
  if (maskMode === 'bld_edge' || maskMode === 'bld_corner' || maskMode === 'bld_swap') {
    const previewMoves = setup !== null ? setup : invertAlgo(alg, true);
    const previewCubies = applyAlgoInstant(cubies, previewMoves, size, true);

    cubies.forEach((c, idx) => {
      const after = previewCubies[idx];
      const moved =
        Math.abs(c.position[0] - after.position[0]) > 0.1 ||
        Math.abs(c.position[1] - after.position[1]) > 0.1 ||
        Math.abs(c.position[2] - after.position[2]) > 0.1;
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(...c.rotation));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(...after.rotation));
      const rotated = Math.abs(q1.dot(q2)) < 0.99;

      if (moved || rotated) {
        swappedCubieIds.add(c.id);
      }
    });
  }

  cubies = cubies.map(c => {
    const baseColors = getBaseCubieColors(c.initialPosition);
    const [px, py, pz] = c.position;
    const euler = new THREE.Euler(c.rotation[0], c.rotation[1], c.rotation[2]);

    const outerCount = [px, py, pz].filter(v => Math.abs(Math.abs(v) - outer) < 0.1).length;
    const isCenterPiece = outerCount === 1;
    const isEdgePiece = outerCount === 2;
    const isCornerPiece = outerCount === 3;

    const faceColors = baseColors.map((col, idx) => {
      if (col === STANDARD_COLORS.core) return col;

      const worldNormal = LOCAL_NORMALS[idx].clone().applyEuler(euler);
      const isUpSticker = worldNormal.y > 0.9;

      if (maskMode === 'bld_edge') {
        // Uniquement les 6 centres + les 2 arêtes échangées (Buffer B et Cible)
        return (isCenterPiece || (isEdgePiece && swappedCubieIds.has(c.id)))
          ? col
          : STANDARD_COLORS.grey;
      }

      if (maskMode === 'bld_corner') {
        // Uniquement les 6 centres + les 2 coins échangés (Buffer A et Cible)
        return (isCenterPiece || (isCornerPiece && swappedCubieIds.has(c.id)))
          ? col
          : STANDARD_COLORS.grey;
      }

      if (maskMode === 'bld_swap') {
        // Les 6 centres + toutes les pièces permutées par l'algorithme (T-Perm, Y-Perm, Ra-Perm)
        return (isCenterPiece || swappedCubieIds.has(c.id))
          ? col
          : STANDARD_COLORS.grey;
      }

      if (maskMode === 'oll') {
        if (Math.abs(py - outer) < 0.1) {
          return isUpSticker ? col : STANDARD_COLORS.grey;
        }
        return col;
      }

      if (maskMode === 'centers') {
        return isCenterPiece ? col : STANDARD_COLORS.grey;
      }

      if (maskMode === 'edges_4x4') {
        return (isCenterPiece || isEdgePiece) ? col : STANDARD_COLORS.grey;
      }

      if (maskMode === 'yau_cross') {
        const isBottomEdge = Math.abs(py - firstLayerY) < 0.1 && isEdgePiece;
        return (isCenterPiece || isBottomEdge) ? col : STANDARD_COLORS.grey;
      }

      if (maskMode === 'f2l') {
        const isFrontRightPair = px > outer - 0.1 && pz > outer - 0.1 && py < outer - 0.1;
        if (isFrontRightPair) return col;
        if (Math.abs(py - outer) < 0.1) {
          return isCenterPiece ? col : STANDARD_COLORS.grey;
        }
        return col;
      }

      if (maskMode === 'cross') {
        const isCrossEdge = Math.abs(py - firstLayerY) < 0.1 && isEdgePiece;
        return (isCenterPiece || isCrossEdge) ? col : STANDARD_COLORS.grey;
      }

      if (maskMode === 'first_layer') {
        if (Math.abs(py - firstLayerY) < 0.1 || isCenterPiece) return col;
        return STANDARD_COLORS.grey;
      }

      if (maskMode === 'f2l_all') {
        if (py < outer - 0.1 || isCenterPiece) return col;
        return STANDARD_COLORS.grey;
      }

      return col;
    });

    return { ...c, faceColors };
  });

  if (applySetup) {
    if (maskMode === 'f2l' && setup === null) {
      const allLayers = Array.from({ length: size }, (_, i) => i - outer);
      const forwardTokens = parseAlgoTokens(alg).filter(t => !t.isOptional);
      for (const tok of forwardTokens) {
        const params = getMoveParams(tok.move, size);
        if (params && params.value.some(v => Math.abs(v) < 0.1)) {
          for (let i = 0; i < params.quarterTurns; i++) {
            cubies = applyQuarterTurn(cubies, params.axis, allLayers, params.direction);
          }
        }
      }
    }

    const setupMoves = setup !== null ? setup : invertAlgo(alg, true);
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