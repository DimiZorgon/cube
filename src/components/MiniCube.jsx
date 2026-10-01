import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { generateInitialCubies } from '../store/useCubeStore';
import { Cubie } from './Cubie';

export function MiniCube({ size }) {
  const cubies = generateInitialCubies(size);
  const camPos = size === 2 ? [3.5, 3.5, 3.5] : [4.5, 4.5, 4.5];
  return (
    <div className="mini-cube-container">
      <Canvas camera={{ position: camPos, fov: 50 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <group>
          {cubies.map(data => (
            <Cubie key={data.id} position={data.position} initialPosition={data.initialPosition} rotation={data.rotation} />
          ))}
        </group>
        <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  );
}
