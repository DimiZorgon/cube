import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCubeStore } from '../store/useCubeStore';
import { useRef, useEffect } from 'react';

export function CameraMapper() {
    // ajout 'gl' pour avoir accès à la fenêtre 3D
    const { camera, gl } = useThree();
    const setCameraMapping = useCubeStore(state => state.setCameraMapping);

    // Lecture du store en direct pour notre aimant
    const cameraMapping = useCubeStore(state => state.cameraMapping);

    const lastMappingRef = useRef("");

    // Notre interrupteur pour l'aimant
    const isSnapping = useRef(false);

    // Écouter la souris pour savoir quand le joueur lâche le cube
    useEffect(() => {
        const handleDown = () => { isSnapping.current = false; };
        const handleUp = () => { isSnapping.current = true; };

        gl.domElement.addEventListener('pointerdown', handleDown);
        window.addEventListener('pointerup', handleUp); // window pour capter même en dehors du cadre

        return () => {
            gl.domElement.removeEventListener('pointerdown', handleDown);
            window.removeEventListener('pointerup', handleUp);
        }
    }, [gl]);

    // Fonction mathématique pour trouver l'axe le plus proche
    const getDominantAxis = (vector) => {
        let max = 0;
        let axis = 'x';
        let value = 1;

        if (Math.abs(vector.x) > max) { max = Math.abs(vector.x); axis = 'x'; value = Math.sign(vector.x); }
        if (Math.abs(vector.y) > max) { max = Math.abs(vector.y); axis = 'y'; value = Math.sign(vector.y); }
        if (Math.abs(vector.z) > max) { max = Math.abs(vector.z); axis = 'z'; value = Math.sign(vector.z); }

        return { axis, value, dirMultiplier: value };
    };

    useFrame(() => {
        // mise a jour du dictionnaire (l'espion)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const front = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        const left = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion);
        const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
        const back = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

        // on transforme l'objet en texte pour le comparer facilement
        const newMapping = {
            Right: getDominantAxis(right),
            Up: getDominantAxis(up),
            Front: getDominantAxis(front),
            Left: getDominantAxis(left),
            Down: getDominantAxis(down),
            Back: getDominantAxis(back)
        };


        const mappingString = JSON.stringify(newMapping);
        if (mappingString !== lastMappingRef.current) {
            lastMappingRef.current = mappingString;
            setCameraMapping(newMapping);
        }

        // "aimant"
        // joueur lache souris -> on prend le contrôle
        if (isSnapping.current && cameraMapping) {
            const frontAxis = cameraMapping.Front;
            const upAxis = cameraMapping.Up;

            // position parfaite
            const targetPos = new THREE.Vector3(0, 0, 0);
            targetPos[frontAxis.axis] = frontAxis.value * 5; // Face au cube

            // inclinaison vers le haut
            targetPos[upAxis.axis] += upAxis.value * 3.5;

            // on repousse la caméra pour qu'elle soit toujours à une distance de 8
            targetPos.setLength(8);

            // axe Haut parfait
            const targetUp = new THREE.Vector3(0, 0, 0);
            targetUp[upAxis.axis] = upAxis.value;

            // transition fluide (0.05 = vitesse)
            camera.position.lerp(targetPos, 0.05);
            camera.up.lerp(targetUp, 0.05);
            camera.lookAt(0, 0, 0);
        }
    });

    return null;
}
