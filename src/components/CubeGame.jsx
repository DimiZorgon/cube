// src/components/CubeGame.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import {
  ArrowLeftBox,
  Sparkles,
  Info,
  Cross,
  Lock,
  Unlock,
  ArrowLeft,
  Star,
  Crown,
  Check,
  Globe,
  Grid,
  Clock
} from '@getpapillon/papicons';
import { RubiksCube } from './RubiksCube';
import { useCubeStore } from '../store/useCubeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useVirtualCubeSessionStore } from '../store/useVirtualCubeSessionStore';
import { CameraMapper } from './CameraMapper';
import { CustomLockControls } from './LockCamera';
import { VirtualCubeHistoryModal } from './VirtualCubeHistoryModal';
import { createCaseCubies, getMoveParams } from '../utils/algoParser';
import { generateWcaScramble } from '../utils/scrambleGenerator';
import { computeMoveMetrics, rotationToCanonicalMove } from '../utils/virtualMoveMetrics';
import { safeTps } from '../utils/smartCube/wcaStats';
import confetti from 'canvas-confetti';
import { playCubeTurnSound, playSolveVictorySound } from '../utils/audioSystem';

export function CubeGame({ size, controlsRenderer, keyboardMapping, shuffleMoves: _shuffleMoves, onBack, trainingCase = null }) {
  const { t } = useTranslation();
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showAlgo, setShowAlgo] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const controlsRef = useRef(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef(null);
  const currentScrambleRef = useRef('');
  const hasRecordedSolveRef = useRef(false);

  const initCube = useCubeStore(state => state.initCube);
  const setCustomCubies = useCubeStore(state => state.setCustomCubies);
  const cameraMapping = useCubeStore(state => state.cameraMapping);
  const isSolved = useCubeStore(state => state.isSolved);
  const activeRotation = useCubeStore(state => state.activeRotation);
  const handleMoveAction = useCubeStore(state => state.startRotation);
  const customColors = useSettingsStore(state => state.colors);
  const cameraSpeed = useSettingsStore(state => state.cameraSpeed);

  const puzzleKey = `${size}x${size}`;
  const sessionSolves = useVirtualCubeSessionStore(state => state.sessions[puzzleKey] || []);
  const recordSolve = useVirtualCubeSessionStore(state => state.recordSolve);

  const supportsTouchSwipe = size >= 2 && size <= 5;
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [touchOnly, setTouchOnly] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 && (size >= 2 && size <= 5));
  const [isLocked, setIsLocked] = useState(false);

  const highScoreKey = `rubiksHighScore_${puzzleKey}`;
  const [highScore, setHighScore] = useState(() => localStorage.getItem(highScoreKey) || null);
  const [hasShuffled, setHasShuffled] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [moveLog, setMoveLog] = useState([]);
  const liveMetrics = useMemo(() => computeMoveMetrics(moveLog), [moveLog]);

  const initTrainingPattern = useCallback(() => {
    if (!trainingCase) return;
    const customCubies = createCaseCubies({
      size,
      alg: trainingCase.alg,
      setup: trainingCase.setup ?? null,
      yellowTop: trainingCase.yellowTop ?? true,
      maskMode: trainingCase.maskMode || 'full',
      applySetup: true,
      colors: customColors
    });
    setCustomCubies(size, customCubies);
    currentScrambleRef.current = '';
    hasRecordedSolveRef.current = false;
    startTimeRef.current = 0;
    setTime(0);
    setMoveCount(0);
    setMoveLog([]);
    setIsRunning(false);
    setHasShuffled(true);
  }, [trainingCase, size, setCustomCubies, customColors]);

  useEffect(() => {
    setHighScore(localStorage.getItem(highScoreKey) || null);
    if (trainingCase) {
      initTrainingPattern();
    } else {
      initCube(size);
      currentScrambleRef.current = '';
      hasRecordedSolveRef.current = false;
      startTimeRef.current = 0;
      setTime(0);
      setMoveCount(0);
      setMoveLog([]);
      setIsRunning(false);
      setHasShuffled(false);
    }
  }, [size, highScoreKey, trainingCase, initCube, initTrainingPattern]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now();
    }
    const update = () => {
      setTime(performance.now() - startTimeRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (isSolved && isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const finalMs = startTimeRef.current > 0
        ? Math.max(10, Math.round(performance.now() - startTimeRef.current))
        : Math.max(10, Math.round(time));
      setTime(finalMs);
      setIsRunning(false);
      setHasShuffled(false);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      playSolveVictorySound();

      if (!trainingCase && !hasRecordedSolveRef.current) {
        hasRecordedSolveRef.current = true;
        const metrics = computeMoveMetrics(moveLog);
        recordSolve(size, {
          timeMs: finalMs,
          scramble: currentScrambleRef.current,
          moves: metrics.simplifiedString,
          rawMoves: metrics.rawString,
          htm: metrics.htm,
          stm: metrics.stm,
          rawMoveCount: metrics.rawCount,
          tpsHtm: safeTps(metrics.htm, finalMs),
          tpsStm: safeTps(metrics.stm, finalMs)
        });
        const existingHigh = Number(highScore);
        if (!highScore || Number.isNaN(existingHigh) || finalMs < existingHigh) {
          localStorage.setItem(highScoreKey, String(finalMs));
          setHighScore(String(finalMs));
        }
      }
    }
  }, [isSolved, isRunning, highScore, time, highScoreKey, trainingCase, recordSolve, size, moveLog]);

  const recordManualRotation = useCallback((axis, sliceArr, direction) => {
    const canonical = rotationToCanonicalMove(axis, sliceArr, direction, size);
    if (!canonical) return;
    setMoveLog(prev => [...prev, canonical]);
  }, [size]);

  const handleSwipeMove = useCallback((axis, value, direction) => {
    if (!supportsTouchSwipe) return;
    if (!hasShuffled || isSolved) return;
    if (!isRunning && moveCount === 0 && activeRotation !== null) return;

    if (!isRunning && time === 0) {
      setIsRunning(true);
    }
    setMoveCount(prev => prev + 1);
    recordManualRotation(axis, value, direction);
    playCubeTurnSound();
    handleMoveAction(axis, value, direction);
  }, [supportsTouchSwipe, hasShuffled, isSolved, isRunning, moveCount, activeRotation, time, recordManualRotation, handleMoveAction]);

  const handleMove = useCallback((move, isManual = true) => {
    if (isManual) {
      if (!hasShuffled || isSolved) return;
      if (!isRunning && moveCount === 0 && activeRotation !== null) return;

      if (!isRunning && time === 0) {
        setIsRunning(true);
      }
      setMoveCount(prev => prev + 1);
    }

    const { Right, Left, Up, Down, Front, Back } = cameraMapping;
    const outer = (size - 1) / 2;
    const allLayers = Array.from({ length: size }, (_, i) => i - outer);
    const wideLayers = (dirObj) => {
      if (size === 5) return [dirObj.value, dirObj.value - Math.sign(dirObj.value)];
      if (size === 4) return [dirObj.value, dirObj.value / 3];
      return [dirObj.value, 0];
    };
    const wide3Layers = (dirObj) => {
      if (size === 5) return [dirObj.value, dirObj.value - Math.sign(dirObj.value), 0];
      return wideLayers(dirObj);
    };
    const innerLayer = (dirObj) => {
      if (size === 5) return [dirObj.value - Math.sign(dirObj.value)];
      if (size === 4) return [dirObj.value / 3];
      return [0];
    };

    const runMove = (axis, val, dir) => {
      if (isManual) {
        recordManualRotation(axis, val, dir);
      }
      playCubeTurnSound();
      handleMoveAction(axis, val, dir);
    };

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

      case "3Rw": runMove(Right.axis, wide3Layers(Right), 1 * Right.dirMultiplier); break;
      case "3Rw'": runMove(Right.axis, wide3Layers(Right), -1 * Right.dirMultiplier); break;
      case "3Lw": runMove(Left.axis, wide3Layers(Left), 1 * Left.dirMultiplier); break;
      case "3Lw'": runMove(Left.axis, wide3Layers(Left), -1 * Left.dirMultiplier); break;
      case "3Uw": runMove(Up.axis, wide3Layers(Up), 1 * Up.dirMultiplier); break;
      case "3Uw'": runMove(Up.axis, wide3Layers(Up), -1 * Up.dirMultiplier); break;
      case "3Dw": runMove(Down.axis, wide3Layers(Down), 1 * Down.dirMultiplier); break;
      case "3Dw'": runMove(Down.axis, wide3Layers(Down), -1 * Down.dirMultiplier); break;
      case "3Fw": runMove(Front.axis, wide3Layers(Front), 1 * Front.dirMultiplier); break;
      case "3Fw'": runMove(Front.axis, wide3Layers(Front), -1 * Front.dirMultiplier); break;
      case "3Bw": runMove(Back.axis, wide3Layers(Back), 1 * Back.dirMultiplier); break;
      case "3Bw'": runMove(Back.axis, wide3Layers(Back), -1 * Back.dirMultiplier); break;

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
  }, [isSolved, hasShuffled, isRunning, time, moveCount, activeRotation, cameraMapping, size, handleMoveAction, recordManualRotation]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isHistoryOpen) return;
      if (document.activeElement.tagName === 'INPUT') return;
      if (keyboardMapping[e.key]) handleMove(keyboardMapping[e.key], true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardMapping, handleMove, isHistoryOpen]);

  const handleShuffle = () => {
    if (trainingCase) {
      initTrainingPattern();
      return;
    }
    initCube(size);
    const scramble = generateWcaScramble(`${size}x${size}x${size}`);
    currentScrambleRef.current = scramble;
    hasRecordedSolveRef.current = false;
    startTimeRef.current = 0;

    const tokens = scramble.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const params = getMoveParams(token, size);
      if (!params) continue;
      for (let i = 0; i < params.quarterTurns; i++) {
        handleMoveAction(params.axis, params.value, params.direction);
      }
    }

    setTime(0);
    setMoveCount(0);
    setMoveLog([]);
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
          <button
            className="shuffle-btn"
            onClick={onBack}
            title={trainingCase ? t('common.backAlgos') : t('common.backCubes')}
          >
            <ArrowLeft size={16} />
            <span className="header-btn-label-sm">
              {trainingCase ? t('common.backAlgos') : t('common.backCubes')}
            </span>
          </button>
          {trainingCase ? (
            <div className="highscore">
              <Star size={18} className="inline-icon accent" />
              <span>{t('game.case', { name: trainingCase.name })}</span>
            </div>
          ) : (
            <div className="highscore">
              <Crown size={18} className="inline-icon amber" />
              <span>{t('game.record', { time: highScore ? formatTime(Number(highScore)) : '-' })}</span>
            </div>
          )}
        </div>
        <div className="header-center" style={{ gap: '0.75rem', display: 'flex', flexWrap: 'wrap' }}>
          <button className="shuffle-btn" onClick={handleShuffle}>
            {trainingCase ? (
              <>
                <ArrowLeftBox size={16} />
                <span>{t('game.resetCase')}</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{t('game.shuffle')}</span>
              </>
            )}
          </button>
          {trainingCase && (
            <button
              className={`shuffle-btn ${showAlgo ? 'active-toggle' : ''}`}
              onClick={() => setShowAlgo(prev => !prev)}
            >
              {showAlgo ? <Cross size={16} /> : <Info size={16} />}
              <span>{showAlgo ? t('game.hideAlgorithm') : t('game.showAlgorithm')}</span>
            </button>
          )}
        </div>
        <div className="header-right" style={{ gap: '0.5rem' }}>
          {!trainingCase && (
            <button
              className="shuffle-btn"
              onClick={() => setIsHistoryOpen(true)}
              title={`Historique (${sessionSolves.length})`}
            >
              <Clock size={16} />
              <span>
                <span className="header-btn-label-sm">Historique </span>
                ({sessionSolves.length})
              </span>
            </button>
          )}
          {supportsTouchSwipe && (
            <button
              className={`shuffle-btn ${touchOnly ? 'active-toggle' : ''}`}
              onClick={() => setTouchOnly(prev => !prev)}
              title={touchOnly ? t('game.touchMode', { defaultValue: 'Tactile' }) : t('game.buttonsMode', { defaultValue: 'Boutons' })}
            >
              {touchOnly ? <Globe size={16} /> : <Grid size={16} />}
              <span className="header-btn-label-sm">
                {touchOnly ? t('game.touchMode', { defaultValue: 'Tactile' }) : t('game.buttonsMode', { defaultValue: 'Boutons' })}
              </span>
            </button>
          )}
          <button
            className="shuffle-btn"
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? t('game.locked') : t('game.free')}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            <span className="header-btn-label-sm">
              {isLocked ? t('game.locked') : t('game.free')}
            </span>
          </button>
        </div>
      </header>

      <main className="main-area">
        <div className="stats-container">
          <div className="timer">{formatTime(time)}</div>
          <div className="moves-count">
            {t('game.moves', { count: moveCount })} · HTM {liveMetrics.htm} · STM {liveMetrics.stm}
          </div>
        </div>

        {trainingCase && showAlgo && (
          <div className="training-algo-banner">
            {trainingCase.alg}
          </div>
        )}

        {isSolved && !isRunning && (time > 0 || moveCount > 0) && (
          <div className="solved-banner-modal">
            <div className="solved-banner-icon">
              <Check size={36} />
            </div>
            <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.75rem' }}>
              {trainingCase ? t('game.caseSolved') : t('game.cubeSolved')}
            </h2>
            <p style={{ margin: '0 0 0.45rem 0', fontSize: '1.05rem', color: '#94a3b8' }}>
              {t('game.result', { time: formatTime(time), count: moveCount })}
            </p>
            <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.95rem', color: '#9eb5aa', fontFamily: 'monospace', fontWeight: 700 }}>
              HTM {liveMetrics.htm} · STM {liveMetrics.stm}
              {!trainingCase && time > 0 ? ` · ${safeTps(liveMetrics.htm, time).toFixed(2)} TPS` : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'center' }}>
              <button className="shuffle-btn primary-action" onClick={handleShuffle}>
                <ArrowLeftBox size={16} />
                <span>{trainingCase ? t('game.retryCase') : t('game.replay')}</span>
              </button>
              {!trainingCase && (
                <button className="shuffle-btn" onClick={() => setIsHistoryOpen(true)}>
                  <Clock size={16} />
                  <span>Historique</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="cube-container">
          <Canvas camera={{ position: size === 5 ? [5.6, 6.0, 7.8] : size === 4 ? [4.6, 5.0, 6.5] : [3.8, 4.2, 5.5], fov: isMobile ? 82 : 66 }}>
            <ambientLight intensity={1.1} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <RubiksCube
              enableSwipe={supportsTouchSwipe}
              onSwipeMove={handleSwipeMove}
              controlsRef={controlsRef}
              isLocked={isLocked}
            />
            <CameraMapper />

            <TrackballControls
              ref={controlsRef}
              enabled={!isLocked}
              noPan={true}
              noZoom={true}
              rotateSpeed={(isMobile ? 2 : 7) * cameraSpeed}
            />
            <CustomLockControls isLocked={isLocked} cameraMapping={cameraMapping} cameraSpeed={cameraSpeed} />
          </Canvas>
        </div>

        {(!supportsTouchSwipe || !touchOnly) && (
          <div className="controls-layer">
            {controlsRenderer(handleMove)}
          </div>
        )}
      </main>

      {!trainingCase && (
        <VirtualCubeHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          size={size}
        />
      )}
    </div>
  );
}
