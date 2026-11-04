// src/store/useCubeStore.js
import { create } from 'zustand';
import { checkIsSolved, generateInitialCubies, applyRotationToCubies } from '../utils/cubeMath.js';

export { generateInitialCubies };

const getDefaultMapping = (size) => {
    const outer = (size - 1) / 2;
    return {
        Right: { axis: 'x', value: outer, dirMultiplier: 1 },
        Up: { axis: 'y', value: outer, dirMultiplier: 1 },
        Front: { axis: 'z', value: outer, dirMultiplier: 1 },
        Left: { axis: 'x', value: -outer, dirMultiplier: 1 },
        Down: { axis: 'y', value: -outer, dirMultiplier: 1 },
        Back: { axis: 'z', value: -outer, dirMultiplier: 1 }
    };
};

export const useCubeStore = create((set) => ({
    size: 3,
    cubies: generateInitialCubies(3),
    logicalCubies: generateInitialCubies(3),
    isSolved: true,
    cameraMapping: getDefaultMapping(3),

    initCube: (size) => {
        set({
            size,
            cubies: generateInitialCubies(size),
            logicalCubies: generateInitialCubies(size),
            isSolved: true,
            rotationFile: [],
            activeRotation: null,
            cameraMapping: getDefaultMapping(size)
        });
    },

    // Charge un pattern spécifique (mode "Tester l'algo")
    setCustomCubies: (size, customCubies) => {
        set({
            size,
            cubies: customCubies,
            logicalCubies: customCubies,
            isSolved: false,
            rotationFile: [],
            activeRotation: null,
            cameraMapping: getDefaultMapping(size)
        });
    },

    setCameraMapping: (mapping) => set({ cameraMapping: mapping }),

    activeRotation: null,
    rotationFile: [],

    startRotation: (axis, value, direction) => {
        const sliceArr = Array.isArray(value) ? value : [value];
        const newMove = { axis, value: sliceArr, direction, progress: 0 };
        set((state) => {
            // Pipeline 1: Synchronous 0ms logical commit & solve check
            const nextLogical = applyRotationToCubies(state.logicalCubies || state.cubies, axis, sliceArr, direction);
            const solved = checkIsSolved(nextLogical);

            if (state.activeRotation === null) {
                return { logicalCubies: nextLogical, isSolved: solved, activeRotation: newMove };
            } else {
                return { logicalCubies: nextLogical, isSolved: solved, rotationFile: [...state.rotationFile, newMove] };
            }
        });
    },

    commitRotation: (axis, value, direction) => {
        set((state) => {
            const nextVisual = applyRotationToCubies(state.cubies, axis, value, direction);
            if (state.rotationFile.length > 0) {
                const [activeRotation, ...rest] = state.rotationFile;
                return { cubies: nextVisual, activeRotation, rotationFile: rest };
            }
            return { cubies: nextVisual, activeRotation: null };
        });
    },

    snapQueue: (keepCount = 0) => {
        set((state) => {
            const allPending = [];
            if (state.activeRotation) allPending.push(state.activeRotation);
            allPending.push(...state.rotationFile);
            if (allPending.length <= keepCount) return state;

            const snapCount = allPending.length - keepCount;
            const movesToSnap = allPending.slice(0, snapCount);
            const remaining = allPending.slice(snapCount);

            const newVisual = movesToSnap.reduce(
                (c, m) => applyRotationToCubies(c, m.axis, m.value, m.direction),
                state.cubies
            );

            const [newActive, ...newRest] = remaining;
            return {
                cubies: newVisual,
                activeRotation: newActive || null,
                rotationFile: newRest
            };
        });
    }
}));
