// tests/e2e/smartCube/adversarial_challenge.mjs
// Adversarial challenge script for Milestone 5 Phase 1 Iteration 2
// Challenger 1: Empirical verification of production useSmartCubeStore.js and ganProtocol.js

import assert from 'node:assert/strict';
import { SmartCubeStore, useSmartCubeStore } from '../../../src/store/useSmartCubeStore.js';
import * as ganProtocol from '../../../src/utils/smartCube/ganProtocol.js';
import { VirtualGanCube } from './mocks/virtualGanCube.mjs';

console.log('====================================================');
console.log(' ADVERSARIAL CHALLENGE HARNESS: M5 Phase 1 Iteration 2');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

// ---------------------------------------------------------------------------
// SUITE 1: ganProtocol.js Production Verification
// ---------------------------------------------------------------------------
console.log('--- Suite 1: ganProtocol.js Production Exports & Bitstream Decoding ---');

runTest('P1.1: Production ganProtocol exports command arrays without freeze TypeError', () => {
  assert(ganProtocol.COMMAND_REQUEST_FACELETS instanceof Uint8Array, 'COMMAND_REQUEST_FACELETS must be Uint8Array');
  assert.equal(ganProtocol.COMMAND_REQUEST_FACELETS.length, 20);
  assert.equal(ganProtocol.COMMAND_REQUEST_FACELETS[0], 0xDD);
  assert.equal(ganProtocol.COMMAND_REQUEST_FACELETS[3], 0xED);

  assert(ganProtocol.COMMAND_REQUEST_BATTERY instanceof Uint8Array, 'COMMAND_REQUEST_BATTERY must be Uint8Array');
  assert.equal(ganProtocol.COMMAND_REQUEST_BATTERY.length, 20);
  assert.equal(ganProtocol.COMMAND_REQUEST_BATTERY[0], 0xDD);
  assert.equal(ganProtocol.COMMAND_REQUEST_BATTERY[3], 0xEF);

  assert(ganProtocol.COMMAND_REQUEST_HARDWARE instanceof Uint8Array, 'COMMAND_REQUEST_HARDWARE must be Uint8Array');
  assert.equal(ganProtocol.COMMAND_REQUEST_HARDWARE.length, 20);
  assert.equal(ganProtocol.COMMAND_REQUEST_HARDWARE[0], 0xDF);

  assert(ganProtocol.COMMAND_HARDWARE_RESET instanceof Uint8Array, 'COMMAND_HARDWARE_RESET must be Uint8Array');
  assert.equal(ganProtocol.COMMAND_HARDWARE_RESET.length, 20);
  assert.equal(ganProtocol.COMMAND_HARDWARE_RESET[0], 0xD2);
});

runTest('P1.2: ganProtocol decodes move packet accurately', () => {
  // Construct raw Gen4 move packet (opcode 0x01)
  // Byte 0: 0x01 (MOVE)
  // Byte 1: 0x00
  // Bytes 2-5: timestamp 32-bit LE (e.g. 500)
  // Bytes 6-7: serial 16-bit LE (e.g. 42)
  // Byte 8: direction (bit 0-1) + rawFace (bit 2-7)
  const buf = new Uint8Array(20);
  buf[0] = 0x01;
  buf[2] = 0xF4; buf[3] = 0x01; buf[4] = 0x00; buf[5] = 0x00; // 500 LE
  buf[6] = 0x2A; buf[7] = 0x00; // 42 LE

  // Raw face: U = 2 (0b000010), direction = CW = 0 (0b00)
  // In byte 8 (bits 64..71): bit 64..65 = direction (bits 7..6), bit 66..71 = rawFace (bits 5..0)
  // direction 0, rawFace 2 -> byte 8 = (0 << 6) | 2 = 2 (0x02)
  buf[8] = (0 << 6) | 2;

  const decoded = ganProtocol.decodeGen4Packet(buf);
  assert.equal(decoded.type, 'MOVE');
  assert.equal(decoded.cubeTimestamp, 500);
  assert.equal(decoded.serial, 42);
  assert.equal(decoded.direction, 0);
  assert.equal(decoded.face, 'U');
  assert.equal(decoded.move, 'U');
});

runTest('P1.3: ganProtocol decodes battery packet accurately', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0xEF;
  buf[1] = 0x00;
  buf[2] = 85; // 85%
  const decoded = ganProtocol.decodeGen4Packet(buf);
  assert.equal(decoded.type, 'BATTERY');
  assert.equal(decoded.batteryLevel, 85);
});

// ---------------------------------------------------------------------------
// SUITE 2: High-Frequency Packet Burst (100 Moves in Rapid Succession)
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: High-Frequency Packet Bursts (100 Moves Ingestion) ---');

await runAsyncTest('P2.1: 100 moves delivered in rapid succession through VirtualGanCube to SmartCubeStore', async () => {
  const cube = new VirtualGanCube();
  const store = new SmartCubeStore();
  await store.connect(cube.device, cube.macAddress);

  const movesCycle = ["R", "U", "R'", "U'", "F", "D", "F'", "D'"];
  const burstMoves = [];
  for (let i = 0; i < 100; i++) {
    burstMoves.push(movesCycle[i % movesCycle.length]);
  }

  const baseTs = 10000;
  // Deliver 100 moves 1ms apart (total 99ms burst)
  for (let i = 0; i < 100; i++) {
    cube.emitMove(burstMoves[i], baseTs + i);
  }

  const state = store.getState();
  assert.equal(state.moveCount, 100, `Move count must be 100, got ${state.moveCount}`);
  assert.equal(state.moveHistory.length, 100, `Move history must have 100 entries, got ${state.moveHistory.length}`);

  for (let i = 0; i < 100; i++) {
    assert.equal(state.moveHistory[i].move, burstMoves[i], `Move ${i} mismatch`);
    assert.equal(state.moveHistory[i].timestamp, baseTs + i, `Timestamp ${i} mismatch`);
    if (i > 0) {
      assert.equal(state.moveHistory[i].stepTime, 1, `Step time ${i} must be 1ms`);
    }
  }
});

runTest('P2.2: 100 moves rapid burst directly into isolated SmartCubeStore with timestamp delta tracking', () => {
  const store = new SmartCubeStore();
  store.newScramble("R");

  const faces = ["U", "D", "L", "R", "F", "B"];
  const baseTs = 50000;

  for (let i = 0; i < 100; i++) {
    const move = faces[i % faces.length];
    store.handleIncomingMove({
      move,
      timestamp: baseTs + i * 2,
      serial: i + 1
    });
  }

  const state = store.getState();
  assert.equal(state.moveCount, 100);
  assert.equal(state.moveHistory.length, 100);
  assert.equal(state.elapsedMs, 198); // 99 * 2 = 198ms
  // Expected TPS = 100 / (198 / 1000) = 100 / 0.198 = 505.05 TPS
  assert.equal(state.currentTps, 505.05);
});

runTest('P2.3: 100 moves rapid burst directly into useSmartCubeStore Zustand store', () => {
  const state = useSmartCubeStore.getState();
  state.resetSolve();
  state.newScramble("R");

  const baseTs = 70000;
  for (let i = 0; i < 100; i++) {
    useSmartCubeStore.getState().handleIncomingMove({
      move: i % 2 === 0 ? "R" : "R'",
      timestamp: baseTs + i * 5,
      serial: i + 1
    });
  }

  const updatedState = useSmartCubeStore.getState();
  assert.equal(updatedState.moveCount, 100);
  assert.equal(updatedState.moveHistory.length, 100);
  assert.equal(updatedState.elapsedMs, 99 * 5); // 495ms
  // TPS = 100 / 0.495 = 202.02
  assert.equal(updatedState.currentTps, 202.02);
});

// ---------------------------------------------------------------------------
// SUITE 3: Relative Timestamp 0 on Move 1, Timestamp 500 on Move 2
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Relative Timestamp (0 -> 500ms) Elapsed & TPS Validation ---');

runTest('P3.1: Move 1 @ ts=0, Move 2 @ ts=500 in non-solving sequence produces exact 500ms elapsed & 4.00 TPS', () => {
  const store = new SmartCubeStore();
  store.newScramble("R U F");
  assert.equal(store.getState().timerStatus, 'scrambled');
  assert.equal(store.getState().timerStartTime, 0);

  // Move 1 arrives at relative timestamp 0
  store.handleIncomingMove({ move: "R'", timestamp: 0, serial: 1 });
  const stateAfterMove1 = store.getState();
  assert.equal(stateAfterMove1.timerStatus, 'solving');
  assert.equal(stateAfterMove1.timerStartTime, 0, 'timerStartTime must be 0');
  assert.equal(stateAfterMove1.moveCount, 1);
  assert.equal(stateAfterMove1.moveHistory[0].timestamp, 0);
  // Clamped to 1ms on first move at ts 0
  assert.equal(stateAfterMove1.elapsedMs, 1);

  // Move 2 arrives at relative timestamp 500
  store.handleIncomingMove({ move: "U'", timestamp: 500, serial: 2 });
  const stateAfterMove2 = store.getState();
  assert.equal(stateAfterMove2.timerStatus, 'solving');
  assert.equal(stateAfterMove2.moveCount, 2);
  assert.equal(stateAfterMove2.timerStartTime, 0, 'timerStartTime must remain 0');

  // Elapsed must be EXACTLY 500ms (500 - 0 = 500), NOT collapsed to 1ms!
  assert.equal(stateAfterMove2.elapsedMs, 500, `elapsedMs must be exactly 500ms, got ${stateAfterMove2.elapsedMs}`);

  // TPS: 2 moves in 500ms = 2 / 0.5s = 4.00 TPS
  assert.equal(stateAfterMove2.currentTps, 4.00, `currentTps must be 4.00, got ${stateAfterMove2.currentTps}`);
  assert.equal(stateAfterMove2.finalTps, null);
});

runTest('P3.2: Move 1 @ ts=0, Move 2 @ ts=500 in solving sequence transitions to solved with exact 500ms & 4.00 finalTps', () => {
  const store = new SmartCubeStore();
  // 2-move scramble: R U
  store.newScramble("R U");
  assert.equal(store.getState().timerStatus, 'scrambled');

  // Move 1: U' at timestamp 0
  store.handleIncomingMove({ move: "U'", timestamp: 0, serial: 1 });
  assert.equal(store.getState().timerStatus, 'solving');
  assert.equal(store.getState().timerStartTime, 0);

  // Move 2: R' at timestamp 500 (solves the cube)
  store.handleIncomingMove({ move: "R'", timestamp: 500, serial: 2 });
  const finalState = store.getState();

  assert.equal(finalState.timerStatus, 'solved', 'Must transition to solved');
  assert.equal(finalState.moveCount, 2);
  assert.equal(finalState.elapsedMs, 500, `elapsedMs must be exactly 500ms, got ${finalState.elapsedMs}`);
  assert.equal(finalState.finalTps, 4.00, `finalTps must be 4.00, got ${finalState.finalTps}`);
  assert.equal(finalState.currentTps, 4.00, `currentTps must be 4.00, got ${finalState.currentTps}`);

  // Verify session solve record
  assert.equal(finalState.sessionSolves.length, 1);
  const solve = finalState.sessionSolves[0];
  assert.equal(solve.elapsedMs, 500);
  assert.equal(solve.tps, 4.00);
  assert.equal(solve.moveCount, 2);
});

runTest('P3.3: useSmartCubeStore Zustand store handles relative ts=0 -> ts=500 identically', () => {
  const store = useSmartCubeStore.getState();
  store.resetSolve();
  store.newScramble("R U");

  // Move 1 at 0
  useSmartCubeStore.getState().handleIncomingMove({ move: "U'", timestamp: 0, serial: 1 });
  let current = useSmartCubeStore.getState();
  assert.equal(current.timerStatus, 'solving');
  assert.equal(current.timerStartTime, 0);

  // Move 2 at 500 (solves)
  useSmartCubeStore.getState().handleIncomingMove({ move: "R'", timestamp: 500, serial: 2 });
  current = useSmartCubeStore.getState();
  assert.equal(current.timerStatus, 'solved');
  assert.equal(current.elapsedMs, 500);
  assert.equal(current.finalTps, 4.00);
  assert.equal(current.currentTps, 4.00);
});

// ---------------------------------------------------------------------------
// SUITE 4: Multiple newScramble() and resetSolve() Isolation of timerStartTime
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Scramble & Reset Isolation (timerStartTime Leak Prevention) ---');

runTest('P4.1: Repeated cycles of newScramble() and resetSolve() completely zero out timerStartTime', () => {
  const store = new SmartCubeStore();

  for (let cycle = 1; cycle <= 20; cycle++) {
    // 1. Scramble
    store.newScramble("R");
    let state = store.getState();
    assert.equal(state.timerStatus, 'scrambled', `Cycle ${cycle}: timerStatus must be scrambled`);
    assert.equal(state.timerStartTime, 0, `Cycle ${cycle}: timerStartTime must be 0 after newScramble`);
    assert.equal(state.elapsedMs, 0, `Cycle ${cycle}: elapsedMs must be 0 after newScramble`);
    assert.equal(state.moveCount, 0, `Cycle ${cycle}: moveCount must be 0`);
    assert.equal(state.moveHistory.length, 0, `Cycle ${cycle}: moveHistory must be empty`);
    assert.equal(state.finalTps, null);

    // 2. Start solve with high timestamp (e.g. 1,000,000 + cycle * 50,000)
    const largeTs = 1000000 + cycle * 50000;
    store.handleIncomingMove("U", largeTs);
    state = store.getState();
    assert.equal(state.timerStatus, 'solving');
    assert.equal(state.timerStartTime, largeTs, `Cycle ${cycle}: timerStartTime must be ${largeTs}`);

    // 3. Reset solve mid-solve
    store.resetSolve();
    state = store.getState();
    assert.equal(state.timerStatus, 'idle', `Cycle ${cycle}: timerStatus must be idle after resetSolve`);
    assert.equal(state.timerStartTime, 0, `Cycle ${cycle}: timerStartTime must be completely reset to 0`);
    assert.equal(state.elapsedMs, 0);
    assert.equal(state.moveCount, 0);
    assert.equal(state.moveHistory.length, 0);
    assert.equal(state.finalTps, null);

    // 4. Now scramble again and start with relative timestamp 0
    store.newScramble("R");
    assert.equal(store.getState().timerStartTime, 0, `Cycle ${cycle}: timerStartTime must remain 0`);

    // Ingest move 1 at ts=0
    store.handleIncomingMove("R'", 0);
    state = store.getState();
    assert.equal(state.timerStatus, 'solved');
    assert.equal(state.timerStartTime, 0, `Cycle ${cycle}: timerStartTime must be 0, not leaked ${largeTs}`);

    // Verify elapsedMs does NOT reflect leaked largeTs
    assert(state.elapsedMs <= 1, `Cycle ${cycle}: elapsedMs must be clamped to 1, got ${state.elapsedMs}`);

    // 5. Final reset
    store.resetSolve();
    assert.equal(store.getState().timerStartTime, 0);
  }
});

runTest('P4.2: useSmartCubeStore Zustand store repeated newScramble & resetSolve isolation', () => {
  for (let cycle = 1; cycle <= 10; cycle++) {
    const store = useSmartCubeStore.getState();
    store.newScramble("R U");

    let s = useSmartCubeStore.getState();
    assert.equal(s.timerStatus, 'scrambled');
    assert.equal(s.timerStartTime, 0);

    // Solve partially at high timestamp
    const bigTs = 99999999;
    useSmartCubeStore.getState().handleIncomingMove("U", bigTs);
    s = useSmartCubeStore.getState();
    assert.equal(s.timerStartTime, bigTs);

    // Call newScramble directly from solving state
    useSmartCubeStore.getState().newScramble("F");
    s = useSmartCubeStore.getState();
    assert.equal(s.timerStatus, 'scrambled');
    assert.equal(s.timerStartTime, 0, 'timerStartTime must be reset to 0');
    assert.equal(s.moveCount, 0);
    assert.equal(s.elapsedMs, 0);

    // Call resetSolve
    useSmartCubeStore.getState().resetSolve();
    s = useSmartCubeStore.getState();
    assert.equal(s.timerStatus, 'idle');
    assert.equal(s.timerStartTime, 0);
    assert.equal(s.elapsedMs, 0);
    assert.equal(s.moveCount, 0);
  }
});

// ---------------------------------------------------------------------------
// SUITE 5: Extended Edge Cases: Negative Deltas, Invalid Face Codes & Gyro/Facelets
// ---------------------------------------------------------------------------
console.log('\n--- Suite 5: Extended Edge Cases & Invalid Inputs ---');

runTest('P5.1: Negative delta / out-of-order packets clamp stepTime to 0 without crashing', () => {
  const store = new SmartCubeStore();
  store.newScramble("R");
  store.handleIncomingMove({ move: "R", timestamp: 1000, serial: 1 });
  // Move arrives with older timestamp
  store.handleIncomingMove({ move: "U", timestamp: 800, serial: 2 });

  const state = store.getState();
  assert.equal(state.moveHistory[1].stepTime, 0, 'stepTime must be clamped to 0 for out-of-order timestamp');
  assert.equal(state.moveCount, 2);
});

runTest('P5.2: Invalid face code in move packet throws descriptive error', () => {
  const buf = new Uint8Array(20);
  buf[0] = 0x01; // MOVE
  // Set invalid face code 63 (0b111111) in bits 66..71
  buf[8] = 63;
  assert.throws(() => {
    ganProtocol.decodeGen4Packet(buf);
  }, /Invalid face code in move packet/);
});

runTest('P5.3: ganProtocol decodes gyro and facelets packets', () => {
  // Test gyro packet (0xEC)
  const gyroBuf = new Uint8Array(20);
  gyroBuf[0] = 0xEC;
  const decodedGyro = ganProtocol.decodeGen4Packet(gyroBuf);
  assert.equal(decodedGyro.type, 'GYRO');
  assert(decodedGyro.quaternion !== undefined);

  // Test facelets packet (0xED)
  const faceletsBuf = new Uint8Array(20);
  faceletsBuf[0] = 0xED;
  const decodedFacelets = ganProtocol.decodeGen4Packet(faceletsBuf);
  assert.equal(decodedFacelets.type, 'FACELETS');
  assert.equal(decodedFacelets.facelets.length, 54);
});

runTest('P5.4: Marathon 1000 moves high-frequency burst maintains memory integrity and exact sequence', () => {
  const store = new SmartCubeStore();
  store.newScramble("R");
  const faces = ["U", "R", "F", "D", "L", "B"];
  for (let i = 0; i < 1000; i++) {
    store.handleIncomingMove({
      move: faces[i % faces.length],
      timestamp: i * 5,
      serial: i + 1
    });
  }
  const state = store.getState();
  assert.equal(state.moveCount, 1000);
  assert.equal(state.moveHistory.length, 1000);
  assert.equal(state.moveHistory[999].timestamp, 4995);
  assert.equal(state.elapsedMs, 4995);
  // TPS = 1000 / 4.995s = 200.20
  assert.equal(state.currentTps, 200.20);
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n====================================================');
console.log(` RESULTS: ${passedTests}/${totalTests} tests passed (${totalTests - passedTests} failed)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
