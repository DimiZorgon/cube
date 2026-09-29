import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import { RubiksCube } from './components/RubiksCube';
import { useCubeStore } from './store/useCubeStore';
import { CameraMapper } from './components/CameraMapper';
import { CustomLockControls } from './components/LockCamera';
import confetti from 'canvas-confetti';

const MoveButton = ({ label, onMove }) => {
  const timerRef = useRef(null);

  const handlePointerDown = () => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onMove(label.toLowerCase());
    }, 500);
  };

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
  );
};

function App() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startRotation = useCubeStore(state => state.startRotation);
  const cameraMapping = useCubeStore(state => state.cameraMapping);
  const [isMobile, setIsMobile] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const isSolved = useCubeStore(state => state.isSolved);
  const [highScore, setHighScore] = useState(localStorage.getItem('rubiksHighScore') || null);
  const [hasShuffled, setHasShuffled] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let intervalId;
    if (isRunning) {
      intervalId = setInterval(() => setTime(t => t + 10), 10);
    } else {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [isRunning]);

  useEffect(() => {
    if (isSolved && isRunning) {
      setIsRunning(false);
      setHasShuffled(false);
      if (!highScore || time < highScore) {
        localStorage.setItem('rubiksHighScore', time);
        setHighScore(time);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  }, [isSolved, isRunning, highScore, time]);

  const handleMove = (move, isManual = true) => {
    if (isSolved && isManual) return;
    if (isManual) {
      if (hasShuffled && !isRunning && time === 0) setIsRunning(true);
      if (!isSolved) setMoveCount(prev => prev + 1);
    }

    const { Right, Left, Up, Down, Front, Back } = cameraMapping;

    switch (move) {
      case "R": startRotation(Right.axis, [Right.value], 1 * Right.dirMultiplier); break;
      case "L": startRotation(Left.axis, [Left.value], 1 * Left.dirMultiplier); break;
      case "U": startRotation(Up.axis, [Up.value], 1 * Up.dirMultiplier); break;
      case "D": startRotation(Down.axis, [Down.value], 1 * Down.dirMultiplier); break;
      case "F": startRotation(Front.axis, [Front.value], 1 * Front.dirMultiplier); break;
      case "B": startRotation(Back.axis, [Back.value], 1 * Back.dirMultiplier); break;
      case "M": startRotation(Left.axis, [0], 1 * Left.dirMultiplier); break;
      case "R'": startRotation(Right.axis, [Right.value], -1 * Right.dirMultiplier); break;
      case "L'": startRotation(Left.axis, [Left.value], -1 * Left.dirMultiplier); break;
      case "U'": startRotation(Up.axis, [Up.value], -1 * Up.dirMultiplier); break;
      case "D'": startRotation(Down.axis, [Down.value], -1 * Down.dirMultiplier); break;
      case "F'": startRotation(Front.axis, [Front.value], -1 * Front.dirMultiplier); break;
      case "B'": startRotation(Back.axis, [Back.value], -1 * Back.dirMultiplier); break;
      case "M'": startRotation(Left.axis, [0], -1 * Left.dirMultiplier); break;
      case "r": startRotation(Right.axis, [Right.value, 0], 1 * Right.dirMultiplier); break;
      case "l": startRotation(Left.axis, [Left.value, 0], 1 * Left.dirMultiplier); break;
      case "u": startRotation(Up.axis, [Up.value, 0], 1 * Up.dirMultiplier); break;
      case "d": startRotation(Down.axis, [Down.value, 0], 1 * Down.dirMultiplier); break;
      case "f": startRotation(Front.axis, [Front.value, 0], 1 * Front.dirMultiplier); break;
      case "b": startRotation(Back.axis, [Back.value, 0], 1 * Back.dirMultiplier); break;
      case "r'": startRotation(Right.axis, [Right.value, 0], -1 * Right.dirMultiplier); break;
      case "l'": startRotation(Left.axis, [Left.value, 0], -1 * Left.dirMultiplier); break;
      case "u'": startRotation(Up.axis, [Up.value, 0], -1 * Up.dirMultiplier); break;
      case "d'": startRotation(Down.axis, [Down.value, 0], -1 * Down.dirMultiplier); break;
      case "f'": startRotation(Front.axis, [Front.value, 0], -1 * Front.dirMultiplier); break;
      case "b'": startRotation(Back.axis, [Back.value, 0], -1 * Back.dirMultiplier); break;
      default: break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      const keyMap = {
        'r': 'R', 'l': 'L', 'u': 'U', 'd': 'D', 'f': 'F', 'b': 'B', 'm': 'M',
        'R': "R'", 'L': "L'", 'U': "U'", 'D': "D'", 'F': "F'", 'B': "B'", 'M': "M'"
      };
      if (keyMap[e.key]) handleMove(keyMap[e.key], true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraMapping, hasShuffled, isRunning, time]);

  const handleShuffle = () => {
    const moves = ["R", "L", "U", "D", "F", "B", "R'", "L'", "U'", "D'", "F'", "B'"];
    let previousMove = "";
    for (let i = 0; i < 20; i++) {
      let randomMove = moves[Math.floor(Math.random() * moves.length)];
      while (randomMove === previousMove + "'" || randomMove + "'" === previousMove) {
        randomMove = moves[Math.floor(Math.random() * moves.length)];
      }
      previousMove = randomMove;
      handleMove(randomMove, false);
    }
    setTime(0);
    setMoveCount(0);
    setIsRunning(false);
    setHasShuffled(true);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((time % 60000) / 1000).toString().padStart(2, '0');
    const centiseconds = Math.floor((time % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${centiseconds}`;
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <div className="highscore">High Score: {highScore ? formatTime(highScore) : "-"}</div>
        </div>
        <div className="header-center">
          <button className="shuffle-btn" onClick={handleShuffle}>Shuffle</button>
        </div>
        <div className="header-right">
          <button className="shuffle-btn" onClick={() => setIsLocked(!isLocked)}>
            {isLocked ? (isMobile ? "🔒" : "🔒 Locked") : (isMobile ? "🔓" : "🔓 Unlocked")}
          </button>
        </div>
      </header>

      <main className="main-area">
        <div className="stats-container" style={{ display: 'flex', gap: '2rem', alignItems: 'center', position: 'relative', zIndex: 3 }}>
          <div className="timer" style={{ margin: '0 0 0 2rem' }}>{formatTime(time)}</div>
          <div className="moves-count" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Moves: {moveCount}</div>
        </div>

        <div className="cube-container">
          <Canvas camera={{ position: [5, 5, 5], fov: isMobile ? 80 : 65 }}>
            <ambientLight intensity={1} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <RubiksCube />
            <CameraMapper />

            {/* Controls */}
            <TrackballControls enabled={!isLocked} noPan={true} noZoom={true} rotateSpeed={isMobile ? 2 : 7} />
            <CustomLockControls isLocked={isLocked} cameraMapping={cameraMapping} />
          </Canvas>
        </div>

        <div className="controls-layer">
          <div className="pos-top">
            <div className="btn-group">
              <MoveButton label="B" onMove={(m) => handleMove(m, true)} />
              <MoveButton label="B'" onMove={(m) => handleMove(m, true)} />
            </div>
            <div className="btn-group">
              <MoveButton label="U" onMove={(m) => handleMove(m, true)} />
              <MoveButton label="U'" onMove={(m) => handleMove(m, true)} />
            </div>
          </div>
          <div className="pos-left">
            <div className="btn-group">
              <MoveButton label="L" onMove={(m) => handleMove(m, true)} />
              <MoveButton label="L'" onMove={(m) => handleMove(m, true)} />
            </div>
          </div>
          <div className="pos-right">
            <div className="btn-group">
              <MoveButton label="R" onMove={(m) => handleMove(m, true)} />
              <MoveButton label="R'" onMove={(m) => handleMove(m, true)} />
            </div>
          </div>
          <div className="pos-bottom">
            <div className="btn-group">
              <MoveButton label="F" onMove={(m) => handleMove(m, true)} />
              <MoveButton label="F'" onMove={(m) => handleMove(m, true)} />
            </div>
            <div className="btn-group">
              <MoveButton label="M" onMove={(m) => handleMove(m, true)} />
              <MoveButton label="M'" onMove={(m) => handleMove(m, true)} />
            </div>
            <div className="btn-group">
              <MoveButton label="D" onMove={(m) => handleMove(m, true)} />
              <MoveButton label="D'" onMove={(m) => handleMove(m, true)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
