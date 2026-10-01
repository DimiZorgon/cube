import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import { RubiksCube } from './RubiksCube';
import { useCubeStore } from '../store/useCubeStore';
import { CameraMapper } from './CameraMapper';
import { CustomLockControls } from './LockCamera';
import confetti from 'canvas-confetti';

// Main component for the Cube Game
export function CubeGame({ size, controlsRenderer, keyboardMapping, shuffleMoves, onBack }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  const initCube = useCubeStore(state => state.initCube);
  const cameraMapping = useCubeStore(state => state.cameraMapping);
  const isSolved = useCubeStore(state => state.isSolved);
  const handleMoveAction = useCubeStore(state => state.startRotation);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const highScoreKey = `rubiksHighScore_${size}x${size}`;
  const [highScore, setHighScore] = useState(localStorage.getItem(highScoreKey) || null);
  const [hasShuffled, setHasShuffled] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  // Effect to initialize the cube when the size changes
  useEffect(() => {
    initCube(size);
  }, [size, initCube]);

  // Effect to handle window resize and determine if the device is mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect to manage the timer based on whether the game is running
  useEffect(() => {
    let intervalId;
    if (isRunning) {
      intervalId = setInterval(() => setTime(t => t + 10), 10);
    } else {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [isRunning]);

  // Effect to handle the end of the game when the cube is solved
  useEffect(() => {
    if (isSolved && isRunning) {
      setIsRunning(false);
      setHasShuffled(false);
      if (!highScore || time < highScore) {
        localStorage.setItem(highScoreKey, time);
        setHighScore(time);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  }, [isSolved, isRunning, highScore, time, highScoreKey]);

  // Function to handle moves based on the current camera mapping
  const handleMove = (move, isManual = true) => {
    if (isSolved && isManual) return;
    if (isManual) {
      if (hasShuffled && !isRunning && time === 0) setIsRunning(true);
      if (!isSolved) setMoveCount(prev => prev + 1);
    }

    const { Right, Left, Up, Down, Front, Back } = cameraMapping;
    
    // Function to run a move based on the axis, value, and direction
    const runMove = (axis, val, dir) => handleMoveAction(axis, val, dir);

    switch (move) {
      case "R": runMove(Right.axis, [Right.value], 1 * Right.dirMultiplier); break;
      case "L": runMove(Left.axis, [Left.value], 1 * Left.dirMultiplier); break;
      case "U": runMove(Up.axis, [Up.value], 1 * Up.dirMultiplier); break;
      case "D": runMove(Down.axis, [Down.value], 1 * Down.dirMultiplier); break;
      case "F": runMove(Front.axis, [Front.value], 1 * Front.dirMultiplier); break;
      case "B": runMove(Back.axis, [Back.value], 1 * Back.dirMultiplier); break;
      case "M": runMove(Left.axis, [0], 1 * Left.dirMultiplier); break;
      case "R'": runMove(Right.axis, [Right.value], -1 * Right.dirMultiplier); break;
      case "L'": runMove(Left.axis, [Left.value], -1 * Left.dirMultiplier); break;
      case "U'": runMove(Up.axis, [Up.value], -1 * Up.dirMultiplier); break;
      case "D'": runMove(Down.axis, [Down.value], -1 * Down.dirMultiplier); break;
      case "F'": runMove(Front.axis, [Front.value], -1 * Front.dirMultiplier); break;
      case "B'": runMove(Back.axis, [Back.value], -1 * Back.dirMultiplier); break;
      case "M'": runMove(Left.axis, [0], -1 * Left.dirMultiplier); break;
      case "r": runMove(Right.axis, [Right.value, 0], 1 * Right.dirMultiplier); break;
      case "l": runMove(Left.axis, [Left.value, 0], 1 * Left.dirMultiplier); break;
      case "u": runMove(Up.axis, [Up.value, 0], 1 * Up.dirMultiplier); break;
      case "d": runMove(Down.axis, [Down.value, 0], 1 * Down.dirMultiplier); break;
      case "f": runMove(Front.axis, [Front.value, 0], 1 * Front.dirMultiplier); break;
      case "b": runMove(Back.axis, [Back.value, 0], 1 * Back.dirMultiplier); break;
      case "r'": runMove(Right.axis, [Right.value, 0], -1 * Right.dirMultiplier); break;
      case "l'": runMove(Left.axis, [Left.value, 0], -1 * Left.dirMultiplier); break;
      case "u'": runMove(Up.axis, [Up.value, 0], -1 * Up.dirMultiplier); break;
      case "d'": runMove(Down.axis, [Down.value, 0], -1 * Down.dirMultiplier); break;
      case "f'": runMove(Front.axis, [Front.value, 0], -1 * Front.dirMultiplier); break;
      case "b'": runMove(Back.axis, [Back.value, 0], -1 * Back.dirMultiplier); break;
      default: break;
    }
  };

  // Effect to handle keyboard input for moves
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (keyboardMapping[e.key]) handleMove(keyboardMapping[e.key], true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraMapping, hasShuffled, isRunning, time, keyboardMapping]);


  // Function to handle shuffling the cube with 20 random moves
  const handleShuffle = () => {
    let previousMove = "";
    for (let i = 0; i < 20; i++) {
      let randomMove = shuffleMoves[Math.floor(Math.random() * shuffleMoves.length)];
      while (randomMove === previousMove + "'" || randomMove + "'" === previousMove) {
        randomMove = shuffleMoves[Math.floor(Math.random() * shuffleMoves.length)];
      }
      previousMove = randomMove;
      handleMove(randomMove, false);
    }
    setTime(0);
    setMoveCount(0);
    setIsRunning(false);
    setHasShuffled(true);
  };

  // Function to format time in mm:ss:cs format
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((time % 60000) / 1000).toString().padStart(2, '0');
    const centiseconds = Math.floor((time % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${centiseconds}`;
  };

  // Render the Cube Game component
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
            {isLocked ? "🔒 Locked" : "🔓 Unlocked"}
          </button>
        </div>
      </header>

      <main className="main-area" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <button 
          className="shuffle-btn" 
          onClick={onBack} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100 }}
        >
          Retour →
        </button>

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
          {controlsRenderer(handleMove)}
        </div>
      </main>
    </div>
  );
}
