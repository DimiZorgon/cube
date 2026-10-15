// src/components/CameraMapper.jsx
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCubeStore } from '../store/useCubeStore';
import { useRef, useEffect } from 'react';

export function CameraMapper() {
    const { camera, gl } = useThree();
    const setCameraMapping = useCubeStore(state => state.setCameraMapping);
    const cameraMapping = useCubeStore(state => state.cameraMapping);
    const size = useCubeStore(state => state.size);

    const lastMappingRef = useRef("");
    const isSnapping = useRef(false);

    useEffect(() => {
        const handleDown = () => { isSnapping.current = false; };
        const handleUp = () => { isSnapping.current = true; };

        gl.domElement.addEventListener('pointerdown', handleDown);
        window.addEventListener('pointerup', handleUp);

        return () => {
            gl.domElement.removeEventListener('pointerdown', handleDown);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [gl]);

    const getDominantAxis = (vector) => {
        let max = 0;
        let axis = 'x';
        let value = 1;

        if (Math.abs(vector.x) > max) { max = Math.abs(vector.x); axis = 'x'; value = Math.sign(vector.x); }
        if (Math.abs(vector.y) > max) { max = Math.abs(vector.y); axis = 'y'; value = Math.sign(vector.y); }
        if (Math.abs(vector.z) > max) { max = Math.abs(vector.z); axis = 'z'; value = Math.sign(vector.z); }

        const outer = (size - 1) / 2;
        const mappedValue = value * outer;

        return { axis, value: mappedValue, dirMultiplier: value };
    };

    useFrame(() => {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const front = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        const left = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion);
        const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
        const back = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

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

        if (isSnapping.current && cameraMapping) {
            const frontAxis = cameraMapping.Front;
            const upAxis = cameraMapping.Up;

            const targetPos = new THREE.Vector3(0, 0, 0);
            targetPos[frontAxis.axis] = Math.sign(frontAxis.value) * 5;
            targetPos[upAxis.axis] += Math.sign(upAxis.value) * 3.5;

            targetPos.setLength(size === 4 ? 9.8 : 8);

            const targetUp = new THREE.Vector3(0, 0, 0);
            targetUp[upAxis.axis] = Math.sign(upAxis.value);

            camera.position.lerp(targetPos, 0.05);
            camera.up.lerp(targetUp, 0.05);
            camera.lookAt(0, 0, 0);
        }
    });

    return null;
}