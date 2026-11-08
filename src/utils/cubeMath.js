// src/utils/cubeMath.js
import * as THREE from 'three';

const LOCAL_NORMALS = [
    new THREE.Vector3(1, 0, 0),  // 0: Right (+X)
    new THREE.Vector3(-1, 0, 0), // 1: Left (-X)
    new THREE.Vector3(0, 1, 0),  // 2: Up (+Y)
    new THREE.Vector3(0, -1, 0), // 3: Down (-Y)
    new THREE.Vector3(0, 0, 1),  // 4: Front (+Z)
    new THREE.Vector3(0, 0, -1)  // 5: Back (-Z)
];

const OUTER_FACES = [
    { axisIndex: 0, sign: 1, normal: new THREE.Vector3(1, 0, 0) },
    { axisIndex: 0, sign: -1, normal: new THREE.Vector3(-1, 0, 0) },
    { axisIndex: 1, sign: 1, normal: new THREE.Vector3(0, 1, 0) },
    { axisIndex: 1, sign: -1, normal: new THREE.Vector3(0, -1, 0) },
    { axisIndex: 2, sign: 1, normal: new THREE.Vector3(0, 0, 1) },
    { axisIndex: 2, sign: -1, normal: new THREE.Vector3(0, 0, -1) }
];

// Retourne l'identifiant des 6 facettes d'origine d'un cubie
const getInitialFaceStickers = (initialPosition, outer) => {
    const [ix, iy, iz] = initialPosition;
    const t = outer - 0.1;
    return [
        ix > t ? 'R' : null,
        ix < -t ? 'L' : null,
        iy > t ? 'U' : null,
        iy < -t ? 'D' : null,
        iz > t ? 'F' : null,
        iz < -t ? 'B' : null
    ];
};

export const checkIsSolved = (cubies) => {
    if (!cubies || cubies.length === 0) return true;

    const outer = Math.max(...cubies.map(c => Math.abs(c.initialPosition[0])));

    // Pour chacune des 6 faces extérieures du cube, toutes les facettes orientées
    // vers l'extérieur doivent appartenir à la même couleur d'origine.
    for (const face of OUTER_FACES) {
        const targetCoord = face.sign * outer;
        const faceCubies = cubies.filter(
            c => Math.abs(c.position[face.axisIndex] - targetCoord) < 0.1
        );

        let referenceSticker = null;

        for (const cubie of faceCubies) {
            const stickers = getInitialFaceStickers(cubie.initialPosition, outer);
            const euler = new THREE.Euler(cubie.rotation[0], cubie.rotation[1], cubie.rotation[2]);

            let visibleSticker = null;
            for (let i = 0; i < 6; i++) {
                const worldNormal = LOCAL_NORMALS[i].clone().applyEuler(euler);
                if (worldNormal.dot(face.normal) > 0.9) {
                    visibleSticker = stickers[i];
                    break;
                }
            }

            if (!visibleSticker) return false;
            if (referenceSticker === null) {
                referenceSticker = visibleSticker;
            } else if (visibleSticker !== referenceSticker) {
                return false;
            }
        }
    }

    return true;
};

export const generateInitialCubies = (size = 3) => {
    const cubies = [];
    const outer = (size - 1) / 2;
    const coords = Array.from({ length: size }, (_, i) => i - outer);

    for (const x of coords) {
        for (const y of coords) {
            for (const z of coords) {
                // On ignore les pièces purement internes invisibles (cœur du 3x3 ou du 4x4)
                const isSurface =
                    Math.abs(Math.abs(x) - outer) < 0.1 ||
                    Math.abs(Math.abs(y) - outer) < 0.1 ||
                    Math.abs(Math.abs(z) - outer) < 0.1;

                if (!isSurface) continue;

                cubies.push({
                    id: `cubie_${x}_${y}_${z}`,
                    position: [x, y, z],
                    rotation: [0, 0, 0],
                    initialPosition: [x, y, z]
                });
            }
        }
    }
    return cubies;
};

export const applyRotationToCubies = (cubies, axis, value, direction) => {
    if (!cubies || !cubies.length) return cubies;
    const dico_axis = { x: 0, y: 1, z: 2 };
    const sliceValues = Array.isArray(value) ? value : [value];
    const axisVector = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
    );
    const angle = -direction * Math.PI / 2;

    return cubies.map((c) => {
        const pos = c.position[dico_axis[axis]];
        const isMoving = sliceValues.some(v => Math.abs(pos - v) < 0.1);
        if (!isMoving) return c;

        const dummy = new THREE.Object3D();
        dummy.position.set(...c.position);
        dummy.rotation.set(...c.rotation);
        dummy.position.applyAxisAngle(axisVector, angle);
        dummy.position.x = Math.round(dummy.position.x * 2) / 2;
        dummy.position.y = Math.round(dummy.position.y * 2) / 2;
        dummy.position.z = Math.round(dummy.position.z * 2) / 2;
        dummy.rotateOnWorldAxis(axisVector, angle);

        return {
            ...c,
            position: [dummy.position.x, dummy.position.y, dummy.position.z],
            rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z]
        };
    });
};

export const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

export function isFaceletsSolved(faceletString) {
    if (!faceletString || faceletString.length !== 54) return false;
    for (let face = 0; face < 6; face++) {
        const start = face * 9;
        const centerChar = faceletString[start + 4];
        for (let i = 0; i < 9; i++) {
            if (faceletString[start + i] !== centerChar) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Decomposes slice moves, wide moves, and rotations into standard quarter turns.
 * @param {string} moveNotation
 * @returns {string[]} Array of standard move tokens
 */
export function expandMoveNotation(moveNotation) {
    if (!moveNotation) return [];
    const move = moveNotation.trim();
    if (!move) return [];

    // Whole-cube rotations
    if (move === 'x') return ['R', "L'", "M'"];
    if (move === "x'") return ["R'", 'L', 'M'];
    if (move === 'x2' || move === "x2'") return ['R2', 'L2', 'M2'];

    if (move === 'y') return ['U', "D'", "E'"];
    if (move === "y'") return ["U'", 'D', 'E'];
    if (move === 'y2' || move === "y2'") return ['U2', 'D2', 'E2'];

    if (move === 'z') return ['F', "B'", 'S'];
    if (move === "z'") return ["F'", 'B', "S'"];
    if (move === 'z2' || move === "z2'") return ['F2', 'B2', 'S2'];

    // Wide moves: r/Rw, l/Lw, u/Uw, d/Dw, f/Fw, b/Bw
    const wideMatch = move.match(/^([rludfb]|Rw|Lw|Uw|Dw|Fw|Bw)(['2]?)$/i);
    if (wideMatch) {
        const base = wideMatch[1];
        const modifier = wideMatch[2] || '';
        const isPrime = modifier === "'";
        const isDouble = modifier === '2';

        if (base === 'r' || base === 'Rw') {
            if (isDouble) return ['R2', 'M2'];
            if (isPrime) return ["R'", 'M'];
            return ['R', "M'"];
        }
        if (base === 'l' || base === 'Lw') {
            if (isDouble) return ['L2', 'M2'];
            if (isPrime) return ["L'", "M'"];
            return ['L', 'M'];
        }
        if (base === 'u' || base === 'Uw') {
            if (isDouble) return ['U2', 'E2'];
            if (isPrime) return ["U'", 'E'];
            return ['U', "E'"];
        }
        if (base === 'd' || base === 'Dw') {
            if (isDouble) return ['D2', 'E2'];
            if (isPrime) return ["D'", "E'"];
            return ['D', 'E'];
        }
        if (base === 'f' || base === 'Fw') {
            if (isDouble) return ['F2', 'S2'];
            if (isPrime) return ["F'", "S'"];
            return ['F', 'S'];
        }
        if (base === 'b' || base === 'Bw') {
            if (isDouble) return ['B2', 'S2'];
            if (isPrime) return ["B'", 'S'];
            return ['B', "S'"];
        }
    }

    // Standard moves: U, D, R, L, F, B, M, E, S (with optional ', 2)
    return [move];
}

/**
 * Converts any algorithm string (including rotations x/y/z, wide moves r/l/u/d/f/b/Rw...,
 * and slice moves M/E/S) into an equivalent sequence of pure outer-face moves (U, D, R, L, F, B)
 * relative to the fixed center axles of a physical Smart Cube.
 *
 * @param {string|string[]} algInput
 * @returns {string[]} Array of standard outer-face move tokens (U, D, R, L, F, B with optional ' or 2)
 */
export function expandAlgoToOuterMoves(algInput, includeOptional = true) {
    if (!algInput) return [];
    const cleanedStr = Array.isArray(algInput)
        ? algInput.join(' ')
        : String(algInput).replace(/[’‘`]/g, "'");
    const withoutOptional = includeOptional
        ? cleanedStr.replace(/[()[\]]/g, ' ')
        : cleanedStr.replace(/\[[^\]]*\]/g, ' ').replace(/[()]/g, ' ');
    const rawTokens = withoutOptional
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    let map = { U: 'U', D: 'D', R: 'R', L: 'L', F: 'F', B: 'B' };

    const rotX = (m) => ({ U: m.F, B: m.U, D: m.B, F: m.D, R: m.R, L: m.L });
    const rotY = (m) => ({ F: m.R, L: m.F, B: m.L, R: m.B, U: m.U, D: m.D });
    const rotZ = (m) => ({ R: m.U, D: m.R, L: m.D, U: m.L, F: m.F, B: m.B });

    const applyRot = (axis, quarterTurns) => {
        const turns = ((quarterTurns % 4) + 4) % 4;
        for (let i = 0; i < turns; i++) {
            if (axis === 'x') map = rotX(map);
            else if (axis === 'y') map = rotY(map);
            else if (axis === 'z') map = rotZ(map);
        }
    };

    const decomposeToken = (raw) => {
        const clean = raw.replace(/[()[\]]/g, '').replace("2'", '2');
        if (!clean) return [];
        const isPrime = clean.endsWith("'");
        const isDouble = clean.endsWith('2');
        const base = clean.replace(/[2']/g, '');
        const mod = isDouble ? '2' : isPrime ? "'" : '';
        const invMod = isDouble ? '2' : isPrime ? '' : "'";

        // First use expandMoveNotation for wide moves & rotations
        const expanded = expandMoveNotation(clean);
        if (expanded.length === 2) {
            // Wide move (e.g. r -> ['R', "M'"], which is L + x in outer+rotation form)
            switch (base) {
                case 'r':
                case 'Rw': return [`L${mod}`, `x${mod}`];
                case 'l':
                case 'Lw': return [`R${mod}`, `x${invMod}`];
                case 'u':
                case 'Uw': return [`D${mod}`, `y${mod}`];
                case 'd':
                case 'Dw': return [`U${mod}`, `y${invMod}`];
                case 'f':
                case 'Fw': return [`B${mod}`, `z${mod}`];
                case 'b':
                case 'Bw': return [`F${mod}`, `z${invMod}`];
                default: break;
            }
        }

        switch (base) {
            case 'M': return [`R${mod}`, `L${invMod}`, `x${invMod}`];
            case 'E': return [`U${mod}`, `D${invMod}`, `y${invMod}`];
            case 'S': return [`F${invMod}`, `B${mod}`, `z${mod}`];
            default: return [ `${base}${mod}` ];
        }
    };

    const outerMoves = [];
    for (const token of rawTokens) {
        const steps = decomposeToken(token);
        for (const step of steps) {
            const face = step[0];
            const mod = step.slice(1);
            if (face === 'x' || face === 'y' || face === 'z') {
                const turns = mod === '2' ? 2 : mod === "'" ? 3 : 1;
                applyRot(face, turns);
            } else if (map[face]) {
                outerMoves.push(`${map[face]}${mod}`);
            }
        }
    }

    return outerMoves;
}

export class CubeStateSimulator {
    constructor(facelets = SOLVED_FACELETS) {
        this.facelets = facelets.split('');
    }

    applyMove(moveNotation) {
        if (!moveNotation) return;
        const expanded = expandMoveNotation(moveNotation);
        for (const move of expanded) {
            const face = move[0];
            const isPrime = move.includes("'");
            const isDouble = move.includes("2");
            const turns = isDouble ? 2 : isPrime ? 3 : 1;

            for (let t = 0; t < turns; t++) {
                this._applyQuarterTurn(face);
            }
        }
    }

    applyMoves(moveList) {
        if (!moveList) return;
        const moves = Array.isArray(moveList)
            ? moveList
            : moveList.replace(/[()[\]]/g, ' ').trim().split(/\s+/).filter(Boolean);
        for (const m of moves) {
            this.applyMove(m);
        }
    }

    getFaceletString() {
        return this.facelets.join('');
    }

    isSolved() {
        return isFaceletsSolved(this.getFaceletString());
    }

    _rotateFaceCW(offset) {
        const f = this.facelets;
        const [c0, c1, c2, c3, c4, c5, c6, c7, c8] = [
            f[offset], f[offset + 1], f[offset + 2],
            f[offset + 3], f[offset + 4], f[offset + 5],
            f[offset + 6], f[offset + 7], f[offset + 8],
        ];
        f[offset] = c6; f[offset + 1] = c3; f[offset + 2] = c0;
        f[offset + 3] = c7; f[offset + 4] = c4; f[offset + 5] = c1;
        f[offset + 6] = c8; f[offset + 7] = c5; f[offset + 8] = c2;
    }

    _applyQuarterTurn(face) {
        const f = this.facelets;
        if (face === 'U') {
            this._rotateFaceCW(0);
            const tmp = [f[18], f[19], f[20]];
            f[18] = f[9];  f[19] = f[10]; f[20] = f[11];
            f[9]  = f[45]; f[10] = f[46]; f[11] = f[47];
            f[45] = f[36]; f[46] = f[37]; f[47] = f[38];
            f[36] = tmp[0]; f[37] = tmp[1]; f[38] = tmp[2];
        } else if (face === 'D') {
            this._rotateFaceCW(27);
            const tmp = [f[24], f[25], f[26]];
            f[24] = f[42]; f[25] = f[43]; f[26] = f[44];
            f[42] = f[51]; f[43] = f[52]; f[44] = f[53];
            f[51] = f[15]; f[52] = f[16]; f[53] = f[17];
            f[15] = tmp[0]; f[16] = tmp[1]; f[17] = tmp[2];
        } else if (face === 'R') {
            this._rotateFaceCW(9);
            const tmp = [f[2], f[5], f[8]];
            f[2] = f[20]; f[5] = f[23]; f[8] = f[26];
            f[20] = f[29]; f[23] = f[32]; f[26] = f[35];
            f[29] = f[51]; f[32] = f[48]; f[35] = f[45];
            f[51] = tmp[0]; f[48] = tmp[1]; f[45] = tmp[2];
        } else if (face === 'L') {
            this._rotateFaceCW(36);
            const tmp = [f[0], f[3], f[6]];
            f[0] = f[53]; f[3] = f[50]; f[6] = f[47];
            f[53] = f[27]; f[50] = f[30]; f[47] = f[33];
            f[27] = f[18]; f[30] = f[21]; f[33] = f[24];
            f[18] = tmp[0]; f[21] = tmp[1]; f[24] = tmp[2];
        } else if (face === 'F') {
            this._rotateFaceCW(18);
            const tmp = [f[6], f[7], f[8]];
            f[6] = f[44]; f[7] = f[41]; f[8] = f[38];
            f[44] = f[29]; f[41] = f[28]; f[38] = f[27];
            f[29] = f[9];  f[28] = f[12]; f[27] = f[15];
            f[9]  = tmp[0]; f[12] = tmp[1]; f[15] = tmp[2];
        } else if (face === 'B') {
            this._rotateFaceCW(45);
            const tmp = [f[0], f[1], f[2]];
            f[0] = f[11]; f[1] = f[14]; f[2] = f[17];
            f[11] = f[35]; f[14] = f[34]; f[17] = f[33];
            f[35] = f[42]; f[34] = f[39]; f[33] = f[36];
            f[42] = tmp[0]; f[39] = tmp[1]; f[36] = tmp[2];
        } else if (face === 'M') {
            const tmp = [f[1], f[4], f[7]];
            f[1] = f[52]; f[4] = f[49]; f[7] = f[46];
            f[52] = f[28]; f[49] = f[31]; f[46] = f[34];
            f[28] = f[19]; f[31] = f[22]; f[34] = f[25];
            f[19] = tmp[0]; f[22] = tmp[1]; f[25] = tmp[2];
        } else if (face === 'E') {
            const tmp = [f[21], f[22], f[23]];
            f[21] = f[39]; f[22] = f[40]; f[23] = f[41];
            f[39] = f[48]; f[40] = f[49]; f[41] = f[50];
            f[48] = f[12]; f[49] = f[13]; f[50] = f[14];
            f[12] = tmp[0]; f[13] = tmp[1]; f[14] = tmp[2];
        } else if (face === 'S') {
            const tmp = [f[3], f[4], f[5]];
            f[3] = f[43]; f[4] = f[40]; f[5] = f[37];
            f[43] = f[32]; f[40] = f[31]; f[37] = f[30];
            f[32] = f[10]; f[31] = f[13]; f[30] = f[16];
            f[10] = tmp[0]; f[13] = tmp[1]; f[16] = tmp[2];
        } else if (face === 'x') {
            this._applyQuarterTurn('R');
            for (let i = 0; i < 3; i++) {
                this._applyQuarterTurn('L');
                this._applyQuarterTurn('M');
            }
        } else if (face === 'y') {
            this._applyQuarterTurn('U');
            for (let i = 0; i < 3; i++) {
                this._applyQuarterTurn('D');
                this._applyQuarterTurn('E');
            }
        } else if (face === 'z') {
            this._applyQuarterTurn('F');
            for (let i = 0; i < 3; i++) {
                this._applyQuarterTurn('B');
            }
            this._applyQuarterTurn('S');
        }
    }
}