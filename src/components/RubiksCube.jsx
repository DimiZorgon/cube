import React from 'react';
import { Cubie } from './Cubie';
import { useCubeStore } from '../store/useCubeStore';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function RubiksCube() {
    // tableau de données et rotations depuis store
    const cubiesData = useCubeStore(state => state.cubies);
    const activeRotation = useCubeStore(state => state.activeRotation);
    const commitRotation = useCubeStore(state => state.commitRotation);
    const dico_axis = { x: 0, y: 1, z: 2 };

    const rotatingGroupRef = useRef();
    const currentAngle = useRef(0);

    useFrame((state, delta) => {
        // On ne fait quelque chose que si une rotation est en cours
        // ET que notre groupe est bien présent sur l'écran
        if (activeRotation !== null && rotatingGroupRef.current) {

            // vitesse
            const speed = 5;

            // Calculer le morceau d'angle à parcourir pour cette image
            const step = speed * delta;

            // Ajouter ce "step" à notre compteur total
            currentAngle.current += step;

            // Appliquer la rotation au groupe en 3D sur le BON AXE
            rotatingGroupRef.current.rotation[activeRotation.axis] = currentAngle.current * -activeRotation.direction;

            // verification fin de rotation
            if (currentAngle.current >= Math.PI / 2) {

                // commit la rotation
                commitRotation(activeRotation.axis, activeRotation.value, activeRotation.direction);

                // remet variable a 0
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
        movingCubies = cubiesData.filter(data => data.position[dico_axis[activeRotation.axis]] === activeRotation.value);
        staticCubies = cubiesData.filter(data => data.position[dico_axis[activeRotation.axis]] !== activeRotation.value);
    }
    else {
        movingCubies = [];
        staticCubies = cubiesData;
    }


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
