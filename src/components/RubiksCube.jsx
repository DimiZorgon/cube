import React from 'react';
import { Cubie } from './Cubie';

export function RubiksCube() {
    // On définit un tableau de Cubies
    const cubies = []

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const key = `${x}-${y}-${z}`;
                cubies.push(<Cubie key={key} position={[x, y, z]} />);

            }
        }

    }
    return (
        <group>
            {cubies}
        </group>
    )
}

