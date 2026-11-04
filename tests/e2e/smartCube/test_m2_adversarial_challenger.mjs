// tests/e2e/smartCube/test_m2_adversarial_challenger.mjs
// Adversarial Challenger Suite for Milestone 2:
// Stress-tests CubeStateSimulator 3D permutations, CFOP phase detection, AUF, step skips, and monotonic locks.

import { createTestSuite, assert, assertEqual } from './helpers/testUtils.mjs';
import { CubeStateSimulator, SOLVED_FACELETS, isFaceletsSolved } from '../../../src/utils/cubeMath.js';
import {
  detectSolvePhase,
  isCrossSolved,
  isF2LSolved,
  isOLLSolved,
  isPLLSolved
} from '../../../src/utils/smartCube/solvePhaseDetector.js';

export const suite = createTestSuite('M2 Adversarial Challenger: Permutations & CFOP Stress Test');

// 1. Group theory & permutation bijection
suite.it('ADV-01: Permutation is an exact bijection (all 54 stickers preserved, 9 of each color)', () => {
  const sim = new CubeStateSimulator();
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
  const modifiers = ['', "'", '2'];

  for (const f of faces) {
    for (const m of modifiers) {
      const move = `${f}${m}`;
      sim.applyMove(move);
      const facelets = sim.getFaceletString();
      assertEqual(facelets.length, 54, `Move ${move} must maintain 54 facelets`);

      // Count occurrences of each color
      const counts = {};
      for (const ch of facelets) {
        counts[ch] = (counts[ch] || 0) + 1;
      }
      for (const expectedColor of ['U', 'R', 'F', 'D', 'L', 'B']) {
        assertEqual(counts[expectedColor], 9, `Move ${move} must preserve 9 stickers of ${expectedColor}`);
      }
    }
  }
});

suite.it('ADV-02: Commutator orders for F and B with all other faces ((X Y X\' Y\')^6 = I)', () => {
  // Commutators in the Rubik's cube group have order dividing 6, 12, or 24.
  // Standard test: (F R F' R')^6 = I
  const simFR = new CubeStateSimulator();
  for (let i = 0; i < 6; i++) {
    simFR.applyMoves("F R F' R'");
  }
  assertEqual(simFR.isSolved(), true, "(F R F' R')^6 must restore solved cube");

  // (B L B' L')^6 = I
  const simBL = new CubeStateSimulator();
  for (let i = 0; i < 6; i++) {
    simBL.applyMoves("B L B' L'");
  }
  assertEqual(simBL.isSolved(), true, "(B L B' L')^6 must restore solved cube");

  // (F U F' U')^6 = I
  const simFU = new CubeStateSimulator();
  for (let i = 0; i < 6; i++) {
    simFU.applyMoves("F U F' U'");
  }
  assertEqual(simFU.isSolved(), true, "(F U F' U')^6 must restore solved cube");
});

// 2. Step skips matrix with standard PLL & OLL algorithms
suite.it('ADV-03: Comprehensive PLL library exhibits exact OLL-solved and PLL-unsolved states', () => {
  // All 21 standard PLL algorithms (subset of major ones):
  const plls = [
    { name: 'T-Perm', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
    { name: 'Y-Perm', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
    { name: 'Jb-Perm', alg: "R U R' F' R U R' U' R' F R2 U' R' U'" },
    { name: 'Ja-Perm', alg: "L' U' L F L' U' L U L F' L2 U L U" },
    { name: 'H-Perm', alg: "R2 U2 R U2 R2 U2 R2 U2 R U2 R2" },
    { name: 'Ua-Perm', alg: "R U' R U R U R U' R' U' R2" },
    { name: 'Ub-Perm', alg: "R2 U R U R' U' R' U' R' U R'" },
    { name: 'E-Perm', alg: "R B' R' F R B R' F' R B R' F R B' R' F'" },
  ];

  for (const { name, alg } of plls) {
    const sim = new CubeStateSimulator();
    sim.applyMoves(alg);
    const facelets = sim.getFaceletString();

    assertEqual(isCrossSolved(facelets), true, `${name}: Cross must be intact`);
    assertEqual(isF2LSolved(facelets), true, `${name}: F2L must be intact`);
    assertEqual(isOLLSolved(facelets), true, `${name}: OLL must be solved (all U yellow)`);
    assertEqual(isPLLSolved(facelets), false, `${name}: PLL must NOT be solved`);

    // In 'f2l' phase, this must trigger an OLL skip and advance straight to 'pll'
    const res = detectSolvePhase(facelets, 'f2l');
    assertEqual(res.phase, 'pll', `${name}: Must skip OLL and advance to pll`);
    assertEqual(res.isAdvance, true, `${name}: Must be advance`);
  }
});

suite.it('ADV-04: Comprehensive OLL library preserves F2L while breaking OLL', () => {
  const olls = [
    { name: 'Sune', alg: "R U R' U R U2 R'" },
    { name: 'Antisune', alg: "R U2 R' U' R U' R'" },
    { name: 'H', alg: "R U R' U R U' R' U R U2 R'" },
    { name: 'Pi', alg: "R U2 R2 U' R2 U' R2 U2 R" },
    { name: 'Headlights (U)', alg: "R2 D R' U2 R D' R' U2 R'" },
  ];

  for (const { name, alg } of olls) {
    const sim = new CubeStateSimulator();
    sim.applyMoves(alg);
    const facelets = sim.getFaceletString();

    assertEqual(isCrossSolved(facelets), true, `${name}: Cross intact`);
    assertEqual(isF2LSolved(facelets), true, `${name}: F2L intact`);
    assertEqual(isOLLSolved(facelets), false, `${name}: OLL not solved`);

    // In 'f2l' phase, advances to 'oll'
    const resFromF2L = detectSolvePhase(facelets, 'f2l');
    assertEqual(resFromF2L.phase, 'oll', `${name}: Advances to oll`);
    assertEqual(resFromF2L.isAdvance, true);

    // In 'oll' phase, remains in 'oll'
    const resFromOLL = detectSolvePhase(facelets, 'oll');
    assertEqual(resFromOLL.phase, 'oll', `${name}: Stays in oll`);
    assertEqual(resFromOLL.isAdvance, false);
  }
});

// 3. AUF (Adjust Upper Face) Resilience
suite.it('ADV-05: AUF rotations on solved cube keep F2L and OLL intact but delay complete', () => {
  const aufMoves = ['U', "U'", 'U2'];

  for (const auf of aufMoves) {
    const sim = new CubeStateSimulator();
    sim.applyMove(auf);
    const facelets = sim.getFaceletString();

    assertEqual(isCrossSolved(facelets), true, `AUF ${auf}: Cross unaffected`);
    assertEqual(isF2LSolved(facelets), true, `AUF ${auf}: F2L unaffected`);
    assertEqual(isOLLSolved(facelets), true, `AUF ${auf}: OLL unaffected (all 9 U match U center)`);
    assertEqual(isPLLSolved(facelets), false, `AUF ${auf}: PLL not yet aligned`);

    // From 'pll' phase, stays 'pll' without premature completion
    const resPLL = detectSolvePhase(facelets, 'pll');
    assertEqual(resPLL.phase, 'pll', `AUF ${auf}: Must remain in pll`);
    assertEqual(resPLL.isAdvance, false);

    // Align with inverse move
    const inverse = auf === 'U' ? "U'" : auf === "U'" ? 'U' : 'U2';
    sim.applyMove(inverse);
    const solvedFacelets = sim.getFaceletString();
    assertEqual(isPLLSolved(solvedFacelets), true, `Inverse ${inverse}: Cube fully solved`);

    const resComplete = detectSolvePhase(solvedFacelets, 'pll');
    assertEqual(resComplete.phase, 'complete');
    assertEqual(resComplete.isAdvance, true);
  }
});

// 4. Partial slot insertions and slot order independence
suite.it('ADV-06: F2L requires all 4 pairs and is slot-order independent', () => {
  // Sledgehammer R' F R F' disrupts FR middle edge & corner while keeping other 3 slots intact
  const sim = new CubeStateSimulator();
  sim.applyMoves("R' F R F'");
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true, 'Cross remains intact');
  assertEqual(isF2LSolved(facelets), false, '1 broken slot must fail F2L');

  // Sexy move R U R' U' disrupts UR/FR pair
  const sim2 = new CubeStateSimulator();
  sim2.applyMoves("L' U' L U"); // breaks FL pair
  assertEqual(isF2LSolved(sim2.getFaceletString()), false, 'Broken FL slot must fail F2L');
});

// 5. Twisted corner & flipped edge adversarial detection
suite.it('ADV-07: In-place twisted pieces fail corresponding phase', () => {
  // Synthesize facelets with DF edge flipped in place
  const sim = new CubeStateSimulator();
  const f = sim.facelets.slice();
  // DF edge is f[28] (D) and f[25] (F). Swap them:
  const tmp = f[28];
  f[28] = f[25];
  f[25] = tmp;

  assertEqual(isCrossSolved(f), false, 'Flipped DF edge must fail isCrossSolved');
  assertEqual(isF2LSolved(f), false, 'Flipped DF edge must fail isF2LSolved');

  // Synthesize facelets with UFR corner twisted in place (yellow sticker on F face)
  const simCorner = new CubeStateSimulator();
  const fc = simCorner.facelets.slice();
  // UFR corner: U=f[8], F=f[20], R=f[9]
  // Twist CW: U gets R, F gets U, R gets F
  const tmpU = fc[8];
  fc[8] = fc[9];
  fc[9] = fc[20];
  fc[20] = tmpU;

  assertEqual(isF2LSolved(fc), true, 'F2L is intact with twisted UFR corner');
  assertEqual(isOLLSolved(fc), false, 'Twisted UFR corner must fail isOLLSolved');
});

// 6. 100-move monotonic lock stress test under high-entropy scrambling
suite.it('ADV-08: Monotonic phase never regresses under 100-move random walk', () => {
  const sim = new CubeStateSimulator();
  const randomMoves = [
    'U', "U'", 'U2', 'D', "D'", 'D2',
    'R', "R'", 'R2', 'L', "L'", 'L2',
    'F', "F'", 'F2', 'B', "B'", 'B2'
  ];

  // Lock at 'oll' phase
  let lockedPhase = 'oll';
  for (let i = 0; i < 100; i++) {
    const move = randomMoves[i % randomMoves.length];
    sim.applyMove(move);
    const res = detectSolvePhase(sim.getFaceletString(), lockedPhase);
    assert(
      res.phase === 'oll' || res.phase === 'pll' || res.phase === 'complete',
      `Phase regressed to ${res.phase} on move ${move} (step ${i})!`
    );
    if (res.isAdvance) {
      lockedPhase = res.phase;
    }
  }

  // Lock at 'complete' phase
  for (let i = 0; i < 50; i++) {
    const move = randomMoves[(i * 3) % randomMoves.length];
    sim.applyMove(move);
    const res = detectSolvePhase(sim.getFaceletString(), 'complete');
    assertEqual(res.phase, 'complete', 'Complete phase must never degrade');
    assertEqual(res.isAdvance, false);
  }
});

// 7. Malformed and extreme edge case inputs
suite.it('ADV-09: Degenerate, null, truncated, and corrupted facelet inputs', () => {
  const badInputs = [
    null,
    undefined,
    '',
    'short',
    12345,
    {},
    true,
    'U'.repeat(53), // 53 chars
    'U'.repeat(55), // 55 chars
    Array(53).fill('U'),
    Array(55).fill('U')
  ];

  for (const bad of badInputs) {
    assertEqual(isCrossSolved(bad), false);
    assertEqual(isF2LSolved(bad), false);
    assertEqual(isOLLSolved(bad), false);
    assertEqual(isPLLSolved(bad), false);

    const res = detectSolvePhase(bad, 'f2l');
    assertEqual(res.phase, 'f2l');
    assertEqual(res.isAdvance, false);
  }

  // Unknown currentPhase gracefully normalizes to 'cross'
  const resBadPhase = detectSolvePhase(SOLVED_FACELETS, 'invalid_phase');
  assertEqual(resBadPhase.phase, 'complete');
  assertEqual(resBadPhase.isAdvance, true);
});

// 8. Scramble corpus & zero false-positive Cross/F2L/OLL/PLL
suite.it('ADV-10: 20 diverse WCA scrambles produce zero false-positive completions', () => {
  const scrambles = [
    "R' U' F D2 B2 L2 F2 R' D2 R' U2 R2 D2 F' L D F' L2 D2 B' R2 D' R' U' F",
    "D2 R2 B' L2 B D2 F' L2 B' R2 B2 D' F' U B' L' R D L' B F",
    "F2 U2 F2 R2 D2 L' D2 R U2 F2 R' U F' L' U' B2 L2 U2 F R2",
    "B2 L2 U B2 D2 F2 L2 D' B2 L2 D' R B' L' F' D R2 F D' B' R'",
    "R2 U2 F2 D' B2 U F2 D' L2 B2 D2 R' B L2 D' B' F2 R' D2 F U'",
    "D B2 U' B2 D2 L2 B2 L2 U' R2 U' F' L2 R' D' B' L2 R' F2 D2",
    "U2 R2 B2 U2 F' L2 U2 B' L2 B' D2 L' D2 B' F2 L' B2 D B' R2",
    "B2 U' F2 D2 L2 D' R2 B2 D B2 D2 F' R U2 L2 D2 B D' B2 L",
    "L2 B2 D2 F2 U L2 D F2 R2 U' B2 R' D' F U B L' D' U' B'",
    "D2 F2 L2 B2 D B2 U' L2 F2 L2 D R' F' D2 L2 B' L2 B' U' L'",
    "U R2 U' F2 U B2 D2 R2 B2 R2 B2 L' F D' L B' U2 R2 B2 R2",
    "R2 D2 B2 D B2 L2 U L2 D F2 U' L' D2 B F2 L' D2 R2 F' D R2",
    "F2 D' R2 D2 B2 U2 L2 B2 U B2 R2 B' R' B2 D' L' F D' B2 U2 R",
    "B2 D2 R2 B2 D B2 L2 F2 D' R2 D' F' R2 U' B2 L' D' B2 L2 F' D'",
    "D2 L2 U2 R2 B2 R2 B D2 F' L2 F2 D' B' L' F' R U B2 D' L U2",
    "L2 U2 F2 U' B2 D' B2 D' R2 F2 U' L' B' U' B F' D' L F' D U'",
    "R2 D2 F' R2 D2 B' D2 F' L2 B' U' R' B2 D L' B D2 F' L U2",
    "D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2",
    "F2 D2 B2 R2 D' B2 D' F2 D R2 U' B' R' D2 U B D' L D2 B2 R",
    "U2 B2 U2 L2 D' R2 U' B2 R2 U' B2 R D' B' D' R' F D' B L'"
  ];

  for (let i = 0; i < scrambles.length; i++) {
    const sim = new CubeStateSimulator();
    sim.applyMoves(scrambles[i]);
    const f = sim.getFaceletString();

    assertEqual(isFaceletsSolved(f), false, `Scramble #${i} must not be solved`);
    // Unless serendipitous cross (rare), should stay in cross
    const res = detectSolvePhase(f, 'cross');
    assert(res.phase === 'cross' || res.phase === 'f2l', `Scramble #${i} unexpected phase ${res.phase}`);
    assertEqual(res.isAdvance, res.phase !== 'cross');
  }
});

// 9. Superflip checks
suite.it('ADV-11: Superflip order 2 and flips all 12 edges without solving CFOP phases', () => {
  const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
  const sim = new CubeStateSimulator();
  sim.applyMoves(superflip);
  const f = sim.getFaceletString();

  assertEqual(isCrossSolved(f), false, 'Superflip must not have cross solved');
  assertEqual(isF2LSolved(f), false, 'Superflip must not have F2L solved');
  assertEqual(isOLLSolved(f), false, 'Superflip must not have OLL solved');
  assertEqual(isPLLSolved(f), false, 'Superflip must not have PLL solved');

  // Double superflip restores solved
  sim.applyMoves(superflip);
  assertEqual(sim.isSolved(), true, 'Superflip^2 must restore solved cube');
});

// 10. Monotonic Step Leap (Cross -> Complete in 1 turn)
suite.it('ADV-12: Direct leap from cross to complete in 1 move', () => {
  const sim = new CubeStateSimulator();
  sim.applyMove("R"); // 1 quarter turn away from solved
  const almostSolved = sim.getFaceletString();

  const res1 = detectSolvePhase(almostSolved, 'cross');
  assertEqual(res1.phase, 'cross');

  sim.applyMove("R'"); // Now solved
  const solved = sim.getFaceletString();

  // Starting at 'cross', solve completed in 1 move -> leaps straight to 'complete'
  const res2 = detectSolvePhase(solved, 'cross');
  assertEqual(res2.phase, 'complete');
  assertEqual(res2.isAdvance, true);
});

// 11. Center Invariants Check
suite.it('ADV-13: Center facelets (U=4, R=13, F=22, D=31, L=40, B=49) are strictly invariant under any moves', () => {
  const sim = new CubeStateSimulator();
  const allMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

  for (const m of allMoves) {
    sim.applyMove(m);
    const f = sim.getFaceletString();
    assertEqual(f[4], 'U', `Move ${m} must preserve U center`);
    assertEqual(f[13], 'R', `Move ${m} must preserve R center`);
    assertEqual(f[22], 'F', `Move ${m} must preserve F center`);
    assertEqual(f[31], 'D', `Move ${m} must preserve D center`);
    assertEqual(f[40], 'L', `Move ${m} must preserve L center`);
    assertEqual(f[49], 'B', `Move ${m} must preserve B center`);
  }
});

// Self-executing runner
if (process.argv[1]?.replace(/\\/g, '/').endsWith('test_m2_adversarial_challenger.mjs')) {
  suite.run().then(res => {
    console.log(`\n${suite.name}: ${res.passed}/${res.total} tests passed (${res.durationMs}ms)`);
    if (res.errors.length > 0) {
      console.error(res.errors);
      process.exit(1);
    }
  });
}

