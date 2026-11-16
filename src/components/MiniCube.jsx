// src/components/MiniCube.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { generateInitialCubies } from '../store/useCubeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Cubie } from './Cubie';

export function MiniCube({ size }) {
  const cubies = generateInitialCubies(size);
  const cubeScale = useSettingsStore(state => state.cubeScale);
  const camPos = size === 2 ? [3.5, 3.5, 3.5] : size === 4 ? [5.8, 5.8, 5.8] : size === 5 ? [7.2, 7.2, 7.2] : [4.5, 4.5, 4.5];
  return (
    <div className="mini-cube-container">
      <Canvas camera={{ position: camPos, fov: 50 }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <group scale={cubeScale}>
          {cubies.map(data => (
            <Cubie
              key={data.id}
              position={data.position}
              initialPosition={data.initialPosition}
              rotation={data.rotation}
            />
          ))}
        </group>
      </Canvas>
    </div>
  );
}
