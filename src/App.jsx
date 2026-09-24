import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrackballControls, OrbitControls } from '@react-three/drei';
// import { Cubie } from './components/Cubie';
import { RubiksCube } from './components/RubiksCube';
import { useCubeStore } from './store/useCubeStore';
import { CameraMapper } from './components/CameraMapper';
import { CustomLockControls } from './components/LockCamera';


const MoveButton = ({ label, onMove }) => {
  const timerRef = useRef(null)
  const handlePointerDown = () => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onMove(label.toLowerCase());
    }, 500)

  }
  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onMove(label);
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

function App() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startRotation = useCubeStore(state => state.startRotation);
  const cameraMapping = useCubeStore(state => state.cameraMapping);
  const [isMobile, setIsMobile] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const isSolved = useCubeStore(state => state.isSolved);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  useEffect(() => {
    let intervalId;

    if (isRunning) {
      intervalId = setInterval(() => {
        setTime((prevTime) => prevTime + 10);
      }, 10);
    } else {
      clearInterval(intervalId);
    }

    return () => clearInterval(intervalId);
  }, [isRunning]);

  useEffect(() => {
    if (isSolved && isRunning) {
      setIsRunning(false);
      console.log("VICTOIRE !");
    }
  }, [isSolved, isRunning]);



  const handleMove = (move) => {
    if (!isRunning && time === 0) {
      setIsRunning(true);
    }
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
    const moves = ["R", "L", "U", "D", "F", "B", "R'", "L'", "U'", "D'", "F'", "B'"];
    let previousMove = "";
    for (let i = 0; i < 21; i++) {
      let randomMove = moves[Math.floor(Math.random() * moves.length)];
      while (randomMove === previousMove + "'" || randomMove + "'" === previousMove) {
        randomMove = moves[Math.floor(Math.random() * moves.length)];
      }
      previousMove = randomMove;
      handleMove(randomMove);
    }
    setTime(0);
    setIsRunning(false);
  };


  const formatTime = (time) => {
    const minutes = Math.floor(time / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((time % 60000) / 1000).toString().padStart(2, '0');
    const centiseconds = Math.floor((time % 1000) / 10).toString().padStart(2, '0');

    return `${minutes}:${seconds}.${centiseconds}`;
  };

  return (
    <div className="app-container">
      {/* Header: Timer and Shuffle */}
      <header className="header">
        <div className="timer">{formatTime(time)}</div>
        <button className="shuffle-btn" onClick={handleShuffle}>Shuffle</button>
        <button className="shuffle-btn" onClick={() => setIsLocked(!isLocked)}>
          {isLocked ? isMobile ? "🔒" : "🔒 Locked" : isMobile ? "🔓" : "🔓 Unlocked"}
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
              <MoveButton label="B" onMove={handleMove} />
              <MoveButton label="B'" onMove={handleMove} />
            </div>
            <div className="btn-group">
              <MoveButton label="U" onMove={handleMove} />
              <MoveButton label="U'" onMove={handleMove} />
            </div>
          </div>

          {/* Left buttons: L */}
          <div className="pos-left">
            <div className="btn-group">
              <MoveButton label="L" onMove={handleMove} />
              <MoveButton label="L'" onMove={handleMove} />
            </div>
          </div>

          {/* Right buttons: R */}
          <div className="pos-right">
            <div className="btn-group">
              <MoveButton label="R" onMove={handleMove} />
              <MoveButton label="R'" onMove={handleMove} />
            </div>
          </div>

          {/* Bottom buttons: F, D, M */}
          <div className="pos-bottom">
            <div className="btn-group">
              <MoveButton label="F" onMove={handleMove} />
              <MoveButton label="F'" onMove={handleMove} />
            </div>
            <div className="btn-group">
              <MoveButton label="M" onMove={handleMove} />
              <MoveButton label="M'" onMove={handleMove} />
            </div>
            <div className="btn-group">
              <MoveButton label="D" onMove={handleMove} />
              <MoveButton label="D'" onMove={handleMove} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



export default App;
