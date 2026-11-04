// src/pages/SmartCubePage.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import confetti from 'canvas-confetti';
import { ArrowLeft, AlertTriangle, Sparkles, Clock } from '@getpapillon/papicons';
import { RubiksCube } from '../components/RubiksCube';
import { MacAddressModal } from '../components/SmartCube/MacAddressModal';
import { useCubeStore } from '../store/useCubeStore';
import { useSmartCubeStore } from '../store/useSmartCubeStore';
import { loadCachedMac } from '../utils/smartCube/macAddressUtils';
import { playSolveVictorySound } from '../utils/audioSystem';
import { calculateSessionStats } from '../utils/smartCube/wcaStats';
import { paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

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
  // GAN raw: [qx, qy, qz, qw] -> Three.js: (qx, qz, -qy, qw)
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

// Inline SVG Icon: Bluetooth
function BluetoothIcon({ className = "w-4 h-4", ...props }) {
  return (
    <svg
      width="16"
      height="16"
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

// Inline SVG Icon: Battery Telemetry
function BatteryIcon({ level, isConnected }) {
  const validLevel = typeof level === 'number' && !isNaN(level) ? level : null;
  const strokeColor = !isConnected || validLevel === null ? '#64748b' : validLevel <= 20 ? '#f43f5e' : '#10b981';
  const fillWidth = !isConnected || validLevel === null ? 0 : Math.max(2, Math.round((validLevel / 100) * 12));

  return (
    <svg
      width="20"
      height="12"
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

// Inline SVG Icon: Eye (Inspect)
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

// Inline SVG Icon: Trash
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

// Inline SVG Icon: Chevron
function ChevronIcon({ isOpen, className = "w-3.5 h-3.5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      aria-hidden="true"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Connection Status Pill
function ConnectionStatusPill({ status }) {
  const { t } = useTranslation();

  const config = useMemo(() => {
    switch (status) {
      case 'connecting':
        return {
          container: 'bg-amber-950/40 border-amber-600/70 text-amber-300',
          dot: 'bg-amber-400 animate-pulse',
          label: t('smartCube.status.connecting', 'Connexion...')
        };
      case 'connected':
        return {
          container: 'bg-emerald-950/40 border-emerald-600/70 text-emerald-300',
          dot: 'bg-emerald-400',
          label: t('smartCube.status.connected', 'Connecté')
        };
      case 'error':
        return {
          container: 'bg-rose-950/40 border-rose-600/70 text-rose-300',
          dot: 'bg-rose-500',
          label: t('smartCube.status.error', 'Erreur')
        };
      case 'disconnected':
      default:
        return {
          container: 'bg-slate-800/80 border-slate-700 text-slate-300',
          dot: 'bg-slate-500',
          label: t('smartCube.status.disconnected', 'Non connecté')
        };
    }
  }, [status, t]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${config.container}`}
      role="status"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
      <span>{config.label}</span>
    </div>
  );
}

export function SmartCubePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useSeo('smartCube');

  const controlsRef = useRef(null);

  // Web Bluetooth API feature detection
  const isBluetoothSupported = useMemo(() => {
    return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
  }, []);

  // Smart Cube Zustand store bindings
  const connectionStatus = useSmartCubeStore(state => state.connectionStatus);
  const batteryLevel = useSmartCubeStore(state => state.batteryLevel);
  const timerStatus = useSmartCubeStore(state => state.timerStatus);
  const timerStartTime = useSmartCubeStore(state => state.timerStartTime);
  const elapsedMs = useSmartCubeStore(state => state.elapsedMs);
  const moveCount = useSmartCubeStore(state => state.moveCount);
  const currentTps = useSmartCubeStore(state => state.currentTps);
  const finalTps = useSmartCubeStore(state => state.finalTps);
  const moveHistory = useSmartCubeStore(state => state.moveHistory);
  const scramble = useSmartCubeStore(state => state.scramble);
  const sessionSolves = useSmartCubeStore(state => state.sessionSolves);

  const connect = useSmartCubeStore(state => state.connect);
  const disconnect = useSmartCubeStore(state => state.disconnect);
  const newScramble = useSmartCubeStore(state => state.newScramble);
  const startInspection = useSmartCubeStore(state => state.startInspection);
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

  const tapeEndRef = useRef(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Smooth 60fps RAF ticker during active solve
  const [liveDisplayMs, setLiveDisplayMs] = useState(0);

  useEffect(() => {
    if (timerStatus === 'solving') {
      let animId;
      const updateTick = () => {
        const start = timerStartTime || Date.now();
        setLiveDisplayMs(Math.max(1, Date.now() - start));
        animId = requestAnimationFrame(updateTick);
      };
      animId = requestAnimationFrame(updateTick);
      return () => cancelAnimationFrame(animId);
    } else {
      setLiveDisplayMs(elapsedMs);
    }
  }, [timerStatus, timerStartTime, elapsedMs]);

  // Victory celebration trigger (audio chime + confetti)
  const prevTimerStatus = useRef(timerStatus);
  useEffect(() => {
    if (prevTimerStatus.current === 'solving' && timerStatus === 'solved') {
      try {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.7 } });
      } catch {
        // Safe fallback
      }
      try {
        playSolveVictorySound();
      } catch {
        // Safe fallback
      }
    }
    prevTimerStatus.current = timerStatus;
  }, [timerStatus]);

  // Scroll move tape to end on new turns
  useEffect(() => {
    tapeEndRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
  }, [moveHistory.length]);

  const handleCopySequence = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && moveHistory.length > 0) {
      const seq = moveHistory.map(m => m.move).join(' ');
      navigator.clipboard.writeText(seq).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(() => {});
    }
  };

  // Initialize 3x3 Rubik's cube model on mount
  useEffect(() => {
    useCubeStore.getState().initCube(3);
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

  const handleClearSession = () => {
    if (sessionSolves.length === 0) return;
    if (typeof window !== 'undefined' && window.confirm(t('smartCube.history.confirmClear', 'Effacer tous les temps de la session ?'))) {
      clearSessionSolves();
    }
  };

  // Session analytics summary
  const sessionStats = useMemo(() => {
    return calculateSessionStats(sessionSolves);
  }, [sessionSolves]);

  // Timer visual styling based on FSM state
  const timerStyle = useMemo(() => {
    switch (timerStatus) {
      case 'scrambled':
        return {
          cardBorder: 'border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
          badge: 'bg-amber-950/60 border-amber-500/80 text-amber-300',
          dot: 'bg-amber-400',
          text: 'text-amber-100',
          label: t('smartCube.timer.scrambled', 'Mélangé — Tournez pour lancer')
        };
      case 'inspecting':
        return {
          cardBorder: 'border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse',
          badge: 'bg-orange-950/70 border-orange-500 text-orange-200',
          dot: 'bg-orange-400 animate-ping',
          text: 'text-orange-100',
          label: t('smartCube.timer.inspecting', 'Inspection WCA')
        };
      case 'solving':
        return {
          cardBorder: 'border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.35)]',
          badge: 'bg-emerald-950/70 border-emerald-500 text-emerald-300 animate-pulse',
          dot: 'bg-emerald-400 animate-pulse',
          text: 'text-emerald-100',
          label: t('smartCube.timer.solving', 'Chrono en cours')
        };
      case 'solved':
        return {
          cardBorder: 'border-yellow-400/90 shadow-[0_0_30px_rgba(234,179,8,0.35)]',
          badge: 'bg-yellow-950/70 border-yellow-400 text-yellow-300',
          dot: 'bg-yellow-400',
          text: 'text-yellow-200',
          label: t('smartCube.timer.solved', 'Résolu !')
        };
      case 'idle':
      default:
        return {
          cardBorder: 'border-[#394144]',
          badge: 'bg-[#252b2e] border-[#41494c] text-[#9eb5aa]',
          dot: 'bg-[#9eb5aa]',
          text: 'text-white',
          label: t('smartCube.timer.ready', 'Prêt')
        };
    }
  }, [timerStatus, t]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#1b2023] text-[#f0f1ed] overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-5 py-2.5 bg-[#202629] border-b border-[#394144] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(paths.play())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded bg-[#252b2e] border border-[#41494c] text-[#f0f1ed] hover:border-[#9eb5aa] hover:bg-[#2b3336] transition-colors cursor-pointer"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{t('app.play.smartCube.back', 'Jeux')}</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold leading-tight text-white flex items-center gap-2">
              {t('app.play.smartCube.title', 'Smart Cube GAN 16 ui')}
            </h1>
            <span className="text-[11px] text-[#94a3b8] hidden md:inline">
              {t('app.play.smartCube.subtitle', 'Synchronisation Bluetooth & Chronométrage')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ConnectionStatusPill status={connectionStatus} />

          {/* Battery Pill */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-300"
            title={t('smartCube.telemetry.battery', 'Batterie')}
          >
            <BatteryIcon level={batteryLevel} isConnected={connectionStatus === 'connected'} />
            <span>{connectionStatus === 'connected' && typeof batteryLevel === 'number' && !isNaN(batteryLevel) ? `${batteryLevel}%` : '--%'}</span>
          </div>

          {/* Bluetooth Action Button */}
          <button
            onClick={handleConnectClick}
            disabled={!isBluetoothSupported || connectionStatus === 'connecting'}
            className={`shuffle-btn text-xs sm:text-sm py-1.5 px-3 ${
              connectionStatus === 'connected'
                ? 'border-[#56615e] hover:border-rose-400 hover:text-rose-300'
                : 'primary-action'
            } ${!isBluetoothSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <BluetoothIcon className="w-3.5 h-3.5" />
            <span>
              {connectionStatus === 'connected'
                ? t('smartCube.action.disconnect', 'Déconnecter')
                : connectionStatus === 'connecting'
                ? t('smartCube.action.connecting', 'Connexion...')
                : t('smartCube.action.connect', 'Connecter GAN 16 ui')}
            </span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 overflow-hidden">
        {/* Unsupported Browser Banner */}
        {!isBluetoothSupported && (
          <div className="mb-3 shrink-0 flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-amber-950/60 border border-amber-600/70 text-amber-200 text-xs sm:text-sm shadow-md">
            <AlertTriangle size={20} className="shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-amber-100 mb-0.5">
                {t('smartCube.bluetoothUnavailableTitle', 'Navigateur non compatible Web Bluetooth')}
              </div>
              <div className="text-amber-200/90 leading-relaxed text-[11px] sm:text-xs">
                {t(
                  'smartCube.bluetoothUnavailableDesc',
                  "L'API Web Bluetooth n'est pas prise en charge par ce navigateur. Pour connecter votre smart cube GAN 16 ui, veuillez utiliser un navigateur basé sur Chromium (Google Chrome, Microsoft Edge, Brave, Opera) ou Bluefy sur iOS."
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection Error Alert Banner */}
        {connectionStatus === 'error' && (
          <div className="mb-3 shrink-0 flex flex-wrap items-start justify-between gap-3 p-3 rounded-lg bg-rose-950/60 border border-rose-600/70 text-rose-200 text-xs sm:text-sm shadow-md">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <span className="break-words leading-relaxed">{errorMessage || t('smartCube.status.error', 'Erreur de connexion Bluetooth')}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={openMacModal}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-900/60 hover:bg-rose-900 border border-rose-500 text-rose-100 cursor-pointer"
              >
                {t('smartCube.action.changeMac', 'Changer MAC')}
              </button>
              <button
                onClick={() => connect()}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#252b2e] hover:bg-[#2b3336] border border-[#41494c] text-white cursor-pointer"
              >
                {t('common.retry', 'Réessayer')}
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
          {/* Left Column: Timer, Telemetry & Analytics */}
          <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
            {/* Scramble Card */}
            <div className="p-3 rounded-lg bg-[#202629] border border-[#394144] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <span className="font-bold uppercase tracking-wider">{t('smartCube.telemetry.scramble', 'Mélange WCA')}</span>
                <div className="flex items-center gap-2">
                  {timerStatus === 'scrambled' && (
                    <button
                      onClick={startInspection}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                    >
                      <EyeIcon />
                      <span>{t('smartCube.action.inspect', 'Inspecter')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => newScramble()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9eb5aa] hover:underline cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>{t('smartCube.action.scramble', 'Mélanger')}</span>
                  </button>
                </div>
              </div>
              <div className="font-mono text-sm sm:text-base font-semibold text-slate-200 break-words leading-relaxed select-text">
                {scramble || "D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2"}
              </div>
            </div>

            {/* Smart Timer Banner with dynamic glow */}
            <div className={`p-4 rounded-lg bg-[#202629] border transition-all duration-300 flex flex-col items-center justify-center text-center ${timerStyle.cardBorder}`}>
              <div className={`text-5xl sm:text-6xl font-mono font-extrabold tracking-tight mb-2 transition-colors duration-200 ${timerStyle.text}`}>
                {formatLiveTimer(liveDisplayMs)}
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${timerStyle.badge}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${timerStyle.dot}`} />
                <Clock size={12} />
                <span>{timerStyle.label}</span>
              </div>
            </div>

            {/* Live Solve Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-[#202629] border border-[#394144] text-center">
                <div className="text-[10px] sm:text-xs text-[#94a3b8] uppercase font-bold">{t('smartCube.telemetry.moves', 'Mouvements')}</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5">{moveCount}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#202629] border border-[#394144] text-center">
                <div className="text-[10px] sm:text-xs text-[#94a3b8] uppercase font-bold">{t('smartCube.telemetry.liveTps', 'TPS actuel')}</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-0.5">{currentTps.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#202629] border border-[#394144] text-center">
                <div className="text-[10px] sm:text-xs text-[#94a3b8] uppercase font-bold">{t('smartCube.telemetry.finalTps', 'TPS final')}</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5">{finalTps !== null ? finalTps.toFixed(2) : '--'}</div>
              </div>
            </div>

            {/* Move History Tape */}
            <div className="p-3 rounded-lg bg-[#202629] border border-[#394144] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <span className="font-bold uppercase tracking-wider">{t('smartCube.telemetry.moveTape', 'Séquence de mouvements')}</span>
                <div className="flex items-center gap-2">
                  {moveHistory.length > 0 && (
                    <button
                      onClick={handleCopySequence}
                      className="inline-flex items-center gap-1 text-[11px] text-[#9eb5aa] hover:underline cursor-pointer"
                    >
                      <span>{isCopied ? t('smartCube.action.sequenceCopied', 'Copié !') : t('smartCube.action.copySequence', 'Copier la séquence')}</span>
                    </button>
                  )}
                  {moveHistory.length > 0 && (
                    <button
                      onClick={resetSolve}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:underline cursor-pointer"
                    >
                      <span>{t('smartCube.action.clearTape', 'Effacer')}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 min-h-[44px] scrollbar-thin">
                {moveHistory.length === 0 ? (
                  <span className="text-xs text-[#64748b] italic">{t('smartCube.telemetry.waitingMove', 'En attente du premier mouvement...')}</span>
                ) : (
                  moveHistory.map((item, idx) => {
                    const face = item.move[0];
                    const badgeColor = getMoveBadgeStyle(face);
                    const stepLabel = idx === 0 ? '#1' : `+${item.stepTime}ms`;
                    return (
                      <div
                        key={idx}
                        className={`inline-flex flex-col items-center justify-center px-2 py-0.5 rounded border shrink-0 min-w-[38px] ${badgeColor}`}
                      >
                        <span className="text-xs font-mono font-bold leading-tight">{item.move}</span>
                        <span className="text-[9px] font-mono opacity-80 leading-tight">{stepLabel}</span>
                      </div>
                    );
                  })
                )}
                <div ref={tapeEndRef} />
              </div>
            </div>

            {/* Session Analytics Dashboard */}
            <div className="p-3 rounded-lg bg-[#202629] border border-[#394144] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <span className="font-bold uppercase tracking-wider">{t('smartCube.stats.title', 'Statistiques de session')}</span>
                <span className="text-[11px] font-mono text-[#9eb5aa]">{sessionStats.count} {t('smartCube.stats.solves', 'résolutions')}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                <div className="p-2 rounded bg-[#252b2e] border border-[#394144]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">{t('smartCube.stats.best', 'Meilleur')}</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {sessionStats.best !== null ? formatSolveTime(sessionStats.best) : '--'}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#252b2e] border border-[#394144]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">{t('smartCube.stats.mo3', 'Mo3')}</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {typeof sessionStats.mo3 === 'number' ? formatSolveTime(sessionStats.mo3) : (sessionStats.mo3 || '--')}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#252b2e] border border-[#394144]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">{t('smartCube.stats.ao5', 'Ao5')}</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                    {typeof sessionStats.ao5 === 'number' ? formatSolveTime(sessionStats.ao5) : (sessionStats.ao5 || '--')}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#252b2e] border border-[#394144]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">{t('smartCube.stats.ao12', 'Ao12')}</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {typeof sessionStats.ao12 === 'number' ? formatSolveTime(sessionStats.ao12) : (sessionStats.ao12 || '--')}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#252b2e] border border-[#394144]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">{t('smartCube.stats.worst', 'Pire')}</div>
                  <div className="text-sm font-mono font-bold text-slate-300 mt-0.5">
                    {sessionStats.worst !== null ? formatSolveTime(sessionStats.worst) : '--'}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#252b2e] border border-[#394144]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">{t('smartCube.stats.avgTps', 'TPS moy.')}</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {sessionStats.avgTps !== null ? sessionStats.avgTps.toFixed(2) : '--'}
                  </div>
                </div>
              </div>
            </div>

            {/* Solves History Drawer */}
            <div className="p-3 rounded-lg bg-[#202629] border border-[#394144] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <button
                  onClick={() => setIsHistoryOpen(open => !open)}
                  className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-200 hover:text-white cursor-pointer"
                >
                  <span>{t('smartCube.history.title', 'Historique des temps')}</span>
                  <span className="text-[11px] text-[#9eb5aa]">({sessionSolves.length})</span>
                  <ChevronIcon isOpen={isHistoryOpen} />
                </button>
                {sessionSolves.length > 0 && (
                  <button
                    onClick={handleClearSession}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  >
                    <TrashIcon />
                    <span>{t('smartCube.history.clear', 'Vider')}</span>
                  </button>
                )}
              </div>

              {isHistoryOpen && (
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1 pt-1 border-t border-[#394144]/60 mt-1">
                  {sessionSolves.length === 0 ? (
                    <div className="text-xs text-[#64748b] italic py-2 text-center">
                      {t('smartCube.history.empty', 'Aucun temps enregistré')}
                    </div>
                  ) : (
                    [...sessionSolves].reverse().map((solve, revIdx) => {
                      const solveIndex = sessionSolves.length - revIdx;
                      const isNone = !solve.penalty || solve.penalty === 'none';
                      const isPlus2 = solve.penalty === '+2';
                      const isDnf = solve.penalty === 'dnf' || solve.isDnf;

                      return (
                        <div
                          key={solve.id}
                          className="flex items-center justify-between gap-2 p-2 rounded bg-[#252b2e] border border-[#394144]/50 text-xs hover:border-[#41494c] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[#94a3b8] text-[11px]">#{solveIndex}</span>
                            <span className={`font-mono font-bold text-sm ${isDnf ? 'text-rose-400 line-through' : isPlus2 ? 'text-amber-300' : 'text-white'}`}>
                              {formatSolveTime(solve.elapsedMs ?? solve.timeMs, solve.penalty)}
                            </span>
                            <span className="text-[11px] text-[#64748b] font-mono hidden sm:inline">
                              {solve.moveCount} mvt • {solve.tps ? Number(solve.tps).toFixed(2) : '--'} TPS
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Penalty Selector Pills */}
                            <div className="inline-flex rounded border border-[#41494c] overflow-hidden text-[10px] font-semibold">
                              <button
                                onClick={() => updateSolvePenalty(solve.id, 'none')}
                                className={`px-1.5 py-0.5 transition-colors cursor-pointer ${
                                  isNone ? 'bg-slate-700 text-white font-bold' : 'bg-transparent text-[#94a3b8] hover:bg-slate-800'
                                }`}
                                title="Sans pénalité"
                              >
                                {t('smartCube.history.penaltyOk', 'OK')}
                              </button>
                              <button
                                onClick={() => updateSolvePenalty(solve.id, '+2')}
                                className={`px-1.5 py-0.5 border-l border-[#41494c] transition-colors cursor-pointer ${
                                  isPlus2 ? 'bg-amber-600 text-white font-bold' : 'bg-transparent text-[#94a3b8] hover:bg-slate-800'
                                }`}
                                title="Pénalité +2 secondes"
                              >
                                {t('smartCube.history.penaltyPlus2', '+2')}
                              </button>
                              <button
                                onClick={() => updateSolvePenalty(solve.id, 'dnf')}
                                className={`px-1.5 py-0.5 border-l border-[#41494c] transition-colors cursor-pointer ${
                                  isDnf ? 'bg-rose-700 text-white font-bold' : 'bg-transparent text-[#94a3b8] hover:bg-slate-800'
                                }`}
                                title="Did Not Finish"
                              >
                                {t('smartCube.history.penaltyDnf', 'DNF')}
                              </button>
                            </div>

                            {/* Delete Solve Button */}
                            <button
                              onClick={() => deleteSolve(solve.id)}
                              className="p-1 rounded text-[#94a3b8] hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={t('smartCube.history.delete', 'Supprimer ce temps')}
                              aria-label={t('smartCube.history.delete', 'Supprimer ce temps')}
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Utility Controls */}
            <div className="flex items-center gap-2 mt-auto pt-1">
              <button
                onClick={recalibrateGyro}
                className="flex-1 shuffle-btn text-xs py-2 border-[#41494c]"
              >
                <span>{t('smartCube.action.recalibrate', 'Recentrer orientation 3D')}</span>
              </button>
              <button
                onClick={resetSolve}
                className="shuffle-btn text-xs py-2 border-[#41494c]"
              >
                <span>{t('smartCube.action.reset', 'Réinitialiser')}</span>
              </button>
            </div>
          </section>

          {/* Right Column: 3D Cube Canvas */}
          <section className="lg:col-span-7 xl:col-span-8 relative flex flex-col rounded-xl bg-[#202629] border border-[#394144] overflow-hidden min-h-[320px] lg:min-h-0 shadow-inner">
            <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252b2e]/80 backdrop-blur-sm border border-[#41494c] text-[11px] font-semibold text-[#9eb5aa]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9eb5aa]" />
              <span>{t('smartCube.view3d', 'Vue 3D temps réel')}</span>
            </div>

            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <button
                onClick={() => toggleGyroActive()}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm cursor-pointer transition-colors ${
                  isGyroActive
                    ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700/80'
                }`}
                title={t('smartCube.telemetry.gyroToggle', 'Gyroscope')}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isGyroActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span>
                  {t('smartCube.telemetry.gyroToggle', 'Gyro')}: {isGyroActive ? t('smartCube.telemetry.gyroActive', 'Actif') : t('smartCube.telemetry.gyroInactive', 'Inactif')}
                </span>
              </button>
              <button
                onClick={recalibrateGyro}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#252b2e]/80 backdrop-blur-sm border border-[#41494c] hover:border-[#9eb5aa] text-xs font-semibold text-[#f0f1ed] cursor-pointer"
              >
                <span>{t('smartCube.action.recalibrateShort', 'Recentrer')}</span>
              </button>
            </div>

            <div className="w-full h-full">
              <Canvas camera={{ position: [3.8, 4.2, 5.5], fov: 66 }}>
                <ambientLight intensity={1.1} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <SmartCube3DScene controlsRef={controlsRef} />
                <TrackballControls ref={controlsRef} noPan noZoom rotateSpeed={4} />
              </Canvas>
            </div>
          </section>
        </div>
      </main>

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
