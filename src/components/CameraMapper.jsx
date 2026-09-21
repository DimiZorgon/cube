import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCubeStore } from '../store/useCubeStore';
import { useRef } from 'react';

export function CameraMapper() {
    const { camera } = useThree();
    const setCameraMapping = useCubeStore(state => state.setCameraMapping);

    // mémoire cachée pour éviter de faire exploser React
    const lastMappingRef = useRef("");

    // Fonction mathématique pour trouver l'axe le plus proche
    const getDominantAxis = (vector) => {
        let max = 0;
        let axis = 'x';
        let value = 1;

        // On regarde quelle coordonnée (x, y ou z) est la plus grande
        if (Math.abs(vector.x) > max) { max = Math.abs(vector.x); axis = 'x'; value = Math.sign(vector.x); }
        if (Math.abs(vector.y) > max) { max = Math.abs(vector.y); axis = 'y'; value = Math.sign(vector.y); }
        if (Math.abs(vector.z) > max) { max = Math.abs(vector.z); axis = 'z'; value = Math.sign(vector.z); }

        // dirMultiplier est égal à value pour garder le sens horaire correct par rapport à l'écran
        return { axis, value, dirMultiplier: value };
    };

    useFrame(() => {
        // On crée les flèches imaginaires de l'écran (Droite, Haut, Avant)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const front = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);

        // Et les inverses (Gauche, Bas, Arrière)
        const left = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion);
        const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
        const back = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

        // On demande à notre fonction mathématique de trouver les vrais axes du monde
        const newMapping = {
            Right: getDominantAxis(right),
            Up: getDominantAxis(up),
            Front: getDominantAxis(front),
            Left: getDominantAxis(left),
            Down: getDominantAxis(down),
            Back: getDominantAxis(back)
        };

        // On transforme l'objet en texte pour le comparer facilement
        const mappingString = JSON.stringify(newMapping);

        // Si le dictionnaire a changé depuis la dernière image, on met à jour le Store !
        if (mappingString !== lastMappingRef.current) {
            lastMappingRef.current = mappingString;
            setCameraMapping(newMapping);
        }
    });

    return null;
}
