// tests/e2e/smartCube/mocks/mockWebBluetooth.mjs
// Full Web Bluetooth standard mock harness conforming to W3C Web Bluetooth specifications.

class EventEmitterTarget {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, listener) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    if (this._listeners.has(type)) {
      this._listeners.get(type).delete(listener);
    }
  }

  dispatchEvent(event) {
    const listeners = this._listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent(event);
          }
        } catch (err) {
          console.error(`Error in event listener for ${event.type}:`, err);
        }
      }
    }
    return true;
  }
}

export class MockBluetoothRemoteGATTCharacteristic extends EventEmitterTarget {
  constructor(uuid, service, properties = { read: true, write: true, notify: true }) {
    super();
    this.uuid = uuid.toLowerCase();
    this.service = service;
    this.properties = properties;
    this.value = null;
    this._notificationsActive = false;
    this._writeHandler = null;
    this._concurrentWriteLocked = false;
  }

  setWriteHandler(fn) {
    this._writeHandler = fn;
  }

  async readValue() {
    if (!this.service?.device?.gatt?.connected) {
      throw new Error('NetworkError: GATT Server is disconnected');
    }
    return this.value;
  }

  async writeValueWithResponse(data) {
    if (!this.service?.device?.gatt?.connected) {
      throw new Error('NetworkError: GATT Server is disconnected');
    }
    if (this._concurrentWriteLocked) {
      throw new Error('NetworkError: GATT operation already in progress');
    }

    this._concurrentWriteLocked = true;
    try {
      const bytes = data instanceof Uint8Array
        ? data
        : new Uint8Array(data.buffer || data);

      if (this._writeHandler) {
        await this._writeHandler(bytes);
      }
      this.value = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    } finally {
      this._concurrentWriteLocked = false;
    }
  }

  async writeValueWithoutResponse(data) {
    return this.writeValueWithResponse(data);
  }

  async startNotifications() {
    if (!this.service?.device?.gatt?.connected) {
      throw new Error('NetworkError: GATT Server is disconnected');
    }
    this._notificationsActive = true;
    return this;
  }

  async stopNotifications() {
    this._notificationsActive = false;
    return this;
  }

  emitValueNotification(uint8Array) {
    if (!this._notificationsActive) return;
    const arrayBuffer = uint8Array.buffer.slice(
      uint8Array.byteOffset,
      uint8Array.byteOffset + uint8Array.byteLength
    );
    this.value = new DataView(arrayBuffer);

    const event = {
      type: 'characteristicvaluechanged',
      target: this,
      currentTarget: this
    };
    this.dispatchEvent(event);
  }
}

export class MockBluetoothRemoteGATTService {
  constructor(uuid, device, isPrimary = true) {
    this.uuid = uuid.toLowerCase();
    this.device = device;
    this.isPrimary = isPrimary;
    this._characteristics = new Map();
  }

  addCharacteristic(char) {
    this._characteristics.set(char.uuid.toLowerCase(), char);
  }

  async getCharacteristic(uuid) {
    const key = uuid.toLowerCase();
    const char = this._characteristics.get(key);
    if (!char) {
      throw new Error(`NotFoundError: Characteristic ${uuid} not found on service ${this.uuid}`);
    }
    return char;
  }

  async getCharacteristics() {
    return Array.from(this._characteristics.values());
  }
}

export class MockBluetoothRemoteGATTServer {
  constructor(device) {
    this.device = device;
    this.connected = false;
    this._services = new Map();
  }

  addService(service) {
    this._services.set(service.uuid.toLowerCase(), service);
  }

  async connect() {
    this.connected = true;
    return this;
  }

  disconnect() {
    if (this.connected) {
      this.connected = false;
      const event = {
        type: 'gattserverdisconnected',
        target: this.device,
        currentTarget: this.device
      };
      this.device.dispatchEvent(event);
    }
  }

  async getPrimaryService(uuid) {
    if (!this.connected) {
      throw new Error('NetworkError: GATT Server is disconnected');
    }
    const key = uuid.toLowerCase();
    const service = this._services.get(key);
    if (!service) {
      throw new Error(`NotFoundError: Service ${uuid} not found`);
    }
    return service;
  }

  async getPrimaryServices() {
    if (!this.connected) {
      throw new Error('NetworkError: GATT Server is disconnected');
    }
    return Array.from(this._services.values());
  }
}

export class MockBluetoothDevice extends EventEmitterTarget {
  constructor(id, name, manufacturerData = null) {
    super();
    this.id = id;
    this.name = name;
    this.gatt = new MockBluetoothRemoteGATTServer(this);
    this.manufacturerData = manufacturerData;
    this.watchingAdvertisements = false;
  }

  async watchAdvertisements() {
    this.watchingAdvertisements = true;
  }

  emitAdvertisement(dataMap) {
    const event = {
      type: 'advertisementreceived',
      device: this,
      manufacturerData: dataMap || this.manufacturerData || new Map()
    };
    this.dispatchEvent(event);
  }
}

export class MockWebBluetooth extends EventEmitterTarget {
  constructor() {
    super();
    this._availableDevices = [];
    this._available = true;
    this._pairingRejectionReason = null;
  }

  setAvailable(flag) {
    this._available = flag;
  }

  registerDevice(device) {
    this._availableDevices.push(device);
  }

  setNextPairingRejection(error) {
    this._pairingRejectionReason = error;
  }

  async getAvailability() {
    return this._available;
  }

  async requestDevice(options = {}) {
    if (this._pairingRejectionReason) {
      const err = this._pairingRejectionReason;
      this._pairingRejectionReason = null;
      throw err;
    }

    if (!options.filters && !options.acceptAllDevices) {
      throw new TypeError("Failed to execute 'requestDevice': Must specify filters or acceptAllDevices");
    }

    // Filter devices based on name, namePrefix, services
    const matched = this._availableDevices.find(dev => {
      if (options.acceptAllDevices) return true;
      if (!options.filters) return false;

      return options.filters.some(filter => {
        if (filter.name && dev.name === filter.name) return true;
        if (filter.namePrefix && dev.name && dev.name.startsWith(filter.namePrefix)) return true;
        if (filter.services && Array.isArray(filter.services)) {
          const hasSvc = filter.services.some(s => dev.gatt._services.has(s.toLowerCase()));
          if (hasSvc) return true;
        }
        return false;
      });
    });

    if (!matched) {
      throw new Error('NotFoundError: User cancelled the requestDevice() chooser');
    }

    return matched;
  }
}

let originalNavigatorBluetooth = null;
let originalNavigator = null;

export function installMockWebBluetooth(mock = new MockWebBluetooth()) {
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = {};
  }
  originalNavigatorBluetooth = globalThis.navigator.bluetooth;
  globalThis.navigator.bluetooth = mock;
  return mock;
}

export function uninstallMockWebBluetooth() {
  if (globalThis.navigator) {
    globalThis.navigator.bluetooth = originalNavigatorBluetooth;
  }
}
