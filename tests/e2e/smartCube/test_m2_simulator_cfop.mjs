// tests/e2e/smartCube/test_m2_simulator_cfop.mjs
// Milestone 2 Verification Suite:
// 1. CubeStateSimulator F & B quarter-turn permutations, group invariants, and algorithm involutions.
// 2. solvePhaseDetector CFOP monotonic phase progression, step skips, and regression guards.

import { createTestSuite, assert, assertEqual } from './helpers/testUtils.mjs';
import { CubeStateSimulator, SOLVED_FACELETS, isFaceletsSolved } from '../../../src/utils/cubeMath.js';
import {
  detectSolvePhase,
  isCrossSolved,
  isF2LSolved,
  isOLLSolved,
  isPLLSolved,
  CFOP_PHASES
} from '../../../src/utils/smartCube/solvePhaseDetector.js';

export const suite = createTestSuite('M2: Cube Simulator Permutations & CFOP Phase Detection');

// ============================================================================
// PART 1: CubeStateSimulator F & B Permutation Invariants & Involutions
// ============================================================================

suite.it('M2-SIM-01: F quarter turn preserves 4-cycle order (F^4 = I)', () => {
  const sim = new CubeStateSimulator();
  assertEqual(sim.isSolved(), true);
  for (let i = 0; i < 4; i++) {
    sim.applyMove('F');
  }
  assertEqual(sim.isSolved(), true, 'Applying F four times must return cube to solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('M2-SIM-02: B quarter turn preserves 4-cycle order (B^4 = I)', () => {
  const sim = new CubeStateSimulator();
  assertEqual(sim.isSolved(), true);
  for (let i = 0; i < 4; i++) {
    sim.applyMove('B');
  }
  assertEqual(sim.isSolved(), true, 'Applying B four times must return cube to solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('M2-SIM-03: F and B inverse pairs cancel out (X X\' = I)', () => {
  const sim = new CubeStateSimulator();
  sim.applyMove('F');
  sim.applyMove("F'");
  assertEqual(sim.isSolved(), true, "F F' must be solved");

  sim.applyMove("B'");
  sim.applyMove('B');
  assertEqual(sim.isSolved(), true, "B' B must be solved");

  sim.applyMove('F2');
  sim.applyMove('F2');
  assertEqual(sim.isSolved(), true, 'F2 F2 must be solved');

  sim.applyMove('B2');
  sim.applyMove('B2');
  assertEqual(sim.isSolved(), true, 'B2 B2 must be solved');
});

suite.it('M2-SIM-04: All 6 face turns satisfy group invariants (X^4 = I and X X\' = I)', () => {
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
  for (const face of faces) {
    const sim = new CubeStateSimulator();
    for (let i = 0; i < 4; i++) {
      sim.applyMove(face);
    }
    assertEqual(sim.isSolved(), true, `${face}^4 must return to solved`);

    sim.applyMove(face);
    sim.applyMove(`${face}'`);
    assertEqual(sim.isSolved(), true, `${face} ${face}' must return to solved`);

    sim.applyMove(`${face}2`);
    sim.applyMove(`${face}2`);
    assertEqual(sim.isSolved(), true, `${face}2 ${face}2 must return to solved`);
  }
});

suite.it('M2-SIM-05: Double T-Perm returns simulator to solved state ((T-Perm)^2 = I)', () => {
  const sim = new CubeStateSimulator();
  const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";

  sim.applyMoves(tPerm);
  assertEqual(sim.isSolved(), false, '1x T-Perm must permute last layer pieces');

  sim.applyMoves(tPerm);
  assertEqual(sim.isSolved(), true, '2x T-Perm must restore cube to completely solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('M2-SIM-06: Double Y-Perm returns simulator to solved state ((Y-Perm)^2 = I)', () => {
  const sim = new CubeStateSimulator();
  const yPerm = "F R U' R' U' R U R' F' R U R' U' R' F R F'";

  sim.applyMoves(yPerm);
  assertEqual(sim.isSolved(), false, '1x Y-Perm must permute corners and edges');

  sim.applyMoves(yPerm);
  assertEqual(sim.isSolved(), true, '2x Y-Perm must restore cube to completely solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('M2-SIM-07: Double Jb-Perm returns simulator to solved state ((Jb-Perm)^2 = I)', () => {
  const sim = new CubeStateSimulator();
  const jbPerm = "R U R' F' R U R' U' R' F R2 U' R' U'";

  sim.applyMoves(jbPerm);
  assertEqual(sim.isSolved(), false, '1x Jb-Perm must be unsolved');

  sim.applyMoves(jbPerm);
  assertEqual(sim.isSolved(), true, '2x Jb-Perm must restore solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('M2-SIM-08: Sledgehammer repeated 6 times returns to solved ((R\' F R F\')^6 = I)', () => {
  const sim = new CubeStateSimulator();
  const sledge = "R' F R F'";
  for (let i = 0; i < 6; i++) {
    sim.applyMoves(sledge);
  }
  assertEqual(sim.isSolved(), true, '6x Sledgehammer must return to solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('M2-SIM-09: Sexy Move repeated 6 times returns to solved ((R U R\' U\')^6 = I)', () => {
  const sim = new CubeStateSimulator();
  const sexy = "R U R' U'";
  for (let i = 0; i < 6; i++) {
    sim.applyMoves(sexy);
  }
  assertEqual(sim.isSolved(), true, '6x Sexy move must return to solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('M2-SIM-10: 20-move WCA scramble and exact reverse returns to solved', () => {
  const sim = new CubeStateSimulator();
  const scramble = "D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2";
  const inverse = "R2 D' F D B2 R B D R B2 U' F2 D R2 F2 U' B2 U R2 D";

  sim.applyMoves(scramble);
  assertEqual(sim.isSolved(), false, 'Cube must be scrambled');

  sim.applyMoves(inverse);
  assertEqual(sim.isSolved(), true, 'Inverting scramble must restore solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

// ============================================================================
// PART 2: CFOP Solve Phase Detection & Monotonic Progression
// ============================================================================

suite.it('M2-CFOP-01: Correctly identifies fully solved cube as complete', () => {
  const sim = new CubeStateSimulator();
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true);
  assertEqual(isF2LSolved(facelets), true);
  assertEqual(isOLLSolved(facelets), true);
  assertEqual(isPLLSolved(facelets), true);

  const res = detectSolvePhase(facelets, 'cross');
  assertEqual(res.phase, 'complete');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-02: Scrambled state stays in cross phase without advance', () => {
  const sim = new CubeStateSimulator();
  sim.applyMoves("D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2");
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), false);
  assertEqual(isF2LSolved(facelets), false);
  assertEqual(isOLLSolved(facelets), false);
  assertEqual(isPLLSolved(facelets), false);

  const res = detectSolvePhase(facelets, 'cross');
  assertEqual(res.phase, 'cross');
  assertEqual(res.isAdvance, false);
});

suite.it('M2-CFOP-03: Cross solved advances phase from cross to f2l', () => {
  // Start from solved, apply moves that disrupt F2L, OLL, PLL but preserve D cross edges
  const sim = new CubeStateSimulator();
  // Sexy move R U R' U' preserves all 4 D cross edges (DF, DR, DB, DL)
  sim.applyMoves("R U R' U'");
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true, 'D cross edges must remain intact');
  assertEqual(isF2LSolved(facelets), false, 'F2L corner/edge are disrupted');

  const res = detectSolvePhase(facelets, 'cross');
  assertEqual(res.phase, 'f2l', 'Must advance to f2l');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-04: F2L solved advances phase from f2l to oll', () => {
  const sim = new CubeStateSimulator();
  // Sune (R U R' U R U2 R') is an OLL algorithm that preserves F2L
  sim.applyMoves("R U R' U R U2 R'");
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true);
  assertEqual(isF2LSolved(facelets), true, 'First two layers must be intact');
  assertEqual(isOLLSolved(facelets), false, 'U face orientation is not solved');

  const res = detectSolvePhase(facelets, 'f2l');
  assertEqual(res.phase, 'oll', 'Must advance to oll');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-05: OLL solved advances phase from oll to pll', () => {
  const sim = new CubeStateSimulator();
  // T-Perm preserves F2L and leaves U face oriented, only permutes last layer
  sim.applyMoves("R U R' U' R' F R2 U' R' U' R U R' F'");
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true);
  assertEqual(isF2LSolved(facelets), true);
  assertEqual(isOLLSolved(facelets), true, 'All 9 U face stickers match U center');
  assertEqual(isPLLSolved(facelets), false, 'Last layer permutation is not solved');

  const res = detectSolvePhase(facelets, 'oll');
  assertEqual(res.phase, 'pll', 'Must advance to pll');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-06: PLL solved advances phase from pll to complete', () => {
  const sim = new CubeStateSimulator();
  const facelets = sim.getFaceletString();

  const res = detectSolvePhase(facelets, 'pll');
  assertEqual(res.phase, 'complete');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-07: OLL skip advances directly from f2l to pll', () => {
  const sim = new CubeStateSimulator();
  // A PLL algorithm applied to a solved cube has F2L solved AND OLL solved (OLL skip)
  sim.applyMoves("R U R' F' R U R' U' R' F R2 U' R' U'"); // Jb-Perm
  const facelets = sim.getFaceletString();

  // If solver was in f2l phase and completes F2L with an OLL skip:
  const res = detectSolvePhase(facelets, 'f2l');
  assertEqual(res.phase, 'pll', 'OLL skip must advance straight to pll');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-08: PLL skip advances directly from oll to complete', () => {
  const sim = new CubeStateSimulator();
  // Solved cube with solver currently in oll phase
  const facelets = sim.getFaceletString();

  const res = detectSolvePhase(facelets, 'oll');
  assertEqual(res.phase, 'complete', 'PLL skip must advance straight to complete');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-09: Monotonic progression never regresses to an earlier phase', () => {
  const sim = new CubeStateSimulator();
  sim.applyMoves("D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2");
  const facelets = sim.getFaceletString();

  // Even though cube is completely scrambled:
  // If solver had reached 'f2l', phase must remain 'f2l'
  const resF2L = detectSolvePhase(facelets, 'f2l');
  assertEqual(resF2L.phase, 'f2l');
  assertEqual(resF2L.isAdvance, false);

  // If solver had reached 'oll', phase must remain 'oll'
  const resOLL = detectSolvePhase(facelets, 'oll');
  assertEqual(resOLL.phase, 'oll');
  assertEqual(resOLL.isAdvance, false);

  // If solver had reached 'pll', phase must remain 'pll'
  const resPLL = detectSolvePhase(facelets, 'pll');
  assertEqual(resPLL.phase, 'pll');
  assertEqual(resPLL.isAdvance, false);

  // If solve was complete, it must remain 'complete'
  const resComp = detectSolvePhase(facelets, 'complete');
  assertEqual(resComp.phase, 'complete');
  assertEqual(resComp.isAdvance, false);
});

suite.it('M2-CFOP-10: Step-by-step complete CFOP solve progression', () => {
  // Simulate an authentic complete CFOP solve sequence:
  // 1. Scramble
  const sim = new CubeStateSimulator();
  let phase = 'cross';

  // State 0: Scrambled
  sim.applyMoves("D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2");
  let res = detectSolvePhase(sim.getFaceletString(), phase);
  assertEqual(res.phase, 'cross');
  assertEqual(res.isAdvance, false);

  // Re-create progressive states from solved:
  // State 1: Cross completed (F2L broken)
  const simCross = new CubeStateSimulator();
  simCross.applyMoves("R U R' U'");
  res = detectSolvePhase(simCross.getFaceletString(), phase);
  assertEqual(res.phase, 'f2l');
  assertEqual(res.isAdvance, true);
  phase = res.phase; // Now in 'f2l'

  // State 2: F2L completed (OLL broken)
  const simF2L = new CubeStateSimulator();
  simF2L.applyMoves("R U R' U R U2 R'"); // Sune
  res = detectSolvePhase(simF2L.getFaceletString(), phase);
  assertEqual(res.phase, 'oll');
  assertEqual(res.isAdvance, true);
  phase = res.phase; // Now in 'oll'

  // State 3: OLL completed (PLL broken)
  const simOLL = new CubeStateSimulator();
  simOLL.applyMoves("R U R' U' R' F R2 U' R' U' R U R' F'"); // T-Perm
  res = detectSolvePhase(simOLL.getFaceletString(), phase);
  assertEqual(res.phase, 'pll');
  assertEqual(res.isAdvance, true);
  phase = res.phase; // Now in 'pll'

  // State 4: PLL completed (Cube fully solved)
  const simSolved = new CubeStateSimulator();
  res = detectSolvePhase(simSolved.getFaceletString(), phase);
  assertEqual(res.phase, 'complete');
  assertEqual(res.isAdvance, true);
  phase = res.phase;

  // Final check: already complete
  res = detectSolvePhase(simSolved.getFaceletString(), phase);
  assertEqual(res.phase, 'complete');
  assertEqual(res.isAdvance, false);
});

suite.it('M2-CFOP-11: Defensive handling for invalid inputs', () => {
  assertEqual(isCrossSolved(''), false);
  assertEqual(isCrossSolved(null), false);
  assertEqual(isF2LSolved('short'), false);
  assertEqual(isOLLSolved(undefined), false);
  assertEqual(isPLLSolved([]), false);

  const res1 = detectSolvePhase('invalid', 'oll');
  assertEqual(res1.phase, 'oll');
  assertEqual(res1.isAdvance, false);

  const res2 = detectSolvePhase(SOLVED_FACELETS, 'unknown_phase');
  assertEqual(res2.phase, 'complete');
  assertEqual(res2.isAdvance, true);
});

suite.it('M2-CFOP-12: Swapped cross edges fail isCrossSolved', () => {
  const sim = new CubeStateSimulator();
  // D2 swaps DF and DB without affecting orientation, but they are in wrong positions
  // To swap just two edges: (M2 U2 M2 U2) swaps UB and UF, or (D R2 D' R2...)
  // Let's swap DF and DB directly:
  sim.applyMoves("R2 L2 U2 R2 L2 D2");
  const facelets = sim.getFaceletString();
  assertEqual(isCrossSolved(facelets), false, 'Cross edges swapped must return false');
});

suite.it('M2-CFOP-13: F2L with misplaced corner fails isF2LSolved', () => {
  const sim = new CubeStateSimulator();
  // Swap DFL and DFR corners while leaving edges and cross intact
  // Permutation of corners:
  sim.applyMoves("R U R' U' R U R' U' R U R' U'"); // 3x Sexy move swaps pairs
  const facelets = sim.getFaceletString();
  assertEqual(isCrossSolved(facelets), true, 'Cross is intact');
  assertEqual(isF2LSolved(facelets), false, 'Misplaced corners must fail F2L');
});

suite.it('M2-CFOP-14: OLL with 8 U stickers instead of 9 fails isOLLSolved', () => {
  const sim = new CubeStateSimulator();
  sim.applyMoves("R U2 R' U' R U' R'"); // Antisune (twists corners)
  const facelets = sim.getFaceletString();
  assertEqual(isF2LSolved(facelets), true);
  assertEqual(isOLLSolved(facelets), false, 'Twisted U corner must fail OLL');
});

suite.it('M2-CFOP-15: Superflip 20-move algorithm order 2 verification', () => {
  const sim = new CubeStateSimulator();
  const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
  sim.applyMoves(superflip);
  assertEqual(sim.isSolved(), false, 'Superflip flips all 12 edges');
  sim.applyMoves(superflip);
  assertEqual(sim.isSolved(), true, 'Superflip x 2 must restore solved state');
});

suite.it('M2-CFOP-16: detectSolvePhase accepts facelet arrays as well as strings', () => {
  const arr = SOLVED_FACELETS.split('');
  const res = detectSolvePhase(arr, 'cross');
  assertEqual(res.phase, 'complete');
  assertEqual(res.isAdvance, true);
});

suite.it('M2-CFOP-17: Random move walks under monotonic phase lock', () => {
  const phases = ['cross', 'f2l', 'oll', 'pll', 'complete'];
  const rank = { cross: 0, f2l: 1, oll: 2, pll: 3, complete: 4 };

  const randomMoves = ['U', "U'", 'D', 'R', "R'", 'F', 'B', 'L', 'F2', 'B2'];
  for (const startPhase of phases) {
    const sim = new CubeStateSimulator();
    // Apply 30 random moves
    for (let i = 0; i < 30; i++) {
      const m = randomMoves[i % randomMoves.length];
      sim.applyMove(m);
      const res = detectSolvePhase(sim.getFaceletString(), startPhase);
      assert(rank[res.phase] >= rank[startPhase], `Phase ${res.phase} must never be lower than start ${startPhase}`);
    }
  }
});

suite.it('M2-CFOP-18: Exported CFOP_PHASES constant and isFaceletsSolved contracts', () => {
  assertEqual(Array.isArray(CFOP_PHASES), true);
  assertEqual(CFOP_PHASES.join(','), 'cross,f2l,oll,pll,complete');
  assertEqual(isFaceletsSolved(SOLVED_FACELETS), true);
  assertEqual(isFaceletsSolved(''), false);
});

// Self-executing runner if invoked directly via `node test_m2_simulator_cfop.mjs`
if (process.argv[1]?.replace(/\\/g, '/').endsWith('test_m2_simulator_cfop.mjs')) {
  suite.run().then(res => {
    console.log(`\n${suite.name}: ${res.passed}/${res.total} tests passed (${res.durationMs}ms)`);
    if (res.errors.length > 0) {
      console.error(res.errors);
      process.exit(1);
    }
  });
}
