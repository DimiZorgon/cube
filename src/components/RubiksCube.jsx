// src/components/RubiksCube.jsx
import React, { useRef, useLayoutEffect } from 'react';
import { Cubie } from './Cubie';
import { useCubeStore } from '../store/useCubeStore';
import { useFrame } from '@react-three/fiber';

export function RubiksCube() {
    const cubiesData = useCubeStore(state => state.cubies);
    const activeRotation = useCubeStore(state => state.activeRotation);
    const commitRotation = useCubeStore(state => state.commitRotation);
    const dico_axis = { x: 0, y: 1, z: 2 };

    const pivotRefs = useRef({});
    const currentAngle = useRef(0);
    const committedRef = useRef(false);

    useLayoutEffect(() => {
        currentAngle.current = 0;
        committedRef.current = false;
        Object.values(pivotRefs.current).forEach(grp => {
            if (grp) grp.rotation.set(0, 0, 0);
        });
    }, [cubiesData, activeRotation]);

    useFrame((_, delta) => {
        if (activeRotation !== null && !committedRef.current) {
            const speed = 5.5;
            currentAngle.current += speed * delta;
            const targetAngle = Math.PI / 2;
            const clampedAngle = Math.min(currentAngle.current, targetAngle);
            const rotValue = clampedAngle * -activeRotation.direction;

            for (const c of cubiesData) {
                const grp = pivotRefs.current[c.id];
                if (!grp) continue;
                const isMoving = activeRotation.value.some(
                    v => Math.abs(c.position[dico_axis[activeRotation.axis]] - v) < 0.1
                );
                if (isMoving) {
                    grp.rotation[activeRotation.axis] = rotValue;
                } else {
                    grp.rotation.set(0, 0, 0);
                }
            }

            if (currentAngle.current >= targetAngle) {
                committedRef.current = true;
                commitRotation(activeRotation.axis, activeRotation.value, activeRotation.direction);
            }
        }
    });

    return (
        <group>
            {cubiesData.map(data => (
                <group
                    key={data.id}
                    ref={el => {
                        pivotRefs.current[data.id] = el;
                    }}
                >
                    <Cubie
                        position={data.position}
                        initialPosition={data.initialPosition}
                        rotation={data.rotation}
                        faceColors={data.faceColors}
                    />
                </group>
            ))}
        </group>
    );
}