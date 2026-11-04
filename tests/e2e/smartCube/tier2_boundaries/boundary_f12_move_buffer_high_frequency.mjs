// tests/e2e/smartCube/tier2_boundaries/boundary_f12_move_buffer_high_frequency.mjs
// Boundary F12: High-Frequency Move Bursts (15-20 TPS) (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('Boundary F12: High-Frequency Move Bursts');

suite.it('B12-1: Ingests 20 moves arriving within 50ms without dropping moves', () => {
  const store = new SpecSmartCubeStore();
  const moves = ["R", "U", "R'", "U'"].flatMap(x => [x, x, x, x, x]); // 20 moves
  let ts = 1000;
  for (const m of moves) {
    store.handleIncomingMove(m, ts);
    ts += 2; // 2ms apart -> 500 TPS arrival rate
  }
  assertEqual(store.getState().moveCount, 20);
  assertEqual(store.getState().moveHistory.length, 20);
});

suite.it('B12-2: Sub-millisecond identical timestamps between two moves are supported', () => {
  const store = new SpecSmartCubeStore();
  store.handleIncomingMove('R', 5000);
  store.handleIncomingMove('U', 5000); // Same ms
  const history = store.getState().moveHistory;
  assertEqual(history.length, 2);
  assertEqual(history[1].stepTime, 0);
});

suite.it('B12-3: Alternating quarter turns at 15 TPS maintain accurate move tape sequence', () => {
  const store = new SpecSmartCubeStore();
  const sequence = [];
  for (let i = 0; i < 30; i++) {
    const move = (i % 2 === 0) ? 'R' : "R'";
    sequence.push(move);
    store.handleIncomingMove(move);
  }
  assertEqual(store.getState().moveCount, 30);
  const recorded = store.getState().moveHistory.map(h => h.move);
  assertEqual(recorded.join(','), sequence.join(','));
});

suite.it('B12-4: 180-degree physical turn emitted as two consecutive 90 turns', () => {
  const store = new SpecSmartCubeStore();
  // Physical U2 is emitted by hardware as U then U
  store.handleIncomingMove('U', 1000);
  store.handleIncomingMove('U', 1030);
  assertEqual(store.getState().moveCount, 2);
  assertEqual(store.getState().moveHistory[1].stepTime, 30);
});

suite.it('B12-5: Rapid burst does not destabilize internal cube state simulator', () => {
  const store = new SpecSmartCubeStore();
  // 6 sexy moves (24 turns)
  for (let i = 0; i < 6; i++) {
    store.handleIncomingMove('R');
    store.handleIncomingMove('U');
    store.handleIncomingMove("R'");
    store.handleIncomingMove("U'");
  }
  assertEqual(store.getState().moveCount, 24);
  assertEqual(store.cubeSimulator.isSolved(), true);
});
