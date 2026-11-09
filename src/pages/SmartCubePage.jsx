// src/pages/SmartCubePage.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import { ArrowLeft, AlertTriangle, Sparkles, Clock, ArrowDownBox } from '@getpapillon/papicons';
import { RubiksCube } from '../components/RubiksCube';
import { MacAddressModal } from '../components/SmartCube/MacAddressModal';
import { SmartCubePbModal } from '../components/SmartCube/SmartCubePbModal';
import { SmartCubeEvolutionChart } from '../components/SmartCube/SmartCubeEvolutionChart';
import { F2LBreakdownView } from '../components/SmartCube/F2LBreakdownView';
import { useCubeStore } from '../store/useCubeStore';
import {
  useSmartCubeStore,
  CFOP_PHASE_ORDER,
  CFOP_PHASE_NAMES,
  analyzeSolvePauses
} from '../store/useSmartCubeStore';
import { loadCachedMac } from '../utils/smartCube/macAddressUtils';
import { playSolveVictorySound } from '../utils/audioSystem';
import { calculateSessionStats, getEffectiveTime } from '../utils/smartCube/wcaStats';
import { computeRollingAverage } from '../utils/smartCube/chartStats';
import { paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

const PHASE_SHORT_LABELS = {
  cross: 'C',
  f2l: 'F',
  oll: 'O',
  pll: 'P'
};

const PHASE_BAR_COLORS = {
  cross: 'bg-sky-600',
  f2l: 'bg-[#385a49]',
  oll: 'bg-amber-600',
  pll: 'bg-violet-600'
};

const PHASE_BADGE_STYLES = {
  cross: 'border-[#41494c] bg-[#252b2e] text-sky-300',
  f2l: 'border-[#41494c] bg-[#252b2e] text-[#9eb5aa]',
  oll: 'border-[#41494c] bg-[#252b2e] text-amber-300',
  pll: 'border-[#41494c] bg-[#252b2e] text-violet-300'
};

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

function formatSolveTime(ms, penalty = 'none') {
  if (penalty === 'dnf') return 'DNF';
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '--';
  const effectiveMs = penalty === '+2' ? ms + 2000 : ms;
  const totalSeconds = effectiveMs / 1000;
  if (totalSeconds < 60) {
    const formatted = totalSeconds.toFixed(2);
    return penalty === '+2' ? `${formatted}+` : formatted;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  const formatted = `${minutes}:${remainingSecs}`;
  return penalty === '+2' ? `${formatted}+` : formatted;
}

function formatSplitSeconds(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '--';
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatLiveTimer(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms <= 0) return '0.00';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return totalSeconds.toFixed(2);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${remainingSecs}`;
}

function computeFluencyScore(totalMs, pauses) {
  if (!totalMs || totalMs <= 0) return 100;
  const pauseMs = pauses?.totalPauseMs || 0;
  const pauseCount = pauses?.count || 0;
  const ratio = pauseMs / totalMs;
  return Math.max(15, Math.min(100, Math.round(100 - ratio * 70 - pauseCount * 2)));
}

function buildSolveAnalysis(solve, fallbackMoveHistory = []) {
  if (!solve) return null;
  const totalMs = Math.max(1, solve.elapsedMs ?? solve.timeMs ?? 1);
  const splitsObj = solve.splits || {};
  const breakdown = CFOP_PHASE_ORDER.map(phase => {
    const s = splitsObj[phase] || {
      phase,
      name: CFOP_PHASE_NAMES[phase],
      durationMs: 0,
      moveCount: 0,
      moves: 0,
      tps: 0,
      skipped: true
    };
    const durationMs = Number(s.durationMs) || 0;
    const moves = Number(s.moves ?? s.moveCount) || 0;
    const pct = Math.min(100, Math.max(0, Math.round((durationMs / totalMs) * 100)));
    return {
      phase,
      shortLabel: PHASE_SHORT_LABELS[phase],
      name: CFOP_PHASE_NAMES[phase],
      durationMs,
      moves,
      tps: Number(s.tps) || 0,
      skipped: Boolean(s.skipped),
      pct
    };
  });

  const pauses = solve.pauses || analyzeSolvePauses(
    solve.moveTimings || fallbackMoveHistory,
    splitsObj
  );
  const fluency = computeFluencyScore(totalMs, pauses);

  return {
    solve,
    totalMs,
    breakdown,
    pauses,
    fluency
  };
}

function SmartCube3DScene({ controlsRef }) {
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

      let qTarget = qLive;
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
          qTarget = qZero.clone().invert().multiply(qLive);
        }
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

function BluetoothIcon({ className = "w-3.5 h-3.5", ...props }) {
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

function EyeIcon({ className = "w-3.5 h-3.5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function QuitIcon({ className = "w-3 h-3", ...props }) {
  return (
    <svg
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function ListIcon({ className = "w-4 h-4", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ConnectionStatusPill({ status }) {
  const { t } = useTranslation();

  const config = useMemo(() => {
    switch (status) {
      case 'connecting':
        return {
          container: 'bg-[#252b2e] border-[#41494c] text-amber-300',
          dot: 'bg-amber-400',
          label: t('smartCube.status.connecting', 'Connexion...')
        };
      case 'connected':
        return {
          container: 'bg-[#252b2e] border-[#385a49] text-[#9eb5aa]',
          dot: 'bg-[#9eb5aa]',
          label: t('smartCube.status.connected', 'Connecté')
        };
      case 'error':
        return {
          container: 'bg-[#252b2e] border-rose-900/60 text-rose-300',
          dot: 'bg-rose-500',
          label: t('smartCube.status.error', 'Erreur')
        };
      case 'disconnected':
      default:
        return {
          container: 'bg-[#252b2e] border-[#394144] text-slate-400',
          dot: 'bg-slate-500',
          label: t('smartCube.status.disconnected', 'Non connecté')
        };
    }
  }, [status, t]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors shrink-0 ${config.container}`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className="truncate max-w-[68px] min-[390px]:max-w-[95px] sm:max-w-none">{config.label}</span>
    </div>
  );
}

export function SmartCubePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useSeo('smartCube');

  const controlsRef = useRef(null);

  const isBluetoothSupported = useMemo(() => {
    return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
  }, []);

  const connectionStatus = useSmartCubeStore(state => state.connectionStatus);
  const batteryLevel = useSmartCubeStore(state => state.batteryLevel);
  const timerStatus = useSmartCubeStore(state => state.timerStatus);
  const timerStartTime = useSmartCubeStore(state => state.timerStartTime);
  const wallStartTime = useSmartCubeStore(state => state.wallStartTime);
  const inspectionStartTime = useSmartCubeStore(state => state.inspectionStartTime);
  const elapsedMs = useSmartCubeStore(state => state.elapsedMs);
  const moveCount = useSmartCubeStore(state => state.moveCount);
  const currentTps = useSmartCubeStore(state => state.currentTps);
  const finalTps = useSmartCubeStore(state => state.finalTps);
  const moveHistory = useSmartCubeStore(state => state.moveHistory);
  const scramble = useSmartCubeStore(state => state.scramble);
  const scrambleMoves = useSmartCubeStore(state => state.scrambleMoves);
  const scrambleIndex = useSmartCubeStore(state => state.scrambleIndex);
  const scrambleSubStep = useSmartCubeStore(state => state.scrambleSubStep);
  const scrambleError = useSmartCubeStore(state => state.scrambleError);
  const scrambleTracking = useSmartCubeStore(state => state.scrambleTracking);
  const currentPhase = useSmartCubeStore(state => state.currentPhase);
  const phaseSplits = useSmartCubeStore(state => state.phaseSplits);
  const sessionSolves = useSmartCubeStore(state => state.sessionSolves);

  const connect = useSmartCubeStore(state => state.connect);
  const disconnect = useSmartCubeStore(state => state.disconnect);
  const refreshBattery = useSmartCubeStore(state => state.refreshBattery);
  const newScramble = useSmartCubeStore(state => state.newScramble);
  const startScrambleTracking = useSmartCubeStore(state => state.startScrambleTracking);
  const recalibrateGyro = useSmartCubeStore(state => state.recalibrateGyro);
  const resetSolve = useSmartCubeStore(state => state.resetSolve);
  const deleteSolve = useSmartCubeStore(state => state.deleteSolve);
  const clearSessionSolves = useSmartCubeStore(state => state.clearSessionSolves);
  const updateSolvePenalty = useSmartCubeStore(state => state.updateSolvePenalty);

  const isGyroActive = useSmartCubeStore(state => state.isGyroActive);
  const toggleGyroActive = useSmartCubeStore(state => state.toggleGyroActive);

  const isMacModalOpen = useSmartCubeStore(state => state.isMacModalOpen);
  const openMacModal = useSmartCubeStore(state => state.openMacModal);
  const closeMacModal = useSmartCubeStore(state => state.closeMacModal);
  const setMacAddress = useSmartCubeStore(state => state.setMacAddress);
  const errorMessage = useSmartCubeStore(state => state.errorMessage);

  const [isCopied, setIsCopied] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPbModalOpen, setIsPbModalOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState('list'); // 'list' | 'stats' | 'trends' | 'distribution'
  const [statsPeriod, setStatsPeriod] = useState('total'); // 'day' | 'total'
  const [distRange, setDistRange] = useState(50); // 50 | 100 | 200 | 'all'
  const [selectedSolveId, setSelectedSolveId] = useState(null);

  const [liveTickMs, setLiveTickMs] = useState(0);
  const [inspectionElapsedMs, setInspectionElapsedMs] = useState(0);

  // Synchronisation 60fps du chrono sur wallStartTime
  useEffect(() => {
    if (timerStatus !== 'solving') return undefined;
    let animId;
    const updateTick = () => {
      const start = wallStartTime || timerStartTime || Date.now();
      setLiveTickMs(Math.max(1, Date.now() - start));
      animId = requestAnimationFrame(updateTick);
    };
    animId = requestAnimationFrame(updateTick);
    return () => cancelAnimationFrame(animId);
  }, [timerStatus, wallStartTime, timerStartTime]);

  // Synchronisation 60fps de l'inspection WCA 15s
  useEffect(() => {
    if (timerStatus !== 'inspecting') return undefined;
    let animId;
    const start = inspectionStartTime || Date.now();
    const updateInspection = () => {
      setInspectionElapsedMs(Math.max(0, Date.now() - start));
      animId = requestAnimationFrame(updateInspection);
    };
    animId = requestAnimationFrame(updateInspection);
    return () => cancelAnimationFrame(animId);
  }, [timerStatus, inspectionStartTime]);

  const liveDisplayMs = timerStatus === 'solving' ? liveTickMs : elapsedMs;

  // Son de victoire dès que le cube est résolu
  const prevTimerStatus = useRef(timerStatus);
  useEffect(() => {
    if (prevTimerStatus.current === 'solving' && timerStatus === 'solved') {
      try {
        playSolveVictorySound();
      } catch {
        // Fallback sécurisé
      }
    }
    prevTimerStatus.current = timerStatus;
  }, [timerStatus]);

  // Initialisation du cube 3x3 et lancement auto du guide de mélange
  useEffect(() => {
    useCubeStore.getState().initCube(3);
    const st = useSmartCubeStore.getState();
    if (st.timerStatus === 'idle') {
      st.startScrambleTracking(st.scramble, { autoInspect: true });
    }
  }, []);

  const handleConnectClick = () => {
    if (connectionStatus === 'connected') {
      disconnect();
    } else {
      const cached = loadCachedMac();
      if (!cached) {
        openMacModal();
      } else {
        connect();
      }
    }
  };

  const handleSaveMacAndConnect = (mac, remember) => {
    setMacAddress(mac, remember);
    connect(null, mac);
  };

  const handleStartNextGuidedScramble = () => {
    startScrambleTracking(null, { autoInspect: true });
  };

  const handleQuitScramble = () => {
    useCubeStore.getState().initCube(3);
    startScrambleTracking(null, { autoInspect: true });
  };

  const handleCopySequence = (movesString) => {
    const seq = typeof movesString === 'string'
      ? movesString
      : moveHistory.map(m => m.move).join(' ');
    if (typeof navigator !== 'undefined' && navigator.clipboard && seq) {
      navigator.clipboard.writeText(seq).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(() => {});
    }
  };

  const handleClearSession = () => {
    if (sessionSolves.length === 0) return;
    if (typeof window !== 'undefined' && window.confirm(t('smartCube.history.confirmClear', 'Effacer tous les temps de la session ?'))) {
      clearSessionSolves();
      setSelectedSolveId(null);
    }
  };

  const handleExportCsTimer = () => {
    if (!sessionSolves || sessionSolves.length === 0) {
      alert(t('timer.noSolvesToExport', 'Aucun temps à exporter dans cette session'));
      return;
    }

    const csSolves = [...sessionSolves].reverse().map(s => {
      const penaltyCode = s.penalty === '+2' ? 2000 : (s.penalty === 'dnf' || s.penalty === 'DNF' || s.isDnf) ? -1 : 0;
      const timeMs = s.elapsedMs ?? s.timeMs ?? 0;
      const timestampSec = Math.floor((Number(s.timestamp) || Number(s.date) || Date.now()) / 1000);
      return [
        [penaltyCode, timeMs],
        s.scramble || '',
        s.moves ? `Moves: ${s.moves}` : '',
        timestampSec
      ];
    });

    const exportData = {
      session1: csSolves,
      properties: {
        sessionData: JSON.stringify({
          1: {
            name: 'Smart Cube - 3x3x3',
            opt: {}
          }
        })
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cstimer_export_smartcube_3x3x3_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sessionStats = useMemo(() => {
    return calculateSessionStats(sessionSolves);
  }, [sessionSolves]);

  const { bestSolveIndex, worstSolveIndex } = useMemo(() => {
    if (!sessionSolves || sessionSolves.length < 1) {
      return { bestSolveIndex: -1, worstSolveIndex: -1 };
    }

    let minTime = Infinity;
    let maxTime = -Infinity;
    let bestIdx = -1;
    let worstIdx = -1;

    sessionSolves.forEach((s, idx) => {
      const isDnf = s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf;
      if (isDnf) return;
      const eff = getEffectiveTime(s);
      if (typeof eff === 'number' && !isNaN(eff)) {
        if (eff < minTime) {
          minTime = eff;
          bestIdx = idx;
        }
        if (eff > maxTime) {
          maxTime = eff;
          worstIdx = idx;
        }
      }
    });

    if (!isFinite(minTime) || minTime === Infinity) {
      return { bestSolveIndex: -1, worstSolveIndex: -1 };
    }

    return {
      bestSolveIndex: bestIdx,
      worstSolveIndex: (minTime !== maxTime && sessionSolves.length > 1) ? worstIdx : -1
    };
  }, [sessionSolves]);

  const pbSolve = useMemo(() => {
    if (bestSolveIndex === -1 || !sessionSolves) return null;
    return sessionSolves[bestSolveIndex] || null;
  }, [sessionSolves, bestSolveIndex]);

  const rollingAo5List = useMemo(() => computeRollingAverage(sessionSolves || [], 5), [sessionSolves]);
  const rollingAo12List = useMemo(() => computeRollingAverage(sessionSolves || [], 12), [sessionSolves]);

  const periodStats = useMemo(() => {
    const allSolves = Array.isArray(sessionSolves) ? sessionSolves : [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const filtered = statsPeriod === 'day'
      ? allSolves.filter(s => {
          const ts = Number(s?.timestamp) || Number(s?.date) || 0;
          return ts >= todayMs;
        })
      : allSolves;

    const validSolves = [];
    let bestSingleMs = Infinity;
    let totalTimeMs = 0;
    let totalMoves = 0;
    let totalTps = 0;
    let totalFluency = 0;
    let totalPauses = 0;

    filtered.forEach(s => {
      const isDnf = s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf;
      if (isDnf) return;
      const eff = getEffectiveTime(s);
      if (typeof eff === 'number' && !isNaN(eff) && eff > 0) {
        validSolves.push(s);
        if (eff < bestSingleMs) bestSingleMs = eff;
        totalTimeMs += eff;
        totalMoves += Number(s?.moveCount) || 0;
        totalTps += Number(s?.tps) || 0;
        totalFluency += computeFluencyScore(s?.elapsedMs ?? s?.timeMs, s?.pauses);
        totalPauses += Number(s?.pauses?.count) || 0;
      }
    });

    const pAo5 = computeRollingAverage(filtered, 5).filter(v => typeof v === 'number' && !isNaN(v));
    const pAo12 = computeRollingAverage(filtered, 12).filter(v => typeof v === 'number' && !isNaN(v));
    const bestAo5Ms = pAo5.length > 0 ? Math.min(...pAo5) : null;
    const bestAo12Ms = pAo12.length > 0 ? Math.min(...pAo12) : null;

    const vCount = validSolves.length;
    return {
      totalCount: filtered.length,
      validCount: vCount,
      avgTimeMs: vCount > 0 ? totalTimeMs / vCount : null,
      bestSingleMs: vCount > 0 && isFinite(bestSingleMs) ? bestSingleMs : null,
      avgMoves: vCount > 0 ? totalMoves / vCount : null,
      avgTps: vCount > 0 ? totalTps / vCount : null,
      avgFluency: vCount > 0 ? totalFluency / vCount : null,
      avgPauses: vCount > 0 ? totalPauses / vCount : null,
      bestAo5Ms,
      bestAo12Ms
    };
  }, [sessionSolves, statsPeriod]);

  const distributionData = useMemo(() => {
    const allSolves = Array.isArray(sessionSolves) ? sessionSolves : [];
    const sliced = distRange === 'all' ? allSolves : allSolves.slice(-Number(distRange));
    const validSecs = [];
    sliced.forEach(s => {
      const isDnf = s === 'DNF' || s?.penalty === 'dnf' || s?.isDnf;
      if (isDnf) return;
      const eff = getEffectiveTime(s);
      if (typeof eff === 'number' && !isNaN(eff) && eff > 0) {
        validSecs.push(eff / 1000);
      }
    });

    if (validSecs.length === 0) {
      return { buckets: [], maxCount: 0, totalValid: 0 };
    }

    const minVal = Math.min(...validSecs);
    const maxVal = Math.max(...validSecs);
    const bucketCount = 6;
    const startSec = Math.max(0, Math.floor(minVal * 2) / 2);
    const rawSpan = Math.max(1.2, maxVal - startSec + 0.01);
    const step = Math.max(0.5, Math.ceil((rawSpan / bucketCount) * 2) / 2);

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const low = startSec + i * step;
      const high = low + step;
      return {
        label: `${low % 1 === 0 ? low.toFixed(0) : low.toFixed(1)}-${high % 1 === 0 ? high.toFixed(0) : high.toFixed(1)}s`,
        low,
        high,
        count: 0
      };
    });

    validSecs.forEach(sec => {
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((sec - startSec) / step)));
      buckets[idx].count += 1;
    });

    const maxCount = Math.max(1, ...buckets.map(b => b.count));
    return { buckets, maxCount, totalValid: validSecs.length };
  }, [sessionSolves, distRange]);

  const activeScrambleMoves = useMemo(() => {
    if (Array.isArray(scrambleMoves) && scrambleMoves.length > 0) return scrambleMoves;
    if (Array.isArray(scrambleTracking?.expectedMoves) && scrambleTracking.expectedMoves.length > 0) {
      return scrambleTracking.expectedMoves;
    }
    return (scramble || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }, [scrambleMoves, scrambleTracking, scramble]);

  const activeScrambleIndex = typeof scrambleIndex === 'number'
    ? scrambleIndex
    : (scrambleTracking?.currentMoveIndex ?? 0);

  const visibleScrambleTokens = useMemo(() => {
    const tokens = activeScrambleMoves.map((moveToken, idx) => ({
      moveToken,
      idx
    }));
    if (scrambleError && timerStatus === 'scrambling') {
      return tokens.filter(item => item.idx >= activeScrambleIndex);
    }
    return tokens;
  }, [activeScrambleMoves, scrambleError, timerStatus, activeScrambleIndex]);

  // Le bandeau de mélange s'affiche pendant le mélange, disparaît pendant l'inspection/résolution, et réapparaît une fois résolu
  const showScrambleBanner =
    timerStatus === 'scrambling' ||
    timerStatus === 'idle' ||
    timerStatus === 'solved';

  const inspectionInfo = useMemo(() => {
    const elapsedSec = inspectionElapsedMs / 1000;
    const remainingSec = Math.max(0, 15 - elapsedSec);
    const pct = Math.min(100, Math.max(0, (remainingSec / 15) * 100));
    if (elapsedSec >= 17) {
      return { text: 'DNF', color: 'text-rose-400', bar: 'bg-rose-500', pct: 0 };
    }
    if (elapsedSec >= 15) {
      return { text: '+2', color: 'text-rose-300', bar: 'bg-rose-500', pct: 0 };
    }
    if (elapsedSec >= 12) {
      return { text: `${remainingSec.toFixed(1)}s`, color: 'text-rose-300', bar: 'bg-rose-500', pct };
    }
    if (elapsedSec >= 8) {
      return { text: `${remainingSec.toFixed(1)}s`, color: 'text-amber-300', bar: 'bg-amber-400', pct };
    }
    return { text: `${remainingSec.toFixed(1)}s`, color: 'text-orange-300', bar: 'bg-orange-400', pct };
  }, [inspectionElapsedMs]);

  // Dernière résolution pour l'affichage en bas de l'écran une fois terminé
  const latestSolve = sessionSolves.length > 0 ? sessionSolves[sessionSolves.length - 1] : null;
  const postSolveAnalysis = useMemo(() => {
    return buildSolveAnalysis(latestSolve, moveHistory);
  }, [latestSolve, moveHistory]);

  // Résolution inspectée dans la sous-vue "Toutes les infos" de la modale d'historique
  const modalInspectedSolve = useMemo(() => {
    if (!selectedSolveId) return null;
    return sessionSolves.find(s => s.id === selectedSolveId) || null;
  }, [selectedSolveId, sessionSolves]);

  const modalSolveAnalysis = useMemo(() => {
    return buildSolveAnalysis(modalInspectedSolve, moveHistory);
  }, [modalInspectedSolve, moveHistory]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#1b2023] text-[#f0f1ed] overflow-hidden select-none">
      {/* 1. EN-TÊTE MINIMALISTE SUR UNE SEULE LIGNE : Retour + Connecté + Batterie + Déconnecter */}
      <header className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-5 min-h-12 py-1 bg-[#202629] border-b border-[#394144] shrink-0 z-20">
        <button
          onClick={() => navigate(paths.play())}
          className="inline-flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 rounded-lg bg-[#252b2e] border border-[#41494c] text-[#f0f1ed] hover:border-[#9eb5aa] transition-colors cursor-pointer shrink-0"
          aria-label={t('common.back', 'Retour')}
          title={t('app.play.smartCube.back', 'Jeux')}
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline ml-1.5 text-xs font-semibold">
            {t('app.play.smartCube.back', 'Jeux')}
          </span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-wrap sm:flex-nowrap justify-end">
          <ConnectionStatusPill status={connectionStatus} />

          {/* Pilule Batterie (cliquable pour rafraîchir) */}
          <button
            type="button"
            onClick={() => refreshBattery && refreshBattery()}
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-[#252b2e] border border-[#41494c] text-slate-200 hover:border-[#9eb5aa] cursor-pointer shrink-0"
            title={t('smartCube.telemetry.battery', 'Batterie')}
          >
            <BatteryIcon level={batteryLevel} isConnected={connectionStatus === 'connected'} />
            <span>
              {connectionStatus === 'connected' && typeof batteryLevel === 'number' && !isNaN(batteryLevel)
                ? `${batteryLevel}%`
                : '--%'}
            </span>
          </button>

          {/* Bouton Connecter / Déconnecter */}
          <button
            onClick={handleConnectClick}
            disabled={!isBluetoothSupported || connectionStatus === 'connecting'}
            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              connectionStatus === 'connected'
                ? 'bg-[#252b2e] border-[#56615e] text-slate-200 hover:border-rose-400 hover:text-rose-300'
                : 'bg-[#9eb5aa] border-[#9eb5aa] text-[#1b2023] font-bold hover:bg-[#b0c6bc]'
            } ${!isBluetoothSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Alertes compactes si navigateur non supporté ou erreur BLE */}
      {!isBluetoothSupported && (
        <div className="mx-3 mt-2 shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-950/70 border border-amber-600/70 text-amber-200 text-xs">
          <AlertTriangle size={16} className="shrink-0 text-amber-400" />
          <div className="truncate">
            <span className="font-semibold text-amber-100 mr-1">
              {t('smartCube.bluetoothUnavailableTitle', 'Navigateur non compatible Web Bluetooth')} :
            </span>
            <span>
              {t('smartCube.bluetoothUnavailableDesc', 'Utilisez Chrome, Edge, Brave ou Bluefy sur iOS.')}
            </span>
          </div>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="mx-3 mt-2 shrink-0 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#2b2123] border border-rose-900/60 text-rose-200 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={15} className="text-rose-400 shrink-0" />
            <span className="truncate">{errorMessage || t('smartCube.status.error', 'Erreur Bluetooth')}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={openMacModal}
              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-rose-950/80 border border-rose-800 text-rose-200 hover:border-rose-600 cursor-pointer"
            >
              {t('smartCube.action.changeMac', 'MAC')}
            </button>
            <button
              onClick={() => connect()}
              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-white cursor-pointer"
            >
              {t('common.retry', 'Réessayer')}
            </button>
          </div>
        </div>
      )}

      {/* 2. BANDEAU DE MÉLANGE */}
      {showScrambleBanner && (
        <section className="mx-2.5 sm:mx-auto sm:w-full sm:max-w-2xl mt-2 px-3 py-2.5 rounded-xl bg-[#202629] border border-[#394144] shrink-0 z-10">
          <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[#9eb5aa]">
                {t('smartCube.telemetry.scramble', 'Mélange WCA')}
              </span>
              {timerStatus === 'scrambling' && (
                <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[#252b2e] border border-[#41494c] text-slate-300">
                  {activeScrambleIndex}/{activeScrambleMoves.length}
                </span>
              )}
              {timerStatus === 'solved' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#252b2e] border border-[#385a49] text-[#9eb5aa]">
                  {t('smartCube.scramble.readyBadge', 'Terminé')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {timerStatus === 'scrambling' && (
                <>
                  <button
                    type="button"
                    onClick={handleQuitScramble}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#252b2e] border border-rose-900/60 text-[11px] font-semibold text-rose-300 hover:border-rose-500 hover:text-rose-200 cursor-pointer"
                    title={t('smartCube.action.quitScrambleDesc', 'Réinitialiser le cube et générer un nouveau mélange')}
                  >
                    <QuitIcon className="w-3 h-3" />
                    <span>{t('smartCube.action.quitScramble', 'Quitter')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => newScramble(scramble, { autoInspect: true })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#252b2e] border border-[#41494c] text-[11px] font-semibold text-slate-300 hover:border-[#9eb5aa] hover:text-white cursor-pointer"
                  >
                    <EyeIcon className="w-3 h-3" />
                    <span>{t('smartCube.action.inspect', 'Passer')}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleStartNextGuidedScramble}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-[11px] font-semibold text-[#f0f1ed] cursor-pointer"
              >
                <Sparkles size={11} />
                <span>
                  {timerStatus === 'solved'
                    ? t('smartCube.action.nextScramble', 'Mélanger le suivant')
                    : t('smartCube.action.scramble', 'Changer')}
                </span>
              </button>
            </div>
          </div>

          {/* Alerte d'erreur si une mauvaise face est tournée */}
          {timerStatus === 'scrambling' && scrambleError && (
            <div className="mb-1.5 flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-[#2f2224] border border-rose-900/70 text-rose-200 text-xs font-medium">
              <span>{t('smartCube.scramble.wrongMove', 'Mauvais mouvement ! Inverse ajouté au mélange :')}</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-900/80 text-white">
                {scrambleError}
              </span>
            </div>
          )}

          {/* Jetons du mélange */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-1.5 select-text">
            {visibleScrambleTokens.map(({ moveToken, idx }) => {
              const isDone = timerStatus === 'scrambling' ? idx < activeScrambleIndex : timerStatus === 'solved';
              const isCurrent = timerStatus === 'scrambling' && idx === activeScrambleIndex;
              const isHalfDone = isCurrent && scrambleSubStep === 1;

              let tokenClass = 'text-slate-300 border-transparent';
              if (isDone) {
                tokenClass = 'text-slate-500 border-transparent';
              } else if (isCurrent) {
                tokenClass = scrambleError
                  ? 'bg-rose-900/60 text-rose-200 border-rose-500/70'
                  : 'bg-[#303a37] text-white border-[#9eb5aa]';
              }

              return (
                <span
                  key={`${moveToken}-${idx}`}
                  className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded border font-mono text-xs sm:text-sm font-semibold transition-colors ${tokenClass}`}
                >
                  <span>{moveToken}</span>
                  {isHalfDone && (
                    <span className="ml-0.5 text-[9px] text-amber-200">½</span>
                  )}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. ZONE CENTRALE : CUBE VIRTUEL 3D PLEIN ÉCRAN */}
      <div className="flex-1 min-h-0 relative w-full flex items-center justify-center overflow-hidden touch-none">
        {/* Contrôles Gyro & Recentrage flottants très discrets en haut du canvas */}
        <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
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
              {t('smartCube.telemetry.gyroToggle', 'Gyro')}: {isGyroActive ? t('smartCube.telemetry.gyroActive', 'Actif') : t('smartCube.telemetry.gyroInactive', 'Inactif')}
            </span>
          </button>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={recalibrateGyro}
              className="px-2.5 py-1 rounded-md bg-[#202629] border border-[#394144] hover:border-[#9eb5aa] text-[11px] font-semibold text-[#f0f1ed] cursor-pointer"
              title={t('smartCube.action.recalibrate', 'Recentrer orientation 3D')}
            >
              {t('smartCube.action.recalibrateShort', 'Recentrer')}
            </button>
            {timerStatus !== 'scrambling' && (
              <button
                type="button"
                onClick={resetSolve}
                className="px-2.5 py-1 rounded-md bg-[#202629] border border-[#394144] hover:border-rose-400 text-[11px] font-semibold text-slate-300 cursor-pointer"
              >
                {t('smartCube.action.reset', 'Réinitialiser')}
              </button>
            )}
          </div>
        </div>

        <div className="w-full h-full touch-none overflow-hidden" aria-label={t('smartCube.view3d', 'Vue 3D temps réel')}>
          <Canvas camera={{ position: [3.8, 4.2, 5.5], fov: 62 }}>
            <ambientLight intensity={1.1} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <SmartCube3DScene controlsRef={controlsRef} />
            <TrackballControls ref={controlsRef} noPan noZoom rotateSpeed={4} />
          </Canvas>
        </div>
      </div>

      {/* 4. ZONE INFÉRIEURE (BOTTOM DOCK) : Timer, Phases CFOP et Bouton "Tous les temps" */}
      <footer className="px-3 pb-3 pt-1.5 sm:px-5 sm:pb-4 shrink-0 z-10 w-full max-w-2xl mx-auto flex flex-col gap-2">
        {/* ÉTAT A : En cours de mélange */}
        {(timerStatus === 'scrambling' || timerStatus === 'idle') && (
          <div className="p-3 rounded-xl bg-[#202629] border border-[#394144] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#9eb5aa] shrink-0" />
              <div className="truncate">
                <div className="text-xs sm:text-sm font-bold text-white">
                  {t('smartCube.timer.scrambling', 'Effectuez le mélange sur le cube')}
                </div>
                <div className="text-[11px] text-[#94a3b8]">
                  {t('smartCube.timer.ready', 'L’inspection démarrera dès la fin du mélange')}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-[#f0f1ed] cursor-pointer shrink-0"
            >
              <ListIcon className="w-3.5 h-3.5 text-[#9eb5aa]" />
              <span>{t('smartCube.history.title', 'Tous les temps')} ({sessionSolves.length})</span>
            </button>
          </div>
        )}

        {/* ÉTAT B : Inspection WCA (15s) ou Mélangé prêt à démarrer */}
        {(timerStatus === 'inspecting' || timerStatus === 'scrambled') && (
          <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Clock size={13} />
              <span>
                {timerStatus === 'inspecting'
                  ? t('smartCube.timer.inspecting', 'Inspection WCA')
                  : t('smartCube.timer.scrambled', 'Mélangé — Tournez pour lancer')}
              </span>
            </div>

            <div className={`text-5xl sm:text-6xl font-mono font-extrabold tracking-tight leading-none ${
              timerStatus === 'inspecting' ? inspectionInfo.color : 'text-amber-200'
            }`}>
              {timerStatus === 'inspecting' ? inspectionInfo.text : '0.00'}
            </div>

            {timerStatus === 'inspecting' && (
              <div className="w-full h-1.5 rounded-full bg-[#252b2e] overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${inspectionInfo.bar}`}
                  style={{ width: `${inspectionInfo.pct}%` }}
                />
              </div>
            )}

            <div className="w-full flex items-center justify-between pt-1 text-[11px] text-[#94a3b8]">
              <span>{t('smartCube.telemetry.waitingMove', 'Tournez n’importe quelle face pour démarrer')}</span>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="inline-flex items-center gap-1 font-semibold text-[#9eb5aa] hover:underline cursor-pointer"
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>{t('smartCube.history.toggle', 'Tous les temps')} ({sessionSolves.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* ÉTAT C : Résolution en cours (Chrono géant + 4 phases CFOP en direct) */}
        {timerStatus === 'solving' && (
          <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-5xl sm:text-6xl font-mono font-extrabold tracking-tight leading-none text-white">
                {formatLiveTimer(liveDisplayMs)}
              </div>
              <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
                <span className="text-slate-300">
                  <strong className="text-white">{moveCount}</strong> {t('smartCube.telemetry.moves', 'mvt')}
                </span>
                <span className="text-[#9eb5aa] font-bold">
                  {currentTps.toFixed(2)} {t('smartCube.telemetry.liveTps', 'TPS')}
                </span>
              </div>
            </div>

            {/* Barre des 4 phases CFOP en direct */}
            <div className="grid grid-cols-4 gap-1.5">
              {CFOP_PHASE_ORDER.map(phase => {
                const split = phaseSplits?.[phase];
                const isDone = Boolean(split);
                const isCurrent = currentPhase === phase && !isDone;
                return (
                  <div
                    key={phase}
                    className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
                      isDone
                        ? 'bg-[#252b2e] border-[#385a49] text-[#9eb5aa]'
                        : isCurrent
                        ? 'bg-[#252b2e] border-[#9eb5aa] text-white'
                        : 'bg-[#1c2124] border-[#343c3f] text-slate-500'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase">{CFOP_PHASE_NAMES[phase]}</div>
                    <div className="text-xs font-mono font-bold mt-0.5">
                      {isDone
                        ? (split.skipped ? 'Skip' : formatSplitSeconds(split.durationMs))
                        : isCurrent
                        ? t('smartCube.cfop.inProgress', '...')
                        : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ÉTAT D : Cube résolu ! (Temps final + Tableau des 4 phases CFOP façon Cube Station + Bouton Tous les temps) */}
        {timerStatus === 'solved' && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-2.5">
            {/* Ligne supérieure : Badge Terminé + Temps encadré + Métriques globales */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#252b2e] border border-[#385a49] text-[#9eb5aa] text-[11px] font-semibold">
                  {t('smartCube.timer.solved', 'Terminé')}
                </span>
                <div className="px-3 py-1 rounded-lg bg-[#252b2e] border border-[#41494c] text-2xl sm:text-3xl font-mono font-extrabold text-white leading-none">
                  {formatSolveTime(
                    postSolveAnalysis?.totalMs ?? elapsedMs,
                    postSolveAnalysis?.solve?.penalty
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs font-mono text-slate-300">
                <span>
                  {t('smartCube.telemetry.moves', 'Étapes')} <strong className="text-white">{postSolveAnalysis?.solve?.moveCount ?? moveCount}</strong>
                </span>
                <span>
                  {t('smartCube.telemetry.finalTps', 'TPS')} <strong className="text-[#9eb5aa]">{(postSolveAnalysis?.solve?.tps ?? finalTps ?? 0).toFixed(2)}</strong>
                </span>
                {postSolveAnalysis && (
                  <span>
                    Fluence <strong className="text-slate-200">{postSolveAnalysis.fluency}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Grille des 4 phases CFOP (C, F, O, P) avec Temps, Étapes et TPS */}
            {postSolveAnalysis && (
              <div className="grid grid-cols-4 gap-1.5">
                {postSolveAnalysis.breakdown.map(item => (
                  <div
                    key={item.phase}
                    className={`p-2 rounded-lg border flex flex-col justify-between ${PHASE_BADGE_STYLES[item.phase]}`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="px-1.5 py-0.2 rounded bg-black/30 text-white">{item.shortLabel}</span>
                      <span className="font-mono opacity-80">{item.skipped ? '0%' : `${item.pct}%`}</span>
                    </div>
                    <div className="text-xs sm:text-sm font-mono font-extrabold text-white mt-1">
                      {item.skipped ? 'Skip' : formatSplitSeconds(item.durationMs)}
                    </div>
                    <div className="text-[10px] font-mono opacity-85 mt-0.5 flex items-center justify-between">
                      <span>{item.moves}m</span>
                      <span>{item.tps.toFixed(1)}t/s</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Boutons d'action en bas : Voir tous les temps + Mélange suivant */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedSolveId(null);
                  setIsHistoryOpen(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-[#f0f1ed] cursor-pointer"
              >
                <ListIcon className="w-4 h-4 text-[#9eb5aa]" />
                <span>{t('smartCube.history.title', 'Tous les temps')} ({sessionSolves.length})</span>
              </button>

              {postSolveAnalysis?.solve && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSolveId(postSolveAnalysis.solve.id);
                    setIsHistoryOpen(true);
                  }}
                  className="py-2 px-3 rounded-lg bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-[#f0f1ed] cursor-pointer"
                >
                  {t('smartCube.history.inspectSolve', 'Détails')}
                </button>
              )}

              <button
                type="button"
                onClick={handleStartNextGuidedScramble}
                className="py-2 px-3.5 rounded-lg bg-[#9eb5aa] hover:bg-[#b0c6bc] text-xs font-bold text-[#1b2023] cursor-pointer"
              >
                {t('smartCube.action.scramble', 'Suivant')}
              </button>
            </div>
          </div>
        )}
      </footer>

      {/* 5. MODALE PLEIN ÉCRAN PORTRAIT : TOUS LES TEMPS, DÉTAILS D'UN TEMPS & STATISTIQUES */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl h-[100dvh] sm:h-[85dvh] bg-[#1b2023] sm:rounded-xl rounded-none border-0 sm:border border-[#394144] flex flex-col overflow-hidden">
            {/* En-tête de la modale en 2 niveaux sans débordement */}
            <div className="flex flex-col bg-[#202629] border-b border-[#394144] shrink-0">
              {/* Ligne 1 : Titre ou bouton retour + boutons d'action à droite */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
                {modalSolveAnalysis ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSolveId(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9eb5aa] hover:text-white cursor-pointer"
                  >
                    <ArrowLeft size={15} />
                    <span>{t('common.back', 'Retour à la liste')}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 min-w-0 flex-1 max-w-full">
                    <Clock size={16} className="text-[#9eb5aa] shrink-0" />
                    <span className="text-xs sm:text-sm font-extrabold text-[#f0f1ed] truncate">
                      {t('smartCube.history.modalTitle', 'Historique & Statistiques')} ({sessionSolves.length})
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap shrink-0 justify-end">
                  {pbSolve && !modalSolveAnalysis && (
                    <button
                      type="button"
                      onClick={() => setIsPbModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-[#f0f1ed] cursor-pointer shrink-0"
                      title={t('smartCube.pbCard.buttonTooltip', 'Partager la carte de record Smart Cube')}
                    >
                      <Sparkles size={14} />
                      <span>{t('smartCube.pbCard.button', 'Carte PB')}</span>
                    </button>
                  )}
                  {sessionSolves.length > 0 && !modalSolveAnalysis && (
                    <button
                      type="button"
                      onClick={handleExportCsTimer}
                      className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-[#f0f1ed] cursor-pointer shrink-0"
                      title={t('timer.exportCsTimer', 'Exporter la session au format csTimer')}
                    >
                      <ArrowDownBox size={14} />
                      <span>{t('smartCube.history.export', 'Exporter')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSolveId(null);
                      setIsHistoryOpen(false);
                    }}
                    className="px-2 sm:px-2.5 py-1 rounded-lg bg-[#252b2e] border border-[#41494c] text-xs font-bold text-slate-200 hover:text-white cursor-pointer shrink-0"
                  >
                    {t('common.close', 'Fermer')}
                  </button>
                </div>
              </div>

              {/* Ligne 2 : Barre de navigation à 4 onglets bien répartis */}
              {!modalSolveAnalysis && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-3 sm:px-4 pb-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('list')}
                    title={t('smartCube.history.tabDetails', 'Détails de la résolution')}
                    className={`min-w-0 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center truncate cursor-pointer transition-colors ${
                      historyTab === 'list'
                        ? 'bg-[#9eb5aa] text-[#1b2023]'
                        : 'bg-[#252b2e] text-slate-300 border border-[#394144] hover:text-white'
                    }`}
                  >
                    {t('smartCube.history.tabDetails', 'Détails de la résolution')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('stats')}
                    title={t('smartCube.stats.title', 'Statistiques')}
                    className={`min-w-0 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center truncate cursor-pointer transition-colors ${
                      historyTab === 'stats'
                        ? 'bg-[#9eb5aa] text-[#1b2023]'
                        : 'bg-[#252b2e] text-slate-300 border border-[#394144] hover:text-white'
                    }`}
                  >
                    {t('smartCube.stats.title', 'Statistiques')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('trends')}
                    title={t('smartCube.history.tabTrends', 'AO Trend')}
                    className={`min-w-0 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center truncate cursor-pointer transition-colors ${
                      historyTab === 'trends'
                        ? 'bg-[#9eb5aa] text-[#1b2023]'
                        : 'bg-[#252b2e] text-slate-300 border border-[#394144] hover:text-white'
                    }`}
                  >
                    {t('smartCube.history.tabTrends', 'AO Trend')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('distribution')}
                    title={t('smartCube.history.tabDistribution', 'Distribution du temps')}
                    className={`min-w-0 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center truncate cursor-pointer transition-colors ${
                      historyTab === 'distribution'
                        ? 'bg-[#9eb5aa] text-[#1b2023]'
                        : 'bg-[#252b2e] text-slate-300 border border-[#394144] hover:text-white'
                    }`}
                  >
                    {t('smartCube.history.tabDistribution', 'Distribution du temps')}
                  </button>
                </div>
              )}
            </div>

            {/* Contenu de la modale */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-3">
              {/* SOUS-VUE 1 : FICHE DÉTAILLÉE D'UN TEMPS ("Voir toutes les infos") */}
              {modalSolveAnalysis ? (
                <div className="flex flex-col gap-3">
                  {/* Résumé principal du temps */}
                  <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-[#94a3b8] uppercase font-bold">
                        {t('smartCube.analysis.title', 'Détails de la résolution')}
                      </div>
                      <div className="text-3xl font-mono font-extrabold text-white mt-0.5">
                        {formatSolveTime(modalSolveAnalysis.totalMs, modalSolveAnalysis.solve.penalty)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-center">
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144]">
                        <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Étapes</div>
                        <div className="text-sm font-mono font-bold text-white">{modalSolveAnalysis.solve.moveCount}</div>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144]">
                        <div className="text-[10px] text-[#94a3b8] uppercase font-bold">TPS</div>
                        <div className="text-sm font-mono font-bold text-[#9eb5aa]">
                          {Number(modalSolveAnalysis.solve.tps || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144]">
                        <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Fluence</div>
                        <div className="text-sm font-mono font-bold text-slate-200">{modalSolveAnalysis.fluency}</div>
                      </div>
                    </div>
                  </div>

                  {/* Tableau CFOP style Cube Station (C, F, O, P avec Temps, Étapes, TPS, %) */}
                  <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#9eb5aa]">
                      {t('smartCube.cfop.title', 'Décomposition CFOP (Cross • F2L • OLL • PLL)')}
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-[#252b2e] overflow-hidden flex border border-[#394144]">
                      {modalSolveAnalysis.breakdown.map(item => (
                        item.pct > 0 && (
                          <div
                            key={item.phase}
                            style={{ width: `${item.pct}%` }}
                            className={`${PHASE_BAR_COLORS[item.phase]} h-full`}
                          />
                        )
                      ))}
                    </div>

                    <div className="grid grid-cols-4 text-[11px] font-bold text-[#94a3b8] px-2 pt-1">
                      <span>Phase</span>
                      <span className="text-right">Temps</span>
                      <span className="text-right">Étapes</span>
                      <span className="text-right">TPS</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {modalSolveAnalysis.breakdown.map(item => (
                        <div
                          key={item.phase}
                          className="grid grid-cols-4 items-center px-2.5 py-2 rounded-lg bg-[#252b2e] border border-[#394144]/70 font-mono text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${PHASE_BADGE_STYLES[item.phase]}`}>
                              {item.shortLabel}
                            </span>
                            <span className="font-sans font-semibold text-slate-200">{item.name}</span>
                          </div>
                          <span className="text-right font-bold text-white">
                            {item.skipped ? 'Skip' : formatSplitSeconds(item.durationMs)}
                          </span>
                          <span className="text-right text-slate-300">{item.moves}</span>
                          <span className="text-right text-emerald-400">{item.tps.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Hésitations / pauses */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#252b2e] border border-[#394144] text-xs">
                      <span className="text-[#94a3b8] font-semibold">
                        {t('smartCube.analysis.pauses', 'Hésitations (>450ms)')}
                      </span>
                      {modalSolveAnalysis.pauses.count === 0 ? (
                        <span className="font-mono text-emerald-400 font-semibold">
                          {t('smartCube.analysis.noPauses', 'Aucune pause')}
                        </span>
                      ) : (
                        <span className="font-mono text-amber-300">
                          {modalSolveAnalysis.pauses.count} pause(s) • {(modalSolveAnalysis.pauses.totalPauseMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Détail des 4 paires F2L */}
                  <F2LBreakdownView solve={modalSolveAnalysis.solve} />

                  {/* Mélange utilisé */}
                  <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                      {t('smartCube.telemetry.scramble', 'Mélange WCA')}
                    </span>
                    <div className="font-mono text-xs sm:text-sm text-slate-200 select-text break-words">
                      {modalSolveAnalysis.solve.scramble || scramble}
                    </div>
                  </div>

                  {/* Séquence de mouvements complète */}
                  <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-[#94a3b8]">
                        {t('smartCube.telemetry.moveTape', 'Séquence de mouvements')} ({modalSolveAnalysis.solve.moveCount})
                      </span>
                      {modalSolveAnalysis.solve.moves && (
                        <button
                          type="button"
                          onClick={() => handleCopySequence(modalSolveAnalysis.solve.moves)}
                          className="text-[11px] font-semibold text-[#9eb5aa] hover:underline cursor-pointer"
                        >
                          {isCopied
                            ? t('smartCube.action.sequenceCopied', 'Copié !')
                            : t('smartCube.action.copySequence', 'Copier la séquence')}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto p-2 rounded-lg bg-[#252b2e] border border-[#394144] font-mono text-xs select-text">
                      {(modalSolveAnalysis.solve.moves || '')
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((mv, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded border text-[11px] font-bold ${getMoveBadgeStyle(mv[0])}`}
                          >
                            {mv}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              ) : historyTab === 'list' ? (
                /* ONGLET 1 : DÉTAILS DE LA RÉSOLUTION (TABLEAU STRUCTURÉ FAÇON CUBE STATION) */
                <div className="flex flex-col gap-2.5">
                  {sessionSolves.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-[#94a3b8] px-1">
                      <span>{sessionStats.count} {t('smartCube.stats.solves', 'résolutions')}</span>
                      <button
                        type="button"
                        onClick={handleClearSession}
                        className="inline-flex items-center gap-1 text-rose-400 hover:underline cursor-pointer"
                      >
                        <TrashIcon />
                        <span>{t('smartCube.history.clear', 'Vider la session')}</span>
                      </button>
                    </div>
                  )}

                  {sessionSolves.length === 0 ? (
                    <div className="text-xs text-[#64748b] italic py-8 text-center">
                      {t('smartCube.history.empty', 'Aucun temps enregistré')}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#202629] border border-[#394144] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#252b2e] border-b border-[#394144] text-[10px] uppercase tracking-wider font-extrabold text-[#94a3b8]">
                              <th className="py-2.5 px-2.5">{t('smartCube.history.colTotal', 'Total')}</th>
                              <th className="py-2.5 px-2.5">{t('smartCube.history.colSingle', 'Résolution unique')}</th>
                              <th className="py-2.5 px-2 text-center">{t('smartCube.history.colSteps', 'Étapes')}</th>
                              <th className="py-2.5 px-2 text-center">{t('smartCube.history.colTps', 'TPS')}</th>
                              <th className="py-2.5 px-2 text-center">{t('smartCube.history.colFluency', 'Fluence')}</th>
                              <th className="py-2.5 px-2 text-center">{t('smartCube.history.colAo5', 'AO5')}</th>
                              <th className="py-2.5 px-2 text-center">{t('smartCube.history.colAo12', 'AO12')}</th>
                              <th className="py-2.5 px-2.5 text-right">{t('smartCube.history.colActions', 'Actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#394144]/60 font-mono">
                            {[...sessionSolves].reverse().map((solve, revIdx) => {
                              const solveIndex = sessionSolves.length - revIdx;
                              const origIndex = solveIndex - 1;
                              const isNone = !solve.penalty || solve.penalty === 'none';
                              const isPlus2 = solve.penalty === '+2';
                              const isDnf = solve.penalty === 'dnf' || solve.isDnf;
                              const isBest = origIndex === bestSolveIndex;
                              const isWorst = origIndex === worstSolveIndex;
                              const fluency = computeFluencyScore(solve.elapsedMs ?? solve.timeMs, solve.pauses);
                              const ao5AtIdx = rollingAo5List[origIndex];
                              const ao12AtIdx = rollingAo12List[origIndex];

                              let timeColor = 'text-white';
                              if (isDnf) {
                                timeColor = 'text-rose-400 line-through';
                              } else if (isBest) {
                                timeColor = 'text-emerald-400 font-bold';
                              } else if (isWorst) {
                                timeColor = 'text-rose-400 font-bold';
                              } else if (isPlus2) {
                                timeColor = 'text-amber-300';
                              }

                              return (
                                <tr key={solve.id} className="hover:bg-[#252b2e]/60 transition-colors">
                                  <td className="py-2.5 px-2.5 text-[#94a3b8] font-semibold">#{solveIndex}</td>
                                  <td className={`py-2.5 px-2.5 text-sm font-extrabold ${timeColor}`}>
                                    {formatSolveTime(solve.elapsedMs ?? solve.timeMs, solve.penalty)}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-200">{solve.moveCount ?? '-'}</td>
                                  <td className="py-2.5 px-2 text-center text-[#9eb5aa]">
                                    {solve.tps ? Number(solve.tps).toFixed(2) : '-'}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-300">{fluency}</td>
                                  <td className="py-2.5 px-2 text-center text-amber-300">
                                    {ao5AtIdx === 'DNF' ? 'DNF' : typeof ao5AtIdx === 'number' ? formatSolveTime(ao5AtIdx) : '-'}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-violet-300">
                                    {ao12AtIdx === 'DNF' ? 'DNF' : typeof ao12AtIdx === 'number' ? formatSolveTime(ao12AtIdx) : '-'}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">
                                    <div className="inline-flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedSolveId(solve.id)}
                                        className="px-2 py-1 rounded bg-[#252b2e] border border-[#41494c] hover:border-[#9eb5aa] text-[#f0f1ed] font-sans text-[10px] font-semibold cursor-pointer"
                                      >
                                        {t('smartCube.history.inspectSolve', 'Infos')}
                                      </button>
                                      <div className="inline-flex rounded border border-[#41494c] overflow-hidden font-sans text-[10px] font-semibold">
                                        <button
                                          type="button"
                                          onClick={() => updateSolvePenalty(solve.id, 'none')}
                                          className={`px-1.5 py-0.5 cursor-pointer ${
                                            isNone ? 'bg-slate-700 text-white font-bold' : 'text-[#94a3b8]'
                                          }`}
                                        >
                                          {t('smartCube.history.penaltyOk', 'OK')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => updateSolvePenalty(solve.id, '+2')}
                                          className={`px-1.5 py-0.5 border-l border-[#41494c] cursor-pointer ${
                                            isPlus2 ? 'bg-amber-600 text-white font-bold' : 'text-[#94a3b8]'
                                          }`}
                                        >
                                          {t('smartCube.history.penaltyPlus2', '+2')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => updateSolvePenalty(solve.id, 'dnf')}
                                          className={`px-1.5 py-0.5 border-l border-[#41494c] cursor-pointer ${
                                            isDnf ? 'bg-rose-700 text-white font-bold' : 'text-[#94a3b8]'
                                          }`}
                                        >
                                          {t('smartCube.history.penaltyDnf', 'DNF')}
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => deleteSolve(solve.id)}
                                        className="p-1 rounded text-[#94a3b8] hover:text-rose-400 cursor-pointer"
                                        aria-label={t('smartCube.history.delete', 'Supprimer ce temps')}
                                      >
                                        <TrashIcon />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : historyTab === 'stats' ? (
                /* ONGLET 2 : STATISTIQUES (TABLEAU MÉTRIQUES | STATISTIQUES AVEC FILTRE JOUR / TOTAL) */
                <div className="flex flex-col gap-3">
                  {/* Filtre de période Jour / Total */}
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="inline-flex rounded-lg border border-[#41494c] bg-[#252b2e] overflow-hidden text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setStatsPeriod('day')}
                        className={`px-3 py-1.5 cursor-pointer transition-colors ${
                          statsPeriod === 'day'
                            ? 'bg-[#9eb5aa] text-[#1b2023]'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {t('smartCube.stats.periodDay', 'Jour')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatsPeriod('total')}
                        className={`px-3 py-1.5 border-l border-[#41494c] cursor-pointer transition-colors ${
                          statsPeriod === 'total'
                            ? 'bg-[#9eb5aa] text-[#1b2023]'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {t('smartCube.stats.periodTotal', 'Total')}
                      </button>
                    </div>
                  </div>

                  {/* Tableau Métriques | Statistiques */}
                  <div className="rounded-xl bg-[#202629] border border-[#394144] overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#252b2e] border-b border-[#394144] text-[11px] uppercase tracking-wider font-extrabold text-[#94a3b8]">
                          <th className="py-2.5 px-4">{t('smartCube.stats.colMetric', 'Métriques')}</th>
                          <th className="py-2.5 px-4 text-right">{t('smartCube.stats.colValue', 'Statistiques')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#394144]/60">
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.avgTime', 'Temps moyen')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                            {periodStats.avgTimeMs !== null ? formatSolveTime(periodStats.avgTimeMs) : '-'}
                          </td>
                        </tr>
                        <tr
                          className={`hover:bg-[#252b2e]/50 ${pbSolve ? 'cursor-pointer' : ''}`}
                          onClick={() => { if (pbSolve) setIsPbModalOpen(true); }}
                        >
                          <td className="py-2.5 px-4 font-semibold text-slate-300 flex items-center gap-1.5">
                            <span>{t('smartCube.stats.pbLabel', 'PB')}</span>
                            {pbSolve && <Sparkles size={12} className="text-yellow-400" />}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-400">
                            {periodStats.bestSingleMs !== null ? formatSolveTime(periodStats.bestSingleMs) : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.countLabel', 'Compter')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                            {periodStats.totalCount}
                          </td>
                        </tr>
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.avgSteps', 'AVG.Étapes')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-200">
                            {periodStats.avgMoves !== null ? periodStats.avgMoves.toFixed(1) : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.avgTpsLabel', 'AVG.TPS')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-[#9eb5aa]">
                            {periodStats.avgTps !== null ? periodStats.avgTps.toFixed(2) : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.avgFluency', 'AVG.Flux')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-200">
                            {periodStats.avgFluency !== null ? Math.round(periodStats.avgFluency) : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.avgPauses', 'Tours moyens')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-200">
                            {periodStats.avgPauses !== null ? periodStats.avgPauses.toFixed(1) : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.bestAo5', 'AO5.Meilleur')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-300">
                            {periodStats.bestAo5Ms !== null ? formatSolveTime(periodStats.bestAo5Ms) : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-[#252b2e]/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-300">{t('smartCube.stats.bestAo12', 'AO12.Meilleur')}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-violet-300">
                            {periodStats.bestAo12Ms !== null ? formatSolveTime(periodStats.bestAo12Ms) : '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : historyTab === 'trends' ? (
                /* ONGLET 3 : COURBE D'ÉVOLUTION AO TREND */
                <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#9eb5aa]">
                    {t('smartCube.trends.title', 'Évolution des temps')} ({sessionSolves.length})
                  </div>
                  <SmartCubeEvolutionChart sessionSolves={sessionSolves} />
                </div>
              ) : (
                /* ONGLET 4 : DISTRIBUTION DU TEMPS (HISTOGRAMME SVG) */
                <div className="p-3.5 rounded-xl bg-[#202629] border border-[#394144] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9eb5aa]">
                      {t('smartCube.history.tabDistribution', 'Distribution du temps')} ({distributionData.totalValid})
                    </span>
                  </div>

                  {distributionData.totalValid === 0 ? (
                    <div className="h-44 flex items-center justify-center rounded-xl bg-[#252b2e]/60 border border-[#394144] text-xs text-[#64748b] italic">
                      {t('smartCube.history.empty', 'Aucun temps enregistré')}
                    </div>
                  ) : (
                    <div className="w-full rounded-xl bg-[#1b2023] border border-[#394144] p-3">
                      <svg viewBox="0 0 540 210" className="w-full h-auto block select-none">
                        {/* Lignes de grille horizontales */}
                        {[0, 0.5, 1].map((ratio, idx) => {
                          const y = 165 - ratio * 130;
                          const val = Math.round(ratio * distributionData.maxCount);
                          return (
                            <g key={idx}>
                              <line x1={36} y1={y} x2={520} y2={y} stroke="#2a3236" strokeDasharray="3 3" strokeWidth="1" />
                              <text x={28} y={y + 3} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
                                {val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Barres de l'histogramme */}
                        {distributionData.buckets.map((bucket, idx) => {
                          const count = distributionData.buckets.length;
                          const slotWidth = (520 - 44) / count;
                          const barWidth = Math.min(46, slotWidth * 0.62);
                          const xCenter = 44 + idx * slotWidth + slotWidth / 2;
                          const barX = xCenter - barWidth / 2;
                          const barHeight = distributionData.maxCount > 0
                            ? (bucket.count / distributionData.maxCount) * 130
                            : 0;
                          const barY = 165 - barHeight;

                          return (
                            <g key={bucket.label}>
                              <rect
                                x={barX}
                                y={barY}
                                width={barWidth}
                                height={Math.max(2, barHeight)}
                                rx="4"
                                fill={bucket.count > 0 ? '#9eb5aa' : '#252b2e'}
                              />
                              <text
                                x={xCenter}
                                y={barY - 6}
                                textAnchor="middle"
                                fill="#f0f1ed"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {bucket.count}
                              </text>
                              <text
                                x={xCenter}
                                y={186}
                                textAnchor="middle"
                                fill="#94a3b8"
                                fontSize="10"
                                fontFamily="monospace"
                              >
                                {bucket.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}

                  {/* Sélecteur de plage en bas : Derniers 50 | Derniers 100 | Derniers 200 | Tout */}
                  <div className="flex items-center justify-center pt-1">
                    <div className="inline-flex rounded-lg border border-[#394144] bg-[#202629] overflow-hidden text-[11px] font-semibold">
                      {[
                        { value: 50, label: t('smartCube.trends.last50', 'Derniers 50') },
                        { value: 100, label: t('smartCube.trends.last100', 'Derniers 100') },
                        { value: 200, label: t('smartCube.trends.last200', 'Derniers 200') },
                        { value: 'all', label: t('smartCube.trends.rangeAll', 'Tout') }
                      ].map((opt, idx) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setDistRange(opt.value)}
                          className={`px-3 py-1 cursor-pointer transition-colors ${
                            idx > 0 ? 'border-l border-[#394144]' : ''
                          } ${
                            distRange === opt.value
                              ? 'bg-[#9eb5aa] text-[#1b2023] font-bold'
                              : 'text-[#94a3b8] hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smart Cube PB Card Modal */}
      <SmartCubePbModal
        isOpen={isPbModalOpen}
        onClose={() => setIsPbModalOpen(false)}
        pbSolve={pbSolve}
        sessionStats={sessionStats}
        puzzle="3x3"
      />

      {/* MAC Address Modal */}
      <MacAddressModal
        isOpen={isMacModalOpen}
        initialMac={loadCachedMac() || ''}
        onClose={closeMacModal}
        onSaveAndConnect={handleSaveMacAndConnect}
      />
    </div>
  );
}

export default SmartCubePage;