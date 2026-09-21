import React from 'react';
import { Cubie } from './Cubie';
import { useCubeStore } from '../store/useCubeStore';

export function RubiksCube() {
    // tableau de données depuis store
    const cubiesData = useCubeStore(state => state.cubies);
    return (
        <group>
            {/* transforme chaque donnée en un vrai composant graphique <Cubie> */}
            {cubiesData.map(data => (
                <Cubie key={data.id} position={data.position} initialPosition={data.initialPosition} rotation={data.rotation} />
            ))}
        </group>
    );
}

