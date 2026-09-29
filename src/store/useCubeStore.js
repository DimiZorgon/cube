import { create } from 'zustand';
import * as THREE from 'three'; // car probleme d'axe (Grimal lock)


const checkIsSolved = (cubies) => {
    return cubies.every(c => {
        const posOk = Math.abs(c.position[0] - c.initialPosition[0]) < 0.1 &&
                      Math.abs(c.position[1] - c.initialPosition[1]) < 0.1 &&
                      Math.abs(c.position[2] - c.initialPosition[2]) < 0.1;

        if (!posOk) return false;

        // Quaternion pour éviter gimbal lock
        const q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(c.rotation[0], c.rotation[1], c.rotation[2])
        );

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q);

        // Vérifie UNIQUEMENT les axes ayant une face colorée (initialPosition != 0)
        return (Math.abs(c.initialPosition[0]) < 0.1 || Math.abs(Math.round(right.x) - 1) < 0.01) &&
               (Math.abs(c.initialPosition[1]) < 0.1 || Math.abs(Math.round(up.y) - 1) < 0.01) &&
               (Math.abs(c.initialPosition[2]) < 0.1 || Math.abs(Math.round(forward.z) - 1) < 0.01);
    });
};


export const generateInitialCubies = (size = 3) => {
    const cubies = [];
    if (size === 3) {
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    cubies.push({ id: `cubie_${x}${y}${z}`, position: [x, y, z], rotation: [0, 0, 0], initialPosition: [x, y, z] });
                }
            }
        }
    } else if (size === 2) {
        const coords = [-0.5, 0.5];
        for (let x of coords) {
            for (let y of coords) {
                for (let z of coords) {
                    cubies.push({ id: `cubie_${x}${y}${z}`, position: [x, y, z], rotation: [0, 0, 0], initialPosition: [x, y, z] });
                }
            }
        }
    }
    return cubies
}



export const useCubeStore = create((set) => ({
    size: 3,
    cubies: generateInitialCubies(3),
    isSolved: true,
    // etat par defaut 
    cameraMapping: {
        Right: { axis: 'x', value: 1, dirMultiplier: 1 },
        Up: { axis: 'y', value: 1, dirMultiplier: 1 },
        Front: { axis: 'z', value: 1, dirMultiplier: 1 },
        Left: { axis: 'x', value: -1, dirMultiplier: 1 },
        Down: { axis: 'y', value: -1, dirMultiplier: 1 },
        Back: { axis: 'z', value: -1, dirMultiplier: 1 }
    },
    
    initCube: (size) => {
        const mapping = size === 3 ? {
            Right: { axis: 'x', value: 1, dirMultiplier: 1 },
            Up: { axis: 'y', value: 1, dirMultiplier: 1 },
            Front: { axis: 'z', value: 1, dirMultiplier: 1 },
            Left: { axis: 'x', value: -1, dirMultiplier: 1 },
            Down: { axis: 'y', value: -1, dirMultiplier: 1 },
            Back: { axis: 'z', value: -1, dirMultiplier: 1 }
        } : {
            Right: { axis: 'x', value: 0.5, dirMultiplier: 1 },
            Up: { axis: 'y', value: 0.5, dirMultiplier: 1 },
            Front: { axis: 'z', value: 0.5, dirMultiplier: 1 },
            Left: { axis: 'x', value: -0.5, dirMultiplier: 1 },
            Down: { axis: 'y', value: -0.5, dirMultiplier: 1 },
            Back: { axis: 'z', value: -0.5, dirMultiplier: 1 }
        };
        set({ size, cubies: generateInitialCubies(size), isSolved: true, rotationFile: [], activeRotation: null, cameraMapping: mapping });
    },

    // La fonction pour mettre à jour cet état
    setCameraMapping: (mapping) => set({ cameraMapping: mapping }),

    // Gestion rotation

    activeRotation: null,
    rotationFile: [],

    startRotation: (axis, value, direction) => {
        // Le mouvement que l'on veut faire
        const newMove = { axis, value, direction, progress: 0 };
        // On utilise la méthode réfléchie car on a besoin de lire l'état actuel
        set((state) => {

            // CAS 1 : Le cube ne tourne pas actuellement
            if (state.activeRotation === null) {
                // Retourne un objet qui met `newMove` dans `activeRotation`
                // isSolved = false pour éviter que le highscore se déclenche avant commitRotation
                return { activeRotation: newMove, isSolved: false };
            }

            // CAS 2 : Le cube tourne déjà
            else {
                return { rotationFile: [...state.rotationFile, newMove], isSolved: false };
            }
        });
    },


    // fonction de rotation de face
    commitRotation: (axis, value, direction) => {
        set((state) => {
            const dico_axis = {
                x: 0,
                y: 1,
                z: 2
            }
            const axedCubies = state.cubies.map((c) => {
                const pos = c.position[dico_axis[axis]];
                const isMoving = value.some(v => Math.abs(pos - v) < 0.1);

                if (isMoving) {
                    // Creation axe 3D (si axis est 'x', ça fait Vector3(1,0,0))
                    const axisVector = new THREE.Vector3(
                        axis === 'x' ? 1 : 0,
                        axis === 'y' ? 1 : 0,
                        axis === 'z' ? 1 : 0
                    );
                    // Creation d'un objet 3D "fantôme" avec position et rotation actuelles du cubie
                    const dummy = new THREE.Object3D();
                    dummy.position.set(...c.position);
                    dummy.rotation.set(...c.rotation);
                    // Rotation de la position autour de l'origine (0,0,0)
                    dummy.position.applyAxisAngle(axisVector, -direction * Math.PI / 2);
                    dummy.position.x = Math.round(dummy.position.x * 2) / 2;
                    dummy.position.y = Math.round(dummy.position.y * 2) / 2;
                    dummy.position.z = Math.round(dummy.position.z * 2) / 2;
                    // Rotation de l'objet sur lui-même, par rapport aux axes du MONDE (WorldAxis)
                    dummy.rotateOnWorldAxis(axisVector, -direction * Math.PI / 2);
                    // Mise à jour du cubie avec les nouvelles valeurs extraites du fantôme

                    return {
                        ...c,
                        position: [dummy.position.x, dummy.position.y, dummy.position.z],
                        rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z]
                    };
                } else {
                    return c;
                }

            })
            const solved = checkIsSolved(axedCubies);
            if (state.rotationFile.length > 0) {
                const [activeRotation, ...rest] = state.rotationFile;
                return { cubies: axedCubies, activeRotation, rotationFile: rest, isSolved: solved };
            }
            return { cubies: axedCubies, activeRotation: null, isSolved: solved };
        })
    }

}));