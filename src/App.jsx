import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
// import { Cubie } from './components/Cubie';
import { RubiksCube } from './components/RubiksCube';
import { useCubeStore } from './store/useCubeStore';

function App() {
  const [time, setTime] = useState("00:00.00");
  const rotateFace = useCubeStore(state => state.rotateFace);

  const handleMove = (move) => {
    console.log("Move triggered:", move);

    // Mouvements simples
    if (move === "R") {
      rotateFace("x", 1, 1);
    }
    else if (move === "L") {
      rotateFace("x", -1, 1);
    }
    else if (move === "U") {
      rotateFace("y", 1, 1);
    }
    else if (move === "D") {
      rotateFace("y", -1, 1);
    }
    else if (move === "F") {
      rotateFace("z", 1, 1);
    }
    else if (move === "B") {
      rotateFace("z", -1, 1);
    }
    else if (move === "M") {
      rotateFace("x", 0, 1);
    }

    // Mouvements prime
    if (move === "R'") {
      rotateFace("x", 1, -1);
    }
    else if (move === "L'") {
      rotateFace("x", -1, -1);
    }
    else if (move === "U'") {
      rotateFace("y", 1, -1);
    }
    else if (move === "D'") {
      rotateFace("y", -1, -1);
    }
    else if (move === "F'") {
      rotateFace("z", 1, -1);
    }
    else if (move === "B'") {
      rotateFace("z", -1, -1);
    }
    else if (move === "M'") {
      rotateFace("x", 0, -1);
    }


  };

  const handleShuffle = () => {
    console.log("Shuffle triggered");
    // TODO: implement shuffle logic
  };

  const MoveButton = ({ label }) => (
    <button className="move-btn" onClick={() => handleMove(label)}>
      {label}
    </button>
  );

  return (
    <div className="app-container">
      {/* Header: Timer and Shuffle */}
      <header className="header">
        <div className="timer">{time}</div>
        <button className="shuffle-btn" onClick={handleShuffle}>Shuffle</button>
      </header>

      {/* Main Area: 3D Cube and Controls */}
      <main className="main-area">
        {/* 3D Canvas */}
        <div className="cube-container">
          <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} />

            {/* Placeholder Cube */}
            <RubiksCube />

            <OrbitControls enablePan={false} enableZoom={false} />
          </Canvas>
        </div>

        {/* UI Controls overlay */}
        <div className="controls-layer">
          {/* Top buttons: B, U */}
          <div className="pos-top">
            <div className="btn-group">
              <MoveButton label="B" />
              <MoveButton label="B'" />
            </div>
            <div className="btn-group">
              <MoveButton label="U" />
              <MoveButton label="U'" />
            </div>
          </div>

          {/* Left buttons: L */}
          <div className="pos-left">
            <div className="btn-group">
              <MoveButton label="L" />
              <MoveButton label="L'" />
            </div>
          </div>

          {/* Right buttons: R */}
          <div className="pos-right">
            <div className="btn-group">
              <MoveButton label="R" />
              <MoveButton label="R'" />
            </div>
          </div>

          {/* Bottom buttons: F, D, M */}
          <div className="pos-bottom">
            <div className="btn-group">
              <MoveButton label="F" />
              <MoveButton label="F'" />
            </div>
            <div className="btn-group">
              <MoveButton label="D" />
              <MoveButton label="D'" />
            </div>
            <div className="btn-group">
              <MoveButton label="M" />
              <MoveButton label="M'" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
