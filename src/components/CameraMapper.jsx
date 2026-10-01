import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCubeStore } from '../store/useCubeStore';
import { useRef, useEffect } from 'react';

export function CameraMapper() {
    // Setup de la caméra et du rendu
    const { camera, gl } = useThree();
    const setCameraMapping = useCubeStore(state => state.setCameraMapping);

    // Lecture du store en direct pour fix move
    const cameraMapping = useCubeStore(state => state.cameraMapping);
    const size = useCubeStore(state => state.size);

    const lastMappingRef = useRef("");

    // Stop fix move
    const isSnapping = useRef(false);

    // event mouse down / up for fix move
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

    // Function to determine the dominant axis of a vector and its direction
    const getDominantAxis = (vector) => {
        let max = 0;
        let axis = 'x';
        let value = 1;

        if (Math.abs(vector.x) > max) { max = Math.abs(vector.x); axis = 'x'; value = Math.sign(vector.x); }
        if (Math.abs(vector.y) > max) { max = Math.abs(vector.y); axis = 'y'; value = Math.sign(vector.y); }
        if (Math.abs(vector.z) > max) { max = Math.abs(vector.z); axis = 'z'; value = Math.sign(vector.z); }

        const mappedValue = size === 2 ? value * 0.5 : value;

        return { axis, value: mappedValue, dirMultiplier: value };
    };

    useFrame(() => {
        // update dict of camera mapping based on camera orientation
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const front = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        const left = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion);
        const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
        const back = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

        // New mapping
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

        // fix move logic : if the user is holding the mouse button down, we want to snap the camera to a perfect orientation based on the current mapping
        if (isSnapping.current && cameraMapping) {
            const frontAxis = cameraMapping.Front;
            const upAxis = cameraMapping.Up;

            // perfect position
            const targetPos = new THREE.Vector3(0, 0, 0);
            targetPos[frontAxis.axis] = frontAxis.value * 5; // Face au cube

            // Up axis for perfect orientation
            targetPos[upAxis.axis] += upAxis.value * 3.5;

            // camera distance
            targetPos.setLength(8);

            // up axis
            const targetUp = new THREE.Vector3(0, 0, 0);
            targetUp[upAxis.axis] = upAxis.value;

            // transition
            camera.position.lerp(targetPos, 0.05);
            camera.up.lerp(targetUp, 0.05);
            camera.lookAt(0, 0, 0);
        }
    });

    return null;
}
