import React from 'react';

export function Cubie({ position, initialPosition, rotation }) {
    const [x, y, z] = position;
    const [ix, iy, iz] = initialPosition;
    const [rx, ry, rz] = rotation;
    // Tu peux placer ça en haut de ton fichier Cubie.jsx ou même dans un fichier séparé
    const COLORS = {
        right: "#B71234",  // rouge
        left: "#ff9900",   // orange
        up: "#FFFFFF",     // Blanc
        down: "#fbff00",   // Jaune
        front: "#009B48",  // Vert
        back: "#0003ad",   // Bleu
        core: "#1C1C1C"    // noir
    };


    const getColors = () => {
        return [
            ix === 1 ? COLORS.right : COLORS.core, // droite
            ix === -1 ? COLORS.left : COLORS.core, // gauche
            iy === 1 ? COLORS.up : COLORS.core, // haut
            iy === -1 ? COLORS.down : COLORS.core, // bas
            iz === 1 ? COLORS.front : COLORS.core, // avant
            iz === -1 ? COLORS.back : COLORS.core, // arriere
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