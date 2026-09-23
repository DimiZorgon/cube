import { create } from 'zustand';
import * as THREE from 'three'; // car probleme d'axe (Grimal lock)

export const generateInitialCubies = () => {
    const cubies = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                cubies.push({ id: `cubie_${x}${y}${z}`, position: [x, y, z], rotation: [0, 0, 0], initialPosition: [x, y, z] });
            }
        }

    }
    return cubies
}



export const useCubeStore = create((set) => ({
    cubies: generateInitialCubies(),
    //etat par defaut 
    cameraMapping: {
        Right: { axis: 'x', value: 1, dirMultiplier: 1 },
        Up: { axis: 'y', value: 1, dirMultiplier: 1 },
        Front: { axis: 'z', value: 1, dirMultiplier: 1 },
        Left: { axis: 'x', value: -1, dirMultiplier: 1 },
        Down: { axis: 'y', value: -1, dirMultiplier: 1 },
        Back: { axis: 'z', value: -1, dirMultiplier: 1 }
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
                return { activeRotation: newMove };
            }

            // CAS 2 : Le cube tourne déjà
            else {
                return { rotationFile: [...state.rotationFile, newMove] };
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
                if (value.includes(c.position[dico_axis[axis]])) {
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
                    dummy.position.x = Math.round(dummy.position.x);
                    dummy.position.y = Math.round(dummy.position.y);
                    dummy.position.z = Math.round(dummy.position.z);
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
            if (state.rotationFile.length > 0) {
                const [activeRotation, ...rest] = state.rotationFile;
                return { cubies: axedCubies, activeRotation, rotationFile: rest };
            }
            return { cubies: axedCubies, activeRotation: null };
        })
    }

}));