import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrackballControls, OrbitControls } from '@react-three/drei';
// import { Cubie } from './components/Cubie';
import { RubiksCube } from './components/RubiksCube';
import { useCubeStore } from './store/useCubeStore';
import { CameraMapper } from './components/CameraMapper';
import { CustomLockControls } from './components/LockCamera';


function App() {
  const [time, setTime] = useState("00:00.00");
  const startRotation = useCubeStore(state => state.startRotation);
  const cameraMapping = useCubeStore(state => state.cameraMapping);
  const [isMobile, setIsMobile] = useState(false);
  const [isLocked, setIsLocked] = useState(false);



  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const handleMove = (move) => {
    const { Right, Left, Up, Down, Front, Back } = cameraMapping;

    switch (move) {
      // Mouvements simples (1 tranche)
      case "R":
        startRotation(Right.axis, [Right.value], 1 * Right.dirMultiplier);
        break;
      case "L":
        startRotation(Left.axis, [Left.value], 1 * Left.dirMultiplier);
        break;
      case "U":
        startRotation(Up.axis, [Up.value], 1 * Up.dirMultiplier);
        break;
      case "D":
        startRotation(Down.axis, [Down.value], 1 * Down.dirMultiplier);
        break;
      case "F":
        startRotation(Front.axis, [Front.value], 1 * Front.dirMultiplier);
        break;
      case "B":
        startRotation(Back.axis, [Back.value], 1 * Back.dirMultiplier);
        break;
      case "M":
        startRotation(Left.axis, [0], 1 * Left.dirMultiplier);
        break;

      // Mouvements prime (1 tranche, sens inverse)
      case "R'":
        startRotation(Right.axis, [Right.value], -1 * Right.dirMultiplier);
        break;
      case "L'":
        startRotation(Left.axis, [Left.value], -1 * Left.dirMultiplier);
        break;
      case "U'":
        startRotation(Up.axis, [Up.value], -1 * Up.dirMultiplier);
        break;
      case "D'":
        startRotation(Down.axis, [Down.value], -1 * Down.dirMultiplier);
        break;
      case "F'":
        startRotation(Front.axis, [Front.value], -1 * Front.dirMultiplier);
        break;
      case "B'":
        startRotation(Back.axis, [Back.value], -1 * Back.dirMultiplier);
        break;
      case "M'":
        startRotation(Left.axis, [0], -1 * Left.dirMultiplier);
        break;

      // Mouvements larges (2 tranches)
      case "r":
        startRotation(Right.axis, [Right.value, 0], 1 * Right.dirMultiplier);
        break;
      case "l":
        startRotation(Left.axis, [Left.value, 0], 1 * Left.dirMultiplier);
        break;
      case "u":
        startRotation(Up.axis, [Up.value, 0], 1 * Up.dirMultiplier);
        break;
      case "d":
        startRotation(Down.axis, [Down.value, 0], 1 * Down.dirMultiplier);
        break;
      case "f":
        startRotation(Front.axis, [Front.value, 0], 1 * Front.dirMultiplier);
        break;
      case "b":
        startRotation(Back.axis, [Back.value, 0], 1 * Back.dirMultiplier);
        break;

      // Mouvements larges prime (2 tranches, sens inverse)
      case "r'":
        startRotation(Right.axis, [Right.value, 0], -1 * Right.dirMultiplier);
        break;
      case "l'":
        startRotation(Left.axis, [Left.value, 0], -1 * Left.dirMultiplier);
        break;
      case "u'":
        startRotation(Up.axis, [Up.value, 0], -1 * Up.dirMultiplier);
        break;
      case "d'":
        startRotation(Down.axis, [Down.value, 0], -1 * Down.dirMultiplier);
        break;
      case "f'":
        startRotation(Front.axis, [Front.value, 0], -1 * Front.dirMultiplier);
        break;
      case "b'":
        startRotation(Back.axis, [Back.value, 0], -1 * Back.dirMultiplier);
        break;

      default:
        console.warn(`Mouvement non reconnu : ${move}`);
        break;
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

  const MoveButton = ({ label }) => {
    const timerRef = useRef(null)
    const handlePointerDown = () => {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        handleMove(label.toLowerCase());
      }, 500)

    }
    const handlePointerUp = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        handleMove(label);
      }
    };

    return (
      <button
        className="move-btn"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {label}
      </button>
    )
  };

  return (
    <div className="app-container">
      {/* Header: Timer and Shuffle */}
      <header className="header">
        <div className="timer">{time}</div>
        <button className="shuffle-btn" onClick={handleShuffle}>Shuffle</button>
        <button className="shuffle-btn" onClick={() => setIsLocked(!isLocked)}>
          {isLocked ? "Déverrouiller" : "Verrouiller"}
        </button>

      </header>

      {/* Main Area: 3D Cube and Controls */}
      <main className="main-area">
        {/* 3D Canvas */}
        <div className="cube-container">
          <Canvas camera={{ position: [5, 5, 5], fov: isMobile ? 65 : 55 }}>
            <ambientLight intensity={1} />
            <directionalLight position={[10, 10, 10]} intensity={1} />

            {/* Placeholder Cube */}
            <RubiksCube />

            {/* Espion caméra */}
            <CameraMapper />

            {/* Controls */}
            <TrackballControls enabled={!isLocked} noPan={true} noZoom={true} rotateSpeed={isMobile ? 5 : 8} />
            <CustomLockControls isLocked={isLocked} cameraMapping={cameraMapping} />

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
              <MoveButton label="M" />
              <MoveButton label="M'" />
            </div>
            <div className="btn-group">
              <MoveButton label="D" />
              <MoveButton label="D'" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
