// tests/e2e/smartCube/tier1_features/test_f17_solve_detection.mjs
// F17: Instant Solve State Detection (5 tests)

import { createTestSuite, assert, assertEqual, isFaceletsSolved, SOLVED_FACELETS, CubeStateSimulator } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('F17: Instant Solve State Detection');

suite.it('F17-1: Detects canonical solved facelet string as solved', () => {
  assertEqual(isFaceletsSolved(SOLVED_FACELETS), true);
});

suite.it('F17-2: Returns false for scrambled facelet state', () => {
  const sim = new CubeStateSimulator(SOLVED_FACELETS);
  sim.applyMoves("R U R' U'");
  assertEqual(isFaceletsSolved(sim.getFaceletString()), false);
});

suite.it('F17-3: Returns false for a single quarter turn difference (AUF / U move)', () => {
  const sim = new CubeStateSimulator(SOLVED_FACELETS);
  sim.applyMove('U');
  assertEqual(sim.isSolved(), false);
});

suite.it('F17-4: Returns true after applying complete algorithm inverse to restore solved state', () => {
  const sim = new CubeStateSimulator(SOLVED_FACELETS);
  sim.applyMoves("R U R' U'");
  assertEqual(sim.isSolved(), false);

  sim.applyMoves("U R U' R'");
  assertEqual(sim.isSolved(), true);
});

suite.it('F17-5: Sexy move 6 times restores cube to solved state', () => {
  const sim = new CubeStateSimulator(SOLVED_FACELETS);
  for (let i = 0; i < 6; i++) {
    sim.applyMoves("R U R' U'");
  }
  assertEqual(sim.isSolved(), true);
});
