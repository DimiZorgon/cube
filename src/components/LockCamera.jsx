import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const CustomLockControls = ({ isLocked, cameraMapping }) => {
    const { camera, gl } = useThree();

    const isDragging = useRef(false);
    const previousX = useRef(0);

    useEffect(() => {
        if (!isLocked) return;
        
        const axisVector = new THREE.Vector3(
            cameraMapping.Up.axis === 'x' ? cameraMapping.Up.value : 0,
            cameraMapping.Up.axis === 'y' ? cameraMapping.Up.value : 0,
            cameraMapping.Up.axis === 'z' ? cameraMapping.Up.value : 0
        );

        const onPointerDown = (e) => {
            isDragging.current = true;
            previousX.current = e.clientX;
        };

        const onPointerMove = (e) => {
            if (!isDragging.current) return;

            const deltaX = e.clientX - previousX.current;
            const rotationSpeed = 0.01; 

            camera.position.applyAxisAngle(axisVector, -deltaX * rotationSpeed);
            camera.lookAt(0, 0, 0);

            previousX.current = e.clientX;
        };

        const onPointerUp = () => {
            isDragging.current = false;
        };

        gl.domElement.addEventListener('pointerdown', onPointerDown);
        gl.domElement.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            gl.domElement.removeEventListener('pointerdown', onPointerDown);
            gl.domElement.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [isLocked, camera, gl, cameraMapping]);

    return null;
};
