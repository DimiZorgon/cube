import assert from 'node:assert/strict';
import test from 'node:test';

const memoryLocalStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoryLocalStorage.has(k) ? memoryLocalStorage.get(k) : null),
  setItem: (k, v) => memoryLocalStorage.set(k, String(v)),
  removeItem: (k) => memoryLocalStorage.delete(k),
  clear: () => memoryLocalStorage.clear()
};

function createMockIdbStore() {
  const data = new Map();
  const customStore = (_txMode, callback) => {
    const tx = {
      oncomplete: null,
      onerror: null,
      onabort: null
    };
    const fakeObjectStore = {
      transaction: tx,
      get(key) {
        const req = {
          result: data.has(key) ? structuredClone(data.get(key)) : undefined,
          onsuccess: null,
          onerror: null
        };
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
      put(value, key) {
        data.set(key, structuredClone(value));
        queueMicrotask(() => tx.oncomplete?.());
      }
    };
    return Promise.resolve(callback(fakeObjectStore));
  };
  return { customStore, data };
}

const {
  SESSIONS_STORAGE_KEY,
  IDB_SOLVES_KEY,
  IDB_COUNTER_KEY,
  IDB_MIGRATED_KEY,
  assignMissingSolveNumbers,
  mergeImportedSolves,
  loadSmartCubeSolvesAsync,
  saveSmartCubeSolvesAsync,
  getSmartCubeSolveByNumberAsync
} = await import('../src/utils/smartCube/sessionStorage.js');
const {
  buildFullJsonExport,
  parseImportedSolvesJson
} = await import('../src/utils/smartCube/solveExport.js');
const {
  encodeReplayPayload,
  decodeReplayPayload,
  buildReplayShareUrl
} = await import('../src/utils/smartCube/replayCodec.js');
const { CubeStateSimulator } = await import('../src/utils/cubeMath.js');

test('assignMissingSolveNumbers preserves existing numbers and assigns monotonic ones', () => {
  const input = [
    { id: 'a', solveNumber: 3 },
    { id: 'b' },
    { id: 'c', solveNumber: 7 },
    { id: 'd' }
  ];
  const res = assignMissingSolveNumbers(input, 1);
  assert.equal(res.modified, true);
  assert.deepEqual(
    res.solves.map(s => s.solveNumber),
    [3, 8, 7, 9]
  );
  assert.equal(res.nextSolveNumber, 10);
});

test('loadSmartCubeSolvesAsync migrates legacy localStorage once, backfills solveNumbers, and clears localStorage key', async () => {
  memoryLocalStorage.clear();
  const legacy = [
    { id: 'solve-1700000000000-aa', elapsedMs: 11200, scramble: 'R U', moves: "U' R'" },
    { id: 'solve-1700000050000-bb', elapsedMs: 9800, scramble: 'F R', moves: "R' F'" }
  ];
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(legacy));

  const { customStore, data } = createMockIdbStore();
  const res = await loadSmartCubeSolvesAsync(customStore);

  assert.equal(res.solves.length, 2);
  assert.equal(res.solves[0].solveNumber, 1);
  assert.equal(res.solves[1].solveNumber, 2);
  assert.equal(res.nextSolveNumber, 3);
  assert.equal(data.get(IDB_MIGRATED_KEY), true);
  assert.equal(data.get(IDB_COUNTER_KEY), 3);
  assert.equal(data.get(IDB_SOLVES_KEY).length, 2);
  assert.equal(localStorage.getItem(SESSIONS_STORAGE_KEY), null);

  const byNum = await getSmartCubeSolveByNumberAsync(2, customStore);
  assert.equal(byNum?.id, 'solve-1700000050000-bb');
  assert.equal(await getSmartCubeSolveByNumberAsync(99, customStore), null);
});

test('saveSmartCubeSolvesAsync persists all solves with full moveTimings without compaction', async () => {
  const { customStore } = createMockIdbStore();
  const bigList = Array.from({ length: 250 }, (_, idx) => ({
    id: `solve-${1700000000000 + idx}-x`,
    solveNumber: idx + 1,
    timestamp: 1700000000000 + idx,
    elapsedMs: 10000 + idx,
    scramble: 'R U',
    moves: "U' R'",
    moveTimings: [
      { move: "U'", stepTime: 100, relMs: 100 },
      { move: "R'", stepTime: 150, relMs: 250 }
    ]
  }));

  await saveSmartCubeSolvesAsync(bigList, 251, customStore);
  // Mark migrated so loader reads directly from IDB
  await customStore('readwrite', (store) => store.put(true, IDB_MIGRATED_KEY));

  const loaded = await loadSmartCubeSolvesAsync(customStore);
  assert.equal(loaded.solves.length, 250);
  assert.equal(loaded.solves[0].moveTimings.length, 2);
  assert.equal(loaded.nextSolveNumber, 251);
});

test('parseImportedSolvesJson + mergeImportedSolves deduplicate by id and keep monotonic solveNumbers after deletions', () => {
  const existing = [
    { id: 'solve-1700000001000-a', solveNumber: 1, timestamp: 1700000001000, elapsedMs: 12000, moves: "U' R'" },
    { id: 'solve-1700000003000-c', solveNumber: 5, timestamp: 1700000003000, elapsedMs: 10500, moves: "F' R'" }
  ];
  // Suppose #2, #3, #4 were deleted and counter is at 6
  const exportPayload = buildFullJsonExport([
    existing[0], // duplicate id
    { id: 'solve-1700000002000-b', timestamp: 1700000002000, elapsedMs: 9400, scramble: 'R U', moves: "U' R'" },
    { id: 'solve-1700000004000-d', timestamp: 1700000004000, elapsedMs: 8800, penalty: '+2', scramble: 'F U', moves: "U' F'" }
  ]);

  const parsed = parseImportedSolvesJson(JSON.stringify(exportPayload));
  assert.equal(parsed.length, 3);

  const merged = mergeImportedSolves(existing, parsed, 6);
  assert.equal(merged.addedCount, 2);
  assert.equal(merged.skippedCount, 1);
  assert.equal(merged.solves.length, 4);
  assert.equal(merged.nextSolveNumber, 8);
  assert.deepEqual(
    merged.solves.map(s => s.solveNumber),
    [1, 6, 5, 7]
  );

  assert.throws(() => parseImportedSolvesJson('{bad json'), /JSON invalide/);
  assert.throws(() => parseImportedSolvesJson(JSON.stringify({ solves: [] })), /Aucune résolution valide/);
});

test('encodeReplayPayload + decodeReplayPayload round-trip reconstructs CFOP splits, F2L, pauses, and solved state', async () => {
  const scramble = "R U F' L2 D B' R2 U'";
  const solution = "U R2 B D' L2 F U' R'";
  const moves = solution.split(' ');
  const deltas = [0, 220, 520, 180, 200, 610, 190, 210];
  let rel = 0;
  const baseTs = 1700000100000;
  const moveTimings = moves.map((m, idx) => {
    rel = idx === 0 ? deltas[0] : rel + deltas[idx];
    return {
      move: m,
      stepTime: deltas[idx],
      relMs: rel,
      timestamp: baseTs + rel
    };
  });

  const solve = {
    id: 'solve-1700000100000-test',
    solveNumber: 12,
    timestamp: baseTs,
    elapsedMs: rel,
    moveCount: moves.length,
    scramble,
    moves: solution,
    moveTimings,
    penalty: '+2'
  };

  const encoded = await encodeReplayPayload(solve);
  assert.ok(encoded.length > 10 && encoded.length < 400, `Expected compact payload, got length ${encoded.length}`);
  assert.ok(!/[+/=]/.test(encoded), 'Encoded string must be URL-safe base64url');

  const decoded = await decodeReplayPayload(encoded);
  assert.equal(decoded.isShared, true);
  assert.equal(decoded.solveNumber, 12);
  assert.equal(decoded.scramble, scramble);
  assert.equal(decoded.moves, solution);
  assert.equal(decoded.elapsedMs, rel);
  assert.equal(decoded.penalty, '+2');
  assert.equal(decoded.moveTimings.length, moves.length);
  assert.equal(decoded.pauses.count, 2); // 520ms and 610ms >= 450ms
  assert.ok(decoded.splits.cross && decoded.splits.f2l && decoded.splits.oll && decoded.splits.pll);
  assert.equal(Object.keys(decoded.f2lBreakdown).length, 4);

  const sim = new CubeStateSimulator();
  sim.applyMoves(decoded.scramble);
  sim.applyMoves(decoded.moves);
  assert.equal(sim.isSolved(), true);

  const url = await buildReplayShareUrl(solve, 'https://cube.noullez.com', 'en');
  assert.ok(url.startsWith('https://cube.noullez.com/en/smart-cube/replay?d='));
});
