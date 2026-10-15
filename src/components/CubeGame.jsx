// src/components/CubeGame.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import {
  RotateCcw,
  Shuffle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowLeft,
  Target,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { RubiksCube } from './RubiksCube';
import { useCubeStore } from '../store/useCubeStore';
import { CameraMapper } from './CameraMapper';
import { CustomLockControls } from './LockCamera';
import { createCaseCubies } from '../utils/algoParser';
import confetti from 'canvas-confetti';

export function CubeGame({ size, controlsRenderer, keyboardMapping, shuffleMoves, onBack, trainingCase = null }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showAlgo, setShowAlgo] = useState(false);

  const initCube = useCubeStore(state => state.initCube);
  const setCustomCubies = useCubeStore(state => state.setCustomCubies);
  const cameraMapping = useCubeStore(state => state.cameraMapping);
  const isSolved = useCubeStore(state => state.isSolved);
  const handleMoveAction = useCubeStore(state => state.startRotation);

  const [isMobile, setIsMobile] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const highScoreKey = `rubiksHighScore_${size}x${size}`;
  const [highScore, setHighScore] = useState(localStorage.getItem(highScoreKey) || null);
  const [hasShuffled, setHasShuffled] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const initTrainingPattern = useCallback(() => {
    if (!trainingCase) return;
    const customCubies = createCaseCubies({
      size,
      alg: trainingCase.alg,
      setup: trainingCase.setup ?? null,
      yellowTop: trainingCase.yellowTop ?? true,
      maskMode: trainingCase.maskMode || 'full',
      applySetup: true
    });
    setCustomCubies(size, customCubies);
    setTime(0);
    setMoveCount(0);
    setIsRunning(false);
    setHasShuffled(true);
  }, [trainingCase, size, setCustomCubies]);

  useEffect(() => {
    if (trainingCase) {
      initTrainingPattern();
    } else {
      initCube(size);
    }
  }, [size, trainingCase, initCube, initTrainingPattern]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
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
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      if (!trainingCase && (!highScore || time < highScore)) {
        localStorage.setItem(highScoreKey, time);
        setHighScore(time);
      }
    }
  }, [isSolved, isRunning, highScore, time, highScoreKey, trainingCase]);

  const handleMove = useCallback((move, isManual = true) => {
    if (isSolved && isManual) return;
    if (isManual) {
      if (hasShuffled && !isRunning && time === 0) setIsRunning(true);
      if (!isSolved) setMoveCount(prev => prev + 1);
    }

    const { Right, Left, Up, Down, Front, Back } = cameraMapping;
    const outer = (size - 1) / 2;
    const allLayers = Array.from({ length: size }, (_, i) => i - outer);
    // Sur 3x3 la 2e couche d'un mouvement large est 0, sur 4x4 c'est ±0.5 (soit Dir.value / 3)
    const wideLayers = (dirObj) => size === 4 ? [dirObj.value, dirObj.value / 3] : [dirObj.value, 0];
    const innerLayer = (dirObj) => size === 4 ? [dirObj.value / 3] : [0];

    const runMove = (axis, val, dir) => handleMoveAction(axis, val, dir);

    switch (move) {
      case "R": runMove(Right.axis, [Right.value], 1 * Right.dirMultiplier); break;
      case "L": runMove(Left.axis, [Left.value], 1 * Left.dirMultiplier); break;
      case "U": runMove(Up.axis, [Up.value], 1 * Up.dirMultiplier); break;
      case "D": runMove(Down.axis, [Down.value], 1 * Down.dirMultiplier); break;
      case "F": runMove(Front.axis, [Front.value], 1 * Front.dirMultiplier); break;
      case "B": runMove(Back.axis, [Back.value], 1 * Back.dirMultiplier); break;
      case "M": runMove(Left.axis, size === 4 ? [-0.5, 0.5] : [0], 1 * Left.dirMultiplier); break;

      case "R'": runMove(Right.axis, [Right.value], -1 * Right.dirMultiplier); break;
      case "L'": runMove(Left.axis, [Left.value], -1 * Left.dirMultiplier); break;
      case "U'": runMove(Up.axis, [Up.value], -1 * Up.dirMultiplier); break;
      case "D'": runMove(Down.axis, [Down.value], -1 * Down.dirMultiplier); break;
      case "F'": runMove(Front.axis, [Front.value], -1 * Front.dirMultiplier); break;
      case "B'": runMove(Back.axis, [Back.value], -1 * Back.dirMultiplier); break;
      case "M'": runMove(Left.axis, size === 4 ? [-0.5, 0.5] : [0], -1 * Left.dirMultiplier); break;

      case "r":
      case "Rw": runMove(Right.axis, wideLayers(Right), 1 * Right.dirMultiplier); break;
      case "l":
      case "Lw": runMove(Left.axis, wideLayers(Left), 1 * Left.dirMultiplier); break;
      case "u":
      case "Uw": runMove(Up.axis, wideLayers(Up), 1 * Up.dirMultiplier); break;
      case "d":
      case "Dw": runMove(Down.axis, wideLayers(Down), 1 * Down.dirMultiplier); break;
      case "f":
      case "Fw": runMove(Front.axis, wideLayers(Front), 1 * Front.dirMultiplier); break;
      case "b":
      case "Bw": runMove(Back.axis, wideLayers(Back), 1 * Back.dirMultiplier); break;

      case "r'":
      case "Rw'": runMove(Right.axis, wideLayers(Right), -1 * Right.dirMultiplier); break;
      case "l'":
      case "Lw'": runMove(Left.axis, wideLayers(Left), -1 * Left.dirMultiplier); break;
      case "u'":
      case "Uw'": runMove(Up.axis, wideLayers(Up), -1 * Up.dirMultiplier); break;
      case "d'":
      case "Dw'": runMove(Down.axis, wideLayers(Down), -1 * Down.dirMultiplier); break;
      case "f'":
      case "Fw'": runMove(Front.axis, wideLayers(Front), -1 * Front.dirMultiplier); break;
      case "b'":
      case "Bw'": runMove(Back.axis, wideLayers(Back), -1 * Back.dirMultiplier); break;

      case "2R": runMove(Right.axis, innerLayer(Right), 1 * Right.dirMultiplier); break;
      case "2R'": runMove(Right.axis, innerLayer(Right), -1 * Right.dirMultiplier); break;
      case "2L": runMove(Left.axis, innerLayer(Left), 1 * Left.dirMultiplier); break;
      case "2L'": runMove(Left.axis, innerLayer(Left), -1 * Left.dirMultiplier); break;
      case "2U": runMove(Up.axis, innerLayer(Up), 1 * Up.dirMultiplier); break;
      case "2U'": runMove(Up.axis, innerLayer(Up), -1 * Up.dirMultiplier); break;

      case "x": runMove(Right.axis, allLayers, 1 * Right.dirMultiplier); break;
      case "x'": runMove(Right.axis, allLayers, -1 * Right.dirMultiplier); break;
      case "y": runMove(Up.axis, allLayers, 1 * Up.dirMultiplier); break;
      case "y'": runMove(Up.axis, allLayers, -1 * Up.dirMultiplier); break;
      case "z": runMove(Front.axis, allLayers, 1 * Front.dirMultiplier); break;
      case "z'": runMove(Front.axis, allLayers, -1 * Front.dirMultiplier); break;
      default: break;
    }
  }, [isSolved, hasShuffled, isRunning, time, cameraMapping, size, handleMoveAction]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (keyboardMapping[e.key]) handleMove(keyboardMapping[e.key], true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardMapping, handleMove]);

  const handleShuffle = () => {
    if (trainingCase) {
      initTrainingPattern();
      return;
    }
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

  const formatTime = (t) => {
    const minutes = Math.floor(t / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((t % 60000) / 1000).toString().padStart(2, '0');
    const centiseconds = Math.floor((t % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${centiseconds}`;
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          {trainingCase ? (
            <div className="highscore">
              <Target size={18} className="inline-icon accent" />
              <span>Cas : {trainingCase.name}</span>
            </div>
          ) : (
            <div className="highscore">
              <Trophy size={18} className="inline-icon amber" />
              <span>Record : {highScore ? formatTime(highScore) : "-"}</span>
            </div>
          )}
        </div>
        <div className="header-center" style={{ gap: '0.75rem', display: 'flex', flexWrap: 'wrap' }}>
          <button className="shuffle-btn" onClick={handleShuffle}>
            {trainingCase ? (
              <>
                <RotateCcw size={16} />
                <span>Réinitialiser le cas</span>
              </>
            ) : (
              <>
                <Shuffle size={16} />
                <span>Mélanger</span>
              </>
            )}
          </button>
          {trainingCase && (
            <button
              className={`shuffle-btn ${showAlgo ? 'active-toggle' : ''}`}
              onClick={() => setShowAlgo(prev => !prev)}
            >
              {showAlgo ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>{showAlgo ? "Cacher l'algo" : "Afficher l'algo"}</span>
            </button>
          )}
        </div>
        <div className="header-right">
          <button className="shuffle-btn" onClick={() => setIsLocked(!isLocked)}>
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            <span>{isLocked ? "Verrouillé" : "Libre"}</span>
          </button>
        </div>
      </header>

      <main className="main-area">
        <button
          className="shuffle-btn game-back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          <span>{trainingCase ? "Retour aux algos" : "Menu Cubes"}</span>
        </button>

        <div className="stats-container">
          <div className="timer">{formatTime(time)}</div>
          <div className="moves-count">Mouvements : {moveCount}</div>
        </div>

        {trainingCase && showAlgo && (
          <div className="training-algo-banner">
            {trainingCase.alg}
          </div>
        )}

        {isSolved && hasShuffled && !isRunning && (time > 0 || moveCount > 0) && (
          <div className="solved-banner-modal">
            <div className="solved-banner-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.75rem' }}>
              {trainingCase ? "Cas Résolu !" : "Cube Résolu !"}
            </h2>
            <p style={{ margin: '0 0 1.2rem 0', fontSize: '1.05rem', color: '#94a3b8' }}>
              Temps : {formatTime(time)} • Mouvements : {moveCount}
            </p>
            <button className="shuffle-btn primary-action" onClick={handleShuffle}>
              <RotateCcw size={16} />
              <span>{trainingCase ? "Recommencer ce cas" : "Rejouer"}</span>
            </button>
          </div>
        )}

        <div className="cube-container">
          <Canvas camera={{ position: [3.8, 4.2, 5.5], fov: isMobile ? 80 : 65 }}>
            <ambientLight intensity={1.1} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <RubiksCube />
            <CameraMapper />

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