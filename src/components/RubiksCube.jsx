// src/components/RubiksCube.jsx
import React, { useRef } from 'react';
import { Cubie } from './Cubie';
import { useCubeStore } from '../store/useCubeStore';
import { useFrame } from '@react-three/fiber';

export function RubiksCube() {
    const cubiesData = useCubeStore(state => state.cubies);
    const activeRotation = useCubeStore(state => state.activeRotation);
    const commitRotation = useCubeStore(state => state.commitRotation);
    const dico_axis = { x: 0, y: 1, z: 2 };

    const rotatingGroupRef = useRef();
    const currentAngle = useRef(0);

    useFrame((state, delta) => {
        if (activeRotation !== null && rotatingGroupRef.current) {
            const speed = 5;
            const step = speed * delta;
            currentAngle.current += step;

            rotatingGroupRef.current.rotation[activeRotation.axis] = currentAngle.current * -activeRotation.direction;

            if (currentAngle.current >= Math.PI / 2) {
                commitRotation(activeRotation.axis, activeRotation.value, activeRotation.direction);
                currentAngle.current = 0;
                rotatingGroupRef.current.rotation.x = 0;
                rotatingGroupRef.current.rotation.y = 0;
                rotatingGroupRef.current.rotation.z = 0;
            }
        }
    });

    let movingCubies = [];
    let staticCubies = [];

    if (activeRotation !== null) {
        movingCubies = cubiesData.filter(data => activeRotation.value.some(v => Math.abs(data.position[dico_axis[activeRotation.axis]] - v) < 0.1));
        staticCubies = cubiesData.filter(data => !activeRotation.value.some(v => Math.abs(data.position[dico_axis[activeRotation.axis]] - v) < 0.1));
    } else {
        movingCubies = [];
        staticCubies = cubiesData;
    }

    return (
        <group>
            <group>
                {staticCubies.map(data => (
                    <Cubie
                        key={data.id}
                        position={data.position}
                        initialPosition={data.initialPosition}
                        rotation={data.rotation}
                        faceColors={data.faceColors}
                    />
                ))}
            </group>
            <group ref={rotatingGroupRef}>
                {movingCubies.map(data => (
                    <Cubie
                        key={data.id}
                        position={data.position}
                        initialPosition={data.initialPosition}
                        rotation={data.rotation}
                        faceColors={data.faceColors}
                    />
                ))}
            </group>
        </group>
    );
}