// src/components/Cubie.jsx
import React from 'react';

export function Cubie({ position, initialPosition, rotation, faceColors }) {
    const [ix, iy, iz] = initialPosition;
    const outer = Math.max(Math.abs(ix), Math.abs(iy), Math.abs(iz), 0.5);
    const threshold = outer - 0.1;

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
        if (faceColors && faceColors.length === 6) {
            return faceColors;
        }
        return [
            ix > threshold ? COLORS.right : COLORS.core,  // droite
            ix < -threshold ? COLORS.left : COLORS.core,  // gauche
            iy > threshold ? COLORS.up : COLORS.core,     // haut
            iy < -threshold ? COLORS.down : COLORS.core,  // bas
            iz > threshold ? COLORS.front : COLORS.core,  // avant
            iz < -threshold ? COLORS.back : COLORS.core,  // arriere
        ];
    };
    const colors = getColors();

    return (
        <mesh position={position} rotation={rotation}>
            <boxGeometry args={[0.95, 0.95, 0.95]} />
            {colors.map((color, index) => (
                <meshStandardMaterial key={index} attach={`material-${index}`} color={color} />
            ))}
        </mesh>
    );
}