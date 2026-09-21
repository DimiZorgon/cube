import React from 'react';

export function Cubie({ position }) {
    const [x, y, z] = position;

    const getColors = () => {
        return [
            x === 1 ? 'red' : 'black', // Droite
            x === -1 ? 'orange' : 'black', // Gauche
            y === 1 ? 'white' : 'black', //haut
            y === -1 ? 'yellow' : 'black', //bas
            z === 1 ? 'green' : 'black', // avant
            z === -1 ? 'blue' : 'black', //arriere
        ];
    };
    const colors = getColors();

    return (
        <mesh position={position}>
            {/* 0.95 pour créer petit espace noir entre les cubes */}
            <boxGeometry args={[0.95, 0.95, 0.95]} />

            {/* tableau de 6 matériaux générés par notre liste de couleurs */}
            {colors.map((color, index) => (
                <meshStandardMaterial key={index} attach={`material-${index}`} color={color} />
            ))}
        </mesh>
    );
};