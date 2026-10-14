// src/store/useCubeStore.js
import { create } from 'zustand';
import * as THREE from 'three';
import { checkIsSolved, generateInitialCubies } from '../utils/cubeMath';

export { generateInitialCubies };

const getDefaultMapping = (size) => size === 3 ? {
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

export const useCubeStore = create((set) => ({
    size: 3,
    cubies: generateInitialCubies(3),
    isSolved: true,
    history: [],
    cameraMapping: getDefaultMapping(3),

    initCube: (size) => {
        set({
            size,
            cubies: generateInitialCubies(size),
            isSolved: true,
            rotationFile: [],
            activeRotation: null,
            cameraMapping: getDefaultMapping(size),
            history: []
        });
    },

    // Charge un pattern spécifique (mode "Tester l'algo")
    setCustomCubies: (size, customCubies) => {
        set({
            size,
            cubies: customCubies,
            isSolved: false,
            rotationFile: [],
            activeRotation: null,
            cameraMapping: getDefaultMapping(size),
            history: []
        });
    },

    setCameraMapping: (mapping) => set({ cameraMapping: mapping }),

    activeRotation: null,
    rotationFile: [],

    startRotation: (axis, value, direction) => {
        const newMove = { axis, value, direction, progress: 0 };
        set((state) => {
            if (state.activeRotation === null) {
                return { activeRotation: newMove, isSolved: false };
            } else {
                return { rotationFile: [...state.rotationFile, newMove], isSolved: false };
            }
        });
    },

    commitRotation: (axis, value, direction) => {
        set((state) => {
            const dico_axis = { x: 0, y: 1, z: 2 };
            const axedCubies = state.cubies.map((c) => {
                const pos = c.position[dico_axis[axis]];
                const isMoving = value.some(v => Math.abs(pos - v) < 0.1);

                if (isMoving) {
                    const axisVector = new THREE.Vector3(
                        axis === 'x' ? 1 : 0,
                        axis === 'y' ? 1 : 0,
                        axis === 'z' ? 1 : 0
                    );
                    const dummy = new THREE.Object3D();
                    dummy.position.set(...c.position);
                    dummy.rotation.set(...c.rotation);
                    dummy.position.applyAxisAngle(axisVector, -direction * Math.PI / 2);
                    dummy.position.x = Math.round(dummy.position.x * 2) / 2;
                    dummy.position.y = Math.round(dummy.position.y * 2) / 2;
                    dummy.position.z = Math.round(dummy.position.z * 2) / 2;
                    dummy.rotateOnWorldAxis(axisVector, -direction * Math.PI / 2);

                    return {
                        ...c,
                        position: [dummy.position.x, dummy.position.y, dummy.position.z],
                        rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z]
                    };
                } else {
                    return c;
                }
            });

            const solved = checkIsSolved(axedCubies);
            const newHistory = [...state.history, state.cubies];

            if (state.rotationFile.length > 0) {
                const [activeRotation, ...rest] = state.rotationFile;
                return { cubies: axedCubies, activeRotation, rotationFile: rest, isSolved: solved, history: newHistory };
            }
            return { cubies: axedCubies, activeRotation: null, isSolved: solved, history: newHistory };
        });
    },

    undo: () => {
        set((state) => {
            if (state.history.length === 0) return state;
            const previousCubies = state.history[state.history.length - 1];
            const newHistory = state.history.slice(0, state.history.length - 1);
            const solved = checkIsSolved(previousCubies);
            return {
                cubies: previousCubies,
                history: newHistory,
                isSolved: solved,
                activeRotation: null,
                rotationFile: []
            };
        });
    }
}));