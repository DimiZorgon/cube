// src/components/SmartCube/SmartCubeAlgoTestView.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import {
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Clock,
  Check
} from '@getpapillon/papicons';
import { useTranslation } from 'react-i18next';
import { RubiksCube } from '../RubiksCube';
import { MacAddressModal } from './MacAddressModal';
import { useCubeStore } from '../../store/useCubeStore';
import {
  useSmartCubeStore,
  applyMoveTo3D,
  processScrambleTurn
} from '../../store/useSmartCubeStore';
import { ganBleDriver as defaultGanBleDriver } from '../../utils/smartCube/ganBleDriver';
import { createCaseCubies, invertAlgo, mapPhysicalToLogicalAlgoMove, mapRelativeGyroToYellowTopOrientation } from '../../utils/algoParser';
import {
  CubeStateSimulator,
  expandMoveNotation,
  expandAlgoToOuterMoves
} from '../../utils/cubeMath';
import { isStageObjectiveMet, normalizeStage } from '../../utils/smartCube/stageCompletion';
import { playSolveVictorySound } from '../../utils/audioSystem';

function safeNormalizeQuaternion([x, y, z, w]) {
  if (![x, y, z, w].every(v => typeof v === 'number' && !isNaN(v))) {
    return [0, 0, 0, 1];
  }
  const lenSq = x * x + y * y + z * z + w * w;
  if (lenSq < 0.000001) {
    return [0, 0, 0, 1];
  }
  const inv = 1 / Math.sqrt(lenSq);
  return [x * inv, y * inv, z * inv, w * inv];
}

function mapGanToThreeQuaternion(raw) {
  if (!raw || raw.length < 4) return [0, 0, 0, 1];
  return safeNormalizeQuaternion([raw[0], raw[2], -raw[1], raw[3]]);
}

function formatSolveTime(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '0.00';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return totalSeconds.toFixed(2);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${remainingSecs}`;
}

function getMoveBadgeStyle(face) {
  switch (face) {
    case 'U': return 'bg-slate-100/15 text-slate-100 border-slate-400/50';
    case 'D': return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/50';
    case 'F': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50';
    case 'B': return 'bg-blue-500/15 text-blue-300 border-blue-500/50';
    case 'R': return 'bg-rose-500/15 text-rose-300 border-rose-500/50';
    case 'L': return 'bg-orange-500/15 text-orange-300 border-orange-500/50';
    default:  return 'bg-slate-800 text-slate-200 border-slate-600';
  }
}

function BluetoothIcon({ className = 'w-3.5 h-3.5', ...props }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="m7 7 10 10-5 5V2l5 5L7 17" />
    </svg>
  );
}

function BatteryIcon({ level, isConnected }) {
  const validLevel = typeof level === 'number' && !isNaN(level) ? level : null;
  const strokeColor = !isConnected || validLevel === null ? '#64748b' : validLevel <= 20 ? '#f43f5e' : '#10b981';
  const fillWidth = !isConnected || validLevel === null ? 0 : Math.max(2, Math.round((validLevel / 100) * 12));

  return (
    <svg
      width="18"
      height="11"
      viewBox="0 0 24 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="19" height="12" rx="3" stroke={strokeColor} strokeWidth="2" />
      <path d="M22 5V9" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      {fillWidth > 0 && (
        <rect x="3.5" y="3.5" width={fillWidth} height="7" rx="1.5" fill={strokeColor} />
      )}
    </svg>
  );
}

function SmartCubeAlgo3DScene({ controlsRef }) {
  const gyroGroupRef = useRef(null);
  const isGyroActive = useSmartCubeStore(state => state.isGyroActive);
  const gyroQuaternion = useSmartCubeStore(state => state.gyroQuaternion);
  const gyroZeroQuaternion = useSmartCubeStore(state => state.gyroZeroQuaternion);

  useFrame(() => {
    if (!gyroGroupRef.current) return;

    if (isGyroActive && gyroQuaternion) {
      if (controlsRef?.current) {
        controlsRef.current.enabled = false;
      }

      const liveArr = mapGanToThreeQuaternion(gyroQuaternion);
      const qLive = new THREE.Quaternion(...liveArr);

      let qTarget = new THREE.Quaternion(0, 0, 0, 1);
      if (gyroZeroQuaternion) {
        const isResetIdentity = Array.isArray(gyroQuaternion) &&
          gyroQuaternion[0] === 0 &&
          gyroQuaternion[1] === 0 &&
          gyroQuaternion[2] === 0 &&
          gyroQuaternion[3] === 1;

        if (isResetIdentity) {
          qTarget = new THREE.Quaternion(0, 0, 0, 1);
        } else {
          const zeroArr = mapGanToThreeQuaternion(gyroZeroQuaternion);
          const qZero = new THREE.Quaternion(...zeroArr);
          const qRel = qZero.clone().invert().multiply(qLive);
          const [nx, ny, nz, nw] = mapRelativeGyroToYellowTopOrientation(qRel);
          qTarget = new THREE.Quaternion(nx, ny, nz, nw);
        }
      } else {
        const [nx, ny, nz, nw] = mapRelativeGyroToYellowTopOrientation(qLive);
        qTarget = new THREE.Quaternion(nx, ny, nz, nw);
      }

      gyroGroupRef.current.quaternion.slerp(qTarget, 0.3);
    } else {
      if (controlsRef?.current) {
        controlsRef.current.enabled = true;
      }
    }
  });

  return (
    <group ref={gyroGroupRef}>
      <RubiksCube enableSwipe={false} controlsRef={controlsRef} adaptiveSpeed={true} />
    </group>
  );
}

export function SmartCubeAlgoTestView({
  caseData,
  onBack,
  driver: customDriver = null
}) {
  const { t } = useTranslation();
  const controlsRef = useRef(null);

  // Zustand Store Integration
  const connectionStatus = useSmartCubeStore(state => state.connectionStatus);
  const batteryLevel = useSmartCubeStore(state => state.batteryLevel);
  const connect = useSmartCubeStore(state => state.connect);
  const disconnect = useSmartCubeStore(state => state.disconnect);
  const isGyroActive = useSmartCubeStore(state => state.isGyroActive);
  const recalibrateGyro = useSmartCubeStore(state => state.recalibrateGyro);
  const gyroQuaternion = useSmartCubeStore(state => state.gyroQuaternion);
  const gyroZeroQuaternion = useSmartCubeStore(state => state.gyroZeroQuaternion);
  const toggleGyroActive = useSmartCubeStore(state => state.toggleGyroActive);
  const isMacModalOpen = useSmartCubeStore(state => state.isMacModalOpen);
  const openMacModal = useSmartCubeStore(state => state.openMacModal);
  const closeMacModal = useSmartCubeStore(state => state.closeMacModal);
  const setMacAddress = useSmartCubeStore(state => state.setMacAddress);
  const macAddress = useSmartCubeStore(state => state.macAddress);

  const lastLiveGyroRef = useRef(null);

  // Keep track of the last live valid quaternion for robust recentering
  useEffect(() => {
    if (gyroQuaternion && (!Array.isArray(gyroQuaternion) || gyroQuaternion[0] !== 0 || gyroQuaternion[1] !== 0 || gyroQuaternion[2] !== 0 || gyroQuaternion[3] !== 1)) {
      lastLiveGyroRef.current = gyroQuaternion;
    }
  }, [gyroQuaternion]);

  // On mount / first valid gyro packet, if gyroZeroQuaternion is not set, establish initial calibration reference
  useEffect(() => {
    if (!gyroZeroQuaternion && gyroQuaternion) {
      const isIdentity = Array.isArray(gyroQuaternion) &&
        gyroQuaternion[0] === 0 &&
        gyroQuaternion[1] === 0 &&
        gyroQuaternion[2] === 0 &&
        gyroQuaternion[3] === 1;
      if (!isIdentity) {
        recalibrateGyro();
      }
    }
  }, [gyroQuaternion, gyroZeroQuaternion, recalibrateGyro]);

  // Clean up gyroZeroQuaternion when leaving Yellow-top algorithm test view
  useEffect(() => {
    return () => {
      useSmartCubeStore.setState({ gyroZeroQuaternion: null });
    };
  }, []);

  // Ensure reset button resets gyro reference accurately for Yellow-top Green-front orientation
  const handleRecalibrateGyro = useCallback(() => {
    const isResetIdentity = Array.isArray(gyroQuaternion) &&
      gyroQuaternion[0] === 0 &&
      gyroQuaternion[1] === 0 &&
      gyroQuaternion[2] === 0 &&
      gyroQuaternion[3] === 1;

    if (isResetIdentity && lastLiveGyroRef.current) {
      useSmartCubeStore.setState({
        gyroZeroQuaternion: [...lastLiveGyroRef.current],
        gyroQuaternion: [0, 0, 0, 1]
      });
    } else {
      recalibrateGyro();
    }
  }, [gyroQuaternion, recalibrateGyro]);

  // Stage & Scramble Calculation (expanded to outer-face moves U, D, R, L, F, B for physical Smart Cube)
  const stage = useMemo(
    () => normalizeStage(caseData?.category || caseData?.maskMode || 'f2l'),
    [caseData]
  );

  const outerAlgMoves = useMemo(() => {
    if (!caseData?.alg) return [];
    return expandAlgoToOuterMoves(caseData.alg, true);
  }, [caseData]);

  const inverseScramble = useMemo(() => {
    if (caseData?.setup) {
      return expandAlgoToOuterMoves(caseData.setup, true).join(' ');
    }
    if (outerAlgMoves.length === 0) return '';
    return invertAlgo(outerAlgMoves.join(' '), true);
  }, [caseData, outerAlgMoves]);

  const initialScrambleTokens = useMemo(() => {
    return (inverseScramble || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .flatMap(tok => expandMoveNotation(tok));
  }, [inverseScramble]);

  // Guided Scramble & Test State: 'scrambling' | 'ready' | 'solving' | 'completed'
  const [timerState, setTimerState] = useState('scrambling');
  const timerStateRef = useRef('scrambling');
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  const [scrambleMoves, setScrambleMoves] = useState(initialScrambleTokens);
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [scrambleSubStep, setScrambleSubStep] = useState(0);
  const [scrambleError, setScrambleError] = useState(null);

  const scrambleMovesRef = useRef(initialScrambleTokens);
  const scrambleIndexRef = useRef(0);
  const scrambleSubStepRef = useRef(0);
  const subStepDirRef = useRef(null);
  const errorStackRef = useRef([]);

  const [liveElapsed, setLiveElapsed] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [finalTime, setFinalTime] = useState(null);
  const [finalMoves, setFinalMoves] = useState(null);
  const [finalTps, setFinalTps] = useState(null);
  const [objectiveReason, setObjectiveReason] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Simulator tracking
  const simRef = useRef(null);
  const startTimeRef = useRef(null);
  const movesRef = useRef([]);
  const lastMoveRef = useRef({ serial: null, move: null, ts: 0 });

  // Initialize 3D Cube & Simulator at SOLVED state with Stage Masking (#525866 for irrelevant cubies)
  const init3DCubeAndSimulator = useCallback(() => {
    if (!caseData) return;

    // 1. Setup internal simulator at solved state (scramble will be applied step-by-step)
    const sim = new CubeStateSimulator();
    simRef.current = sim;

    // 2. Setup 3D masked cubies at solved state (applySetup: false)
    const maskMode = caseData.maskMode || (stage === 'oll' ? 'oll' : stage === 'f2l' ? 'f2l' : 'full');
    const customCubies = createCaseCubies({
      size: 3,
      alg: caseData.alg,
      setup: caseData.setup ?? null,
      yellowTop: caseData.yellowTop ?? true,
      maskMode,
      applySetup: false
    });

    try {
      useCubeStore.getState().setCustomCubies(3, customCubies);
    } catch {
      // Ignore in non-WebGL environments
    }

    // 3. Reset guided scramble & test refs
    const nextState = initialScrambleTokens.length > 0 ? 'scrambling' : 'ready';
    timerStateRef.current = nextState;
    setTimerState(nextState);

    scrambleMovesRef.current = [...initialScrambleTokens];
    scrambleIndexRef.current = 0;
    scrambleSubStepRef.current = 0;
    subStepDirRef.current = null;
    errorStackRef.current = [];
    setScrambleMoves([...initialScrambleTokens]);
    setScrambleIndex(0);
    setScrambleSubStep(0);
    setScrambleError(null);

    setLiveElapsed(0);
    setMoveCount(0);
    setFinalTime(null);
    setFinalMoves(null);
    setFinalTps(null);
    setObjectiveReason('');
    startTimeRef.current = null;
    movesRef.current = [];
    lastMoveRef.current = { serial: null, move: null, ts: 0 };
  }, [caseData, initialScrambleTokens, stage]);

  // Skip guided scramble if physical cube is already scrambled
  const handleSkipScramble = useCallback(() => {
    if (!caseData) return;

    const sim = new CubeStateSimulator();
    if (initialScrambleTokens.length > 0) {
      sim.applyMoves(initialScrambleTokens);
    }
    simRef.current = sim;

    const maskMode = caseData.maskMode || (stage === 'oll' ? 'oll' : stage === 'f2l' ? 'f2l' : 'full');
    const customCubies = createCaseCubies({
      size: 3,
      alg: caseData.alg,
      setup: inverseScramble,
      yellowTop: caseData.yellowTop ?? true,
      maskMode,
      applySetup: true
    });

    try {
      useCubeStore.getState().setCustomCubies(3, customCubies);
    } catch {
      // Ignore in non-WebGL environments
    }

    scrambleMovesRef.current = [...initialScrambleTokens];
    scrambleIndexRef.current = initialScrambleTokens.length;
    scrambleSubStepRef.current = 0;
    subStepDirRef.current = null;
    errorStackRef.current = [];
    setScrambleMoves([...initialScrambleTokens]);
    setScrambleIndex(initialScrambleTokens.length);
    setScrambleSubStep(0);
    setScrambleError(null);

    timerStateRef.current = 'ready';
    setTimerState('ready');
    setLiveElapsed(0);
    setMoveCount(0);
    movesRef.current = [];
  }, [caseData, initialScrambleTokens, inverseScramble, stage]);

  useEffect(() => {
    init3DCubeAndSimulator();
    return () => {
      try {
        useCubeStore.getState().initCube(3);
      } catch {
        // Ignore in tests
      }
    };
  }, [init3DCubeAndSimulator]);

  // Live Timer animation loop
  useEffect(() => {
    if (timerState !== 'solving') return;
    let animId;
    const updateTick = () => {
      if (startTimeRef.current) {
        setLiveElapsed(Math.max(0, Date.now() - startTimeRef.current));
      }
      animId = requestAnimationFrame(updateTick);
    };
    animId = requestAnimationFrame(updateTick);
    return () => cancelAnimationFrame(animId);
  }, [timerState]);

  // Turn handler
  const handleIncomingTurn = useCallback((event) => {
    const rawMove = typeof event === 'string' ? event : event?.move;
    if (!rawMove) return;
    const ts = (typeof event === 'object' && typeof event?.timestamp === 'number') ? event.timestamp : Date.now();
    const serial = typeof event === 'object' && event?.serial !== undefined ? event.serial : null;

    // Move deduplication
    if (serial !== null && serial === lastMoveRef.current.serial) return;
    if (serial === null && rawMove === lastMoveRef.current.move && Math.abs(ts - lastMoveRef.current.ts) < 15) return;
    lastMoveRef.current = { serial, move: rawMove, ts };

    // Map physical smart cube turn to CFOP Yellow-top Green-front logical move
    const move = mapPhysicalToLogicalAlgoMove(rawMove);

    // If test is completed, allow turns to rotate 3D cube without re-triggering timer
    if (timerStateRef.current === 'completed') {
      applyMoveTo3D(move);
      return;
    }

    // Step-by-step guided scramble tracking before ready state
    if (timerStateRef.current === 'scrambling') {
      if (simRef.current) {
        simRef.current.applyMove(move);
      }
      applyMoveTo3D(move);

      const result = processScrambleTurn({
        scrambleMoves: scrambleMovesRef.current,
        scrambleIndex: scrambleIndexRef.current,
        scrambleSubStep: scrambleSubStepRef.current,
        subStepDir: subStepDirRef.current,
        _errorStack: errorStackRef.current,
        moveNotation: move
      });

      scrambleMovesRef.current = result.scrambleMoves;
      scrambleIndexRef.current = result.scrambleIndex;
      scrambleSubStepRef.current = result.scrambleSubStep;
      subStepDirRef.current = result.subStepDir;
      errorStackRef.current = result.errorStack;

      setScrambleMoves(result.scrambleMoves);
      setScrambleIndex(result.scrambleIndex);
      setScrambleSubStep(result.scrambleSubStep);
      setScrambleError(result.scrambleError);

      if (result.isCompleted) {
        timerStateRef.current = 'ready';
        setTimerState('ready');
        movesRef.current = [];
        setMoveCount(0);
      }
      return;
    }

    // Auto-Start Timer on first physical move after scramble is complete
    if (timerStateRef.current === 'ready') {
      timerStateRef.current = 'solving';
      startTimeRef.current = ts;
      setTimerState('solving');
      setLiveElapsed(0);
    }

    // Apply move to simulator and 3D cube
    if (simRef.current) {
      simRef.current.applyMove(move);
    }
    applyMoveTo3D(move);

    movesRef.current.push({ move, timestamp: ts });
    setMoveCount(movesRef.current.length);

    // Evaluate Stage Objective Auto-Stop
    if (simRef.current) {
      const facelets = simRef.current.getFaceletString();
      const check = isStageObjectiveMet(facelets, stage, caseData);

      if (check.completed && timerStateRef.current === 'solving') {
        const endTime = ts;
        const startTime = startTimeRef.current || ts;
        const duration = Math.max(1, endTime - startTime);
        const totalTurns = movesRef.current.length;
        const tps = Number((totalTurns / (duration / 1000)).toFixed(2));

        timerStateRef.current = 'completed';
        setTimerState('completed');
        setFinalTime(duration);
        setFinalMoves(totalTurns);
        setFinalTps(tps);
        setObjectiveReason(check.reason);
        playSolveVictorySound();
      }
    }
  }, [caseData, stage]);

  // Bluetooth Driver Subscription
  useEffect(() => {
    if (customDriver) {
      if (typeof customDriver.onMove === 'function') {
        const unsub = customDriver.onMove((event) => {
          handleIncomingTurn(event);
        });
        return unsub;
      }
      return undefined;
    }

    const previousOnMove = defaultGanBleDriver.onMove;
    defaultGanBleDriver.onMove = (event) => {
      handleIncomingTurn(event);
    };

    return () => {
      defaultGanBleDriver.onMove = previousOnMove;
    };
  }, [customDriver, handleIncomingTurn]);

  // Connect / Disconnect handlers
  const handleConnectClick = () => {
    if (connectionStatus === 'connected') {
      disconnect();
    } else {
      if (!macAddress) {
        openMacModal();
      } else {
        connect();
      }
    }
  };

  const handleCopyScramble = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && inverseScramble) {
      navigator.clipboard.writeText(inverseScramble).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(() => {});
    }
  };

  const stageGoalText = useMemo(() => {
    if (stage === 'f2l') {
      return t('smartCube.algoTest.stageF2L', 'Objectif : Placer la paire F2L dans son emplacement');
    }
    if (stage === 'oll') {
      return t('smartCube.algoTest.stageOLL', 'Objectif : Orienter la face jaune complète');
    }
    if (stage === 'pll') {
      return t('smartCube.algoTest.stagePLL', 'Objectif : Résoudre entièrement le cube');
    }
    return t('smartCube.algoTest.statusSolving', 'Résolution en cours...');
  }, [stage, t]);

  const displayedTime = timerState === 'completed'
    ? formatSolveTime(finalTime)
    : timerState === 'solving'
    ? formatSolveTime(liveElapsed)
    : '0.00';

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#171a1c] text-[#e2e8f0] select-none overflow-hidden">
      {/* 1. TOPBAR */}
      <header className="h-14 border-b border-[#2d3539] px-3 sm:px-5 flex items-center justify-between shrink-0 bg-[#1b2023] z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-slate-200 transition-colors cursor-pointer shrink-0"
            aria-label={t('smartCube.algoTest.backToAlgos', 'Retour aux algorithmes')}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{t('smartCube.algoTest.backToAlgos', 'Retour aux algorithmes')}</span>
          </button>

          <div className="flex items-center gap-2 truncate">
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {caseData?.name || 'Algorithme'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#283832] border border-[#385a49] text-[#9eb5aa]">
              {caseData?.category || stage.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Battery Indicator */}
          <div
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-[#252b2e] border border-[#3b4347] text-xs font-mono font-medium text-slate-300 shrink-0"
            title={t('smartCube.telemetry.battery', 'Batterie')}
          >
            <BatteryIcon level={batteryLevel} isConnected={connectionStatus === 'connected'} />
            <span>
              {connectionStatus === 'connected' && typeof batteryLevel === 'number' && !isNaN(batteryLevel)
                ? `${batteryLevel}%`
                : '--%'}
            </span>
          </div>

          {/* Connect / Disconnect Button */}
          <button
            type="button"
            onClick={handleConnectClick}
            disabled={connectionStatus === 'connecting'}
            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              connectionStatus === 'connected'
                ? 'bg-[#252b2e] border-[#56615e] text-slate-200 hover:border-rose-400 hover:text-rose-300'
                : 'bg-[#9eb5aa] border-[#9eb5aa] text-[#1b2023] font-bold hover:bg-[#b0c6bc]'
            }`}
          >
            <BluetoothIcon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[85px] min-[390px]:max-w-none">
              {connectionStatus === 'connected'
                ? t('smartCube.action.disconnect', 'Déconnecter')
                : connectionStatus === 'connecting'
                ? t('smartCube.action.connecting', 'Connexion...')
                : t('smartCube.action.connect', 'Connecter cube')}
            </span>
          </button>
        </div>
      </header>

      {/* Connection error alert */}
      {connectionStatus === 'error' && (
        <div className="mx-3 mt-2 shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2b2123] border border-rose-900/60 text-rose-200 text-xs">
          <AlertTriangle size={15} className="text-rose-400 shrink-0" />
          <span>Erreur Bluetooth. Vérifiez que votre cube est allumé.</span>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row relative overflow-hidden">
        {/* LEFT COLUMN: Inverse Scramble & Instructions */}
        <aside className="w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-[#2d3539] bg-[#1a1e21] p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto">
          {/* Card: Inverse Setup Scramble (Guided step-by-step) */}
          <div className="rounded-xl bg-[#202629] border border-[#394144] p-3 sm:p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider truncate">
                  {t('smartCube.algoTest.setupTitle', 'Mélange préparatoire (Scramble inverse)')}
                </span>
                {timerState === 'scrambling' && scrambleMoves.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[#252b2e] border border-[#41494c] text-slate-300 shrink-0">
                    {scrambleIndex}/{scrambleMoves.length}
                  </span>
                )}
                {timerState !== 'scrambling' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#252b2e] border border-[#385a49] text-[#9eb5aa] shrink-0">
                    {t('smartCube.scramble.readyBadge', 'Mélangé - Prêt !')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyScramble}
                className="text-[11px] font-semibold text-[#9eb5aa] hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {isCopied ? 'Copié !' : 'Copier'}
              </button>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              {t('smartCube.algoTest.setupDesc', 'Appliquez cette séquence sur votre cube résolu pour préparer le cas :')}
            </p>

            {/* Error Alert if wrong move turned during guided scramble */}
            {timerState === 'scrambling' && scrambleError && (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#2f2224] border border-rose-900/70 text-rose-200 text-xs font-medium">
                <span>{t('smartCube.scramble.wrongMove', 'Mauvais mouvement ! Inverse ajouté au mélange :')}</span>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-900/80 text-white shrink-0">
                  {scrambleError}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-[#181c1e] border border-[#2d3539]">
              {scrambleMoves.map((tok, idx) => {
                if (scrambleError && timerState === 'scrambling' && idx < scrambleIndex) {
                  return null;
                }
                const face = tok[0];
                const isDone = timerState === 'scrambling' ? idx < scrambleIndex : true;
                const isCurrent = timerState === 'scrambling' && idx === scrambleIndex;
                const isHalfDone = isCurrent && scrambleSubStep === 1;

                let tokenClass = getMoveBadgeStyle(face);
                if (isDone) {
                  tokenClass = 'bg-slate-800/40 text-slate-500 border-slate-700/40';
                } else if (isCurrent) {
                  tokenClass = scrambleError
                    ? 'bg-rose-900/60 text-rose-200 border-rose-500/70'
                    : 'bg-[#303a37] text-white border-[#9eb5aa] ring-1 ring-[#9eb5aa]/40';
                }

                return (
                  <span
                    key={`${tok}-${idx}`}
                    className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded border font-mono text-xs font-bold transition-colors ${tokenClass}`}
                  >
                    <span>{tok}</span>
                    {isHalfDone && (
                      <span className="ml-0.5 text-[9px] text-amber-200">½</span>
                    )}
                  </span>
                );
              })}
            </div>

            {timerState === 'scrambling' && (
              <button
                type="button"
                onClick={handleSkipScramble}
                className="w-full py-1.5 px-3 rounded-lg bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                {t('smartCube.algoTest.skipScramble', 'Passer le mélange (déjà mélangé)')}
              </button>
            )}

            <div className="text-[11px] text-[#718096] flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#2d3539] min-w-0">
              <span className="shrink-0">Formule directe :</span>
              <span className="font-mono text-slate-300 font-semibold break-words min-w-0 text-right">{caseData?.alg}</span>
            </div>
          </div>

          {/* Card: Stage Objective */}
          <div className="rounded-xl bg-[#202629] border border-[#394144] p-3 flex items-start gap-2.5">
            <Sparkles size={16} className="text-[#9eb5aa] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-200 font-medium leading-relaxed">
              {stageGoalText}
            </div>
          </div>
        </aside>

        {/* CENTER / RIGHT: 3D Masked Model & Live Timing */}
        <main className="flex-1 min-h-0 flex flex-col relative bg-[#141719] overflow-hidden">
          {/* Gyro & Recenter Floating Controls */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <button
              type="button"
              onClick={() => toggleGyroActive()}
              className={`pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer transition-colors ${
                isGyroActive
                  ? 'bg-[#202629] border-[#385a49] text-[#9eb5aa]'
                  : 'bg-[#202629] border-[#394144] text-slate-400'
              }`}
              title={t('smartCube.telemetry.gyroToggle', 'Gyroscope')}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isGyroActive ? 'bg-[#9eb5aa]' : 'bg-slate-500'}`} />
              <span>
                Gyro: {isGyroActive ? t('smartCube.telemetry.gyroActive', 'Actif') : t('smartCube.telemetry.gyroInactive', 'Inactif')}
              </span>
            </button>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={handleRecalibrateGyro}
                className="px-2.5 py-1 rounded-md bg-[#202629] border border-[#394144] hover:border-[#9eb5aa] text-[11px] font-semibold text-[#f0f1ed] cursor-pointer"
                title={t('smartCube.action.recalibrate', 'Recentrer orientation 3D')}
              >
                {t('smartCube.action.recalibrateShort', 'Recentrer')}
              </button>
              <button
                type="button"
                onClick={init3DCubeAndSimulator}
                className="px-2.5 py-1 rounded-md bg-[#202629] border border-[#394144] hover:border-[#9eb5aa] text-[11px] font-semibold text-[#9eb5aa] cursor-pointer"
                title={t('smartCube.algoTest.retry', 'Réessayer')}
              >
                {t('smartCube.algoTest.retry', 'Réessayer')}
              </button>
            </div>
          </div>

          {/* 3D Canvas with Stage Masking */}
          <div className="flex-1 w-full h-full relative" aria-label="3D Cube Stage Masked">
            <Canvas camera={{ position: [3.8, 4.2, 5.5], fov: 60 }}>
              <ambientLight intensity={1.1} />
              <directionalLight position={[10, 10, 10]} intensity={1} />
              <SmartCubeAlgo3DScene controlsRef={controlsRef} />
              <TrackballControls ref={controlsRef} noPan noZoom rotateSpeed={4} />
            </Canvas>
          </div>

          {/* BOTTOM TIMING PANEL */}
          <footer className="p-3 sm:p-4 border-t border-[#2d3539] bg-[#1a1e21] flex flex-col items-center justify-center gap-2 shrink-0 z-10">
            {/* Status Pill */}
            <div className="flex items-center gap-2">
              {timerState === 'scrambling' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#252b2e] text-[#9eb5aa] border border-[#385a49]">
                  <span className="w-2 h-2 rounded-full bg-[#9eb5aa] animate-pulse" />
                  <span>{t('smartCube.algoTest.statusScrambling', 'Effectuez le mélange préparatoire sur votre cube')}</span>
                </span>
              )}
              {timerState === 'ready' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#2a3034] text-slate-300 border border-[#3a4449]">
                  <Clock size={13} className="text-[#9eb5aa]" />
                  <span>{t('smartCube.algoTest.statusWaitingStart', 'Tournez une face pour démarrer le chronomètre')}</span>
                </span>
              )}
              {timerState === 'solving' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#2e3b35] text-[#a7f3d0] border border-[#385a49]">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                  <span>{t('smartCube.algoTest.statusSolving', 'Résolution en cours...')}</span>
                </span>
              )}
              {timerState === 'completed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#1f372a] text-[#86efac] border border-[#22c55e]">
                  <Check size={14} className="text-[#4ade80]" />
                  <span>{t('smartCube.algoTest.statusCompleted', 'Étape réussie !')}</span>
                </span>
              )}
            </div>

            {/* Timer Display */}
            <div className="flex items-baseline gap-3">
              <div className={`text-4xl sm:text-5xl font-mono font-extrabold tracking-tight ${
                timerState === 'completed' ? 'text-[#4ade80]' : timerState === 'solving' ? 'text-white' : 'text-slate-400'
              }`}>
                {displayedTime}
              </div>
              {timerState === 'solving' && moveCount > 0 && (
                <span className="text-xs font-mono font-bold text-slate-400">
                  {moveCount} {moveCount === 1 ? 'coup' : 'coups'}
                </span>
              )}
            </div>

            {/* Completed Stats & Retry Button */}
            {timerState === 'completed' && (
              <div className="flex items-center gap-4 text-xs font-mono text-slate-300 mt-1">
                <div>
                  <span className="text-slate-500 mr-1">Coups:</span>
                  <span className="font-bold text-white">{finalMoves}</span>
                </div>
                <div>
                  <span className="text-slate-500 mr-1">TPS:</span>
                  <span className="font-bold text-[#9eb5aa]">{finalTps}</span>
                </div>
                {objectiveReason && (
                  <div className="hidden sm:block text-[#94a3b8] italic">
                    ({objectiveReason})
                  </div>
                )}
                <button
                  type="button"
                  onClick={init3DCubeAndSimulator}
                  className="px-3 py-1 rounded-md bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {t('smartCube.algoTest.retry', 'Réessayer')}
                </button>
              </div>
            )}
          </footer>
        </main>
      </div>

      {/* MAC Address Modal (if user connects for the first time) */}
      <MacAddressModal
        isOpen={isMacModalOpen}
        onClose={closeMacModal}
        onSaveAndConnect={(mac, remember) => {
          setMacAddress(mac, remember);
          connect(null, mac);
        }}
      />
    </div>
  );
}

export default SmartCubeAlgoTestView;
