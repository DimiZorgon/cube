import { create } from 'zustand';
import * as THREE from 'three'; // car probleme d'axe (Grimal lock)


const checkIsSolved = (cubies) => {
    if (cubies.length === 0) return true;

    // Use the first cubie to determine the supposed global rotation of the solved cube
    const firstCubie = cubies[0];
    const qGlobal = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(firstCubie.rotation[0], firstCubie.rotation[1], firstCubie.rotation[2])
    );

    return cubies.every(c => {
        // Check position matches its initial position rotated by the global rotation
        const expectedPos = new THREE.Vector3(...c.initialPosition).applyQuaternion(qGlobal);
        if (Math.abs(c.position[0] - expectedPos.x) > 0.1 ||
            Math.abs(c.position[1] - expectedPos.y) > 0.1 ||
            Math.abs(c.position[2] - expectedPos.z) > 0.1) {
            return false;
        }

        // Check rotation (only for 3x3 cubes)
        const zeros = c.initialPosition.filter(v => v === 0).length;
        if (zeros < 2) {
            const qC = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(c.rotation[0], c.rotation[1], c.rotation[2])
            );
            const dot = Math.abs(qGlobal.dot(qC));
            if (dot < 0.99) return false;
        }

        return true;
    });
};

// Function to generate initial cubies based on size of the cube (2x2 or 3x3)
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


// Zustand store for cube state management
export const useCubeStore = create((set) => ({
    size: 3,
    cubies: generateInitialCubies(3),
    isSolved: true,
    // default state for camera mapping
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

    // Function to update the camera mapping in the store
    setCameraMapping: (mapping) => set({ cameraMapping: mapping }),

    // rotation state management
    activeRotation: null,
    rotationFile: [],

    startRotation: (axis, value, direction) => {
        // Move object to represent the new rotation
        const newMove = { axis, value, direction, progress: 0 };
        // Update the store based on whether a rotation is already active or not
        set((state) => {

            // CAS 1 : not active rotation, we can start a new one
            if (state.activeRotation === null) {
                // return new state with the new active rotation and isSolved set to false
                // isSolved = false pour éviter que le highscore se déclenche avant commitRotation
                return { activeRotation: newMove, isSolved: false };
            }

            // CAS 2 : Already an active rotation, we add the new move to the rotationFile queue
            else {
                return { rotationFile: [...state.rotationFile, newMove], isSolved: false };
            }
        });
    },


    // Function to commit the rotation of the cubies in the store
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
                    // Create a vector representing the axis of rotation
                    const axisVector = new THREE.Vector3(
                        axis === 'x' ? 1 : 0,
                        axis === 'y' ? 1 : 0,
                        axis === 'z' ? 1 : 0
                    );
                    // Create a dummy object to perform the rotation and position calculations
                    const dummy = new THREE.Object3D();
                    dummy.position.set(...c.position);
                    dummy.rotation.set(...c.rotation);
                    // Rotate the dummy object around the specified axis by 90 degrees x direction
                    dummy.position.applyAxisAngle(axisVector, -direction * Math.PI / 2);
                    dummy.position.x = Math.round(dummy.position.x * 2) / 2;
                    dummy.position.y = Math.round(dummy.position.y * 2) / 2;
                    dummy.position.z = Math.round(dummy.position.z * 2) / 2;
                    // Rotate the dummy object around the specified axis by 90 degrees x direction
                    dummy.rotateOnWorldAxis(axisVector, -direction * Math.PI / 2);
                    // Update the cubie's position and rotation in the store

                    return {
                        ...c,
                        position: [dummy.position.x, dummy.position.y, dummy.position.z],
                        rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z]
                    };
                } else {
                    return c;
                }

            })
            // Check if the cube is solved after the rotation
            const solved = checkIsSolved(axedCubies);
            if (state.rotationFile.length > 0) {
                const [activeRotation, ...rest] = state.rotationFile;
                return { cubies: axedCubies, activeRotation, rotationFile: rest, isSolved: solved };
            }
            return { cubies: axedCubies, activeRotation: null, isSolved: solved };
        })
    }

}));