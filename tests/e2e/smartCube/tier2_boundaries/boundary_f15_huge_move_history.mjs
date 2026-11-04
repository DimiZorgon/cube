// tests/e2e/smartCube/tier2_boundaries/boundary_f15_huge_move_history.mjs
// Boundary F15: Massive Move History (500+ moves) & Memory Resilience (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('Boundary F15: Huge Move History & Memory Resilience');

suite.it('B15-1: Handles 500 consecutive moves in a marathon solve session', () => {
  const store = new SpecSmartCubeStore();
  const faces = ['R', 'U', 'F', 'L', 'D', 'B'];

  for (let i = 0; i < 500; i++) {
    const move = faces[i % faces.length];
    store.handleIncomingMove(move, 1000 + i * 100);
  }

  assertEqual(store.getState().moveCount, 500);
  assertEqual(store.getState().moveHistory.length, 500);
});

suite.it('B15-2: Move history step time remains accurate across 500 moves', () => {
  const store = new SpecSmartCubeStore();
  for (let i = 0; i < 500; i++) {
    store.handleIncomingMove('R', i * 50); // 50ms interval
  }
  const history = store.getState().moveHistory;
  assertEqual(history[100].stepTime, 50);
  assertEqual(history[499].stepTime, 50);
});

suite.it('B15-3: Resetting after 500 moves frees array memory and resets counter', () => {
  const store = new SpecSmartCubeStore();
  for (let i = 0; i < 500; i++) {
    store.handleIncomingMove('U');
  }
  assertEqual(store.getState().moveCount, 500);

  store.resetSolve();
  assertEqual(store.getState().moveCount, 0);
  assertEqual(store.getState().moveHistory.length, 0);
});

suite.it('B15-4: Move tape UI slice helper limits visible elements to recent 20 moves', () => {
  function getVisibleMoveTape(history, maxVisible = 20) {
    return history.slice(-maxVisible);
  }
  const history = Array(200).fill(0).map((_, i) => ({ move: `M${i}`, timestamp: i }));
  const visible = getVisibleMoveTape(history, 20);
  assertEqual(visible.length, 20);
  assertEqual(visible[19].move, 'M199');
});

suite.it('B15-5: Serializing 500 moves to JSON succeeds within budget (< 50KB)', () => {
  const store = new SpecSmartCubeStore();
  for (let i = 0; i < 500; i++) {
    store.handleIncomingMove("R'", 1000 + i * 200);
  }
  const jsonStr = JSON.stringify(store.getState().moveHistory);
  assert(jsonStr.length < 50000, `JSON string length ${jsonStr.length} exceeds 50KB`);
});
