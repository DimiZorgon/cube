import React from 'react';
import { Cubie } from './Cubie';
import { useCubeStore } from '../store/useCubeStore';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function RubiksCube() {
    // get data from the store
    const cubiesData = useCubeStore(state => state.cubies);
    const activeRotation = useCubeStore(state => state.activeRotation);
    const commitRotation = useCubeStore(state => state.commitRotation);
    const dico_axis = { x: 0, y: 1, z: 2 };

    const rotatingGroupRef = useRef();
    const currentAngle = useRef(0);

    useFrame((state, delta) => {
        // if there is an active rotation, apply the rotation to the group of cubies
        if (activeRotation !== null && rotatingGroupRef.current) {

            // speed
            const speed = 5;

            // calculate the step based on speed and delta time
            const step = speed * delta;

            // update the current angle of rotation
            currentAngle.current += step;

            // apply the rotation to the group of cubies based on the active rotation axis and direction
            rotatingGroupRef.current.rotation[activeRotation.axis] = currentAngle.current * -activeRotation.direction;

            // if the current angle exceeds 90 degrees (π/2 radians), commit the rotation and reset the angle and group rotation
            if (currentAngle.current >= Math.PI / 2) {

                // commit rotation
                commitRotation(activeRotation.axis, activeRotation.value, activeRotation.direction);

                // reset angle and group rotation
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
    }
    else {
        movingCubies = [];
        staticCubies = cubiesData;
    }


    // Render the Rubik's Cube with static and moving cubies
    return (
        <group>
            <group>
                {/* transforme chaque donnée en un vrai composant graphique <Cubie> */}
                {staticCubies.map(data => (
                    <Cubie key={data.id} position={data.position} initialPosition={data.initialPosition} rotation={data.rotation} />
                ))}
            </group>
            {/* Cubies en rotation */}
            <group ref={rotatingGroupRef}>

                {movingCubies.map(data => (
                    <Cubie key={data.id} position={data.position} initialPosition={data.initialPosition} rotation={data.rotation} />
                ))}
            </group>
        </group>
    );
}
