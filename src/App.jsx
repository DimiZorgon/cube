import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrackballControls, OrbitControls } from '@react-three/drei';
// import { Cubie } from './components/Cubie';
import { RubiksCube } from './components/RubiksCube';
import { useCubeStore } from './store/useCubeStore';
import { CameraMapper } from './components/CameraMapper';

function App() {
  const [time, setTime] = useState("00:00.00");
  const startRotation = useCubeStore(state => state.startRotation);
  const cameraMapping = useCubeStore(state => state.cameraMapping);
  const [isMobile, setIsMobile] = useState(false)


  useEffect(() => {
    // vérifie la largeur et met à jour le state
    const handleResize = () => {
      // SI la largeur de la fenêtre (window.innerWidth) est plus petite que 768px, 
      // ALORS on utilise setIsMobile(true), SINON setIsMobile(false)

      setIsMobile(window.innerWidth < 768);
    };

    // écoute les changements de taille de l'écran
    window.addEventListener("resize", handleResize);

    // appelle la fonction une 1ère fois au démarrage pour initialiser la valeur
    handleResize();

    // nettoye pour éviter les fuites de mémoire
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const handleMove = (move) => {
    const { Right, Left, Up, Down, Front, Back } = cameraMapping;

    // Mouvements simples
    if (move === "R") {
      startRotation(Right.axis, Right.value, 1 * Right.dirMultiplier);
    }
    else if (move === "L") {
      startRotation(Left.axis, Left.value, 1 * Left.dirMultiplier);
    }
    else if (move === "U") {
      startRotation(Up.axis, Up.value, 1 * Up.dirMultiplier);
    }
    else if (move === "D") {
      startRotation(Down.axis, Down.value, 1 * Down.dirMultiplier);
    }
    else if (move === "F") {
      startRotation(Front.axis, Front.value, 1 * Front.dirMultiplier);
    }
    else if (move === "B") {
      startRotation(Back.axis, Back.value, 1 * Back.dirMultiplier);
    }
    else if (move === "M") {
      startRotation(Left.axis, 0, 1 * Left.dirMultiplier);
    }

    // Mouvements prime
    if (move === "R'") {
      startRotation(Right.axis, Right.value, -1 * Right.dirMultiplier);
    }
    else if (move === "L'") {
      startRotation(Left.axis, Left.value, -1 * Left.dirMultiplier);
    }
    else if (move === "U'") {
      startRotation(Up.axis, Up.value, -1 * Up.dirMultiplier);
    }
    else if (move === "D'") {
      startRotation(Down.axis, Down.value, -1 * Down.dirMultiplier);
    }
    else if (move === "F'") {
      startRotation(Front.axis, Front.value, -1 * Front.dirMultiplier);
    }
    else if (move === "B'") {
      startRotation(Back.axis, Back.value, -1 * Back.dirMultiplier);
    }
    else if (move === "M'") {
      startRotation(Left.axis, 0, -1 * Left.dirMultiplier);
    }


  };

  const handleShuffle = () => {
    console.log("Shuffle triggered");
    const moves = ["R", "L", "U", "D", "F", "B", "R'", "L'", "U'", "D'", "F'", "B'"];
    let previousMove = "";
    for (let i = 0; i < 20; i++) {
      let randomMove = moves[Math.floor(Math.random() * moves.length)];
      while (randomMove === previousMove + "'" || randomMove + "'" === previousMove) {
        randomMove = moves[Math.floor(Math.random() * moves.length)];
      }
      previousMove = randomMove;
      handleMove(randomMove);
    }
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
          <Canvas camera={{ position: [5, 5, 5], fov: isMobile ? 75 : 65 }}>
            <ambientLight intensity={0.9} />
            <directionalLight position={[10, 10, 10]} intensity={1} />

            {/* Placeholder Cube */}
            <RubiksCube />

            {/* Espion caméra */}
            <CameraMapper />

            {/* Controls */}
            <TrackballControls noPan={true} noZoom={true} rotateSpeed={isMobile ? 5 : 8} />

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
