import React from 'react';

export function Cubie({ position, initialPosition, rotation }) {
    const [x, y, z] = position;
    const [ix, iy, iz] = initialPosition;
    const [rx, ry, rz] = rotation;


    const getColors = () => {
        return [
            ix === 1 ? 'red' : 'black', // Droite
            ix === -1 ? 'orange' : 'black', // Gauche
            iy === 1 ? 'white' : 'black', //haut
            iy === -1 ? 'yellow' : 'black', //bas
            iz === 1 ? 'green' : 'black', // avant
            iz === -1 ? 'blue' : 'black', //arriere
        ];
    };
    const colors = getColors();

    return (
        <mesh position={position} rotation={rotation}>
            {/* 0.95 pour créer petit espace noir entre les cubes */}
            <boxGeometry args={[0.95, 0.95, 0.95]} />

            {/* tableau de 6 matériaux générés par notre liste de couleurs */}
            {colors.map((color, index) => (
                <meshStandardMaterial key={index} attach={`material-${index}`} color={color} />
            ))}
        </mesh>
    );
};