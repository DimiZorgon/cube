// tests/e2e/smartCube/test_m2_auditor_stress.mjs
// Independent Forensic Auditor Adversarial Stress Suite for Milestone 2

import assert from 'node:assert/strict';
import { CubeStateSimulator, SOLVED_FACELETS, isFaceletsSolved } from '../../../src/utils/cubeMath.js';
import {
  detectSolvePhase,
  isCrossSolved,
  isF2LSolved,
  isOLLSolved,
  isPLLSolved
} from '../../../src/utils/smartCube/solvePhaseDetector.js';

console.log('======================================================================');
console.log(' FORENSIC AUDITOR ADVERSARIAL STRESS SUITE: MILESTONE 2');
console.log('======================================================================\n');

let total = 0;
let passed = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Group Theory Invariants & Commutators for F and B
// ---------------------------------------------------------------------------

test('AUD-SIM-01: F and B commute ([F, B] = I -> F B F\' B\' = I)', () => {
  const sim = new CubeStateSimulator();
  sim.applyMoves("F B F' B'");
  assert.equal(sim.isSolved(), true);
  assert.equal(sim.getFaceletString(), SOLVED_FACELETS);
});

test('AUD-SIM-02: F2 and B2 commute (F2 B2 F2 B2 = I)', () => {
  const sim = new CubeStateSimulator();
  sim.applyMoves("F2 B2 F2 B2");
  assert.equal(sim.isSolved(), true);
  assert.equal(sim.getFaceletString(), SOLVED_FACELETS);
});

test('AUD-SIM-03: (R2 F2)^6 = I (order 6 group element)', () => {
  const sim = new CubeStateSimulator();
  for (let i = 0; i < 6; i++) {
    sim.applyMoves("R2 F2");
  }
  assert.equal(sim.isSolved(), true, '(R2 F2)^6 must restore solved state');
});

test('AUD-SIM-04: (R2 B2)^6 = I (order 6 group element)', () => {
  const sim = new CubeStateSimulator();
  for (let i = 0; i < 6; i++) {
    sim.applyMoves("R2 B2");
  }
  assert.equal(sim.isSolved(), true, '(R2 B2)^6 must restore solved state');
});

test('AUD-SIM-05: (R F)^105 = I (order 105 group element)', () => {
  const sim = new CubeStateSimulator();
  for (let i = 0; i < 105; i++) {
    sim.applyMoves("R F");
  }
  assert.equal(sim.isSolved(), true, '(R F)^105 must restore solved state');
});

test('AUD-SIM-06: (R B)^105 = I (order 105 group element)', () => {
  const sim = new CubeStateSimulator();
  for (let i = 0; i < 105; i++) {
    sim.applyMoves("R B");
  }
  assert.equal(sim.isSolved(), true, '(R B)^105 must restore solved state');
});

test('AUD-SIM-07: All 8 face commutators with F & B have order 6', () => {
  const commutators = [
    "F R F' R'",
    "F L F' L'",
    "F U F' U'",
    "F D F' D'",
    "B R B' R'",
    "B L B' L'",
    "B U B' U'",
    "B D B' D'"
  ];
  for (const comm of commutators) {
    const sim = new CubeStateSimulator();
    for (let i = 0; i < 6; i++) {
      sim.applyMoves(comm);
    }
    assert.equal(sim.isSolved(), true, `(${comm})^6 must restore solved state`);
  }
});

test('AUD-SIM-08: Center facelets (4, 13, 22, 31, 40, 49) are strictly invariant under any moves', () => {
  const sim = new CubeStateSimulator();
  const centersBefore = [
    sim.facelets[4], sim.facelets[13], sim.facelets[22],
    sim.facelets[31], sim.facelets[40], sim.facelets[49]
  ];
  assert.deepEqual(centersBefore, ['U', 'R', 'F', 'D', 'L', 'B']);

  const complexScramble = "R U R' U' F' U2 F U R U2 R' D R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2";
  sim.applyMoves(complexScramble);

  const centersAfter = [
    sim.facelets[4], sim.facelets[13], sim.facelets[22],
    sim.facelets[31], sim.facelets[40], sim.facelets[49]
  ];
  assert.deepEqual(centersAfter, ['U', 'R', 'F', 'D', 'L', 'B']);
});

test('AUD-SIM-09: Conservation of facelet color distribution across 1000 turns', () => {
  const sim = new CubeStateSimulator();
  const moves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
  for (let i = 0; i < 1000; i++) {
    sim.applyMove(moves[i % moves.length]);
  }
  const counts = {};
  for (const ch of sim.facelets) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  assert.deepEqual(counts, { U: 9, R: 9, F: 9, D: 9, L: 9, B: 9 });
});

// ---------------------------------------------------------------------------
// 2. CFOP Phase Detector Adversarial Boundary & False-Positive Tests
// ---------------------------------------------------------------------------

test('AUD-CFOP-01: Inverted DF edge prevents isCrossSolved', () => {
  const simFlip = new CubeStateSimulator();
  const f = [...simFlip.facelets];
  // Swap DF facelets: f[28] is D side of DF, f[25] is F side of DF
  const tmp = f[28];
  f[28] = f[25];
  f[25] = tmp;
  const flippedFacelets = f.join('');

  assert.equal(isCrossSolved(flippedFacelets), false, 'Flipped cross edge must fail isCrossSolved');
  assert.equal(isF2LSolved(flippedFacelets), false);
  assert.equal(isOLLSolved(flippedFacelets), false);
  assert.equal(isPLLSolved(flippedFacelets), false);
});

test('AUD-CFOP-02: Misplaced cross edge (DF and DB swapped) fails isCrossSolved', () => {
  const sim = new CubeStateSimulator();
  // Swap DF and DB
  const f = [...sim.facelets];
  // DF: D=28, F=25. DB: D=34, B=52.
  const tD = f[28]; f[28] = f[34]; f[34] = tD;
  const tAdj = f[25]; f[25] = f[52]; f[52] = tAdj;
  const swapped = f.join('');

  assert.equal(isCrossSolved(swapped), false, 'Cross edges in swapped slots must fail isCrossSolved');
});

test('AUD-CFOP-03: F2L with single twisted corner fails isF2LSolved', () => {
  const sim = new CubeStateSimulator();
  const f = [...sim.facelets];
  // DFL corner: D=27, F=24, L=44. Twist CW: D->F, F->L, L->D
  const t = f[27];
  f[27] = f[44];
  f[44] = f[24];
  f[24] = t;
  const twisted = f.join('');

  assert.equal(isCrossSolved(twisted), true, 'Cross is untouched');
  assert.equal(isF2LSolved(twisted), false, 'Twisted corner must fail isF2LSolved');
});

test('AUD-CFOP-04: F2L with single flipped middle edge fails isF2LSolved', () => {
  const sim = new CubeStateSimulator();
  const f = [...sim.facelets];
  // FR middle edge: F=23, R=12. Flip stickers:
  const t = f[23];
  f[23] = f[12];
  f[12] = t;
  const flippedEdge = f.join('');

  assert.equal(isCrossSolved(flippedEdge), true, 'Cross is untouched');
  assert.equal(isF2LSolved(flippedEdge), false, 'Flipped middle edge must fail isF2LSolved');
});

test('AUD-CFOP-05: OLL with U-perm fails isPLLSolved but passes isOLLSolved', () => {
  const sim = new CubeStateSimulator();
  // Ua-Perm: R U' R U R U R U' R' U' R2
  // Leaves F2L and OLL solved, but permutes 3 edges on U layer
  sim.applyMoves("R U' R U R U R U' R' U' R2");
  const facelets = sim.getFaceletString();

  assert.equal(isCrossSolved(facelets), true);
  assert.equal(isF2LSolved(facelets), true);
  assert.equal(isOLLSolved(facelets), true, 'U face is all same color (OLL solved)');
  assert.equal(isPLLSolved(facelets), false, 'Last layer edges not in correct position');
  assert.equal(isFaceletsSolved(facelets), false);

  const res = detectSolvePhase(facelets, 'f2l');
  assert.equal(res.phase, 'pll', 'Must advance to pll');
  assert.equal(res.isAdvance, true);
});

test('AUD-CFOP-06: Step-skip matrix verification (cross -> complete, cross -> oll, f2l -> complete)', () => {
  const solved = SOLVED_FACELETS;

  // 1. Cross to Complete direct (e.g. lucky solve or test state)
  const res1 = detectSolvePhase(solved, 'cross');
  assert.equal(res1.phase, 'complete');
  assert.equal(res1.isAdvance, true);

  // 2. F2L to Complete direct (PLL skip from F2L)
  const res2 = detectSolvePhase(solved, 'f2l');
  assert.equal(res2.phase, 'complete');
  assert.equal(res2.isAdvance, true);

  // 3. Cross to PLL direct (F2L skip + OLL skip)
  // Jb-perm state has F2L & OLL solved, but PLL unsolved
  const simJb = new CubeStateSimulator();
  simJb.applyMoves("R U R' F' R U R' U' R' F R2 U' R' U'");
  const jbFacelets = simJb.getFaceletString();
  const res3 = detectSolvePhase(jbFacelets, 'cross');
  assert.equal(res3.phase, 'pll');
  assert.equal(res3.isAdvance, true);
});

test('AUD-CFOP-07: Monotonic lock once complete remains complete indefinitely', () => {
  const sim = new CubeStateSimulator();
  // Solved state
  let res = detectSolvePhase(sim.getFaceletString(), 'pll');
  assert.equal(res.phase, 'complete');

  // Now apply random moves
  sim.applyMoves("R U R' U' F B D L2");
  res = detectSolvePhase(sim.getFaceletString(), 'complete');
  assert.equal(res.phase, 'complete');
  assert.equal(res.isAdvance, false);
});

test('AUD-CFOP-08: Complete fuzzing of malformed inputs', () => {
  const badInputs = [
    null, undefined, '', 'SHORT', 12345, {}, [],
    SOLVED_FACELETS.slice(0, 53),
    SOLVED_FACELETS + 'U',
    Array(53).fill('U')
  ];

  for (const bad of badInputs) {
    assert.equal(isCrossSolved(bad), false);
    assert.equal(isF2LSolved(bad), false);
    assert.equal(isOLLSolved(bad), false);
    assert.equal(isPLLSolved(bad), false);

    const res = detectSolvePhase(bad, 'oll');
    assert.equal(res.phase, 'oll');
    assert.equal(res.isAdvance, false);
  }

  // Unknown currentPhase strings fallback to 'cross'
  const resUnknown = detectSolvePhase(SOLVED_FACELETS, 'bogus_phase');
  assert.equal(resUnknown.phase, 'complete');
  assert.equal(resUnknown.isAdvance, true);
});

console.log('\n' + '='.repeat(70));
console.log(` AUDITOR STRESS SUMMARY: ${passed}/${total} PASSED`);
console.log('='.repeat(70) + '\n');

if (passed !== total) {
  process.exit(1);
}
