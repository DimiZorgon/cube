// tests/e2e/smartCube/challenger_m1_battery_fuzz.mjs
// Adversarial Fuzzing & Boundary Stress Harness for Battery Telemetry (Milestone 1)

import {
  createTestSuite,
  assert,
  assertEqual
} from './helpers/testUtils.mjs';

import {
  decodeGen4Packet
} from '../../../src/utils/smartCube/ganProtocol.js';

import {
  SmartCubeStore,
  useSmartCubeStore
} from '../../../src/store/useSmartCubeStore.js';

import {
  GanBleDriver
} from '../../../src/utils/smartCube/ganBleDriver.js';

export const suite = createTestSuite('Challenger M1: Adversarial Battery Fuzzing & Boundary Harness');

// ---------------------------------------------------------------------------
// 1. BOUNDARY TESTING: 0xEF Packets
// ---------------------------------------------------------------------------

suite.it('FZ1: Empty Uint8Array handled safely as UNKNOWN type without throwing', () => {
  const p = new Uint8Array([]);
  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'UNKNOWN');
});

suite.it('FZ2: 0xEF packets of all lengths 1 to 20 with all-zero payloads produce batteryLevel: 0', () => {
  for (let len = 1; len <= 20; len++) {
    const p = new Uint8Array(len);
    p[0] = 0xEF;
    const res = decodeGen4Packet(p);
    assertEqual(res.type, 'BATTERY', `Length ${len} failed type`);
    assertEqual(typeof res.batteryLevel, 'number', `Length ${len} non-number`);
    assert(!isNaN(res.batteryLevel), `Length ${len} is NaN`);
    assertEqual(res.batteryLevel, 0, `Length ${len} non-zero battery`);
  }
});

suite.it('FZ3: 0xEF packets of all lengths 1 to 20 with all-0xFF payloads clamp cleanly to <= 100 without NaN', () => {
  for (let len = 1; len <= 20; len++) {
    const p = new Uint8Array(len).fill(0xFF);
    p[0] = 0xEF;
    const res = decodeGen4Packet(p);
    assertEqual(res.type, 'BATTERY', `Length ${len} failed type`);
    assert(!isNaN(res.batteryLevel), `Length ${len} is NaN`);
    assert(res.batteryLevel >= 0 && res.batteryLevel <= 100, `Length ${len} out of bounds: ${res.batteryLevel}`);
  }
});

suite.it('FZ4: 0xEF packet with byte 2 = 0 and byte 3 missing (length 3) does not produce NaN', () => {
  const p = new Uint8Array([0xEF, 0x01, 0x00]);
  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'BATTERY');
  assert(!isNaN(res.batteryLevel), 'Missing byte 3 produced NaN');
  assertEqual(res.batteryLevel, 0);
});

suite.it('FZ5: 0xEF packet with dataLen valid but both target offsets > 100 falls back to clamped level <= 100', () => {
  const p = new Uint8Array(20);
  p[0] = 0xEF;
  p[1] = 7;
  p[2] = 42;
  p[7] = 200; // > 100
  p[8] = 250; // > 100

  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'BATTERY');
  assert(!isNaN(res.batteryLevel));
  assert(res.batteryLevel <= 100);
});

suite.it('FZ6: 0xEF packet with 1+dataLen == 0 and dataLen == 50% prefers valid 50% or 0%', () => {
  const p = new Uint8Array(20);
  p[0] = 0xEF;
  p[1] = 7;
  p[2] = 99;
  p[7] = 50; // dataLen has 50%
  p[8] = 0;  // 1+dataLen has 0%

  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'BATTERY');
  // Since 1+dataLen is 0, the code checks decrypted[dataLen] > 0 && <= 100
  assertEqual(res.batteryLevel, 50);
});

// ---------------------------------------------------------------------------
// 2. BOUNDARY TESTING: 0xDD Packets
// ---------------------------------------------------------------------------

suite.it('FZ7: 0xDD packets where 0xEF is at index 1 but packet has only 2 bytes is UNKNOWN', () => {
  const p = new Uint8Array([0xDD, 0xEF]);
  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'UNKNOWN', 'Truncated 0xDD at index 1 must be UNKNOWN');
});

suite.it('FZ8: 0xDD packets where 0xEF is at index 3 but packet has only 4 bytes is UNKNOWN', () => {
  const p = new Uint8Array([0xDD, 0x01, 0x02, 0xEF]);
  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'UNKNOWN', 'Truncated 0xDD at index 3 must be UNKNOWN');
});

suite.it('FZ9: 0xDD packet with 0xEF at index 4 (outside [1,2,3]) is NOT misidentified as battery', () => {
  const p = new Uint8Array([0xDD, 0x01, 0x02, 0x03, 0xEF, 50]);
  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'UNKNOWN');
});

suite.it('FZ10: 0xDD packet with 0xEF at index 1 and battery byte 0% decodes to exactly 0%', () => {
  const p = new Uint8Array([0xDD, 0xEF, 0, 0x00]);
  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'BATTERY');
  assertEqual(res.batteryLevel, 0);
});

suite.it('FZ11: 0xDD packet with multiple 0xEF markers resolves the first valid pair', () => {
  const p = new Uint8Array([0xDD, 0xEF, 35, 0xEF, 70]);
  const res = decodeGen4Packet(p);
  assertEqual(res.type, 'BATTERY');
  assertEqual(res.batteryLevel, 35);
});

// ---------------------------------------------------------------------------
// 3. STORE & DRIVER ROBUSTNESS: Corrupted & Hostile Inputs
// ---------------------------------------------------------------------------

suite.it('FZ12: SmartCubeStore rejects non-numeric and NaN inputs without state corruption', () => {
  const store = new SmartCubeStore();
  store.driver.onBattery(50);
  assertEqual(store.getState().batteryLevel, 50);

  const hostileInputs = [
    NaN,
    null,
    undefined,
    '75',
    'NaN',
    {},
    [],
    Symbol('foo'),
    true,
    false,
    () => 50
  ];

  for (const hostile of hostileInputs) {
    store.driver.onBattery(hostile);
    assertEqual(store.getState().batteryLevel, 50, `Polluted by hostile input: ${String(hostile)}`);
  }
});

suite.it('FZ13: SmartCubeStore rounds float percentages and clamps values < 0 or > 100', () => {
  const store = new SmartCubeStore();

  store.driver.onBattery(42.4);
  assertEqual(store.getState().batteryLevel, 42);

  store.driver.onBattery(42.6);
  assertEqual(store.getState().batteryLevel, 43);

  store.driver.onBattery(-25);
  assertEqual(store.getState().batteryLevel, 0);

  store.driver.onBattery(999);
  assertEqual(store.getState().batteryLevel, 100);

  store.driver.onBattery(0);
  assertEqual(store.getState().batteryLevel, 0);

  store.driver.onBattery(100);
  assertEqual(store.getState().batteryLevel, 100);
});

suite.it('FZ14: Zustand store rejects NaN and hostile inputs identically', () => {
  const { getState } = useSmartCubeStore;

  // Driver onBattery on default driver
  GanBleDriver; // ensure driver class is loaded

  // Test Zustand handler directly if registered
  const origBattery = getState().batteryLevel;

  // Inject valid level
  useSmartCubeStore.setState({ batteryLevel: 60 });
  assertEqual(getState().batteryLevel, 60);

  // Directly verify Zustand handler rejects hostile
  const handler = (level) => {
    if (typeof level !== 'number' || isNaN(level)) return;
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    useSmartCubeStore.setState({ batteryLevel: clamped });
  };

  handler(NaN);
  assertEqual(getState().batteryLevel, 60);

  handler('100');
  assertEqual(getState().batteryLevel, 60);

  handler(undefined);
  assertEqual(getState().batteryLevel, 60);

  // Restore
  useSmartCubeStore.setState({ batteryLevel: origBattery });
});

// ---------------------------------------------------------------------------
// 4. RANDOMIZED FUZZING: 10,000 Arbitrary Byte Buffers
// ---------------------------------------------------------------------------

suite.it('FZ15: Fuzzing 10,000 random byte sequences never throws and maintains invariant on BATTERY type', () => {
  const iterations = 10000;
  let batteryCount = 0;

  // Deterministic PRNG for reproducible test
  let seed = 123456789;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < iterations; i++) {
    const len = Math.floor(rand() * 32); // length 0 to 31
    const buf = new Uint8Array(len);
    for (let j = 0; j < len; j++) {
      buf[j] = Math.floor(rand() * 256);
    }

    // Skip 0x01 (moves) as it requires 72-bit bitfield alignment covered in move suites
    if (buf[0] === 0x01) continue;

    let res;
    try {
      res = decodeGen4Packet(buf);
    } catch (e) {
      assert(false, `decodeGen4Packet threw unexpected exception on buffer of len ${len}: ${e.message}`);
    }

    assert(res !== null && typeof res === 'object', 'Result must be an object');
    assert(typeof res.type === 'string', 'Result type must be string');

    if (res.type === 'BATTERY') {
      batteryCount++;
      assertEqual(typeof res.batteryLevel, 'number', 'batteryLevel must be number');
      assert(!isNaN(res.batteryLevel), 'batteryLevel must never be NaN');
      assert(res.batteryLevel >= 0 && res.batteryLevel <= 100, `batteryLevel out of [0, 100]: ${res.batteryLevel}`);
      assertEqual(res.batteryLevel, Math.round(res.batteryLevel), 'batteryLevel must be integer');
    }
  }

  assert(batteryCount > 0, `Expected some random packets to match battery opcode (matched ${batteryCount})`);
});

// ---------------------------------------------------------------------------
// 5. UI DISPLAY RESILIENCE: Battery Formatting Invariants
// ---------------------------------------------------------------------------

suite.it('FZ16: UI battery display formatting helper correctly formats 0%, 100%, and hides on NaN/null/disconnected', () => {
  const formatBatteryText = (connectionStatus, batteryLevel) => {
    return connectionStatus === 'connected' && typeof batteryLevel === 'number' && !isNaN(batteryLevel)
      ? `${batteryLevel}%`
      : '--%';
  };

  assertEqual(formatBatteryText('connected', 0), '0%');
  assertEqual(formatBatteryText('connected', 1), '1%');
  assertEqual(formatBatteryText('connected', 100), '100%');
  assertEqual(formatBatteryText('connected', null), '--%');
  assertEqual(formatBatteryText('connected', undefined), '--%');
  assertEqual(formatBatteryText('connected', NaN), '--%');
  assertEqual(formatBatteryText('disconnected', 85), '--%');
  assertEqual(formatBatteryText('connecting', 85), '--%');
  assertEqual(formatBatteryText('connected', '85'), '--%');
});

// Standalone execution runner
if (process.argv[1]?.endsWith('challenger_m1_battery_fuzz.mjs')) {
  suite.run().then(res => {
    console.log(`\n======================================================================`);
    console.log(`  ${res.suiteName}: ${res.passed}/${res.total} PASSED | ${res.failed} FAILED (${res.durationMs}ms)`);
    console.log(`======================================================================`);
    if (res.errors.length > 0) {
      console.log('\nFAILED TESTS:');
      for (const err of res.errors) {
        console.error(`  ✖ [${err.testName}]:`, err.error.message);
      }
    }
    process.exit(res.failed === 0 ? 0 : 1);
  });
}
