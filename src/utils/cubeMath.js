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