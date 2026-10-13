import * as THREE from 'three';

export const checkIsSolved = (cubies) => {
    if (cubies.length === 0) return true;

    const firstCubie = cubies[0];
    const qGlobal = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(firstCubie.rotation[0], firstCubie.rotation[1], firstCubie.rotation[2])
    );

    return cubies.every(c => {
        const expectedPos = new THREE.Vector3(...c.initialPosition).applyQuaternion(qGlobal);
        if (Math.abs(c.position[0] - expectedPos.x) > 0.1 ||
            Math.abs(c.position[1] - expectedPos.y) > 0.1 ||
            Math.abs(c.position[2] - expectedPos.z) > 0.1) {
            return false;
        }

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
    return cubies;
};
