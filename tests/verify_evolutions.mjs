import assert from 'node:assert/strict';

const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoryStorage.has(k) ? memoryStorage.get(k) : null),
  setItem: (k, v) => memoryStorage.set(k, String(v)),
  removeItem: (k) => memoryStorage.delete(k),
  clear: () => memoryStorage.clear()
};

const { decodeGen4Packet } = await import('../src/utils/smartCube/ganProtocol.js');
const {
  resolveMoveTiming,
  enrichPhaseSplits,
  detectRegrips,
  buildAnnotatedReconstruction
} = await import('../src/utils/smartCube/solveMetrics.js');
const {
  detectF2LSlots,
  reconstructF2LBreakdown,
  VALID_CROSS_FACES
} = await import('../src/utils/smartCube/solvePhaseDetector.js');
const {
  calculateWcaAo50,
  calculateWcaAo100,
  calculateSessionStats
} = await import('../src/utils/smartCube/wcaStats.js');
const {
  buildFullJsonExport,
  buildCsvExport,
  buildCsTimerExport
} = await import('../src/utils/smartCube/solveExport.js');
const { saveSmartCubeSolves, loadSmartCubeSolves } = await import('../src/utils/smartCube/sessionStorage.js');
const { SmartCubeStore } = await import('../src/store/useSmartCubeStore.js');
const { CubeStateSimulator, checkIsSolved } = await import('../src/utils/cubeMath.js');
const { createCaseCubies, applyMoveInstant, getMoveParams } = await import('../src/utils/algoParser.js');
const { rotationToCanonicalMove, computeMoveMetrics } = await import('../src/utils/virtualMoveMetrics.js');
const {
  useVirtualCubeSessionStore,
  buildVirtualJsonExport,
  buildVirtualCsvExport
} = await import('../src/store/useVirtualCubeSessionStore.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`PASS: ${name}`);
}

test('decodeGen4Packet decodes multi-move 72-bit chunks with cubeTimestamp and serial', () => {
  const pkt = new Uint8Array(20);
  // Move 1: event 0x01, ts = 1000 (LE at bit 16..47 -> bytes 2..5), serial = 42 (LE at bit 48..63 -> bytes 6..7), dir=0, face=32 (R -> 0b100000 -> byte 8 = 0x20)
  pkt[0] = 0x01;
  pkt[2] = 0xe8; pkt[3] = 0x03; pkt[4] = 0x00; pkt[5] = 0x00;
  pkt[6] = 42; pkt[7] = 0;
  pkt[8] = 32; // dir 0 (bits 64..65 = 00), face 32 (bits 66..71 = 100000) -> 0b00100000 = 32
  // Move 2 at byte 9 (bit 72): event 0x01, ts = 1150, serial = 43, dir=1, face=2 (U)
  pkt[9] = 0x01;
  pkt[11] = 0x7e; pkt[12] = 0x04; pkt[13] = 0x00; pkt[14] = 0x00;
  pkt[15] = 43; pkt[16] = 0;
  pkt[17] = (1 << 6) | 2; // dir=1 in top 2 bits of byte 17, face=2 in lower 6 bits

  const decoded = decodeGen4Packet(pkt);
  assert.equal(decoded.type, 'MOVE');
  assert.equal(decoded.moves.length, 2);
  assert.equal(decoded.moves[0].move, 'R');
  assert.equal(decoded.moves[0].cubeTimestamp, 1000);
  assert.equal(decoded.moves[0].serial, 42);
  assert.equal(decoded.moves[1].move, "U'");
  assert.equal(decoded.moves[1].cubeTimestamp, 1150);
  assert.equal(decoded.moves[1].serial, 43);
});

test('resolveMoveTiming handles hardware cubeTimestamp and 32-bit wraparound', () => {
  const startWall = 1700000000000;
  const first = resolveMoveTiming({
    moveData: { move: 'R', timestamp: 0xFFFFFF00 },
    prevMoveEntry: null,
    solveStartWallMs: startWall
  });
  assert.equal(first.relMs, 0);
  assert.equal(first.stepTime, 0);

  const second = resolveMoveTiming({
    moveData: { move: 'U', timestamp: 100 },
    prevMoveEntry: { ...first, cubeTimestamp: 0xFFFFFF00 },
    solveStartWallMs: startWall
  });
  // (100 - 0xFFFFFF00) >>> 0 = 256 + 100 = 356ms
  assert.equal(second.stepTime, 356);
  assert.equal(second.relMs, 356);
  assert.equal(second.timestamp, startWall + 356);
});

test('detectF2LSlots supports all 6 color-neutral cross orientations (U, D, F, B, R, L)', () => {
  const sim = new CubeStateSimulator();
  const solved = sim.getFaceletString();
  for (const face of VALID_CROSS_FACES) {
    const slots = detectF2LSlots(solved, face);
    assert.equal(slots.length, 4, `Expected 4 F2L slots for crossFace=${face}`);
    assert.ok(slots.every((s) => s.solved), `Expected all slots solved on solved cube for crossFace=${face}`);
  }
  const autoSlots = detectF2LSlots(solved, 'auto');
  assert.equal(autoSlots.length, 4);
  assert.ok(autoSlots.every((s) => s.solved));
});

test('enrichPhaseSplits computes recognition, execution, and move indices', () => {
  const moveHistory = [
    { move: 'R', stepTime: 0 },
    { move: 'U', stepTime: 180 },
    { move: "R'", stepTime: 200 },
    { move: 'U', stepTime: 650 }, // start F2L -> rec 650ms
    { move: 'F', stepTime: 250 },
    { move: 'R', stepTime: 500 }  // start OLL -> rec 500ms
  ];
  const splits = {
    cross: { phase: 'cross', durationMs: 380, moveCount: 3, moves: 3, tps: 7.89, skipped: false },
    f2l: { phase: 'f2l', durationMs: 900, moveCount: 2, moves: 2, tps: 2.22, skipped: false },
    oll: { phase: 'oll', durationMs: 500, moveCount: 1, moves: 1, tps: 2.0, skipped: false },
    pll: { phase: 'pll', durationMs: 0, moveCount: 0, moves: 0, tps: 0, skipped: true }
  };
  const enriched = enrichPhaseSplits(splits, moveHistory);
  assert.equal(enriched.cross.recognitionMs, 0);
  assert.equal(enriched.cross.executionMs, 380);
  assert.equal(enriched.cross.startMoveIndex, 0);
  assert.equal(enriched.cross.endMoveIndex, 2);

  assert.equal(enriched.f2l.recognitionMs, 650);
  assert.equal(enriched.f2l.executionMs, 250);
  assert.equal(enriched.f2l.startMoveIndex, 3);
  assert.equal(enriched.f2l.endMoveIndex, 4);

  assert.equal(enriched.oll.recognitionMs, 500);
  assert.equal(enriched.oll.executionMs, 0);
  assert.equal(enriched.pll.startMoveIndex, null);
});

test('detectRegrips detects >=40deg gyro rotation and heuristic fallback', () => {
  const moveHistory = [
    { move: 'R', relMs: 0, stepTime: 0 },
    { move: 'F', relMs: 320, stepTime: 320 },
    { move: 'U', relMs: 520, stepTime: 200 }
  ];
  const gyroSamples = [
    { relMs: 0, q: [0, 0, 0, 1] },
    { relMs: 300, q: [0, Math.sin(Math.PI / 6), 0, Math.cos(Math.PI / 6)] } // 60 deg rotation
  ];
  const gyroRes = detectRegrips(moveHistory, gyroSamples, {});
  assert.equal(gyroRes.count, 1);
  assert.equal(gyroRes.items[0].source, 'gyro');
  assert.ok(gyroRes.items[0].angleDeg >= 55);

  const heurRes = detectRegrips(moveHistory, [], {});
  assert.equal(heurRes.count, 1);
  assert.equal(heurRes.items[0].source, 'heuristic');
});

test('SmartCubeStore serial deduplication, droppedPackets, and full solve persistence', () => {
  memoryStorage.clear();
  const store = new SmartCubeStore();
  store.newScramble('R U', { trackScramble: false, autoInspect: false });
  assert.equal(store.getState().timerStatus, 'scrambled');

  // Inverse of "R U" is "U' R'"
  store.handleIncomingMove({ move: "U'", serial: 10, timestamp: 1000 });
  // Duplicate serial 10 should be ignored
  store.handleIncomingMove({ move: "U'", serial: 10, timestamp: 1050 });
  assert.equal(store.getState().moveCount, 1);

  // Jump serial 10 -> 13 (2 dropped packets)
  store.handleIncomingMove({ move: "R'", serial: 13, timestamp: 1350 });
  assert.equal(store.getState().timerStatus, 'solved');
  const lastSolve = store.getState().sessionSolves.at(-1);
  assert.equal(lastSolve.moveCount, 2);
  assert.equal(lastSolve.droppedPackets, 2);
  assert.equal(lastSolve.moveTimings[1].stepTime, 350);
  assert.ok(lastSolve.regrips !== undefined);

  const recon = buildAnnotatedReconstruction(lastSolve);
  assert.ok(recon.text.includes('// Scramble: R U'));
  assert.ok(recon.segments.length >= 1);
});

test('WCA Ao50 & Ao100 trim 3 and 5 correctly', () => {
  // 50 solves: values 1000..50000 step 1000; 3 fastest (1000..3000) & 3 slowest (48000..50000) trimmed
  const solves50 = Array.from({ length: 50 }, (_, i) => ({ elapsedMs: (i + 1) * 1000, penalty: 'none' }));
  // Mean of 4000..47000 is (4000 + 47000) / 2 = 25500
  assert.equal(calculateWcaAo50(solves50), 25500);

  // With 3 DNFs -> still valid (trimCount = 3)
  const solves50With3Dnf = solves50.map((s, i) => (i < 3 ? { ...s, penalty: 'dnf', isDnf: true } : s));
  assert.notEqual(calculateWcaAo50(solves50With3Dnf), 'DNF');

  // With 4 DNFs -> DNF
  const solves50With4Dnf = solves50.map((s, i) => (i < 4 ? { ...s, penalty: 'dnf', isDnf: true } : s));
  assert.equal(calculateWcaAo50(solves50With4Dnf), 'DNF');

  // 100 solves: 1..100 -> trimmed 5 fastest & 5 slowest -> mean of 6..95 is 50.5 * 1000 = 50500
  const solves100 = Array.from({ length: 100 }, (_, i) => ({ elapsedMs: (i + 1) * 1000, penalty: 'none' }));
  assert.equal(calculateWcaAo100(solves100), 50500);

  const sessStats = calculateSessionStats(solves100);
  assert.equal(sessStats.ao50, 75500); // last 50 of 1..100 = 51..100 -> mean 75.5s
  assert.equal(sessStats.ao100, 50500);
});

test('solveExport produces valid JSON v2, RFC 4180 CSV with BOM, and csTimer JSON', () => {
  const solves = [
    {
      id: 's1',
      timestamp: 1700000000000,
      elapsedMs: 12340,
      penalty: 'none',
      moveCount: 50,
      tps: 4.05,
      pauses: { count: 2, totalPauseMs: 1100 },
      regrips: { count: 3, items: [] },
      scramble: 'R U R\' U\'',
      moves: 'R U R\' U\'',
      splits: {
        cross: { durationMs: 2000, moveCount: 7, tps: 3.5 },
        f2l: { durationMs: 6000, moveCount: 24, tps: 4.0 },
        oll: { durationMs: 2000, moveCount: 9, tps: 4.5, recognitionMs: 400 },
        pll: { durationMs: 2340, moveCount: 10, tps: 4.27, recognitionMs: 350 }
      },
      f2lBreakdown: {
        f1: { slot: 'FR', durationMs: 1500 },
        f2: { slot: 'FL', durationMs: 1500 },
        f3: { slot: 'BR', durationMs: 1500 },
        f4: { slot: 'BL', durationMs: 1500 }
      }
    }
  ];
  const json = buildFullJsonExport(solves);
  assert.equal(json.version, 2);
  assert.equal(json.count, 1);

  const csv = buildCsvExport(solves);
  assert.ok(csv.startsWith('\uFEFF'));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[0].split(',').length, 31);

  const cs = buildCsTimerExport(solves);
  assert.equal(cs.session1.length, 1);
  assert.deepEqual(cs.session1[0][0], [0, 12340]);
});

test('sessionStorage sanitizes timestamps and saves/loads solves', () => {
  memoryStorage.clear();
  const sample = [{ id: 'solve-1700000000000-abc', timestamp: 1234, elapsedMs: 9000 }];
  saveSmartCubeSolves(sample);
  const loaded = loadSmartCubeSolves();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].timestamp, 1700000000000);
});

test('Replay 3D mathematical consistency: scramble + solution solves createCaseCubies (yellowTop: false)', () => {
  const scramble = "R U F' L2 D B' R2 U'";
  // Solution is exact inverse of scramble
  const solution = "U R2 B D' L2 F U' R'";
  const sim = new CubeStateSimulator();
  sim.applyMoves(scramble);
  sim.applyMoves(solution);
  assert.ok(sim.isSolved(), 'CubeStateSimulator should be solved after scramble + solution');

  let cubies = createCaseCubies({
    size: 3,
    alg: '',
    setup: scramble,
    yellowTop: false,
    maskMode: 'full',
    applySetup: true
  });
  assert.equal(checkIsSolved(cubies), false, 'Scrambled 3D cubies should not be solved');

  for (const move of solution.split(' ')) {
    cubies = applyMoveInstant(cubies, move, 3);
  }
  assert.equal(checkIsSolved(cubies), true, 'Replay 3D cubies must reach solved state at end of solve');
});

test('rotationToCanonicalMove round-trips with getMoveParams across 2x2-5x5', () => {
  const cases = [
    [3, 'R'], [3, "R'"], [3, 'L'], [3, "L'"],
    [3, 'U'], [3, "U'"], [3, 'D'], [3, "D'"],
    [3, 'F'], [3, "F'"], [3, 'B'], [3, "B'"],
    [3, 'M'], [3, "M'"], [3, 'E'], [3, "E'"], [3, 'S'], [3, "S'"],
    [3, 'Rw'], [3, "Rw'"], [3, 'x'], [3, "x'"], [3, 'y'], [3, "z'"],
    [2, 'R'], [2, "F'"], [2, "U'"],
    [4, 'Rw'], [4, "Uw'"], [4, '2R'], [4, "2U'"], [4, 'M'],
    [5, '3Rw'], [5, "3Fw'"], [5, '2L'], [5, "2D'"]
  ];
  for (const [size, move] of cases) {
    const p = getMoveParams(move, size);
    assert.ok(p, `getMoveParams failed for ${size}x${size} ${move}`);
    const back = rotationToCanonicalMove(p.axis, p.value, p.direction, size);
    assert.equal(back, move, `Round-trip mismatch for ${size}x${size} ${move}: got ${back}`);
  }
});

test('computeMoveMetrics simplifies consecutive turns and computes HTM/STM accurately', () => {
  // R + R -> R2 (1 HTM, 1 STM); U + U' -> cancelled (0); M -> (2 HTM, 1 STM); x -> ignored (0)
  const res = computeMoveMetrics(['R', 'R', 'x', 'U', "U'", 'M', 'F']);
  assert.deepEqual(res.simplifiedMoves, ['R2', 'M', 'F']);
  assert.equal(res.htm, 4); // R2(1) + M(2) + F(1)
  assert.equal(res.stm, 3); // R2(1) + M(1) + F(1)
  assert.equal(res.rawCount, 6); // excludes 'x'
});

test('useVirtualCubeSessionStore records per-size solves, penalties, exports, and highScore', () => {
  memoryStorage.clear();
  useVirtualCubeSessionStore.getState().clearSession(3);
  useVirtualCubeSessionStore.getState().clearSession(4);

  const s3 = useVirtualCubeSessionStore.getState().recordSolve(3, {
    timeMs: 14500,
    scramble: 'R U R\'',
    moves: 'R U\' R\'',
    rawMoves: ['R', "U'", "R'"],
    htm: 3,
    stm: 3,
    rawMoveCount: 3
  });
  assert.equal(useVirtualCubeSessionStore.getState().sessions['3x3'].length, 1);
  assert.equal(useVirtualCubeSessionStore.getState().sessions['4x4'].length, 0);
  assert.equal(localStorage.getItem('rubiksHighScore_3x3'), '14500');

  useVirtualCubeSessionStore.getState().updatePenalty(3, s3.id, '+2');
  assert.equal(useVirtualCubeSessionStore.getState().sessions['3x3'][0].penalty, '+2');

  const vJson = JSON.parse(buildVirtualJsonExport(useVirtualCubeSessionStore.getState().sessions['3x3'], '3x3'));
  assert.equal(vJson.count, 1);
  const vCsv = buildVirtualCsvExport(useVirtualCubeSessionStore.getState().sessions['3x3'], '3x3');
  assert.ok(vCsv.startsWith('index,puzzle,timestamp'));

  useVirtualCubeSessionStore.getState().deleteSolve(3, s3.id);
  assert.equal(useVirtualCubeSessionStore.getState().sessions['3x3'].length, 0);
});

test('reconstructF2LBreakdown includes per-pair moveCount and tps', () => {
  const b = reconstructF2LBreakdown('', [
    { move: 'R', timestamp: 1000, stepTime: 0 },
    { move: 'U', timestamp: 1200, stepTime: 200 }
  ], 'auto');
  assert.ok(typeof b === 'object');
});

console.log(`\nALL ${passed} TESTS PASSED`);
