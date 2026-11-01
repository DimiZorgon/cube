// src/components/Cubie.jsx
import React from 'react';
import * as THREE from 'three';
import { useSettingsStore } from '../store/useSettingsStore';

const CORE_COLOR = '#1C1C1C';

const FACE_TRANSFORMS = [
    { pos: [0.475, 0, 0], rot: [0, Math.PI / 2, 0] },   // 0: right (+X)
    { pos: [-0.475, 0, 0], rot: [0, -Math.PI / 2, 0] }, // 1: left (-X)
    { pos: [0, 0.475, 0], rot: [-Math.PI / 2, 0, 0] },  // 2: up (+Y)
    { pos: [0, -0.475, 0], rot: [Math.PI / 2, 0, 0] },  // 3: down (-Y)
    { pos: [0, 0, 0.475], rot: [0, 0, 0] },             // 4: front (+Z)
    { pos: [0, 0, -0.475], rot: [0, Math.PI, 0] }       // 5: back (-Z)
];

export function Cubie({ position, initialPosition, rotation, faceColors, forceHollow }) {
    const customColors = useSettingsStore(state => state.colors);
    const storeHollow = useSettingsStore(state => state.hollowCube);
    const isHollow = forceHollow !== undefined ? forceHollow : storeHollow;

    const [ix, iy, iz] = initialPosition;
    const outer = Math.max(Math.abs(ix), Math.abs(iy), Math.abs(iz), 0.5);
    const threshold = outer - 0.1;

    const getColors = () => {
        if (faceColors && faceColors.length === 6) {
            return faceColors;
        }
        return [
            ix > threshold ? customColors.right : CORE_COLOR,
            ix < -threshold ? customColors.left : CORE_COLOR,
            iy > threshold ? customColors.up : CORE_COLOR,
            iy < -threshold ? customColors.down : CORE_COLOR,
            iz > threshold ? customColors.front : CORE_COLOR,
            iz < -threshold ? customColors.back : CORE_COLOR
        ];
    };
    const colors = getColors();

    if (isHollow) {
        return (
            <group position={position} rotation={rotation}>
                {/* Hitbox invisible pour que le raycast tactile détecte toujours la pièce */}
                <mesh userData={{ cubiePosition: position }}>
                    <boxGeometry args={[0.96, 0.96, 0.96]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
                {colors.map((color, index) => {
                    if (color === CORE_COLOR) return null;
                    const tf = FACE_TRANSFORMS[index];
                    return (
                        <mesh
                            key={index}
                            position={tf.pos}
                            rotation={tf.rot}
                            userData={{ cubiePosition: position }}
                        >
                            <planeGeometry args={[0.82, 0.82]} />
                            <meshStandardMaterial color={color} side={THREE.DoubleSide} />
                        </mesh>
                    );
                })}
            </group>
        );
    }

    return (
        <mesh position={position} rotation={rotation} userData={{ cubiePosition: position }}>
            <boxGeometry args={[0.95, 0.95, 0.95]} />
            {colors.map((color, index) => (
                <meshStandardMaterial key={index} attach={`material-${index}`} color={color} />
            ))}
        </mesh>
    );
}
