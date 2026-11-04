// tests/e2e/smartCube/tier2_boundaries/boundary_f17_false_positive_solve_checks.mjs
// Boundary F17: False Positive Solve Checks (Checkerboard, Superflip, Parity) (5 tests)

import { createTestSuite, assert, assertEqual, isFaceletsSolved, SOLVED_FACELETS, CubeStateSimulator } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('Boundary F17: False Positive Solve Checks');

suite.it('B17-1: Checkerboard pattern (M2 E2 S2) is NOT recognized as solved', () => {
  const sim = new CubeStateSimulator(SOLVED_FACELETS);
  // Checkerboard using face turns: R2 L2 U2 D2 F2 B2
  sim.applyMoves("R R L L U U D D F F B B");
  assertEqual(sim.isSolved(), false, 'Checkerboard is not solved');
});

suite.it('B17-2: Cube with 2 swapped corners (PLL T-perm) is NOT recognized as solved', () => {
  const sim = new CubeStateSimulator(SOLVED_FACELETS);
  // T-perm: R U R' U' R' F R2 U' R' U' R U R' F'
  sim.applyMoves("R U R' U' R' F R R U' R' U' R U R' F'");
  assertEqual(sim.isSolved(), false, 'T-perm state must not be solved');
});

suite.it('B17-3: Cube with 2 swapped edges (PLL H-perm) is NOT recognized as solved', () => {
  const sim = new CubeStateSimulator(SOLVED_FACELETS);
  // H-perm: M2 U M2 U2 M2 U M2
  // Using R2 L2 D R2 L2 U2 R2 L2 D R2 L2
  sim.applyMoves("R R L L D R R L L U U R R L L D R R L L");
  assertEqual(sim.isSolved(), false, 'H-perm state must not be solved');
});

suite.it('B17-4: Single twisted corner is NOT recognized as solved', () => {
  const facelets = SOLVED_FACELETS.split('');
  // Corrupt corner U1/L1/B1
  facelets[0] = 'L';
  facelets[36] = 'B';
  facelets[47] = 'U';
  assertEqual(isFaceletsSolved(facelets.join('')), false);
});

suite.it('B17-5: Empty or malformed facelet string returns false safely without throwing', () => {
  assertEqual(isFaceletsSolved(''), false);
  assertEqual(isFaceletsSolved(null), false);
  assertEqual(isFaceletsSolved(undefined), false);
  assertEqual(isFaceletsSolved('SHORT_STRING'), false);
});
