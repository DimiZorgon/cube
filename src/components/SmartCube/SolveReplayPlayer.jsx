// src/components/SmartCube/SolveReplayPlayer.jsx
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ArrowLeftBox,
  ArrowRightBox,
  Paper,
  Check,
  Clock,
  Globe
} from '@getpapillon/papicons';
import { Cubie } from '../Cubie';
import {
  createCaseCubies,
  getMoveParams,
  applyQuarterTurn,
  applyMoveInstant,
  invertSingleMove
} from '../../utils/algoParser';
import { buildAnnotatedReconstruction } from '../../utils/smartCube/solveMetrics';
import { useSettingsStore } from '../../store/useSettingsStore';

const AXIS_INDEX = { x: 0, y: 1, z: 2 };
const SPEED_OPTIONS = [0.25, 0.5, 1, 2];
const DEFAULT_STEP_MS = 350;

function formatReplayMs(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '0.00s';
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(2)}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(2).padStart(5, '0');
  return `${mins}:${secs}`;
}

function parseSolveSteps(solve) {
  if (!solve) return [];

  if (Array.isArray(solve.moveTimings) && solve.moveTimings.length > 0) {
    const firstTs = typeof solve.moveTimings[0]?.timestamp === 'number'
      ? solve.moveTimings[0].timestamp
      : null;
    const steps = [];
    let runningMs = 0;

    for (let i = 0; i < solve.moveTimings.length; i++) {
      const item = solve.moveTimings[i];
      const move = typeof item === 'string' ? item.trim() : String(item?.move || '').trim();
      if (!move) continue;

      let stepTime = DEFAULT_STEP_MS;
      if (typeof item === 'object' && item !== null) {
        if (typeof item.stepTime === 'number' && !isNaN(item.stepTime) && item.stepTime >= 0) {
          stepTime = item.stepTime;
        } else if (
          i > 0 &&
          typeof item.timestamp === 'number' &&
          typeof solve.moveTimings[i - 1]?.timestamp === 'number'
        ) {
          stepTime = Math.max(0, item.timestamp - solve.moveTimings[i - 1].timestamp);
        } else if (steps.length === 0) {
          stepTime = 0;
        }
      }

      let relMs;
      if (typeof item === 'object' && item !== null && typeof item.elapsedMs === 'number' && !isNaN(item.elapsedMs)) {
        relMs = Math.max(0, item.elapsedMs);
      } else if (
        firstTs !== null &&
        typeof item === 'object' &&
        item !== null &&
        typeof item.timestamp === 'number' &&
        !isNaN(item.timestamp)
      ) {
        relMs = Math.max(0, item.timestamp - firstTs);
      } else {
        runningMs += stepTime || (steps.length === 0 ? 0 : DEFAULT_STEP_MS);
        relMs = runningMs;
      }

      steps.push({
        index: steps.length,
        move,
        stepTime,
        relMs
      });
    }
    return steps;
  }

  const rawMoves = typeof solve.moves === 'string'
    ? solve.moves.trim().split(/\s+/).filter(Boolean)
    : [];

  return rawMoves.map((move, index) => ({
    index,
    move,
    stepTime: DEFAULT_STEP_MS,
    relMs: (index + 1) * DEFAULT_STEP_MS
  }));
}

function getPhasePillColor(phase) {
  switch (phase) {
    case 'cross': return 'bg-[#2a3439] border-[#4d636e] text-[#cbd5e1]';
    case 'f2l': return 'bg-[#253630] border-[#426658] text-[#a7f3d0]';
    case 'oll': return 'bg-[#363222] border-[#6b6036] text-[#fde68a]';
    case 'pll': return 'bg-[#2e2a3a] border-[#574c75] text-[#ddd6fe]';
    default: return 'bg-[#252b2e] border-[#394144] text-[#9eb5aa]';
  }
}

function getSegmentBarColor(phase, idx) {
  if (phase === 'cross') return 'bg-[#5c7684]';
  if (phase === 'f2l') {
    const f2lShades = ['bg-[#3d7a61]', 'bg-[#4b8f72]', 'bg-[#5aa485]', 'bg-[#6bb897]'];
    return f2lShades[idx % f2lShades.length];
  }
  if (phase === 'oll') return 'bg-[#c29b38]';
  if (phase === 'pll') return 'bg-[#7c69a8]';
  return 'bg-[#9eb5aa]';
}

function AnimatedReplayCube({ cubies, activeAnim, onFinishAnim }) {
  const pivotRefs = useRef({});
  const currentAngle = useRef(0);
  const finishedRef = useRef(false);

  useLayoutEffect(() => {
    currentAngle.current = 0;
    finishedRef.current = false;
    Object.values(pivotRefs.current).forEach(grp => {
      if (grp) grp.rotation.set(0, 0, 0);
    });
  }, [cubies, activeAnim]);

  useFrame((_, delta) => {
    if (!activeAnim || finishedRef.current) return;

    const targetAngle = (Math.PI / 2) * activeAnim.quarterTurns;
    const durationSec = Math.max(0.04, (activeAnim.durationMs || 180) / 1000);
    const angularSpeed = targetAngle / durationSec;

    currentAngle.current += angularSpeed * Math.min(delta, 0.1);
    const clampedAngle = Math.min(currentAngle.current, targetAngle);
    const rotValue = clampedAngle * -activeAnim.direction;

    for (const c of cubies) {
      const grp = pivotRefs.current[c.id];
      if (!grp) continue;
      const isMoving = activeAnim.value.some(
        v => Math.abs(c.position[AXIS_INDEX[activeAnim.axis]] - v) < 0.1
      );
      if (isMoving) {
        grp.rotation[activeAnim.axis] = rotValue;
      } else {
        grp.rotation.set(0, 0, 0);
      }
    }

    if (currentAngle.current >= targetAngle) {
      finishedRef.current = true;
      onFinishAnim();
    }
  });

  return (
    <group>
      {cubies.map(data => (
        <group
          key={data.id}
          ref={el => {
            pivotRefs.current[data.id] = el;
          }}
        >
          <Cubie
            position={data.position}
            initialPosition={data.initialPosition}
            rotation={data.rotation}
            faceColors={data.faceColors}
          />
        </group>
      ))}
    </group>
  );
}

export function SolveReplayPlayer({
  solve,
  layout = 'compact',
  enableKeyboardShortcuts = false,
  rightPanelHeader = null
}) {
  const cameraSpeed = useSettingsStore(state => state.cameraSpeed);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const steps = useMemo(() => parseSolveSteps(solve), [solve]);

  const initialCubies = useMemo(
    () =>
      createCaseCubies({
        size: 3,
        alg: '',
        setup: solve?.scramble || '',
        yellowTop: false,
        maskMode: 'full',
        applySetup: true
      }),
    [solve?.scramble]
  );

  const reconstruction = useMemo(() => {
    if (!solve || steps.length === 0) return { segments: [], text: '' };
    try {
      const result = buildAnnotatedReconstruction(solve);
      return {
        segments: Array.isArray(result?.segments) ? result.segments : [],
        text: typeof result?.text === 'string' ? result.text : ''
      };
    } catch {
      return { segments: [], text: '' };
    }
  }, [solve, steps.length]);

  const [cubies, setCubies] = useState(initialCubies);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timingMode, setTimingMode] = useState('realtime');
  const [activeAnim, setActiveAnim] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCubies(initialCubies);
    setStepIndex(0);
    setIsPlaying(false);
    setActiveAnim(null);
  }, [initialCubies, solve?.id]);

  const computeCubiesAtStep = useCallback(
    targetIdx => {
      const clamped = Math.max(0, Math.min(steps.length, targetIdx));
      let next = initialCubies;
      for (let i = 0; i < clamped; i++) {
        next = applyMoveInstant(next, steps[i].move, 3);
      }
      return { next, clamped };
    },
    [initialCubies, steps]
  );

  const seekToStep = useCallback(
    (targetIdx, stopPlayback = true) => {
      if (stopPlayback) setIsPlaying(false);
      setActiveAnim(null);
      const { next, clamped } = computeCubiesAtStep(targetIdx);
      setCubies(next);
      setStepIndex(clamped);
    },
    [computeCubiesAtStep]
  );

  const triggerStepForward = useCallback(
    (manual = false) => {
      if (stepIndex >= steps.length) {
        setIsPlaying(false);
        return;
      }
      if (activeAnim) {
        if (manual) seekToStep(stepIndex + 1, true);
        return;
      }
      const step = steps[stepIndex];
      const params = getMoveParams(step.move, 3);
      if (!params) {
        seekToStep(stepIndex + 1, manual);
        return;
      }
      const stepDurationMs = timingMode === 'realtime'
        ? Math.min(2000, Math.max(80, step.stepTime)) / playbackSpeed
        : DEFAULT_STEP_MS / playbackSpeed;
      const turnDurationMs = manual
        ? Math.min(180, 180 / playbackSpeed)
        : Math.min(stepDurationMs, 200 / playbackSpeed);

      setActiveAnim({
        ...params,
        durationMs: turnDurationMs,
        nextStepIndex: stepIndex + 1,
        isBackward: false
      });
    },
    [activeAnim, playbackSpeed, seekToStep, stepIndex, steps, timingMode]
  );

  const triggerStepBackward = useCallback(() => {
    if (stepIndex <= 0) return;
    setIsPlaying(false);
    if (activeAnim) {
      seekToStep(stepIndex - 1, true);
      return;
    }
    const prevIdx = stepIndex - 1;
    const invMove = invertSingleMove(steps[prevIdx].move);
    const params = getMoveParams(invMove, 3);
    if (!params) {
      seekToStep(prevIdx, true);
      return;
    }
    setActiveAnim({
      ...params,
      durationMs: Math.min(180, 180 / playbackSpeed),
      nextStepIndex: prevIdx,
      isBackward: true
    });
  }, [activeAnim, playbackSpeed, seekToStep, stepIndex, steps]);

  const handleFinishAnim = useCallback(() => {
    if (!activeAnim) return;
    setCubies(prev => {
      let next = prev;
      for (let i = 0; i < activeAnim.quarterTurns; i++) {
        next = applyQuarterTurn(next, activeAnim.axis, activeAnim.value, activeAnim.direction);
      }
      return next;
    });
    const nextIdx = activeAnim.nextStepIndex;
    setStepIndex(nextIdx);
    setActiveAnim(null);
    if (nextIdx >= steps.length) {
      setIsPlaying(false);
    }
  }, [activeAnim, steps.length]);

  useEffect(() => {
    if (!isPlaying || activeAnim) return;
    if (stepIndex >= steps.length) {
      setIsPlaying(false);
      return;
    }
    const step = steps[stepIndex];
    const stepDurationMs = timingMode === 'realtime'
      ? Math.min(2000, Math.max(80, step.stepTime)) / playbackSpeed
      : DEFAULT_STEP_MS / playbackSpeed;
    const turnDurationMs = Math.min(stepDurationMs, 200 / playbackSpeed);
    const pauseMs = Math.max(0, stepDurationMs - turnDurationMs);

    const timer = setTimeout(() => {
      triggerStepForward(false);
    }, pauseMs);
    return () => clearTimeout(timer);
  }, [activeAnim, isPlaying, playbackSpeed, stepIndex, steps, timingMode, triggerStepForward]);

  const handlePlayPause = useCallback(() => {
    if (stepIndex >= steps.length && !activeAnim) {
      seekToStep(0, false);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(prev => !prev);
  }, [activeAnim, seekToStep, stepIndex, steps.length]);

  useEffect(() => {
    if (!enableKeyboardShortcuts || typeof window === 'undefined' || steps.length === 0) {
      return undefined;
    }
    const handleKeyDown = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        triggerStepBackward();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        triggerStepForward(true);
      } else if (e.code === 'Home') {
        e.preventDefault();
        seekToStep(0, true);
      } else if (e.code === 'End') {
        e.preventDefault();
        seekToStep(steps.length, true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enableKeyboardShortcuts,
    handlePlayPause,
    seekToStep,
    steps.length,
    triggerStepBackward,
    triggerStepForward
  ]);

  const segmentsWithMoves = useMemo(() => {
    if (reconstruction.segments.length > 0) {
      let runningStart = 0;
      return reconstruction.segments.map(seg => {
        const startIdx = typeof seg.startIndex === 'number' ? seg.startIndex : runningStart;
        const segMoves = Array.isArray(seg.moves)
          ? seg.moves
          : typeof seg.moves === 'string'
          ? seg.moves.trim().split(/\s+/).filter(Boolean)
          : steps
              .slice(startIdx, (seg.endIndex ?? startIdx) + 1)
              .map(s => s.move);
        runningStart = startIdx + segMoves.length;
        return {
          ...seg,
          startIndex: startIdx,
          segMoves
        };
      });
    }
    if (steps.length > 0) {
      return [
        {
          key: 'solve',
          label: 'Reconstruction',
          phase: 'solve',
          startIndex: 0,
          endIndex: steps.length - 1,
          segMoves: steps.map(s => s.move)
        }
      ];
    }
    return [];
  }, [reconstruction.segments, steps]);

  const copyText = useMemo(() => {
    if (reconstruction.text) return reconstruction.text;
    if (segmentsWithMoves.length > 0) {
      return segmentsWithMoves
        .map(seg => `// ${seg.label}\n${seg.segMoves.join(' ')}`)
        .join('\n');
    }
    return steps.map(s => s.move).join(' ');
  }, [reconstruction.text, segmentsWithMoves, steps]);

  const handleCopyReconstruction = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  if (!solve || steps.length === 0) {
    return (
      <div className="rounded-xl bg-[#202629] border border-[#394144] p-4 text-center text-xs text-[#94a3b8]">
        Aucun mouvement disponible pour rejouer cette résolution.
      </div>
    );
  }

  const totalMs = Math.max(
    solve.elapsedMs || solve.timeMs || 0,
    steps[steps.length - 1]?.relMs || 0
  );
  const currentRelMs = stepIndex > 0 ? steps[stepIndex - 1]?.relMs ?? 0 : 0;
  const activeMoveIdx = activeAnim
    ? (activeAnim.isBackward ? stepIndex - 1 : stepIndex)
    : stepIndex - 1;

  const activeSegmentKey = (() => {
    for (let i = segmentsWithMoves.length - 1; i >= 0; i--) {
      if (stepIndex >= segmentsWithMoves[i].startIndex) {
        return segmentsWithMoves[i].key;
      }
    }
    return segmentsWithMoves[0]?.key || null;
  })();

  const isSplitLayout = layout === 'split';
  const focusClass = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9eb5aa]';

  const playerControlsBlock = (
    <div className="rounded-xl bg-[#202629] border border-[#394144] p-3 sm:p-4 flex flex-col gap-3 text-[#f0f1ed]">
      {/* 3D Canvas */}
      <div
        className={`relative w-full ${
          isSplitLayout ? 'h-[320px] sm:h-[420px] lg:h-[500px]' : 'h-56 sm:h-64'
        } rounded-lg bg-[#1b2023] border border-[#394144] overflow-hidden touch-none`}
      >
        <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#202629]/90 border border-[#394144] text-[11px] font-semibold text-[#9eb5aa]">
            <Globe size={13} />
            <span className="hidden min-[380px]:inline">Glisser pour orienter</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-[#202629]/90 border border-[#394144] font-mono tabular-nums text-[11px] font-bold text-[#f0f1ed]">
              {formatReplayMs(currentRelMs)} / {formatReplayMs(totalMs)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#252b2e]/95 border border-[#41494c] font-mono tabular-nums text-[11px] font-bold text-[#9eb5aa]">
              {stepIndex} / {steps.length}
            </span>
          </div>
        </div>

        <Canvas camera={{ position: [4.2, 3.8, 4.5], fov: 48 }}>
          <ambientLight intensity={1.15} />
          <directionalLight position={[10, 14, 10]} intensity={1.1} />
          <directionalLight position={[-8, -8, -8]} intensity={0.35} />
          <group rotation={[0, 0, Math.PI]}>
            <AnimatedReplayCube
              cubies={cubies}
              activeAnim={activeAnim}
              onFinishAnim={handleFinishAnim}
            />
          </group>
          <TrackballControls
            noPan={true}
            noZoom={true}
            rotateSpeed={(isMobile ? 2 : 7) * cameraSpeed}
          />
        </Canvas>
      </div>

      {/* Interactive CFOP Timeline */}
      <div className="flex flex-col gap-2">
        {segmentsWithMoves.length > 0 && (
          <div className="w-full h-2.5 rounded-full bg-[#1b2023] border border-[#394144] overflow-hidden flex">
            {segmentsWithMoves.map((seg, idx) => {
              const count = seg.segMoves.length || 1;
              const widthPct = (count / steps.length) * 100;
              return (
                <button
                  key={`${seg.key}-${idx}`}
                  type="button"
                  onClick={() => seekToStep(seg.startIndex, true)}
                  style={{ width: `${widthPct}%` }}
                  className={`${getSegmentBarColor(seg.phase, idx)} h-full cursor-pointer transition-opacity ${
                    activeSegmentKey === seg.key ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  } ${focusClass}`}
                  title={`${seg.label} (${count})`}
                  aria-label={`Aller à ${seg.label}`}
                />
              );
            })}
          </div>
        )}

        <input
          type="range"
          min={0}
          max={steps.length}
          value={stepIndex}
          onChange={e => seekToStep(Number(e.target.value), true)}
          aria-label="Position de la lecture"
          className={`w-full accent-[#9eb5aa] cursor-pointer h-6 ${focusClass}`}
        />

        {segmentsWithMoves.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {segmentsWithMoves.map((seg, idx) => {
              const isActive = activeSegmentKey === seg.key;
              return (
                <button
                  key={`${seg.key}-pill-${idx}`}
                  type="button"
                  onClick={() => seekToStep(seg.startIndex, true)}
                  className={`min-h-[44px] sm:min-h-[34px] px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#303a37] border-[#9eb5aa] text-white'
                      : `${getPhasePillColor(seg.phase)} hover:border-[#9eb5aa]`
                  } ${focusClass}`}
                >
                  {seg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transport Controls */}
      <div className="grid grid-cols-5 gap-1.5">
        <button
          type="button"
          onClick={() => seekToStep(0, true)}
          disabled={stepIndex === 0 && !activeAnim}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg bg-[#252b2e] border border-[#394144] hover:border-[#9eb5aa] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#f0f1ed] cursor-pointer ${focusClass}`}
          title="Début"
          aria-label="Début"
        >
          <ArrowLeftBox size={16} />
          <span className="hidden sm:inline">Début</span>
        </button>

        <button
          type="button"
          onClick={triggerStepBackward}
          disabled={stepIndex <= 0}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg bg-[#252b2e] border border-[#394144] hover:border-[#9eb5aa] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#f0f1ed] cursor-pointer ${focusClass}`}
          title="Précédent (-1)"
          aria-label="Mouvement précédent"
        >
          <ChevronLeft size={16} />
          <span>-1</span>
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9eb5aa] border border-[#b9c9bf] hover:bg-[#b9c9bf] text-xs font-bold text-[#1b2023] cursor-pointer ${focusClass}`}
          aria-label={isPlaying ? 'Pause' : 'Lecture'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span className="hidden min-[400px]:inline">
            {isPlaying ? 'Pause' : stepIndex >= steps.length ? 'Rejouer' : 'Lire'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            triggerStepForward(true);
          }}
          disabled={stepIndex >= steps.length}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg bg-[#252b2e] border border-[#394144] hover:border-[#9eb5aa] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#f0f1ed] cursor-pointer ${focusClass}`}
          title="Suivant (+1)"
          aria-label="Mouvement suivant"
        >
          <span>+1</span>
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => seekToStep(steps.length, true)}
          disabled={stepIndex >= steps.length && !activeAnim}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg bg-[#252b2e] border border-[#394144] hover:border-[#9eb5aa] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#f0f1ed] cursor-pointer ${focusClass}`}
          title="Fin"
          aria-label="Fin"
        >
          <span className="hidden sm:inline">Fin</span>
          <ArrowRightBox size={16} />
        </button>
      </div>

      {/* Speed & Timing Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {SPEED_OPTIONS.map(spd => (
            <button
              key={spd}
              type="button"
              onClick={() => setPlaybackSpeed(spd)}
              className={`min-h-[44px] sm:min-h-[34px] min-w-[44px] px-2.5 rounded-md border font-mono tabular-nums text-xs font-bold cursor-pointer transition-colors ${
                playbackSpeed === spd
                  ? 'bg-[#9eb5aa] border-[#b9c9bf] text-[#1b2023]'
                  : 'bg-[#252b2e] border-[#394144] text-[#cbd5e1] hover:border-[#9eb5aa]'
              } ${focusClass}`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setTimingMode(m => (m === 'realtime' ? 'uniform' : 'realtime'))}
          className={`min-h-[44px] sm:min-h-[34px] inline-flex items-center gap-1.5 px-3 rounded-md bg-[#252b2e] border border-[#394144] hover:border-[#9eb5aa] text-xs font-semibold text-[#9eb5aa] cursor-pointer ${focusClass}`}
        >
          <Clock size={14} />
          <span>{timingMode === 'realtime' ? 'Temps réel' : 'Uniforme'}</span>
        </button>
      </div>

      {enableKeyboardShortcuts && (
        <div className="hidden sm:flex flex-wrap items-center gap-3 text-[11px] text-[#94a3b8] pt-1 border-t border-[#394144]/60">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#1b2023] border border-[#394144] font-mono text-[10px] text-[#cbd5e1]">
              Espace
            </kbd>{' '}
            Lecture / Pause
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#1b2023] border border-[#394144] font-mono text-[10px] text-[#cbd5e1]">
              ← / →
            </kbd>{' '}
            -1 / +1
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#1b2023] border border-[#394144] font-mono text-[10px] text-[#cbd5e1]">
              Début / Fin
            </kbd>{' '}
            Aller aux extrémités
          </span>
        </div>
      )}
    </div>
  );

  const reconstructionBlock = (
    <div className="rounded-xl bg-[#202629] border border-[#394144] p-3 sm:p-4 flex flex-col gap-2.5 text-[#f0f1ed]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9eb5aa]">
          Reconstruction CFOP
        </span>
        <button
          type="button"
          onClick={handleCopyReconstruction}
          aria-live="polite"
          className={`min-h-[44px] sm:min-h-[34px] inline-flex items-center gap-1.5 px-3 rounded-md bg-[#252b2e] border border-[#394144] hover:border-[#9eb5aa] text-xs font-semibold text-[#f0f1ed] cursor-pointer ${focusClass}`}
        >
          {copied ? <Check size={14} /> : <Paper size={14} />}
          <span>{copied ? 'Copié' : 'Copier'}</span>
        </button>
      </div>

      <div
        className={`flex flex-col gap-2.5 ${
          isSplitLayout ? 'max-h-80 lg:max-h-[420px]' : 'max-h-56'
        } overflow-y-auto pr-1`}
      >
        {segmentsWithMoves.map((seg, sIdx) => (
          <div key={`${seg.key}-block-${sIdx}`} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
              <span className="font-bold text-[#9eb5aa]">
                {`// ${seg.label}`}
              </span>
              <span className="text-[#94a3b8]">
                {typeof seg.durationMs === 'number' ? formatReplayMs(seg.durationMs) : ''}
                {typeof seg.tps === 'number' && seg.tps > 0 ? ` · ${seg.tps.toFixed(1)} TPS` : ''}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {seg.segMoves.map((tok, mIdx) => {
                const globalIdx = seg.startIndex + mIdx;
                const isCurrent = globalIdx === activeMoveIdx;
                const isDone = globalIdx < stepIndex && !isCurrent;
                return (
                  <button
                    key={`${globalIdx}-${tok}`}
                    type="button"
                    onClick={() => seekToStep(globalIdx + 1, true)}
                    className={`min-h-[36px] sm:min-h-[28px] min-w-[34px] px-2 py-0.5 rounded border font-mono text-xs font-bold cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-[#9eb5aa] border-[#b9c9bf] text-[#1b2023]'
                        : isDone
                        ? 'bg-[#252b2e] border-[#385a49] text-[#86efac]'
                        : 'bg-[#1b2023] border-[#394144] text-[#f0f1ed] hover:border-[#9eb5aa]'
                    } ${focusClass}`}
                  >
                    {tok}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isSplitLayout) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 flex flex-col gap-3">
          {playerControlsBlock}
        </div>
        <div className="lg:col-span-5 flex flex-col gap-3">
          {rightPanelHeader}
          {reconstructionBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {playerControlsBlock}
      {reconstructionBlock}
    </div>
  );
}

export default SolveReplayPlayer;
