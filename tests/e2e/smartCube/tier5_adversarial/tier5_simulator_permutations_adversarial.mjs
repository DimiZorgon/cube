// tests/e2e/smartCube/tier5_adversarial/tier5_simulator_permutations_adversarial.mjs
// Milestone 2 Empirical Adversarial Stress Test Suite:
// Empirical verification of CubeStateSimulator permutations, group invariants,
// order of elements, commutators, random face turn walks, and dual-oracle cross-checks.

import { createTestSuite, assertEqual } from '../helpers/testUtils.mjs';
import {
  CubeStateSimulator,
  SOLVED_FACELETS,
  generateInitialCubies,
  applyRotationToCubies,
  checkIsSolved
} from '../../../../src/utils/cubeMath.js';

export const suite = createTestSuite('Tier 5 Adversarial: CubeStateSimulator Group Invariants & Stress Harness');

const ALL_FACES = ['U', 'D', 'R', 'L', 'F', 'B'];
const ALL_18_MOVES = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'F', "F'", 'F2',
  'B', "B'", 'B2'
];

function getInverseMove(move) {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);
  return `${move}'`;
}

// ============================================================================
// SECTION 1: Single Move Inverse Invariants ((X X')^100 === I)
// ============================================================================

suite.it('T5-SIM-INV-01: Direct inverse pairs cancel out for all 6 faces (X X\' = I and X\' X = I)', () => {
  for (const face of ALL_FACES) {
    const sim1 = new CubeStateSimulator();
    sim1.applyMove(face);
    sim1.applyMove(`${face}'`);
    assertEqual(sim1.isSolved(), true, `${face} ${face}' must return to solved`);
    assertEqual(sim1.getFaceletString(), SOLVED_FACELETS);

    const sim2 = new CubeStateSimulator();
    sim2.applyMove(`${face}'`);
    sim2.applyMove(face);
    assertEqual(sim2.isSolved(), true, `${face}' ${face} must return to solved`);
    assertEqual(sim2.getFaceletString(), SOLVED_FACELETS);
  }
});

suite.it('T5-SIM-INV-02: Double turn self-inverses cancel for all 6 faces (X2 X2 = I)', () => {
  for (const face of ALL_FACES) {
    const sim = new CubeStateSimulator();
    sim.applyMove(`${face}2`);
    sim.applyMove(`${face}2`);
    assertEqual(sim.isSolved(), true, `${face}2 ${face}2 must return to solved`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
  }
});

suite.it('T5-SIM-INV-03: Rapid single-face inverse oscillations (X X\')^100 === I', () => {
  for (const face of ALL_FACES) {
    const sim = new CubeStateSimulator();
    for (let i = 0; i < 100; i++) {
      sim.applyMove(face);
      sim.applyMove(`${face}'`);
    }
    assertEqual(sim.isSolved(), true, `(${face} ${face}')^100 must be solved`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
  }
});

suite.it('T5-SIM-INV-04: Compound cyclic 6-face inverse oscillations (U U\' D D\' R R\' L L\' F F\' B B\')^100 === I', () => {
  const sim = new CubeStateSimulator();
  for (let i = 0; i < 100; i++) {
    for (const face of ALL_FACES) {
      sim.applyMove(face);
      sim.applyMove(`${face}'`);
    }
  }
  assertEqual(sim.isSolved(), true, 'Cyclic inverse oscillation must preserve solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-INV-05: Compound double-turn oscillations (U2 U2 D2 D2 R2 R2 L2 L2 F2 F2 B2 B2)^100 === I', () => {
  const sim = new CubeStateSimulator();
  for (let i = 0; i < 100; i++) {
    for (const face of ALL_FACES) {
      sim.applyMove(`${face}2`);
      sim.applyMove(`${face}2`);
    }
  }
  assertEqual(sim.isSolved(), true, 'Cyclic double-turn oscillation must preserve solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

// ============================================================================
// SECTION 2: 4-Cycle & Multi-Turn Element Orders
// ============================================================================

suite.it('T5-SIM-ORD-01: Element order for each quarter turn is strictly 4 (X^4 = I, X^k != I for k<4)', () => {
  for (const face of ALL_FACES) {
    const sim = new CubeStateSimulator();
    for (let k = 1; k <= 3; k++) {
      sim.applyMove(face);
      assertEqual(sim.isSolved(), false, `${face}^${k} must NOT be solved`);
    }
    sim.applyMove(face); // 4th move
    assertEqual(sim.isSolved(), true, `${face}^4 MUST be solved`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
  }
});

suite.it('T5-SIM-ORD-02: Element order for each counter-clockwise turn is strictly 4 ((X\')^4 = I, (X\')^k != I for k<4)', () => {
  for (const face of ALL_FACES) {
    const sim = new CubeStateSimulator();
    for (let k = 1; k <= 3; k++) {
      sim.applyMove(`${face}'`);
      assertEqual(sim.isSolved(), false, `(${face}')^${k} must NOT be solved`);
    }
    sim.applyMove(`${face}'`); // 4th move
    assertEqual(sim.isSolved(), true, `(${face}')^4 MUST be solved`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
  }
});

suite.it('T5-SIM-ORD-03: Double-turn order is strictly 2 (X2 != I, (X2)^2 = I)', () => {
  for (const face of ALL_FACES) {
    const sim = new CubeStateSimulator();
    sim.applyMove(`${face}2`);
    assertEqual(sim.isSolved(), false, `${face}2 must NOT be solved`);
    sim.applyMove(`${face}2`);
    assertEqual(sim.isSolved(), true, `(${face}2)^2 MUST be solved`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
  }
});

suite.it('T5-SIM-ORD-04: Algebraic equivalences hold: X^2 == (X\')^2 == X2 and X^3 == X\' and (X\')^3 == X', () => {
  for (const face of ALL_FACES) {
    const simCW2 = new CubeStateSimulator();
    simCW2.applyMove(face);
    simCW2.applyMove(face);

    const simCCW2 = new CubeStateSimulator();
    simCCW2.applyMove(`${face}'`);
    simCCW2.applyMove(`${face}'`);

    const simDouble = new CubeStateSimulator();
    simDouble.applyMove(`${face}2`);

    assertEqual(simCW2.getFaceletString(), simDouble.getFaceletString(), `${face}^2 must equal ${face}2`);
    assertEqual(simCCW2.getFaceletString(), simDouble.getFaceletString(), `(${face}')^2 must equal ${face}2`);

    const simCW3 = new CubeStateSimulator();
    simCW3.applyMove(face);
    simCW3.applyMove(face);
    simCW3.applyMove(face);

    const simCCW1 = new CubeStateSimulator();
    simCCW1.applyMove(`${face}'`);

    assertEqual(simCW3.getFaceletString(), simCCW1.getFaceletString(), `${face}^3 must equal ${face}'`);

    const simCCW3 = new CubeStateSimulator();
    simCCW3.applyMove(`${face}'`);
    simCCW3.applyMove(`${face}'`);
    simCCW3.applyMove(`${face}'`);

    const simCW1 = new CubeStateSimulator();
    simCW1.applyMove(face);

    assertEqual(simCCW3.getFaceletString(), simCW1.getFaceletString(), `(${face}')^3 must equal ${face}`);
  }
});

suite.it('T5-SIM-ORD-05: Group orders for two-generator algorithms: (R U)^105 = I and (F R)^105 = I and (R2 U2)^6 = I', () => {
  // (R2 U2) has order 6
  const simR2U2 = new CubeStateSimulator();
  for (let i = 1; i <= 6; i++) {
    simR2U2.applyMoves('R2 U2');
    if (i < 6) {
      assertEqual(simR2U2.isSolved(), false, `(R2 U2)^${i} must not be solved`);
    } else {
      assertEqual(simR2U2.isSolved(), true, '(R2 U2)^6 MUST be solved');
      assertEqual(simR2U2.getFaceletString(), SOLVED_FACELETS);
    }
  }

  // (R U) has order 105 in 3x3 group
  const simRU = new CubeStateSimulator();
  for (let i = 1; i <= 105; i++) {
    simRU.applyMoves('R U');
    if (i < 105) {
      if (simRU.isSolved()) {
        throw new Error(`(R U)^${i} prematurely reported solved! Group order is 105.`);
      }
    } else {
      assertEqual(simRU.isSolved(), true, '(R U)^105 MUST return to solved');
      assertEqual(simRU.getFaceletString(), SOLVED_FACELETS);
    }
  }

  // (F R) has order 105 in 3x3 group
  const simFR = new CubeStateSimulator();
  for (let i = 1; i <= 105; i++) {
    simFR.applyMoves('F R');
    if (i < 105) {
      if (simFR.isSolved()) {
        throw new Error(`(F R)^${i} prematurely reported solved! Group order is 105.`);
      }
    } else {
      assertEqual(simFR.isSolved(), true, '(F R)^105 MUST return to solved');
      assertEqual(simFR.getFaceletString(), SOLVED_FACELETS);
    }
  }
});

// ============================================================================
// SECTION 3: Disjoint Face Commutators ([A, B] = I for Opposite Faces)
// ============================================================================

suite.it('T5-SIM-COM-01: Disjoint opposite faces commute: [U, D] = I, [L, R] = I, [F, B] = I', () => {
  const oppositePairs = [
    ['U', 'D'],
    ['L', 'R'],
    ['F', 'B']
  ];

  for (const [f1, f2] of oppositePairs) {
    const sim = new CubeStateSimulator();
    // [f1, f2] = f1 f2 f1' f2'
    sim.applyMoves(`${f1} ${f2} ${f1}' ${f2}'`);
    assertEqual(sim.isSolved(), true, `[${f1}, ${f2}] commutator must equal identity`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);

    // Reversed order: [f2, f1] = f2 f1 f2' f1'
    const simRev = new CubeStateSimulator();
    simRev.applyMoves(`${f2} ${f1} ${f2}' ${f1}'`);
    assertEqual(simRev.isSolved(), true, `[${f2}, ${f1}] commutator must equal identity`);
    assertEqual(simRev.getFaceletString(), SOLVED_FACELETS);
  }
});

suite.it('T5-SIM-COM-02: Mixed powers of opposite faces commute identically', () => {
  const testCases = [
    "U2 D' U2 D",
    "U' D2 U D2",
    "L2 R2 L2 R2",
    "L' R2 L R2",
    "F2 B2 F2 B2",
    "F' B F B'",
    "F2 B' F2 B",
    "U D2 U' D2"
  ];

  for (const alg of testCases) {
    const sim = new CubeStateSimulator();
    sim.applyMoves(alg);
    assertEqual(sim.isSolved(), true, `Opposite face sequence "${alg}" must equal identity`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
  }
});

// ============================================================================
// SECTION 4: Commutators & Speedcubing Algorithm Invariants
// ============================================================================

suite.it('T5-SIM-ALG-01: T-Perm involution order is strictly 2', () => {
  const sim = new CubeStateSimulator();
  const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
  sim.applyMoves(tPerm);
  assertEqual(sim.isSolved(), false, '1x T-Perm must be unsolved');
  sim.applyMoves(tPerm);
  assertEqual(sim.isSolved(), true, '2x T-Perm must be solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-ALG-02: Y-Perm involution order is strictly 2', () => {
  const sim = new CubeStateSimulator();
  const yPerm = "F R U' R' U' R U R' F' R U R' U' R' F R F'";
  sim.applyMoves(yPerm);
  assertEqual(sim.isSolved(), false, '1x Y-Perm must be unsolved');
  sim.applyMoves(yPerm);
  assertEqual(sim.isSolved(), true, '2x Y-Perm must be solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-ALG-03: Jb-Perm and Ja-Perm involution orders are strictly 2', () => {
  const simJb = new CubeStateSimulator();
  const jbPerm = "R U R' F' R U R' U' R' F R2 U' R' U'";
  simJb.applyMoves(jbPerm);
  assertEqual(simJb.isSolved(), false);
  simJb.applyMoves(jbPerm);
  assertEqual(simJb.isSolved(), true);

  const simJa = new CubeStateSimulator();
  const jaPerm = "L' U' L F L' U' L U L F' L2 U L U";
  simJa.applyMoves(jaPerm);
  assertEqual(simJa.isSolved(), false);
  simJa.applyMoves(jaPerm);
  assertEqual(simJa.isSolved(), true);
});

suite.it('T5-SIM-ALG-04: Face-turn E-Perm involution order is strictly 2', () => {
  // Pure face-turn E-Perm: R B' R' F R B R' F' R B R' F R B' R' F'
  const sim = new CubeStateSimulator();
  const ePerm = "R B' R' F R B R' F' R B R' F R B' R' F'";
  sim.applyMoves(ePerm);
  assertEqual(sim.isSolved(), false, '1x E-Perm must be unsolved');
  sim.applyMoves(ePerm);
  assertEqual(sim.isSolved(), true, '2x E-Perm must be solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-ALG-05: Sledgehammer (R\' F R F\') order is strictly 6', () => {
  const sim = new CubeStateSimulator();
  const sledge = "R' F R F'";
  for (let k = 1; k <= 5; k++) {
    sim.applyMoves(sledge);
    assertEqual(sim.isSolved(), false, `Sledgehammer ^ ${k} must not be solved`);
  }
  sim.applyMoves(sledge); // 6th repetition
  assertEqual(sim.isSolved(), true, 'Sledgehammer ^ 6 MUST be solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-ALG-06: Sexy Move (R U R\' U\') order is strictly 6', () => {
  const sim = new CubeStateSimulator();
  const sexy = "R U R' U'";
  for (let k = 1; k <= 5; k++) {
    sim.applyMoves(sexy);
    assertEqual(sim.isSolved(), false, `Sexy move ^ ${k} must not be solved`);
  }
  sim.applyMoves(sexy); // 6th repetition
  assertEqual(sim.isSolved(), true, 'Sexy move ^ 6 MUST be solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-ALG-07: Superflip 20-move algorithm order is strictly 2', () => {
  const sim = new CubeStateSimulator();
  const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
  sim.applyMoves(superflip);
  assertEqual(sim.isSolved(), false, 'Superflip flattens all 12 edges into flipped state');
  sim.applyMoves(superflip);
  assertEqual(sim.isSolved(), true, 'Superflip x 2 MUST return to solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-ALG-08: Checkerboard pattern order is strictly 2', () => {
  const sim = new CubeStateSimulator();
  const checkerboard = "R2 L2 U2 D2 F2 B2";
  sim.applyMoves(checkerboard);
  assertEqual(sim.isSolved(), false, 'Checkerboard is unsolved');
  sim.applyMoves(checkerboard);
  assertEqual(sim.isSolved(), true, 'Checkerboard x 2 MUST return to solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

suite.it('T5-SIM-ALG-09: 3-cycle edge commutator Ua-Perm order is strictly 3', () => {
  const sim = new CubeStateSimulator();
  const uaPerm = "R U' R U R U R U' R' U' R2";
  sim.applyMoves(uaPerm);
  assertEqual(sim.isSolved(), false, '1x Ua-Perm must be unsolved');
  sim.applyMoves(uaPerm);
  assertEqual(sim.isSolved(), false, '2x Ua-Perm must be unsolved');
  sim.applyMoves(uaPerm);
  assertEqual(sim.isSolved(), true, '3x Ua-Perm MUST be solved');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

// ============================================================================
// SECTION 5: High-Entropy Random Walk Stress Test (10,000 Face Turns)
// ============================================================================

suite.it('T5-SIM-RND-01: 10,000 continuous random face turns followed by reverse inverse returns to solved', () => {
  // Deterministic LCG pseudo-random generator for 100% reproducible test runs
  let seed = 0xDEADBEEF;
  function nextRand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xFFFFFFFF;
  }

  const turnCount = 10000;
  const moveSequence = [];
  const inverseSequence = [];

  for (let i = 0; i < turnCount; i++) {
    const moveIndex = Math.floor(nextRand() * ALL_18_MOVES.length);
    const move = ALL_18_MOVES[moveIndex];
    moveSequence.push(move);
  }

  // Reverse inverse: if sequence is [M1, M2, ..., Mn], then reverse inverse is [Mn', ..., M1']
  for (let i = turnCount - 1; i >= 0; i--) {
    inverseSequence.push(getInverseMove(moveSequence[i]));
  }

  const sim = new CubeStateSimulator();
  assertEqual(sim.isSolved(), true);

  // Apply all 10,000 random turns in chunks to monitor invariants
  const chunkSize = 1000;
  for (let c = 0; c < turnCount; c += chunkSize) {
    const chunk = moveSequence.slice(c, c + chunkSize);
    sim.applyMoves(chunk);

    // Invariant: Total sticker counts must always be exactly 9 for each color
    const fStr = sim.getFaceletString();
    const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
    for (let j = 0; j < fStr.length; j++) {
      counts[fStr[j]] = (counts[fStr[j]] || 0) + 1;
    }
    for (const face of ALL_FACES) {
      assertEqual(counts[face], 9, `Sticker count for ${face} must remain 9 after ${c + chunkSize} turns`);
    }

    // Invariant: Centers never change in pure face turns
    // Center indices: U:4, R:13, F:22, D:31, L:40, B:49
    assertEqual(fStr[4], 'U', 'Center U must not move');
    assertEqual(fStr[13], 'R', 'Center R must not move');
    assertEqual(fStr[22], 'F', 'Center F must not move');
    assertEqual(fStr[31], 'D', 'Center D must not move');
    assertEqual(fStr[40], 'L', 'Center L must not move');
    assertEqual(fStr[49], 'B', 'Center B must not move');
  }

  // After 10,000 random turns, cube should not be solved
  assertEqual(sim.isSolved(), false, '10,000 random turns must leave cube scrambled');

  // Now apply the 10,000 reverse inverse moves
  for (let c = 0; c < turnCount; c += chunkSize) {
    const chunk = inverseSequence.slice(c, c + chunkSize);
    sim.applyMoves(chunk);
  }

  // Final assertion: must be perfectly restored to SOLVED_FACELETS
  assertEqual(sim.isSolved(), true, '10,000 reverse inverse turns must restore solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS, 'Facelet string must match SOLVED_FACELETS exactly');
});

suite.it('T5-SIM-RND-02: Multi-trial fuzzing: 5 independent trials of 2,000 random turns with inverse cancellation', () => {
  let seed = 0x12345678;
  function nextRand() {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 0xFFFFFFFF;
  }

  for (let trial = 0; trial < 5; trial++) {
    const moves = [];
    const invMoves = [];
    for (let i = 0; i < 2000; i++) {
      const idx = Math.floor(nextRand() * ALL_18_MOVES.length);
      moves.push(ALL_18_MOVES[idx]);
    }
    for (let i = moves.length - 1; i >= 0; i--) {
      invMoves.push(getInverseMove(moves[i]));
    }

    const sim = new CubeStateSimulator();
    sim.applyMoves(moves);
    assertEqual(sim.isSolved(), false, `Trial ${trial}: scrambled state`);
    sim.applyMoves(invMoves);
    assertEqual(sim.isSolved(), true, `Trial ${trial}: reverse inverse must restore solved`);
    assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
  }
});

// ============================================================================
// SECTION 6: Dual-Oracle Consistency (CubeStateSimulator vs 3D Cubie Math)
// ============================================================================

suite.it('T5-SIM-ORA-01: Dual-oracle agreement between CubeStateSimulator and Three.js 3D cubies', () => {
  const FIXED_SMART_CUBE_MAPPING = {
    U: { axis: 'y', value: 1, direction: -1 },
    D: { axis: 'y', value: -1, direction: 1 },
    R: { axis: 'x', value: 1, direction: -1 },
    L: { axis: 'x', value: -1, direction: 1 },
    F: { axis: 'z', value: 1, direction: -1 },
    B: { axis: 'z', value: -1, direction: 1 }
  };

  function applyMoveTo3DCubies(cubies, moveNotation) {
    const move = moveNotation.trim();
    if (!move) return cubies;
    const face = move[0];
    const isPrime = move.includes("'");
    const isDouble = move.includes('2');
    const mapping = FIXED_SMART_CUBE_MAPPING[face];
    if (!mapping) return cubies;

    const turns = isDouble ? 2 : 1;
    const dirMultiplier = isPrime ? -1 : 1;
    const effectiveDir = mapping.direction * dirMultiplier;

    let current = cubies;
    for (let t = 0; t < turns; t++) {
      current = applyRotationToCubies(current, mapping.axis, mapping.value, effectiveDir);
    }
    return current;
  }

  const testSequences = [
    "R U R' U'",
    "R U R' U' R' F R2 U' R' U' R U R' F'",
    "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    "R' F R F'",
    "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2"
  ];

  for (const seq of testSequences) {
    const sim = new CubeStateSimulator();
    let cubies = generateInitialCubies(3);

    // Initial state: both solved
    assertEqual(sim.isSolved(), true);
    assertEqual(checkIsSolved(cubies), true);

    const moves = seq.split(/\s+/).filter(Boolean);
    for (const m of moves) {
      sim.applyMove(m);
      cubies = applyMoveTo3DCubies(cubies, m);
    }

    // Both should agree on whether state is solved
    assertEqual(sim.isSolved(), checkIsSolved(cubies), `Oracle mismatch on "${seq}"`);
  }
});

// ============================================================================
// SECTION 7: Defensive API Edge Cases
// ============================================================================

suite.it('T5-SIM-DEF-01: Defensive null, undefined, empty, and whitespace handling in applyMove and applyMoves', () => {
  const sim = new CubeStateSimulator();

  // applyMove resilience
  sim.applyMove(null);
  sim.applyMove(undefined);
  sim.applyMove('');
  sim.applyMove('   ');
  sim.applyMove('\t\n');
  assertEqual(sim.isSolved(), true, 'Empty moves must not modify simulator state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);

  // applyMoves resilience
  sim.applyMoves(null);
  sim.applyMoves(undefined);
  sim.applyMoves('');
  sim.applyMoves('   ');
  sim.applyMoves([]);
  assertEqual(sim.isSolved(), true);

  // Irregular spacing in applyMoves string
  sim.applyMoves("   R   U   R'   U'   ");
  assertEqual(sim.isSolved(), false, 'Must parse moves with extra whitespace properly');

  // Inverse with array input
  sim.applyMoves(['U', 'R', "U'", "R'"]);
  assertEqual(sim.isSolved(), true, 'Applying inverse array must restore solved state');
  assertEqual(sim.getFaceletString(), SOLVED_FACELETS);
});

// ============================================================================
// SECTION 8: Audit & Discrepancy Probe (testUtils.mjs vs cubeMath.js)
// ============================================================================

suite.it('T5-SIM-AUD-01: Document discrepancy: testUtils.mjs legacy copy vs cubeMath.js production simulator on F/B turns', async () => {
  const { CubeStateSimulator: TestUtilsSimulator } = await import('../helpers/testUtils.mjs');

  const prodSim = new CubeStateSimulator();
  const legacySim = new TestUtilsSimulator();

  const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";

  // Apply T-Perm twice to both
  prodSim.applyMoves(tPerm);
  prodSim.applyMoves(tPerm);

  legacySim.applyMoves(tPerm);
  legacySim.applyMoves(tPerm);

  // Production simulator in cubeMath.js is FIXED and returns true:
  assertEqual(prodSim.isSolved(), true, 'Production cubeMath.js CubeStateSimulator MUST return true for 2x T-Perm');
  assertEqual(prodSim.getFaceletString(), SOLVED_FACELETS);

  // Legacy copy in testUtils.mjs has the unpatched F/B permutation bug:
  assertEqual(legacySim.isSolved(), false, 'Legacy testUtils.mjs copy demonstrates unpatched F/B bug (returns false)');
});

// Self-executing runner if invoked directly via `node tier5_simulator_permutations_adversarial.mjs`
if (process.argv[1]?.replace(/\\/g, '/').endsWith('tier5_simulator_permutations_adversarial.mjs')) {
  suite.run().then(res => {
    console.log(`\n${suite.name}: ${res.passed}/${res.total} tests passed (${res.durationMs}ms)`);
    if (res.errors.length > 0) {
      console.error(res.errors);
      process.exit(1);
    }
  });
}
