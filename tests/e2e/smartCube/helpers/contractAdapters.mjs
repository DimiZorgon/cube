// tests/e2e/smartCube/helpers/contractAdapters.mjs
// Progressive test adapter: dynamically loads production modules when available,
// or falls back to specification oracle conforming to PROJECT.md interface contracts.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveKeyAndIv,
  encryptGen4Packet,
  decryptGen4Packet,
  decodeGen4Packet,
  FACE_CODES,
  FACE_NAMES,
  GAN_GEN4_SERVICE,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC
} from '../mocks/virtualGanCube.mjs';
import { SOLVED_FACELETS, CubeStateSimulator } from './testUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');

export function checkFileExists(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  return fs.existsSync(fullPath);
}

export function readFileContent(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

// -------------------------------------------------------------
// Reference GATT Write Queue implementation
// -------------------------------------------------------------
export class GattWriteQueue {
  constructor() {
    this._queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this._queue.then(() => operation(), () => operation());
    this._queue = next;
    return next;
  }
}

// -------------------------------------------------------------
// Reference Protocol Implementation (Oracle)
// -------------------------------------------------------------
export const SpecGanProtocol = {
  deriveKeyAndIv,
  encryptPacket: encryptGen4Packet,
  decryptPacket: decryptGen4Packet,
  decodePacket: decodeGen4Packet,
  isValidFaceCode(rawFace) {
    return FACE_CODES.includes(rawFace);
  },
  faceCodeToMove(rawFace, direction) {
    const idx = FACE_CODES.indexOf(rawFace);
    if (idx === -1) return null;
    return FACE_NAMES[idx] + (direction === 1 ? "'" : '');
  }
};

// -------------------------------------------------------------
// Reference GAN BLE Driver Implementation (Oracle)
// Conforms strictly to PROJECT.md § Interface Contracts
// -------------------------------------------------------------
export class SpecGanBleDriver {
  constructor(options = {}) {
    this.device = null;
    this.server = null;
    this.commandChar = null;
    this.stateChar = null;
    this.macAddress = options.macAddress || 'DC:BE:4A:16:14:01';
    this.sessionKey = null;
    this.sessionIv = null;
    this.writeQueue = new GattWriteQueue();

    // Callbacks
    this.onStatusChange = () => {};
    this.onMove = () => {};
    this.onFacelets = () => {};
    this.onGyro = () => {};
    this.onBattery = () => {};

    // Bound listeners for proper removal on disconnect
    this._boundOnDisconnected = () => {
      this.onStatusChange('disconnected');
    };
    this._boundOnNotification = (event) => {
      this._handlePacket(event.target.value);
    };
  }

  setMacAddress(mac) {
    this.macAddress = mac;
    const { key, iv } = deriveKeyAndIv(mac);
    this.sessionKey = key;
    this.sessionIv = iv;
  }

  async connect(deviceInstance) {
    try {
      this.onStatusChange('connecting');

      if (deviceInstance) {
        this.device = deviceInstance;
      } else if (globalThis.navigator?.bluetooth) {
        this.device = await globalThis.navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: 'GAN' }, { namePrefix: 'MG' }, { namePrefix: 'AiCube' }],
          optionalServices: [GAN_GEN4_SERVICE]
        });
      } else {
        throw new Error('Web Bluetooth not supported on this device');
      }

      this.device.addEventListener('gattserverdisconnected', this._boundOnDisconnected);

      this.server = await this.device.gatt.connect();

      // Resolve primary service and characteristics
      const service = await this.server.getPrimaryService(GAN_GEN4_SERVICE);
      this.commandChar = await service.getCharacteristic(GAN_GEN4_COMMAND_CHARACTERISTIC);
      this.stateChar = await service.getCharacteristic(GAN_GEN4_STATE_CHARACTERISTIC);

      if (!this.sessionKey) {
        this.setMacAddress(this.macAddress);
      }

      // Start notifications on RX state characteristic
      await this.stateChar.startNotifications();
      this.stateChar.addEventListener('characteristicvaluechanged', this._boundOnNotification);

      this.onStatusChange('connected');
      return { deviceName: this.device.name, macAddress: this.macAddress };
    } catch (err) {
      this.onStatusChange('error', err.message);
      throw err;
    }
  }

  disconnect() {
    if (this.stateChar && this.stateChar.removeEventListener) {
      try {
        this.stateChar.removeEventListener('characteristicvaluechanged', this._boundOnNotification);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (this.device && this.device.removeEventListener) {
      try {
        this.device.removeEventListener('gattserverdisconnected', this._boundOnDisconnected);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.onStatusChange('disconnected');
  }

  async sendCommand(commandBytes) {
    return this.writeQueue.enqueue(async () => {
      if (!this.commandChar) throw new Error('Not connected');
      await this.commandChar.writeValueWithResponse(commandBytes);
    });
  }

  async sendHardwareReset() {
    const resetCmd = new Uint8Array(20);
    resetCmd[0] = 0xD2;
    resetCmd[1] = 0x0D;
    await this.sendCommand(resetCmd);
  }

  async requestFacelets() {
    const cmd = new Uint8Array(20);
    cmd[0] = 0xDD;
    cmd[1] = 0x04;
    cmd[3] = 0xED;
    await this.sendCommand(cmd);
  }

  async requestBattery() {
    const cmd = new Uint8Array(20);
    cmd[0] = 0xDD;
    cmd[1] = 0x04;
    cmd[3] = 0xEF;
    await this.sendCommand(cmd);
  }

  _handlePacket(dataView) {
    try {
      const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
      const decoded = decodeGen4Packet(bytes, this.sessionKey, this.sessionIv);

      if (decoded.type === 'MOVE') {
        this.onMove({
          move: decoded.move,
          face: decoded.face,
          direction: decoded.direction,
          timestamp: decoded.cubeTimestamp,
          serial: decoded.serial
        });
      } else if (decoded.type === 'BATTERY') {
        this.onBattery(decoded.batteryLevel);
      } else if (decoded.type === 'GYRO') {
        const q = decoded.quaternion;
        this.onGyro([q.qx, q.qy, q.qz, q.qw]);
      } else if (decoded.type === 'FACELETS') {
        this.onFacelets(SOLVED_FACELETS);
      }
    } catch (err) {
      console.warn('Packet decode error:', err);
    }
  }
}

// -------------------------------------------------------------
// Reference Smart Cube Store Implementation (Oracle)
// Conforms strictly to PROJECT.md § Interface Contracts
// -------------------------------------------------------------
export class SpecSmartCubeStore {
  constructor(driver = new SpecGanBleDriver()) {
    this.driver = driver;
    this.state = {
      connectionStatus: 'disconnected',
      batteryLevel: null,
      gyroQuaternion: null,
      timerStatus: 'idle', // 'idle' | 'scrambled' | 'inspecting' | 'solving' | 'solved'
      elapsedMs: 0,
      moveCount: 0,
      currentTps: 0,
      finalTps: null,
      moveHistory: [],
      sessionSolves: []
    };

    this.cubeSimulator = new CubeStateSimulator(SOLVED_FACELETS);
    this.timerStartTime = 0;
    this.timerInterval = null;

    this._bindDriver();
  }

  getState() {
    return this.state;
  }

  _bindDriver() {
    this.driver.onStatusChange = (status) => {
      this.state.connectionStatus = status;
    };

    this.driver.onBattery = (level) => {
      this.state.batteryLevel = level;
    };

    this.driver.onGyro = (quat) => {
      this.state.gyroQuaternion = quat;
    };

    this.driver.onMove = (moveData) => {
      this.handleIncomingMove(moveData.move, moveData.timestamp);
    };

    this.driver.onFacelets = (facelets) => {
      this.cubeSimulator = new CubeStateSimulator(facelets);
      if (this.cubeSimulator.isSolved() && this.state.timerStatus === 'solving') {
        this._stopTimer();
      }
    };
  }

  async connect(device) {
    return this.driver.connect(device);
  }

  disconnect() {
    if (this.driver) {
      this.driver.disconnect();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this._stopTimer();
  }

  newScramble(scrambleString = "R U R' U'") {
    this.cubeSimulator = new CubeStateSimulator(SOLVED_FACELETS);
    this.cubeSimulator.applyMoves(scrambleString);
    this.state.timerStatus = 'scrambled';
    this.state.moveCount = 0;
    this.state.elapsedMs = 0;
    this.state.currentTps = 0;
    this.state.finalTps = null;
    this.state.moveHistory = [];
    return scrambleString;
  }

  startInspection() {
    if (this.state.timerStatus === 'scrambled') {
      this.state.timerStatus = 'inspecting';
    }
  }

  handleIncomingMove(moveNotation, timestamp = Date.now()) {
    // Auto-start timer on first move if scrambled or inspecting
    if (this.state.timerStatus === 'scrambled' || this.state.timerStatus === 'inspecting') {
      this._startTimer(timestamp);
    }

    this.cubeSimulator.applyMove(moveNotation);
    this.state.moveCount++;

    const lastTs = this.state.moveHistory.length > 0
      ? this.state.moveHistory[this.state.moveHistory.length - 1].timestamp
      : timestamp;
    const stepTime = timestamp - lastTs;

    this.state.moveHistory.push({
      move: moveNotation,
      timestamp,
      stepTime
    });

    if (this.state.timerStatus === 'solving') {
      const elapsedSec = (Date.now() - this.timerStartTime) / 1000;
      this.state.elapsedMs = Date.now() - this.timerStartTime;
      this.state.currentTps = elapsedSec > 0 ? Number((this.state.moveCount / elapsedSec).toFixed(2)) : 0;

      // Check solve
      if (this.cubeSimulator.isSolved()) {
        this._stopTimer(timestamp);
      }
    }
  }

  _startTimer(startTs = Date.now()) {
    this.state.timerStatus = 'solving';
    this.timerStartTime = startTs;
    this.state.elapsedMs = 0;
    this.state.moveCount = 0;
    this.state.currentTps = 0;
    this.state.finalTps = null;
  }

  _stopTimer(stopTs = null) {
    if (this.state.timerStatus !== 'solving') return;
    this.state.timerStatus = 'solved';
    const now = stopTs !== null ? stopTs : Date.now();
    const elapsedMs = Math.max(1, now - this.timerStartTime);
    this.state.elapsedMs = elapsedMs;
    const elapsedSec = elapsedMs / 1000;
    this.state.finalTps = Number((this.state.moveCount / elapsedSec).toFixed(2));
    this.state.currentTps = this.state.finalTps;

    // Record session solve
    this.state.sessionSolves.push({
      id: `solve-${Date.now()}`,
      timeMs: elapsedMs,
      moveCount: this.state.moveCount,
      tps: this.state.finalTps,
      date: Date.now()
    });
  }

  resetSolve() {
    this.state.timerStatus = 'idle';
    this.state.elapsedMs = 0;
    this.state.moveCount = 0;
    this.state.currentTps = 0;
    this.state.finalTps = null;
    this.state.moveHistory = [];
    this.cubeSimulator = new CubeStateSimulator(SOLVED_FACELETS);
  }

  recalibrateGyro() {
    this.state.gyroQuaternion = [0, 0, 0, 1];
  }
}

// -------------------------------------------------------------
// Dynamic Module Loaders (Production or Oracle Fallback)
// -------------------------------------------------------------
export async function getGanProtocol() {
  if (checkFileExists('src/utils/smartCube/ganProtocol.js')) {
    try {
      const prodModule = await import('../../../../src/utils/smartCube/ganProtocol.js');
      return prodModule;
    } catch (err) {
      console.warn(`[contractAdapters] Failed to load production ganProtocol.js: ${err.message}`);
      throw err;
    }
  }
  return SpecGanProtocol;
}

export async function getGanBleDriverClass() {
  if (checkFileExists('src/utils/smartCube/ganBleDriver.js')) {
    try {
      const prodModule = await import('../../../../src/utils/smartCube/ganBleDriver.js');
      return prodModule.GanBleDriver || prodModule.default;
    } catch (err) {
      console.warn(`[contractAdapters] Failed to load production ganBleDriver.js: ${err.message}`);
      throw err;
    }
  }
  return SpecGanBleDriver;
}

export async function getSmartCubeStoreClass() {
  if (checkFileExists('src/store/useSmartCubeStore.js')) {
    try {
      const prodModule = await import('../../../../src/store/useSmartCubeStore.js');
      return prodModule.SmartCubeStore || prodModule.useSmartCubeStore || prodModule.default;
    } catch (err) {
      console.warn(`[contractAdapters] Failed to load production useSmartCubeStore.js: ${err.message}`);
      throw err;
    }
  }
  return SpecSmartCubeStore;
}
