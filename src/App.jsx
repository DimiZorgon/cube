import React, { useState } from 'react';
import { Cube3x3 } from './components/Cube3x3';
import { Cube2x2 } from './components/Cube2x2';
import { RubiksCube } from './components/RubiksCube';

import './App.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { generateInitialCubies } from './store/useCubeStore';
import { Cubie } from './components/Cubie';

function MiniCube({ size }) {
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

function App() {
  const [mode, setMode] = useState(null); // '2x2' or '3x3'

  if (mode === '3x3') {
    return <Cube3x3 onBack={() => setMode(null)} />;
  }

  if (mode === '2x2') {
    return <Cube2x2 onBack={() => setMode(null)} />;
  }

  // Render the initial mode selection screen
  return (
    <div className="main-menu-container">
      <h1 className="main-menu-title">Rubik's Cube</h1>
      <div className="main-menu-buttons">
        <button 
          className="menu-btn" 
          onClick={() => setMode('2x2')}
        >
          <MiniCube size={2} />
          <span> 2x2 </span>
        </button>
        <button 
          className="menu-btn" 
          onClick={() => setMode('3x3')}
        >
          <MiniCube size={3} />
          <span> 3x3 </span>
        </button>
      </div>
    </div>
  );
}

export default App;
