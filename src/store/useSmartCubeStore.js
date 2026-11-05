// src/store/useSmartCubeStore.js
import { create } from 'zustand';
import { ganBleDriver as defaultGanBleDriver, GanBleDriver } from '../utils/smartCube/ganBleDriver.js';
import {
  loadCachedMac,
  saveCachedMac,
  clearCachedMac,
  isValidMacAddress,
  formatMacAddress
} from '../utils/smartCube/macAddressUtils.js';
import { useCubeStore } from './useCubeStore.js';
import { playCubeTurnSound } from '../utils/audioSystem.js';
import { CubeStateSimulator } from '../utils/cubeMath.js';
import { safeTps } from '../utils/smartCube/wcaStats.js';
import { detectSolvePhase } from '../utils/smartCube/solvePhaseDetector.js';

export const CFOP_PHASE_ORDER = Object.freeze(['cross', 'f2l', 'oll', 'pll']);
export const CFOP_PHASE_NAMES = Object.freeze({
  cross: 'Cross',
  f2l: 'F2L',
  oll: 'OLL',
  pll: 'PLL'
});

export const PAUSE_THRESHOLD_MS = 450;

export function parseScramble(scrambleString) {
  if (!scrambleString || typeof scrambleString !== 'string') return [];
  return scrambleString.trim().split(/\s+/).filter(Boolean);
}

export function buildScrambleTracking(moves, index = 0, subStep = 0, error = null) {
  const safeMoves = Array.isArray(moves) ? moves : [];
  const safeIndex = typeof index === 'number' ? index : 0;
  const isComplete = safeIndex >= safeMoves.length && !error;
  return {
    moves: safeMoves,
    expectedMoves: safeMoves,
    index: safeIndex,
    currentMoveIndex: safeIndex,
    subStep: typeof subStep === 'number' ? subStep : 0,
    error: error || null,
    isComplete
  };
}

export function inverseMove(move) {
  if (!move || typeof move !== 'string') return '';
  const match = move.trim().match(/^([URFDLB])(.*)$/);
  if (!match) return '';
  const face = match[1];
  const mod = match[2];
  if (mod.includes("'")) return face;
  if (mod.includes('2')) return face + '2';
  return face + "'";
}

export function processScrambleTurn({
  scrambleMoves,
  scrambleIndex,
  scrambleSubStep,
  subStepDir,
  errorStack,
  moveNotation
}) {
  const moves = Array.isArray(scrambleMoves) ? [...scrambleMoves] : [];
  let index = typeof scrambleIndex === 'number' ? scrambleIndex : 0;
  let subStep = typeof scrambleSubStep === 'number' ? scrambleSubStep : 0;
  let currentSubStepDir = subStepDir || null;
  const errors = Array.isArray(errorStack) ? [...errorStack] : [];

  if (index >= moves.length) {
    return {
      scrambleIndex: moves.length,
      scrambleSubStep: 0,
      subStepDir: null,
      errorStack: [],
      scrambleError: null,
      isCompleted: true
    };
  }

  // Mode de récupération d'erreur : annuler le mauvais mouvement
  if (errors.length > 0) {
    const expectedCorrection = errors[errors.length - 1];
    if (moveNotation === expectedCorrection) {
      errors.pop();
    } else {
      errors.push(inverseMove(moveNotation));
    }
    const currentError = errors.length > 0 ? errors[errors.length - 1] : null;
    return {
      scrambleIndex: index,
      scrambleSubStep: subStep,
      subStepDir: currentSubStepDir,
      errorStack: errors,
      scrambleError: currentError,
      isCompleted: false
    };
  }

  const expectedMove = moves[index];
  const face = expectedMove[0];
  const isDouble = expectedMove.includes('2');

  if (!isDouble) {
    if (moveNotation === expectedMove) {
      index++;
      subStep = 0;
      currentSubStepDir = null;
    } else {
      errors.push(inverseMove(moveNotation));
    }
  } else {
    if (moveNotation === expectedMove || moveNotation === face + '2') {
      index++;
      subStep = 0;
      currentSubStepDir = null;
    } else if (subStep === 0) {
      if (moveNotation === face) {
        subStep = 1;
        currentSubStepDir = 1;
      } else if (moveNotation === face + "'") {
        subStep = 1;
        currentSubStepDir = -1;
      } else {
        errors.push(inverseMove(moveNotation));
      }
    } else {
      const expectedSecond = currentSubStepDir === 1 ? face : face + "'";
      const undoFirst = currentSubStepDir === 1 ? face + "'" : face;
      if (moveNotation === expectedSecond) {
        index++;
        subStep = 0;
        currentSubStepDir = null;
      } else if (moveNotation === undoFirst) {
        subStep = 0;
        currentSubStepDir = null;
      } else {
        errors.push(inverseMove(moveNotation));
      }
    }
  }

  const currentError = errors.length > 0 ? errors[errors.length - 1] : null;
  const isCompleted = index >= moves.length && errors.length === 0;

  return {
    scrambleIndex: index,
    scrambleSubStep: subStep,
    subStepDir: currentSubStepDir,
    errorStack: errors,
    scrambleError: currentError,
    isCompleted
  };
}

export function advanceSolvePhases({
  currentPhase,
  facelets,
  elapsedMs,
  currentMoveCount,
  lastPhaseSplitMs,
  lastPhaseMoves,
  phaseSplits,
  phaseSteps,
  crossFace = 'auto',
  forceComplete = false
}) {
  const splits = { ...(phaseSplits || {}) };
  const steps = Array.isArray(phaseSteps) ? [...phaseSteps] : [];
  let phase = currentPhase || 'cross';
  let splitMarker = lastPhaseSplitMs || 0;
  let moveMarker = lastPhaseMoves || 0;
  let resolvedCrossFace = crossFace || 'auto';

  const ranks = { cross: 0, f2l: 1, oll: 2, pll: 3, complete: 4 };

  let targetPhase = phase;
  if (forceComplete) {
    targetPhase = 'complete';
  } else if (facelets) {
    const detection = detectSolvePhase(facelets, phase, resolvedCrossFace);
    targetPhase = detection.phase;
    if (detection.detectedCrossFace && resolvedCrossFace === 'auto') {
      resolvedCrossFace = detection.detectedCrossFace;
    }
  }

  const currentRank = ranks[phase] ?? 0;
  const targetRank = ranks[targetPhase] ?? currentRank;

  if (targetRank > currentRank) {
    for (let r = currentRank; r < targetRank; r++) {
      const stepPhase = CFOP_PHASE_ORDER[r];
      if (!stepPhase) continue;

      if (!splits[stepPhase]) {
        if (r === currentRank) {
          const durationMs = Math.max(0, elapsedMs - splitMarker);
          const moveCount = Math.max(0, currentMoveCount - moveMarker);
          const tps = safeTps(moveCount, durationMs);
          const record = {
            phase: stepPhase,
            name: CFOP_PHASE_NAMES[stepPhase],
            durationMs,
            splitMs: elapsedMs,
            moveCount,
            moves: moveCount,
            tps,
            skipped: false
          };
          splits[stepPhase] = record;
          steps.push(record);
          splitMarker = elapsedMs;
          moveMarker = currentMoveCount;
        } else {
          const record = {
            phase: stepPhase,
            name: CFOP_PHASE_NAMES[stepPhase],
            durationMs: 0,
            splitMs: elapsedMs,
            moveCount: 0,
            moves: 0,
            tps: 0,
            skipped: true
          };
          splits[stepPhase] = record;
          steps.push(record);
        }
      }
    }
    phase = targetPhase;
  }

  if (forceComplete || targetPhase === 'complete') {
    for (let r = 0; r < 4; r++) {
      const stepPhase = CFOP_PHASE_ORDER[r];
      if (!splits[stepPhase]) {
        const isCurrentActive = ranks[stepPhase] === currentRank;
        const durationMs = isCurrentActive ? Math.max(0, elapsedMs - splitMarker) : 0;
        const moveCount = isCurrentActive ? Math.max(0, currentMoveCount - moveMarker) : 0;
        const tps = safeTps(moveCount, durationMs);
        const record = {
          phase: stepPhase,
          name: CFOP_PHASE_NAMES[stepPhase],
          durationMs,
          splitMs: elapsedMs,
          moveCount,
          moves: moveCount,
          tps,
          skipped: !isCurrentActive && durationMs === 0 && moveCount === 0
        };
        splits[stepPhase] = record;
        steps.push(record);
        if (isCurrentActive) {
          splitMarker = elapsedMs;
          moveMarker = currentMoveCount;
        }
      }
    }
    phase = 'complete';
  }

  return {
    currentPhase: phase,
    phaseSplits: splits,
    phaseSteps: steps,
    lastPhaseSplitMs: splitMarker,
    lastPhaseMoves: moveMarker,
    crossFace: resolvedCrossFace
  };
}

export function analyzeSolvePauses(moveHistory = [], phaseSplits = {}, thresholdMs = PAUSE_THRESHOLD_MS) {
  if (!Array.isArray(moveHistory) || moveHistory.length <= 1) {
    return { count: 0, totalPauseMs: 0, maxPauseMs: 0, items: [] };
  }

  const startTs = moveHistory[0]?.timestamp ?? 0;
  const crossEnd = phaseSplits?.cross?.splitMs ?? Infinity;
  const f2lEnd = phaseSplits?.f2l?.splitMs ?? Infinity;
  const ollEnd = phaseSplits?.oll?.splitMs ?? Infinity;

  const getPhaseAtElapsed = (relMs) => {
    if (relMs <= crossEnd) return 'cross';
    if (relMs <= f2lEnd) return 'f2l';
    if (relMs <= ollEnd) return 'oll';
    return 'pll';
  };

  const items = [];
  let totalPauseMs = 0;
  let maxPauseMs = 0;

  for (let i = 1; i < moveHistory.length; i++) {
    const entry = moveHistory[i];
    const stepTime = Number(entry?.stepTime) || 0;
    if (stepTime >= thresholdMs) {
      const relMs = Math.max(0, (entry.timestamp ?? startTs) - startTs);
      const phase = getPhaseAtElapsed(relMs);
      totalPauseMs += stepTime;
      if (stepTime > maxPauseMs) maxPauseMs = stepTime;
      items.push({
        moveIndex: i + 1,
        move: entry.move,
        durationMs: stepTime,
        atMs: relMs,
        phase
      });
    }
  }

  return {
    count: items.length,
    totalPauseMs,
    maxPauseMs,
    items
  };
}

function normalizeBatteryValue(payload) {
  const raw = typeof payload === 'object' && payload !== null
    ? (payload.batteryLevel ?? payload.level ?? payload.value)
    : payload;
  if (typeof raw !== 'number' || isNaN(raw)) return null;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export const FIXED_SMART_CUBE_MAPPING = Object.freeze({
  U: { axis: 'y', value: 1, direction: -1 },
  D: { axis: 'y', value: -1, direction: 1 },
  R: { axis: 'x', value: 1, direction: -1 },
  L: { axis: 'x', value: -1, direction: 1 },
  F: { axis: 'z', value: 1, direction: -1 },
  B: { axis: 'z', value: -1, direction: 1 }
});

export const SESSIONS_STORAGE_KEY = 'rubiks_smartcube_sessions_v1';
export const POST_CONNECT_GAP_MS = 120;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function loadSessionSolves() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessionSolves(solves) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(solves));
  } catch {
    // Ignorer les erreurs de quota localStorage
  }
}

export function generateRandomScramble(moveCount = 20) {
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  const result = [];
  let lastFace = '';
  for (let i = 0; i < moveCount; i++) {
    let face;
    do {
      face = faces[Math.floor(Math.random() * faces.length)];
    } while (face === lastFace);
    lastFace = face;
    result.push(face + modifiers[Math.floor(Math.random() * modifiers.length)]);
  }
  return result.join(' ');
}

export function applyMoveTo3D(moveNotation) {
  if (!moveNotation) return;
  try {
    const face = moveNotation[0];
    const mapping = FIXED_SMART_CUBE_MAPPING[face];
    if (!mapping) return;

    const isPrime = moveNotation.includes("'");
    const isDouble = moveNotation.includes("2");
    const moveDirection = (isPrime ? 1 : -1) * mapping.direction;

    const cubeState = useCubeStore.getState();
    const executeTurn = () => {
      cubeState.startRotation(mapping.axis, [mapping.value], moveDirection);
    };

    executeTurn();
    if (isDouble) {
      executeTurn();
    }

    playCubeTurnSound();
  } catch (err) {
    console.warn('Error applying 3D rotation:', err);
  }
}

export class SmartCubeStore {
  constructor(driver = null) {
    this.driver = driver || new GanBleDriver();
    const initialScramble = "D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2";
    const initialMoves = parseScramble(initialScramble);

    this.state = {
      connectionStatus: 'disconnected',
      deviceName: null,
      macAddress: loadCachedMac(),
      batteryLevel: null,
      gyroQuaternion: null,
      isGyroActive: true,
      gyroZeroQuaternion: null,
      errorMessage: null,
      isMacModalOpen: false,
      timerStatus: 'idle',
      timerStartTime: 0,
      wallStartTime: 0,
      inspectionStartTime: 0,
      elapsedMs: 0,
      moveCount: 0,
      currentTps: 0,
      finalTps: null,
      moveHistory: [],
      sessionSolves: loadSessionSolves(),
      scramble: initialScramble,
      scrambleMoves: initialMoves,
      scrambleIndex: initialMoves.length,
      scrambleSubStep: 0,
      scrambleError: null,
      scrambleTracking: buildScrambleTracking(initialMoves, initialMoves.length, 0, null),
      currentPhase: 'cross',
      activeCrossFace: 'auto',
      phaseSplits: {},
      phaseSteps: []
    };

    this._subStepDir = null;
    this._errorStack = [];
    this._lastPhaseSplitMs = 0;
    this._lastPhaseMoves = 0;
    this._autoInspectOnScrambleEnd = false;

    this.cubeSimulator = new CubeStateSimulator();
    this._bindDriver();
  }

  getState() {
    return this.state;
  }

  setState(partial) {
    const next = typeof partial === 'function' ? partial(this.state) : partial;
    Object.assign(this.state, next);
  }

  _bindDriver() {
    this.driver.onStatusChange = (status, error) => {
      this.state.connectionStatus = status;
      this.state.errorMessage = error || null;
      if (status === 'disconnected' || status === 'error') {
        this.state.deviceName = null;
        this.state.batteryLevel = null;
      }
    };

    this.driver.onBattery = (level) => {
      const normalized = normalizeBatteryValue(level);
      if (normalized !== null) {
        this.state.batteryLevel = normalized;
      }
    };

    this.driver.onMove = (moveData) => {
      this.handleIncomingMove(moveData);
    };

    this.driver.onGyro = (quaternion) => {
      this.state.gyroQuaternion = quaternion;
    };

    this.driver.onFacelets = (facelets) => {
      if (this.cubeSimulator && this.state.timerStatus !== 'scrambling') {
        this.cubeSimulator = new CubeStateSimulator(facelets);
      }
      if (this.state.timerStatus === 'solving' && this.cubeSimulator?.isSolved()) {
        this._stopTimer();
      }
    };
  }

  async connect(deviceInstance = null, explicitMac = null) {
    const targetMac = explicitMac || this.state.macAddress || loadCachedMac();
    this.state.connectionStatus = 'connecting';
    this.state.errorMessage = null;

    try {
      if (targetMac) {
        this.driver.setMacAddress(targetMac);
      }
      const info = await this.driver.connect(deviceInstance);
      this.state.connectionStatus = 'connected';
      this.state.deviceName = info?.deviceName || 'GAN 16 ui';
      this.state.macAddress = targetMac || info?.macAddress || null;
      if (info?.batteryLevel !== undefined) {
        const b = normalizeBatteryValue(info.batteryLevel);
        if (b !== null) this.state.batteryLevel = b;
      }
      await this.driver.requestHardware().catch(() => {});
      await delay(POST_CONNECT_GAP_MS);
      await this.driver.requestFacelets().catch(() => {});
      await delay(POST_CONNECT_GAP_MS);
      const batt = await this.driver.requestBattery().catch(() => null);
      const normalizedBatt = normalizeBatteryValue(batt ?? this.driver.batteryLevel);
      if (normalizedBatt !== null) {
        this.state.batteryLevel = normalizedBatt;
      }
      return info;
    } catch (err) {
      this.state.connectionStatus = 'error';
      this.state.errorMessage = err.message || 'Erreur lors de la connexion Bluetooth';
      throw err;
    }
  }

  disconnect() {
    this.driver.disconnect();
    this.state.connectionStatus = 'disconnected';
    this.state.deviceName = null;
    this.state.batteryLevel = null;
    this.state.errorMessage = null;
  }

  startInspection() {
    if (this.state.timerStatus === 'scrambled' || this.state.timerStatus === 'scrambling') {
      this.state.timerStatus = 'inspecting';
      this.state.inspectionStartTime = Date.now();
    }
  }

  startScrambleTracking(scrambleString, options = {}) {
    const scramble = scrambleString || generateRandomScramble(20);
    const moves = parseScramble(scramble);
    this._autoInspectOnScrambleEnd = Boolean(options.autoInspect);
    this.state.scramble = scramble;
    this.state.scrambleMoves = moves;
    this.state.scrambleIndex = 0;
    this.state.scrambleSubStep = 0;
    this.state.scrambleError = null;
    this.state.scrambleTracking = buildScrambleTracking(moves, 0, 0, null);
    this._subStepDir = null;
    this._errorStack = [];
    this.state.timerStatus = 'scrambling';
    this.state.timerStartTime = 0;
    this.state.wallStartTime = 0;
    this.state.inspectionStartTime = 0;
    this.state.moveCount = 0;
    this.state.elapsedMs = 0;
    this.state.currentTps = 0;
    this.state.finalTps = null;
    this.state.moveHistory = [];
    this.state.currentPhase = 'cross';
    this.state.activeCrossFace = 'auto';
    this.state.phaseSplits = {};
    this.state.phaseSteps = [];
    this._lastPhaseSplitMs = 0;
    this._lastPhaseMoves = 0;
    if (this.cubeSimulator) {
      this.cubeSimulator = new CubeStateSimulator();
    }
    return scramble;
  }

  handleIncomingMove(moveData, explicitTimestamp = null) {
    const moveNotation = typeof moveData === 'string' ? moveData : moveData?.move;
    if (!moveNotation) return;
    const now = explicitTimestamp ?? (typeof moveData === 'object' && typeof moveData?.timestamp === 'number' ? moveData.timestamp : Date.now());

    if (this.state.timerStatus === 'solved') {
      if (this.cubeSimulator) {
        this.cubeSimulator.applyMove(moveNotation);
      }
      applyMoveTo3D(moveNotation);
      return;
    }

    if (this.state.timerStatus === 'scrambling') {
      if (this.cubeSimulator) {
        this.cubeSimulator.applyMove(moveNotation);
      }
      applyMoveTo3D(moveNotation);

      const result = processScrambleTurn({
        scrambleMoves: this.state.scrambleMoves,
        scrambleIndex: this.state.scrambleIndex,
        scrambleSubStep: this.state.scrambleSubStep,
        subStepDir: this._subStepDir,
        errorStack: this._errorStack,
        moveNotation
      });

      this.state.scrambleIndex = result.scrambleIndex;
      this.state.scrambleSubStep = result.scrambleSubStep;
      this.state.scrambleError = result.scrambleError;
      this._subStepDir = result.subStepDir;
      this._errorStack = result.errorStack;
      this.state.scrambleTracking = buildScrambleTracking(
        this.state.scrambleMoves,
        result.scrambleIndex,
        result.scrambleSubStep,
        result.scrambleError
      );

      if (result.isCompleted) {
        if (this._autoInspectOnScrambleEnd) {
          this.state.timerStatus = 'inspecting';
          this.state.inspectionStartTime = Date.now();
        } else {
          this.state.timerStatus = 'scrambled';
        }
      }
      return;
    }

    if (this.cubeSimulator) {
      this.cubeSimulator.applyMove(moveNotation);
    }

    let currentTimerStatus = this.state.timerStatus;
    let startTime = this.state.timerStartTime;

    if (currentTimerStatus === 'scrambled' || currentTimerStatus === 'inspecting') {
      currentTimerStatus = 'solving';
      startTime = now;
      this.state.wallStartTime = Date.now();
      this.state.inspectionStartTime = 0;
      this.state.currentPhase = 'cross';
      this.state.activeCrossFace = 'auto';
      this.state.phaseSplits = {};
      this.state.phaseSteps = [];
      this._lastPhaseSplitMs = 0;
      this._lastPhaseMoves = 0;
    }

    const lastMoveTs = this.state.moveHistory.length > 0
      ? this.state.moveHistory[this.state.moveHistory.length - 1].timestamp
      : now;
    const stepTime = Math.max(0, now - lastMoveTs);

    const newMoveCount = this.state.moveCount + 1;
    this.state.moveHistory.push({
      move: moveNotation,
      timestamp: now,
      stepTime,
      serial: (typeof moveData === 'object' && moveData?.serial) ?? newMoveCount
    });

    let elapsed = this.state.elapsedMs;
    let tps = this.state.currentTps;

    if (currentTimerStatus === 'solving') {
      elapsed = Math.max(1, now - (startTime ?? now));
      tps = safeTps(newMoveCount, elapsed);

      const facelets = this.cubeSimulator ? this.cubeSimulator.getFaceletString() : null;
      const isSolved = this.cubeSimulator ? this.cubeSimulator.isSolved() : false;

      const phaseUpdate = advanceSolvePhases({
        currentPhase: this.state.currentPhase,
        facelets,
        elapsedMs: elapsed,
        currentMoveCount: newMoveCount,
        lastPhaseSplitMs: this._lastPhaseSplitMs,
        lastPhaseMoves: this._lastPhaseMoves,
        phaseSplits: this.state.phaseSplits,
        phaseSteps: this.state.phaseSteps,
        crossFace: this.state.activeCrossFace || 'auto',
        forceComplete: isSolved
      });

      this.state.currentPhase = phaseUpdate.currentPhase;
      this.state.activeCrossFace = phaseUpdate.crossFace;
      this.state.phaseSplits = phaseUpdate.phaseSplits;
      this.state.phaseSteps = phaseUpdate.phaseSteps;
      this._lastPhaseSplitMs = phaseUpdate.lastPhaseSplitMs;
      this._lastPhaseMoves = phaseUpdate.lastPhaseMoves;

      if (isSolved) {
        currentTimerStatus = 'solved';
        this.state.finalTps = tps;
        const pauses = analyzeSolvePauses(this.state.moveHistory, this.state.phaseSplits);
        const solveRecord = {
          id: `solve-${now}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: now,
          date: now,
          elapsedMs: elapsed,
          timeMs: elapsed,
          moveCount: newMoveCount,
          tps,
          scramble: this.state.scramble || '',
          moves: this.state.moveHistory.map(m => m.move).join(' '),
          moveTimings: this.state.moveHistory.map(m => ({
            move: m.move,
            timestamp: m.timestamp,
            stepTime: m.stepTime
          })),
          pauses,
          penalty: 'none',
          isDnf: false,
          splits: { ...this.state.phaseSplits },
          steps: [...this.state.phaseSteps]
        };
        this.state.sessionSolves.push(solveRecord);
        saveSessionSolves(this.state.sessionSolves);
      }
    }

    this.state.timerStatus = currentTimerStatus;
    this.state.timerStartTime = startTime;
    this.state.moveCount = newMoveCount;
    this.state.elapsedMs = elapsed;
    this.state.currentTps = tps;

    applyMoveTo3D(moveNotation);
  }

  _stopTimer(now = Date.now()) {
    if (this.state.timerStatus !== 'solving') return;
    this.state.timerStatus = 'solved';
    const elapsed = Math.max(1, now - (this.state.timerStartTime ?? now));
    const finalTps = safeTps(this.state.moveCount, elapsed);
    this.state.elapsedMs = elapsed;
    this.state.finalTps = finalTps;
    this.state.currentTps = finalTps;

    const facelets = this.cubeSimulator ? this.cubeSimulator.getFaceletString() : null;
    const phaseUpdate = advanceSolvePhases({
      currentPhase: this.state.currentPhase,
      facelets,
      elapsedMs: elapsed,
      currentMoveCount: this.state.moveCount,
      lastPhaseSplitMs: this._lastPhaseSplitMs,
      lastPhaseMoves: this._lastPhaseMoves,
      phaseSplits: this.state.phaseSplits,
      phaseSteps: this.state.phaseSteps,
      crossFace: this.state.activeCrossFace || 'auto',
      forceComplete: true
    });
    this.state.currentPhase = phaseUpdate.currentPhase;
    this.state.activeCrossFace = phaseUpdate.crossFace;
    this.state.phaseSplits = phaseUpdate.phaseSplits;
    this.state.phaseSteps = phaseUpdate.phaseSteps;
    this._lastPhaseSplitMs = phaseUpdate.lastPhaseSplitMs;
    this._lastPhaseMoves = phaseUpdate.lastPhaseMoves;

    const pauses = analyzeSolvePauses(this.state.moveHistory, this.state.phaseSplits);
    const solveRecord = {
      id: `solve-${now}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      date: now,
      elapsedMs: elapsed,
      timeMs: elapsed,
      moveCount: this.state.moveCount,
      tps: finalTps,
      scramble: this.state.scramble || '',
      moves: this.state.moveHistory.map(m => m.move).join(' '),
      moveTimings: this.state.moveHistory.map(m => ({
        move: m.move,
        timestamp: m.timestamp,
        stepTime: m.stepTime
      })),
      pauses,
      penalty: 'none',
      isDnf: false,
      splits: { ...this.state.phaseSplits },
      steps: [...this.state.phaseSteps]
    };
    this.state.sessionSolves.push(solveRecord);
    saveSessionSolves(this.state.sessionSolves);
  }

  newScramble(customScramble, options = {}) {
    const scramble = customScramble || generateRandomScramble(20);
    if (options?.trackScramble) {
      return this.startScrambleTracking(scramble, options);
    }
    const moves = parseScramble(scramble);
    this.state.scramble = scramble;
    this.state.scrambleMoves = moves;
    this.state.scrambleIndex = moves.length;
    this.state.scrambleSubStep = 0;
    this.state.scrambleError = null;
    this.state.scrambleTracking = buildScrambleTracking(moves, moves.length, 0, null);
    this._subStepDir = null;
    this._errorStack = [];
    this.state.timerStatus = options?.autoInspect ? 'inspecting' : 'scrambled';
    this.state.timerStartTime = 0;
    this.state.wallStartTime = 0;
    this.state.inspectionStartTime = options?.autoInspect ? Date.now() : 0;
    this.state.moveCount = 0;
    this.state.elapsedMs = 0;
    this.state.currentTps = 0;
    this.state.finalTps = null;
    this.state.moveHistory = [];
    this.state.currentPhase = 'cross';
    this.state.activeCrossFace = 'auto';
    this.state.phaseSplits = {};
    this.state.phaseSteps = [];
    this._lastPhaseSplitMs = 0;
    this._lastPhaseMoves = 0;
    if (this.cubeSimulator) {
      this.cubeSimulator = new CubeStateSimulator();
      this.cubeSimulator.applyMoves(scramble);
    }
    return scramble;
  }

  recalibrateGyro() {
    const current = this.state.gyroQuaternion;
    this.state.gyroZeroQuaternion = current ? [...current] : [0, 0, 0, 1];
    this.state.gyroQuaternion = [0, 0, 0, 1];
  }

  toggleGyroActive(active) {
    this.state.isGyroActive = typeof active === 'boolean' ? active : !this.state.isGyroActive;
  }

  resetSolve() {
    this.state.timerStatus = 'idle';
    this.state.timerStartTime = 0;
    this.state.wallStartTime = 0;
    this.state.inspectionStartTime = 0;
    this.state.elapsedMs = 0;
    this.state.moveCount = 0;
    this.state.currentTps = 0;
    this.state.finalTps = null;
    this.state.moveHistory = [];
    this.state.currentPhase = 'cross';
    this.state.activeCrossFace = 'auto';
    this.state.phaseSplits = {};
    this.state.phaseSteps = [];
    this._lastPhaseSplitMs = 0;
    this._lastPhaseMoves = 0;
    this.state.scrambleIndex = 0;
    this.state.scrambleSubStep = 0;
    this.state.scrambleError = null;
    this._subStepDir = null;
    this._errorStack = [];
    this.state.scrambleTracking = buildScrambleTracking(this.state.scrambleMoves || [], 0, 0, null);
    if (this.cubeSimulator) {
      this.cubeSimulator = new CubeStateSimulator();
    }
  }

  recordSolve(record) {
    this.state.sessionSolves.push(record);
    saveSessionSolves(this.state.sessionSolves);
  }

  deleteSolve(id) {
    this.state.sessionSolves = this.state.sessionSolves.filter(s => s.id !== id);
    saveSessionSolves(this.state.sessionSolves);
  }

  clearSessionSolves() {
    this.state.sessionSolves = [];
    saveSessionSolves([]);
  }

  clearSession() {
    this.clearSessionSolves();
  }

  updateSolvePenalty(id, penalty) {
    this.state.sessionSolves = this.state.sessionSolves.map(s => {
      if (s.id !== id) return s;
      const isDnf = penalty === 'dnf';
      return { ...s, penalty, isDnf };
    });
    saveSessionSolves(this.state.sessionSolves);
  }
}

// État interne du store singleton Zustand (utilisé par l'interface React)
let zustandCubeSimulator = new CubeStateSimulator();
let zustandSubStepDir = null;
let zustandErrorStack = [];
let zustandLastPhaseSplitMs = 0;
let zustandLastPhaseMoves = 0;
let zustandAutoInspect = true;

const defaultScramble = "D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2";
const defaultMoves = parseScramble(defaultScramble);

const rawZustandStore = create((set, get) => {
  defaultGanBleDriver.onStatusChange = (status, error) => {
    set({
      connectionStatus: status,
      errorMessage: error || null,
      ...(status === 'disconnected' || status === 'error'
        ? { deviceName: null, batteryLevel: null }
        : {})
    });
  };

  defaultGanBleDriver.onBattery = (level) => {
    const normalized = normalizeBatteryValue(level);
    if (normalized !== null) {
      set({ batteryLevel: normalized });
    }
  };

  defaultGanBleDriver.onMove = (moveData) => {
    get().handleIncomingMove(moveData);
  };

  defaultGanBleDriver.onGyro = (quaternion) => {
    set({ gyroQuaternion: quaternion });
  };

  defaultGanBleDriver.onFacelets = (facelets) => {
    // Ne pas écraser le simulateur en plein mélange guidé
    if (get().timerStatus !== 'scrambling') {
      zustandCubeSimulator = new CubeStateSimulator(facelets);
    }
    if (get().timerStatus === 'solving' && zustandCubeSimulator.isSolved()) {
      get()._stopTimer();
    }
  };

  return {
    connectionStatus: 'disconnected',
    deviceName: null,
    macAddress: loadCachedMac(),
    batteryLevel: null,
    gyroQuaternion: null,
    errorMessage: null,

    isMacModalOpen: false,

    isGyroActive: true,
    gyroZeroQuaternion: null,

    // Par défaut, démarre directement en mode guide de mélange interactif
    timerStatus: 'scrambling',
    timerStartTime: 0,
    wallStartTime: 0,
    inspectionStartTime: 0,
    elapsedMs: 0,
    moveCount: 0,
    currentTps: 0,
    finalTps: null,
    moveHistory: [],
    sessionSolves: loadSessionSolves(),
    scramble: defaultScramble,
    scrambleMoves: defaultMoves,
    scrambleIndex: 0,
    scrambleSubStep: 0,
    scrambleError: null,
    scrambleTracking: buildScrambleTracking(defaultMoves, 0, 0, null),
    currentPhase: 'cross',
    activeCrossFace: 'auto',
    phaseSplits: {},
    phaseSteps: [],

    openMacModal: () => set({ isMacModalOpen: true }),
    closeMacModal: () => set({ isMacModalOpen: false }),

    setMacAddress: (rawMac, persist = true) => {
      if (!isValidMacAddress(rawMac)) {
        throw new Error('Format d’adresse MAC invalide');
      }
      const formatted = persist ? saveCachedMac(rawMac) : formatMacAddress(rawMac);
      set({ macAddress: formatted, isMacModalOpen: false });
      return formatted;
    },

    clearMac: () => {
      clearCachedMac();
      set({ macAddress: null });
    },

    refreshBattery: async () => {
      if (get().connectionStatus !== 'connected') return null;
      try {
        const res = await defaultGanBleDriver.requestBattery();
        const normalized = normalizeBatteryValue(res ?? defaultGanBleDriver.batteryLevel);
        if (normalized !== null) {
          set({ batteryLevel: normalized });
        }
        return normalized;
      } catch {
        return null;
      }
    },

    connect: async (deviceInstance = null, explicitMac = null) => {
      const state = get();
      const targetMac = explicitMac || state.macAddress || loadCachedMac();

      if (!targetMac && !deviceInstance) {
        set({ isMacModalOpen: true });
        return;
      }

      set({ connectionStatus: 'connecting', errorMessage: null });

      try {
        if (targetMac) {
          defaultGanBleDriver.setMacAddress(targetMac);
        }
        const info = await defaultGanBleDriver.connect(deviceInstance);
        const initialBatt = normalizeBatteryValue(info?.batteryLevel ?? defaultGanBleDriver.batteryLevel);
        set({
          connectionStatus: 'connected',
          deviceName: info?.deviceName || 'GAN 16 ui',
          macAddress: targetMac || info?.macAddress || null,
          ...(initialBatt !== null ? { batteryLevel: initialBatt } : {})
        });

        // Lance automatiquement le guide de mélange à la connexion si inactif ou terminé
        if (get().timerStatus === 'idle' || get().timerStatus === 'solved') {
          get().startScrambleTracking(get().scramble, { autoInspect: true });
        }

        await defaultGanBleDriver.requestHardware().catch(() => {});
        await delay(POST_CONNECT_GAP_MS);
        await defaultGanBleDriver.requestFacelets().catch(() => {});
        await delay(POST_CONNECT_GAP_MS);
        await get().refreshBattery();

        // Relances non bloquantes si le cube GAN ignore la 1re requête batterie pendant l'init GATT
        for (const waitMs of [500, 1400, 2800]) {
          setTimeout(() => {
            if (get().connectionStatus === 'connected' && get().batteryLevel === null) {
              get().refreshBattery();
            }
          }, waitMs);
        }
      } catch (err) {
        set({
          connectionStatus: 'error',
          errorMessage: err.message || 'Erreur lors de la connexion Bluetooth'
        });
        throw err;
      }
    },

    disconnect: () => {
      defaultGanBleDriver.disconnect();
      set({
        connectionStatus: 'disconnected',
        deviceName: null,
        batteryLevel: null,
        errorMessage: null
      });
    },

    startScrambleTracking: (scrambleString, options = {}) => {
      const scramble = scrambleString || generateRandomScramble(20);
      const moves = parseScramble(scramble);
      zustandCubeSimulator = new CubeStateSimulator();
      zustandSubStepDir = null;
      zustandErrorStack = [];
      zustandLastPhaseSplitMs = 0;
      zustandLastPhaseMoves = 0;
      zustandAutoInspect = options.autoInspect !== undefined ? Boolean(options.autoInspect) : true;
      try {
        useCubeStore.getState().initCube(3);
      } catch {
        // Ignore en environnement Node sans WebGL
      }
      set({
        scramble,
        scrambleMoves: moves,
        scrambleIndex: 0,
        scrambleSubStep: 0,
        scrambleError: null,
        scrambleTracking: buildScrambleTracking(moves, 0, 0, null),
        timerStatus: 'scrambling',
        timerStartTime: 0,
        wallStartTime: 0,
        inspectionStartTime: 0,
        elapsedMs: 0,
        moveCount: 0,
        currentTps: 0,
        finalTps: null,
        moveHistory: [],
        currentPhase: 'cross',
        activeCrossFace: 'auto',
        phaseSplits: {},
        phaseSteps: []
      });
      return scramble;
    },

    startInspection: () => {
      const st = get().timerStatus;
      if (st === 'scrambled' || st === 'scrambling') {
        set({
          timerStatus: 'inspecting',
          inspectionStartTime: Date.now()
        });
      }
    },

    handleIncomingMove: (moveData, explicitTimestamp = null) => {
      const state = get();
      const moveNotation = typeof moveData === 'string' ? moveData : moveData?.move;
      if (!moveNotation) return;
      const now = explicitTimestamp ?? (typeof moveData === 'object' && typeof moveData?.timestamp === 'number' ? moveData.timestamp : Date.now());

      if (state.timerStatus === 'solved') {
        zustandCubeSimulator.applyMove(moveNotation);
        applyMoveTo3D(moveNotation);
        return;
      }

      if (state.timerStatus === 'scrambling') {
        zustandCubeSimulator.applyMove(moveNotation);
        applyMoveTo3D(moveNotation);

        const result = processScrambleTurn({
          scrambleMoves: state.scrambleMoves,
          scrambleIndex: state.scrambleIndex,
          scrambleSubStep: state.scrambleSubStep,
          subStepDir: zustandSubStepDir,
          errorStack: zustandErrorStack,
          moveNotation
        });

        zustandSubStepDir = result.subStepDir;
        zustandErrorStack = result.errorStack;

        const nextStatusPatch = result.isCompleted
          ? (zustandAutoInspect
              ? { timerStatus: 'inspecting', inspectionStartTime: Date.now() }
              : { timerStatus: 'scrambled' })
          : {};

        set({
          scrambleIndex: result.scrambleIndex,
          scrambleSubStep: result.scrambleSubStep,
          scrambleError: result.scrambleError,
          scrambleTracking: buildScrambleTracking(
            state.scrambleMoves,
            result.scrambleIndex,
            result.scrambleSubStep,
            result.scrambleError
          ),
          ...nextStatusPatch
        });
        return;
      }

      zustandCubeSimulator.applyMove(moveNotation);

      let currentTimerStatus = state.timerStatus;
      let startTime = state.timerStartTime;
      let wallStart = state.wallStartTime;
      let currentPhase = state.currentPhase;
      let activeCrossFace = state.activeCrossFace || 'auto';
      let phaseSplits = state.phaseSplits;
      let phaseSteps = state.phaseSteps;

      if (currentTimerStatus === 'scrambled' || currentTimerStatus === 'inspecting') {
        currentTimerStatus = 'solving';
        startTime = now;
        wallStart = Date.now();
        currentPhase = 'cross';
        activeCrossFace = 'auto';
        phaseSplits = {};
        phaseSteps = [];
        zustandLastPhaseSplitMs = 0;
        zustandLastPhaseMoves = 0;
      }

      const lastMoveTs = state.moveHistory.length > 0
        ? state.moveHistory[state.moveHistory.length - 1].timestamp
        : now;
      const stepTime = Math.max(0, now - lastMoveTs);

      const newMoveCount = state.moveCount + 1;
      const newHistory = [
        ...state.moveHistory,
        {
          move: moveNotation,
          timestamp: now,
          stepTime,
          serial: (typeof moveData === 'object' && moveData?.serial) ?? newMoveCount
        }
      ];

      let elapsed = state.elapsedMs;
      let tps = state.currentTps;
      let finalTps = state.finalTps;
      let nextSessionSolves = state.sessionSolves;

      if (currentTimerStatus === 'solving') {
        elapsed = Math.max(1, now - (startTime ?? now));
        tps = safeTps(newMoveCount, elapsed);

        const facelets = zustandCubeSimulator ? zustandCubeSimulator.getFaceletString() : null;
        const isSolved = zustandCubeSimulator ? zustandCubeSimulator.isSolved() : false;

        const phaseUpdate = advanceSolvePhases({
          currentPhase,
          facelets,
          elapsedMs: elapsed,
          currentMoveCount: newMoveCount,
          lastPhaseSplitMs: zustandLastPhaseSplitMs,
          lastPhaseMoves: zustandLastPhaseMoves,
          phaseSplits,
          phaseSteps,
          crossFace: activeCrossFace,
          forceComplete: isSolved
        });

        currentPhase = phaseUpdate.currentPhase;
        activeCrossFace = phaseUpdate.crossFace;
        phaseSplits = phaseUpdate.phaseSplits;
        phaseSteps = phaseUpdate.phaseSteps;
        zustandLastPhaseSplitMs = phaseUpdate.lastPhaseSplitMs;
        zustandLastPhaseMoves = phaseUpdate.lastPhaseMoves;

        if (isSolved) {
          currentTimerStatus = 'solved';
          finalTps = tps;
          const pauses = analyzeSolvePauses(newHistory, phaseSplits);
          const solveRecord = {
            id: `solve-${now}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: now,
            date: now,
            elapsedMs: elapsed,
            timeMs: elapsed,
            moveCount: newMoveCount,
            tps,
            scramble: state.scramble || '',
            moves: newHistory.map(m => m.move).join(' '),
            moveTimings: newHistory.map(m => ({
              move: m.move,
              timestamp: m.timestamp,
              stepTime: m.stepTime
            })),
            pauses,
            penalty: 'none',
            isDnf: false,
            splits: { ...phaseSplits },
            steps: [...phaseSteps]
          };
          nextSessionSolves = [...nextSessionSolves, solveRecord];
          saveSessionSolves(nextSessionSolves);
        }
      }

      set({
        timerStatus: currentTimerStatus,
        timerStartTime: startTime,
        wallStartTime: wallStart,
        moveCount: newMoveCount,
        moveHistory: newHistory,
        elapsedMs: elapsed,
        currentTps: tps,
        finalTps,
        sessionSolves: nextSessionSolves,
        currentPhase,
        activeCrossFace,
        phaseSplits,
        phaseSteps
      });

      applyMoveTo3D(moveNotation);
    },

    _stopTimer: (now = Date.now()) => {
      const state = get();
      if (state.timerStatus !== 'solving') return;
      const elapsed = Math.max(1, now - (state.timerStartTime ?? now));
      const finalTps = safeTps(state.moveCount, elapsed);

      const facelets = zustandCubeSimulator ? zustandCubeSimulator.getFaceletString() : null;
      const phaseUpdate = advanceSolvePhases({
        currentPhase: state.currentPhase,
        facelets,
        elapsedMs: elapsed,
        currentMoveCount: state.moveCount,
        lastPhaseSplitMs: zustandLastPhaseSplitMs,
        lastPhaseMoves: zustandLastPhaseMoves,
        phaseSplits: state.phaseSplits,
        phaseSteps: state.phaseSteps,
        crossFace: state.activeCrossFace || 'auto',
        forceComplete: true
      });
      zustandLastPhaseSplitMs = phaseUpdate.lastPhaseSplitMs;
      zustandLastPhaseMoves = phaseUpdate.lastPhaseMoves;

      const pauses = analyzeSolvePauses(state.moveHistory, phaseUpdate.phaseSplits);
      const solveRecord = {
        id: `solve-${now}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        date: now,
        elapsedMs: elapsed,
        timeMs: elapsed,
        moveCount: state.moveCount,
        tps: finalTps,
        scramble: state.scramble || '',
        moves: state.moveHistory.map(m => m.move).join(' '),
        moveTimings: state.moveHistory.map(m => ({
          move: m.move,
          timestamp: m.timestamp,
          stepTime: m.stepTime
        })),
        pauses,
        penalty: 'none',
        isDnf: false,
        splits: { ...phaseUpdate.phaseSplits },
        steps: [...phaseUpdate.phaseSteps]
      };
      const nextSessionSolves = [...state.sessionSolves, solveRecord];
      saveSessionSolves(nextSessionSolves);
      set({
        timerStatus: 'solved',
        elapsedMs: elapsed,
        finalTps,
        currentTps: finalTps,
        sessionSolves: nextSessionSolves,
        currentPhase: phaseUpdate.currentPhase,
        activeCrossFace: phaseUpdate.crossFace,
        phaseSplits: phaseUpdate.phaseSplits,
        phaseSteps: phaseUpdate.phaseSteps
      });
    },

    newScramble: (customScramble, options = {}) => {
      const scramble = customScramble || generateRandomScramble(20);
      if (options?.trackScramble) {
        return get().startScrambleTracking(scramble, options);
      }
      const moves = parseScramble(scramble);
      zustandCubeSimulator = new CubeStateSimulator();
      zustandCubeSimulator.applyMoves(scramble);
      zustandSubStepDir = null;
      zustandErrorStack = [];
      zustandLastPhaseSplitMs = 0;
      zustandLastPhaseMoves = 0;
      set({
        scramble,
        scrambleMoves: moves,
        scrambleIndex: moves.length,
        scrambleSubStep: 0,
        scrambleError: null,
        scrambleTracking: buildScrambleTracking(moves, moves.length, 0, null),
        timerStatus: options?.autoInspect ? 'inspecting' : 'scrambled',
        timerStartTime: 0,
        wallStartTime: 0,
        inspectionStartTime: options?.autoInspect ? Date.now() : 0,
        elapsedMs: 0,
        moveCount: 0,
        moveHistory: [],
        currentTps: 0,
        finalTps: null,
        currentPhase: 'cross',
        activeCrossFace: 'auto',
        phaseSplits: {},
        phaseSteps: []
      });
      return scramble;
    },

    toggleGyroActive: (active) => {
      set((s) => ({ isGyroActive: typeof active === 'boolean' ? active : !s.isGyroActive }));
    },

    recalibrateGyro: () => {
      const current = get().gyroQuaternion;
      set({
        gyroZeroQuaternion: current ? [...current] : [0, 0, 0, 1],
        gyroQuaternion: [0, 0, 0, 1]
      });
    },

    resetSolve: () => {
      const moves = get().scrambleMoves || [];
      zustandCubeSimulator = new CubeStateSimulator();
      zustandSubStepDir = null;
      zustandErrorStack = [];
      zustandLastPhaseSplitMs = 0;
      zustandLastPhaseMoves = 0;
      try {
        useCubeStore.getState().initCube(3);
      } catch {
        // Ignore en environnement Node
      }
      set({
        timerStatus: 'scrambling',
        timerStartTime: 0,
        wallStartTime: 0,
        inspectionStartTime: 0,
        elapsedMs: 0,
        moveCount: 0,
        currentTps: 0,
        finalTps: null,
        moveHistory: [],
        scrambleIndex: 0,
        scrambleSubStep: 0,
        scrambleError: null,
        scrambleTracking: buildScrambleTracking(moves, 0, 0, null),
        currentPhase: 'cross',
        activeCrossFace: 'auto',
        phaseSplits: {},
        phaseSteps: []
      });
    },

    recordSolve: (record) => {
      const next = [...get().sessionSolves, record];
      saveSessionSolves(next);
      set({ sessionSolves: next });
    },

    deleteSolve: (id) => {
      const next = get().sessionSolves.filter(s => s.id !== id);
      saveSessionSolves(next);
      set({ sessionSolves: next });
    },

    clearSessionSolves: () => {
      saveSessionSolves([]);
      set({ sessionSolves: [] });
    },

    clearSession: () => {
      get().clearSessionSolves();
    },

    updateSolvePenalty: (id, penalty) => {
      const next = get().sessionSolves.map(s => {
        if (s.id !== id) return s;
        const isDnf = penalty === 'dnf';
        return { ...s, penalty, isDnf };
      });
      saveSessionSolves(next);
      set({ sessionSolves: next });
    }
  };
});

export function useSmartCubeStore(...args) {
  if (new.target) {
    return new SmartCubeStore(...args);
  }
  return rawZustandStore(...args);
}

Object.assign(useSmartCubeStore, rawZustandStore);
useSmartCubeStore.getState = rawZustandStore.getState;
useSmartCubeStore.setState = rawZustandStore.setState;
useSmartCubeStore.subscribe = rawZustandStore.subscribe;

export default useSmartCubeStore;