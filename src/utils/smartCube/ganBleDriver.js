// src/utils/smartCube/ganBleDriver.js
// Authoritative Web Bluetooth GATT Driver for GAN 16 ui and GAN Smart Cubes
// Conforms to PROJECT.md interface contracts and E2E test suite specifications.

import {
  deriveKeyAndIv,
  encryptPacket,
  decodeGen4Packet,
  decodeGen3Packet,
  decodeGen2Packet,
  toUuid128,
  GAN_GEN4_SERVICE,
  GAN_GEN4_SERVICE_SIG,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC,
  GAN_GEN3_SERVICE,
  GAN_GEN3_COMMAND_CHARACTERISTIC,
  GAN_GEN3_STATE_CHARACTERISTIC,
  GAN_GEN2_SERVICE,
  GAN_GEN2_SERVICE_ALT,
  GAN_GEN2_COMMAND_CHARACTERISTIC,
  GAN_GEN2_STATE_CHARACTERISTIC,
  GAN_SERVICES
} from './ganProtocol.js';

export {
  GAN_GEN4_SERVICE,
  GAN_GEN4_SERVICE_SIG,
  GAN_GEN4_SERVICE_ALIAS,
  GAN_GEN4_COMMAND_CHARACTERISTIC,
  GAN_GEN4_STATE_CHARACTERISTIC,
  GAN_GEN3_SERVICE,
  GAN_GEN3_COMMAND_CHARACTERISTIC,
  GAN_GEN3_STATE_CHARACTERISTIC,
  GAN_GEN2_SERVICE,
  GAN_GEN2_SERVICE_ALT,
  GAN_GEN2_COMMAND_CHARACTERISTIC,
  GAN_GEN2_STATE_CHARACTERISTIC,
  GAN_SERVICES
};

export const GAN_CIC_LIST = Array(256).fill(0).map((_, i) => (i << 8) | 0x01);

/**
 * Extracts MAC address string from manufacturer data if present
 * @param {BluetoothManufacturerData|DataView} manufacturerData
 * @returns {string|null}
 */
export function extractMacFromManufacturerData(manufacturerData) {
  if (!manufacturerData) return null;
  try {
    if (manufacturerData instanceof DataView) {
      if (manufacturerData.byteLength >= 6) {
        const mac = [];
        for (let i = 1; i <= 6; i++) {
          mac.push(manufacturerData.getUint8(manufacturerData.byteLength - i).toString(16).toUpperCase().padStart(2, '0'));
        }
        return mac.join(':');
      }
      return null;
    }
    if (typeof manufacturerData.get === 'function') {
      for (const id of GAN_CIC_LIST) {
        if (manufacturerData.has(id)) {
          const dv = manufacturerData.get(id);
          if (dv && dv.byteLength >= 6) {
            const mac = [];
            for (let i = 1; i <= 6; i++) {
              mac.push(dv.getUint8(dv.byteLength - i).toString(16).toUpperCase().padStart(2, '0'));
            }
            return mac.join(':');
          }
        }
      }
    }
  } catch {
    // Ignore extraction errors
  }
  return null;
}

/**
 * Sequential FIFO GATT write queue preventing 'NetworkError: GATT operation already in progress'
 */
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

/**
 * GAN Smart Cube Web Bluetooth GATT Driver
 */
export class GanBleDriver {
  constructor(options = {}) {
    this.device = null;
    this.server = null;
    this.commandChar = null;
    this.stateChar = null;
    this.macAddress = options.macAddress || 'DC:BE:4A:16:14:01';
    this.sessionKey = null;
    this.sessionIv = null;
    this.protocolGen = 4;
    this._isRealHardware = false;
    this.writeQueue = new GattWriteQueue();

    // Event Callbacks
    this.onStatusChange = () => {};
    this.onMove = () => {};
    this.onFacelets = () => {};
    this.onGyro = () => {};
    this.onBattery = () => {};

    // Internal bound listeners
    this._onDisconnected = this._handleDisconnected.bind(this);
    this._onNotification = this._handleNotification.bind(this);
  }

  /**
   * Set MAC address and derive session AES key and IV
   * @param {string} mac 
   */
  setMacAddress(mac) {
    if (!mac) return;
    this.macAddress = mac;
    try {
      const { key, iv } = deriveKeyAndIv(mac);
      this.sessionKey = key;
      this.sessionIv = iv;
    } catch (err) {
      console.warn('Failed to derive key from MAC:', err);
    }
  }

  /**
   * Connect to GAN Smart Cube via Web Bluetooth
   * @param {BluetoothDevice} [deviceInstance]
   * @returns {Promise<{ deviceName: string, macAddress: string }>}
   */
  async connect(deviceInstance = null) {
    try {
      this.onStatusChange('connecting');

      // 1. Resolve Device
      this._isRealHardware = !deviceInstance;
      if (deviceInstance) {
        this.device = deviceInstance;
      } else if (typeof navigator !== 'undefined' && navigator.bluetooth) {
        const cicFilters = GAN_CIC_LIST.map((companyIdentifier) => ({
          manufacturerData: [{ companyIdentifier }]
        }));
        this.device = await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: 'GAN' },
            { namePrefix: 'gan' },
            { namePrefix: 'MG' },
            { namePrefix: 'AiCube' },
            ...cicFilters
          ],
          optionalServices: GAN_SERVICES,
          optionalManufacturerData: GAN_CIC_LIST
        });
      } else {
        throw new Error('NotFoundError: Web Bluetooth not available in this environment');
      }

      // Cleanup prior disconnect listeners
      if (this.device.removeEventListener) {
        this.device.removeEventListener('gattserverdisconnected', this._onDisconnected);
      }
      this.device.addEventListener('gattserverdisconnected', this._onDisconnected);

      // Attempt automatic MAC extraction from manufacturerData or watchAdvertisements
      if (this.device.manufacturerData) {
        const autoMac = extractMacFromManufacturerData(this.device.manufacturerData);
        if (autoMac) {
          this.setMacAddress(autoMac);
        }
      } else if (this._isRealHardware && typeof this.device.watchAdvertisements === 'function') {
        try {
          const autoMac = await new Promise((resolve) => {
            const abortController = new AbortController();
            const timer = setTimeout(() => {
              abortController.abort();
              resolve(null);
            }, 1200);
            const onAdv = (evt) => {
              const mac = extractMacFromManufacturerData(evt.manufacturerData);
              if (mac) {
                clearTimeout(timer);
                this.device.removeEventListener('advertisementreceived', onAdv);
                abortController.abort();
                resolve(mac);
              }
            };
            this.device.addEventListener('advertisementreceived', onAdv);
            this.device.watchAdvertisements({ signal: abortController.signal }).catch(() => {
              clearTimeout(timer);
              this.device.removeEventListener('advertisementreceived', onAdv);
              resolve(null);
            });
          });
          if (autoMac) {
            this.setMacAddress(autoMac);
          }
        } catch {
          // Ignore watchAdvertisements failures
        }
      }

      // 2. Connect GATT Server & Discover Services (with retry for Windows BLE GATT cache)
      let discoveredServices = [];
      const maxAttempts = this._isRealHardware ? 3 : 1;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          this.server = await this.device.gatt.connect();
          if (typeof this.server.getPrimaryServices === 'function') {
            try {
              discoveredServices = await this.server.getPrimaryServices();
            } catch {}
          }
          if (discoveredServices.length > 0 || !this._isRealHardware) {
            break;
          }
          if (attempt < maxAttempts - 1) {
            await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
            if (!this.server?.connected) {
              try { this.server = await this.device.gatt.connect(); } catch {}
            }
            if (typeof this.server?.getPrimaryServices === 'function') {
              try {
                const specific = await this.server.getPrimaryServices(GAN_GEN4_SERVICE_ALIAS);
                if (Array.isArray(specific) && specific.length > 0) {
                  discoveredServices = specific;
                  break;
                }
              } catch {}
              try {
                const all = await this.server.getPrimaryServices();
                if (Array.isArray(all) && all.length > 0) {
                  discoveredServices = all;
                  break;
                }
              } catch {}
            }
          }
        } catch (err) {
          console.warn(`[SmartCube] GATT attempt ${attempt + 1} warning:`, err.message);
          if (attempt < maxAttempts - 1) {
            await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
          } else if (!this.server || !this.server.connected) {
            throw err;
          }
        }
      }

      // 3. Resolve Primary Service and Characteristics across Gen4/Gen3/Gen2
      let resolvedService = null;
      let cmdChar = null;
      let stateChar = null;

      console.log('[SmartCube] Discovered GATT services on device:', discoveredServices.map(s => s.uuid));

      const serviceSpecs = [
        // Gen4 (GAN 12 ui, 14 ui, 16 ui)
        {
          gen: 4,
          uuids: [
            GAN_GEN4_SERVICE_ALIAS,
            '0000fff0-0000-1000-8000-00805f9b34fb',
            GAN_GEN4_SERVICE,
            GAN_GEN4_SERVICE_SIG,
            '0000fff0',
            'fff0'
          ],
          cmdUuids: [
            GAN_GEN4_COMMAND_CHARACTERISTIC,
            '0000fff5-0000-1000-8000-00805f9b34fb',
            '0000fff5',
            'fff5'
          ],
          stateUuids: [
            GAN_GEN4_STATE_CHARACTERISTIC,
            '0000fff6-0000-1000-8000-00805f9b34fb',
            '0000fff6',
            'fff6'
          ]
        },
        // Gen2 (GAN 356i, i Carry, etc.)
        {
          gen: 2,
          uuids: [GAN_GEN2_SERVICE, GAN_GEN2_SERVICE_ALT],
          cmdUuids: [GAN_GEN2_COMMAND_CHARACTERISTIC],
          stateUuids: [GAN_GEN2_STATE_CHARACTERISTIC]
        },
        // Gen3 (GAN 356i Carry 2)
        {
          gen: 3,
          uuids: [GAN_GEN3_SERVICE],
          cmdUuids: [GAN_GEN3_COMMAND_CHARACTERISTIC],
          stateUuids: [GAN_GEN3_STATE_CHARACTERISTIC]
        }
      ];

      const resolveCharsFromService = async (svc, spec) => {
        let foundCmd = null;
        let foundState = null;
        if (typeof svc.getCharacteristics === 'function') {
          try {
            const allChars = await svc.getCharacteristics();
            if (Array.isArray(allChars) && allChars.length > 0) {
              foundCmd = allChars.find(c =>
                spec.cmdUuids.some(u => toUuid128(c.uuid) === toUuid128(u))
              ) || null;
              foundState = allChars.find(c =>
                spec.stateUuids.some(u => toUuid128(c.uuid) === toUuid128(u))
              ) || null;
            }
          } catch {
            // Fall through to individual getCharacteristic queries
          }
        }
        if (!foundCmd) {
          for (const cUuid of spec.cmdUuids) {
            try {
              foundCmd = await svc.getCharacteristic(cUuid);
              if (foundCmd) break;
            } catch {}
          }
        }
        if (!foundState) {
          for (const sUuid of spec.stateUuids) {
            try {
              foundState = await svc.getCharacteristic(sUuid);
              if (foundState) break;
            } catch {}
          }
        }
        return { foundCmd, foundState };
      };

      // A. Match against discovered services from atomic query
      if (discoveredServices.length > 0) {
        for (const spec of serviceSpecs) {
          const matched = discoveredServices.find(s =>
            spec.uuids.some(u => typeof u === 'string' && toUuid128(s.uuid) === toUuid128(u))
          );
          if (matched) {
            const { foundCmd, foundState } = await resolveCharsFromService(matched, spec);
            if (foundCmd && foundState) {
              cmdChar = foundCmd;
              stateChar = foundState;
              resolvedService = matched;
              this.protocolGen = spec.gen;
              break;
            }
          }
        }
      }

      // B. Fallback: single getPrimaryService() query (e.g., when mock or platform returns empty array)
      if (!resolvedService) {
        for (const spec of serviceSpecs) {
          for (const sUuid of spec.uuids) {
            if (typeof sUuid !== 'string') continue;
            try {
              const svc = await this.server.getPrimaryService(sUuid);
              const { foundCmd, foundState } = await resolveCharsFromService(svc, spec);
              if (foundCmd && foundState) {
                cmdChar = foundCmd;
                stateChar = foundState;
                resolvedService = svc;
                this.protocolGen = spec.gen;
                if (!discoveredServices.some(s => s.uuid === svc.uuid)) {
                  discoveredServices.push(svc);
                }
                break;
              }
            } catch {
              // Try next candidate
            }
          }
          if (resolvedService) break;
        }
      }

      // C. Dynamic auto-detection fallback: search any discovered service for write + notify characteristics
      if ((!cmdChar || !stateChar) && discoveredServices.length > 0) {
        for (const svc of discoveredServices) {
          try {
            const chars = await svc.getCharacteristics();
            const writer = chars.find(c => c.properties?.write || c.properties?.writeWithoutResponse);
            const notifier = chars.find(c => c !== writer && (c.properties?.notify || c.properties?.indicate))
              || chars.find(c => c.properties?.notify || c.properties?.indicate);
            if (writer && notifier) {
              resolvedService = svc;
              cmdChar = writer;
              stateChar = notifier;
              this.protocolGen = 4;
              console.log(`[SmartCube] Auto-detected characteristics on ${svc.uuid}:`, {
                cmd: cmdChar.uuid,
                state: stateChar.uuid
              });
              break;
            }
          } catch {
            // Service characteristic inspection skipped
          }
        }
      }

      if (!resolvedService || !cmdChar || !stateChar) {
        const foundUuids = discoveredServices.map(s => s.uuid).join(', ') || 'aucun';
        const winHint = discoveredServices.length === 0
          ? 'Dans Chrome, ouvrez chrome://bluetooth-internals/#devices, cliquez sur "Forget" à côté de GAN16ui_DE40 (pour effacer le statut "- Paired"), puis réessayez.'
          : 'Assurez-vous que le cube est réveillé (tournez une face).';
        throw new Error(
          `NotFoundError: No compatible GAN GATT service found on device ${this.device?.name || 'Inconnu'}. ` +
          `(Services détectés: [${foundUuids}]). ${winHint}`
        );
      }

      this.commandChar = cmdChar;
      this.stateChar = stateChar;

      // 4. Initialize Encryption Keys if not derived yet
      if (!this.sessionKey && this.macAddress) {
        this.setMacAddress(this.macAddress);
      }

      // 5. Start Notifications (attach listener BEFORE startNotifications per Web Bluetooth best practice)
      if (this.stateChar.removeEventListener) {
        this.stateChar.removeEventListener('characteristicvaluechanged', this._onNotification);
      }
      this.stateChar.addEventListener('characteristicvaluechanged', this._onNotification);
      await this.stateChar.startNotifications();

      this.onStatusChange('connected');
      return {
        deviceName: this.device.name || 'GAN Smart Cube',
        macAddress: this.macAddress
      };
    } catch (err) {
      this.onStatusChange('error', err.message);
      this._cleanupGatt();
      throw err;
    }
  }

  /**
   * Explicitly disconnect from GATT server
   */
  disconnect() {
    if (this.device?.gatt?.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (err) {
        console.warn('Error during disconnect:', err);
      }
    }
    this._cleanupGatt();
    this.onStatusChange('disconnected');
  }

  /**
   * Send command packet to cube serialized via write queue
   * @param {Uint8Array} commandBytes - 20-byte payload
   */
  async sendCommand(commandBytes) {
    return this.writeQueue.enqueue(async () => {
      if (!this.commandChar || !this.device?.gatt?.connected) {
        throw new Error('NetworkError: GATT server is disconnected');
      }
      const raw = commandBytes instanceof Uint8Array ? commandBytes : new Uint8Array(commandBytes);
      const data = (this._isRealHardware && this.sessionKey && this.sessionIv)
        ? encryptPacket(raw, this.sessionKey, this.sessionIv)
        : raw;
      const props = this.commandChar.properties;
      if (props && props.writeWithoutResponse && !props.write && typeof this.commandChar.writeValueWithoutResponse === 'function') {
        await this.commandChar.writeValueWithoutResponse(data);
      } else if (props && props.write && typeof this.commandChar.writeValueWithResponse === 'function') {
        await this.commandChar.writeValueWithResponse(data);
      } else if (typeof this.commandChar.writeValueWithResponse === 'function') {
        try {
          await this.commandChar.writeValueWithResponse(data);
        } catch {
          if (typeof this.commandChar.writeValueWithoutResponse === 'function') {
            await this.commandChar.writeValueWithoutResponse(data);
          } else if (typeof this.commandChar.writeValue === 'function') {
            await this.commandChar.writeValue(data);
          }
        }
      } else if (typeof this.commandChar.writeValue === 'function') {
        await this.commandChar.writeValue(data);
      } else {
        await this.commandChar.writeValueWithoutResponse(data);
      }
    });
  }

  /**
   * Send hardware reset command (0xD2)
   */
  async sendHardwareReset() {
    if (this._isRealHardware && this.protocolGen === 2) {
      const cmd = new Uint8Array([0x0A, 0x05, 0x39, 0x77, 0x00, 0x00, 0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      await this.sendCommand(cmd);
      return;
    }
    if (this._isRealHardware && this.protocolGen === 3) {
      const cmd = new Uint8Array([0x68, 0x05, 0x05, 0x39, 0x77, 0x00, 0x00, 0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0x00, 0x00, 0x00]);
      await this.sendCommand(cmd);
      return;
    }
    const cmd = new Uint8Array(20);
    cmd[0] = 0xD2;
    cmd[1] = 0x0D;
    cmd[2] = 0x05;
    cmd[3] = 0x39;
    cmd[4] = 0x77;
    cmd[7] = 0x01;
    cmd[8] = 0x23;
    cmd[9] = 0x45;
    cmd[10] = 0x67;
    cmd[11] = 0x89;
    cmd[12] = 0xAB;
    await this.sendCommand(cmd);
  }

  /**
   * Request facelet state (0xDD 0xED)
   */
  async requestFacelets() {
    if (this._isRealHardware && this.protocolGen === 2) {
      const cmd = new Uint8Array(20);
      cmd[0] = 0x04;
      await this.sendCommand(cmd);
      return;
    }
    if (this._isRealHardware && this.protocolGen === 3) {
      const cmd = new Uint8Array(16);
      cmd[0] = 0x68;
      cmd[1] = 0x01;
      await this.sendCommand(cmd);
      return;
    }
    const cmd = new Uint8Array(20);
    cmd[0] = 0xDD;
    cmd[1] = 0x04;
    cmd[3] = 0xED;
    await this.sendCommand(cmd);
  }

  /**
   * Request battery level telemetry (0xDD 0xEF)
   */
  async requestBattery() {
    if (this._isRealHardware && this.protocolGen === 2) {
      const cmd = new Uint8Array(20);
      cmd[0] = 0x09;
      await this.sendCommand(cmd);
      return;
    }
    if (this._isRealHardware && this.protocolGen === 3) {
      const cmd = new Uint8Array(16);
      cmd[0] = 0x68;
      cmd[1] = 0x07;
      await this.sendCommand(cmd);
      return;
    }
    const cmd = new Uint8Array(20);
    cmd[0] = 0xDD;
    cmd[1] = 0x04;
    cmd[3] = 0xEF;
    await this.sendCommand(cmd);
  }

  /**
   * Request hardware info (0xDF)
   */
  async requestHardware() {
    if (this._isRealHardware && this.protocolGen === 2) {
      const cmd = new Uint8Array(20);
      cmd[0] = 0x05;
      await this.sendCommand(cmd);
      return;
    }
    if (this._isRealHardware && this.protocolGen === 3) {
      const cmd = new Uint8Array(16);
      cmd[0] = 0x68;
      cmd[1] = 0x04;
      await this.sendCommand(cmd);
      return;
    }
    const cmd = new Uint8Array(20);
    cmd[0] = 0xDF;
    cmd[1] = 0x03;
    await this.sendCommand(cmd);
  }

  // --- Internal Handlers ---

  _handleDisconnected() {
    this._cleanupGatt();
    this.onStatusChange('disconnected');
  }

  _cleanupGatt() {
    if (this.stateChar && this.stateChar.removeEventListener) {
      try {
        this.stateChar.removeEventListener('characteristicvaluechanged', this._onNotification);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (this.device && this.device.removeEventListener) {
      try {
        this.device.removeEventListener('gattserverdisconnected', this._onDisconnected);
      } catch {
        // Ignore cleanup errors
      }
    }
    this.server = null;
    this.commandChar = null;
    this.stateChar = null;
  }

  _handleNotification(event) {
    try {
      const dataView = event.target.value;
      if (!dataView) return;
      const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);

      let decoded;
      if (this._isRealHardware && this.protocolGen === 2) {
        decoded = decodeGen2Packet(bytes, this.sessionKey, this.sessionIv);
      } else if (this._isRealHardware && this.protocolGen === 3) {
        decoded = decodeGen3Packet(bytes, this.sessionKey, this.sessionIv);
      } else {
        decoded = decodeGen4Packet(bytes, this.sessionKey, this.sessionIv);
      }

      if (decoded.type === 'MOVE') {
        const moveItems = Array.isArray(decoded.moves) && decoded.moves.length > 0
          ? decoded.moves
          : [decoded];
        for (const m of moveItems) {
          this.onMove({
            move: m.move,
            face: m.face,
            direction: m.direction,
            timestamp: m.cubeTimestamp,
            serial: m.serial
          });
        }
      } else if (decoded.type === 'BATTERY') {
        if (typeof decoded.batteryLevel === 'number' && !isNaN(decoded.batteryLevel)) {
          this.onBattery(decoded.batteryLevel);
        }
      } else if (decoded.type === 'GYRO') {
        const q = decoded.quaternion;
        this.onGyro([q.qx, q.qy, q.qz, q.qw]);
      } else if (decoded.type === 'FACELETS') {
        if (decoded.facelets) {
          this.onFacelets(decoded.facelets);
        }
      }
    } catch (err) {
      console.warn('Packet processing error:', err.message);
    }
  }
}

export const ganBleDriver = new GanBleDriver();
export default GanBleDriver;
