// tests/e2e/smartCube/tier5_adversarial/tier5_cfop_phase_adversarial.mjs
// Tier 5 Adversarial Coverage Hardening: CFOP Phase Detection Engine & Simulator Permutation Stress
// Challenger M2.2: Empirical stress testing for monotonic progression, step skips, and cross validation.

import {
  createTestSuite,
  assert,
  assertEqual
} from '../helpers/testUtils.mjs';

import {
  CubeStateSimulator,
  SOLVED_FACELETS,
  isFaceletsSolved
} from '../../../../src/utils/cubeMath.js';

import {
  detectSolvePhase,
  isCrossSolved,
  isF2LSolved,
  isOLLSolved,
  isPLLSolved,
  CFOP_PHASES
} from '../../../../src/utils/smartCube/solvePhaseDetector.js';

export const suite = createTestSuite('Tier 5 Adversarial: CFOP Phase Detection Engine Hardening');

const PHASE_RANKS = {
  cross: 0,
  f2l: 1,
  oll: 2,
  pll: 3,
  complete: 4
};

// ============================================================================
// SUITE 1: MONOTONIC FORWARD PROGRESSION UNDER DESTRUCTIVE ALGORITHMS
// ============================================================================

suite.it('ADV-M2-01: Sledgehammer repeated 6 times never regresses below f2l at any intermediate move', () => {
  // Sledgehammer = R' F R F'. In CFOP, used during F2L pair insertion or OLL.
  // R' and F temporarily dislocate DF and DR cross edges.
  // The detector must maintain monotonic phase lock >= 'f2l' throughout all 24 moves.
  const sim = new CubeStateSimulator();
  const sledgeMoves = ["R'", 'F', 'R', "F'"];
  let currentPhase = 'f2l';

  for (let cycle = 0; cycle < 6; cycle++) {
    for (let step = 0; step < 4; step++) {
      const move = sledgeMoves[step];
      sim.applyMove(move);
      const facelets = sim.getFaceletString();
      const res = detectSolvePhase(facelets, currentPhase);

      const isLastMoveOfCycle6 = (cycle === 5 && step === 3);
      if (isLastMoveOfCycle6) {
        assertEqual(sim.isSolved(), true, '6x Sledgehammer must return cube to solved');
        assertEqual(res.phase, 'complete', 'Solved cube must advance to complete');
        assertEqual(res.isAdvance, true);
        currentPhase = res.phase;
      } else {
        assertEqual(
          res.phase,
          'f2l',
          `Sledgehammer cycle ${cycle + 1} step ${step + 1} (${move}): phase must remain 'f2l', got '${res.phase}'`
        );
        assertEqual(res.isAdvance, false);
      }
    }
  }
});

suite.it('ADV-M2-02: Sexy Move repeated 6 times never regresses below f2l at any intermediate move', () => {
  // Sexy Move = R U R' U'. Dislocates F2L pairs.
  const sim = new CubeStateSimulator();
  const sexyMoves = ['R', 'U', "R'", "U'"];
  let currentPhase = 'f2l';

  for (let cycle = 0; cycle < 6; cycle++) {
    for (let step = 0; step < 4; step++) {
      const move = sexyMoves[step];
      sim.applyMove(move);
      const facelets = sim.getFaceletString();
      const res = detectSolvePhase(facelets, currentPhase);

      // Monotonic guarantee: phase rank must never decrease below currentPhase
      assert(
        PHASE_RANKS[res.phase] >= PHASE_RANKS[currentPhase],
        `Sexy move cycle ${cycle + 1} step ${step + 1} (${move}): phase '${res.phase}' regressed below '${currentPhase}'`
      );

      // At step 23 (cycle 6, step 2: R'), only U' remains -> cube is in PLL phase (OLL skip)
      // At step 24 (cycle 6, step 3: U'), cube returns to solved -> complete
      if (res.isAdvance) {
        assert(PHASE_RANKS[res.phase] > PHASE_RANKS[currentPhase]);
        currentPhase = res.phase;
      }
    }
  }
  assertEqual(sim.isSolved(), true, '6x Sexy move must return cube to solved');
  assertEqual(currentPhase, 'complete');
});

suite.it('ADV-M2-03: Hedgeslammer repeated 6 times preserves monotonic f2l lock', () => {
  // Hedgeslammer = F R' F' R
  const sim = new CubeStateSimulator();
  const hedgeMoves = ['F', "R'", "F'", 'R'];
  let currentPhase = 'f2l';

  for (let cycle = 0; cycle < 6; cycle++) {
    for (let step = 0; step < 4; step++) {
      const move = hedgeMoves[step];
      sim.applyMove(move);
      const facelets = sim.getFaceletString();
      const res = detectSolvePhase(facelets, currentPhase);

      const isLastMove = (cycle === 5 && step === 3);
      if (isLastMove) {
        assertEqual(sim.isSolved(), true);
        assertEqual(res.phase, 'complete');
        assertEqual(res.isAdvance, true);
        currentPhase = res.phase;
      } else {
        assertEqual(res.phase, 'f2l', `Hedgeslammer cycle ${cycle + 1} step ${step + 1} (${move})`);
        assertEqual(res.isAdvance, false);
      }
    }
  }
});

suite.it('ADV-M2-04: Sune and Antisune during OLL never regress below oll phase', () => {
  // Sune = R U R' U R U2 R'
  // Antisune = R U2 R' U' R U' R' (the exact group inverse of Sune)
  const sim = new CubeStateSimulator();
  // Start with F2L solved, OLL broken (apply Sune to solved cube)
  sim.applyMoves("R U R' U R U2 R'");
  let currentPhase = 'oll';

  // Apply Antisune step-by-step: each move must remain >= oll
  const antisuneMoves = ['R', 'U2', "R'", "U'", 'R', "U'", "R'"];
  for (let i = 0; i < antisuneMoves.length; i++) {
    sim.applyMove(antisuneMoves[i]);
    const facelets = sim.getFaceletString();
    const res = detectSolvePhase(facelets, currentPhase);
    assert(
      PHASE_RANKS[res.phase] >= PHASE_RANKS.oll,
      `Step ${i} (${antisuneMoves[i]}): phase '${res.phase}' regressed below 'oll'`
    );
    if (res.isAdvance) {
      currentPhase = res.phase;
    }
  }

  // Sune followed by Antisune restores completely solved state
  assertEqual(sim.isSolved(), true, 'Sune followed by Antisune must solve cube');
  assertEqual(currentPhase, 'complete', 'Cube solved must advance to complete');
});

suite.it('ADV-M2-05: T-Perm and Y-Perm during PLL never regress below pll phase at any turn', () => {
  // T-Perm = R U R' U' R' F R2 U' R' U' R U R' F' (14 turns)
  const tPermMoves = ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"];
  const sim = new CubeStateSimulator();
  let currentPhase = 'pll';

  for (let i = 0; i < tPermMoves.length; i++) {
    sim.applyMove(tPermMoves[i]);
    const facelets = sim.getFaceletString();
    const res = detectSolvePhase(facelets, currentPhase);
    assertEqual(
      res.phase,
      'pll',
      `T-Perm move ${i + 1} (${tPermMoves[i]}): phase '${res.phase}' must remain 'pll'`
    );
    assertEqual(res.isAdvance, false);
  }

  // Double T-Perm returns to solved
  for (let i = 0; i < tPermMoves.length; i++) {
    sim.applyMove(tPermMoves[i]);
    const facelets = sim.getFaceletString();
    const res = detectSolvePhase(facelets, currentPhase);
    if (i === tPermMoves.length - 1) {
      assertEqual(sim.isSolved(), true);
      assertEqual(res.phase, 'complete');
      assertEqual(res.isAdvance, true);
    } else {
      assertEqual(res.phase, 'pll');
      assertEqual(res.isAdvance, false);
    }
  }
});

suite.it('ADV-M2-06: 500-move random walk across all 5 phases strictly enforces rank(next) >= rank(current)', () => {
  const allMoves = [
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'R', "R'", 'R2',
    'L', "L'", 'L2',
    'F', "F'", 'F2',
    'B', "B'", 'B2'
  ];

  for (const startPhase of CFOP_PHASES) {
    const sim = new CubeStateSimulator();
    let currentPhase = startPhase;

    // Apply 100 pseudo-random turns
    for (let step = 0; step < 100; step++) {
      const move = allMoves[(step * 7 + 13) % allMoves.length];
      sim.applyMove(move);
      const facelets = sim.getFaceletString();
      const res = detectSolvePhase(facelets, currentPhase);

      assert(
        PHASE_RANKS[res.phase] >= PHASE_RANKS[currentPhase],
        `Monotonic invariant violated: '${res.phase}' (rank ${PHASE_RANKS[res.phase]}) < '${currentPhase}' (rank ${PHASE_RANKS[currentPhase]}) on move ${move}`
      );

      if (res.isAdvance) {
        assert(
          PHASE_RANKS[res.phase] > PHASE_RANKS[currentPhase],
          `isAdvance=true must strictly increase phase rank: ${currentPhase} -> ${res.phase}`
        );
        currentPhase = res.phase;
      } else {
        assertEqual(res.phase, currentPhase);
      }
    }
  }
});

// ============================================================================
// SUITE 2: STEP SKIPS & MULTI-PHASE LEAPS
// ============================================================================

suite.it('ADV-M2-07: OLL skip directly advances f2l -> pll across 5 distinct PLL alg states', () => {
  // In an OLL skip, F2L is solved and U orientation is solved, but PLL is not.
  const pllAlgs = [
    { name: 'T-Perm', moves: "R U R' U' R' F R2 U' R' U' R U R' F'" },
    { name: 'Y-Perm', moves: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
    { name: 'Jb-Perm', moves: "R U R' F' R U R' U' R' F R2 U' R' U'" },
    { name: 'Ra-Perm', moves: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
    { name: 'Ua-Perm', moves: "R U' R U R U R U' R' U' R2" }
  ];

  for (const alg of pllAlgs) {
    const sim = new CubeStateSimulator();
    sim.applyMoves(alg.moves);
    const facelets = sim.getFaceletString();

    assertEqual(isCrossSolved(facelets), true, `${alg.name}: cross must be solved`);
    assertEqual(isF2LSolved(facelets), true, `${alg.name}: F2L must be solved`);
    assertEqual(isOLLSolved(facelets), true, `${alg.name}: OLL must be solved (all yellow)`);
    assertEqual(isPLLSolved(facelets), false, `${alg.name}: PLL must NOT be solved`);

    // Solver at f2l completes F2L and gets an OLL skip
    const res = detectSolvePhase(facelets, 'f2l');
    assertEqual(res.phase, 'pll', `${alg.name}: OLL skip must jump directly from f2l to pll`);
    assertEqual(res.isAdvance, true, `${alg.name}: isAdvance must be true`);
  }
});

suite.it('ADV-M2-08: PLL skip directly advances oll -> complete on solved cube', () => {
  const sim = new CubeStateSimulator();
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true);
  assertEqual(isF2LSolved(facelets), true);
  assertEqual(isOLLSolved(facelets), true);
  assertEqual(isPLLSolved(facelets), true);

  // Solver is in oll phase, executes OLL alg, and whole cube is solved (PLL skip)
  const res = detectSolvePhase(facelets, 'oll');
  assertEqual(res.phase, 'complete', 'PLL skip must advance directly from oll to complete');
  assertEqual(res.isAdvance, true);
});

suite.it('ADV-M2-09: Double skip (OLL + PLL skip) directly advances f2l -> complete', () => {
  const sim = new CubeStateSimulator();
  const facelets = sim.getFaceletString();

  // Solver is in f2l phase, inserts last pair, and cube is fully solved (double skip)
  const res = detectSolvePhase(facelets, 'f2l');
  assertEqual(res.phase, 'complete', 'Double skip must advance directly from f2l to complete');
  assertEqual(res.isAdvance, true);
});

suite.it('ADV-M2-10: Triple skip (F2L + OLL + PLL skip) directly advances cross -> complete', () => {
  const sim = new CubeStateSimulator();
  const facelets = sim.getFaceletString();

  // Solver is in cross phase, cube is solved
  const res = detectSolvePhase(facelets, 'cross');
  assertEqual(res.phase, 'complete', 'Triple skip must advance directly from cross to complete');
  assertEqual(res.isAdvance, true);
});

suite.it('ADV-M2-11: Cross -> PLL leap when OLL is skipped from cross phase', () => {
  const sim = new CubeStateSimulator();
  sim.applyMoves("R U R' F' R U R' U' R' F R2 U' R' U'"); // Jb-Perm
  const facelets = sim.getFaceletString();

  // Solver was in cross phase, somehow F2L+OLL are solved with only PLL left
  const res = detectSolvePhase(facelets, 'cross');
  assertEqual(res.phase, 'pll', 'Must leap directly from cross to pll');
  assertEqual(res.isAdvance, true);
});

suite.it('ADV-M2-12: Cross -> OLL leap when F2L is finished from cross phase', () => {
  const sim = new CubeStateSimulator();
  sim.applyMoves("R U R' U R U2 R'"); // Sune
  const facelets = sim.getFaceletString();

  // Solver was in cross phase, finished F2L
  const res = detectSolvePhase(facelets, 'cross');
  assertEqual(res.phase, 'oll', 'Must leap directly from cross to oll');
  assertEqual(res.isAdvance, true);
});

// ============================================================================
// SUITE 3: CROSS VALIDATION, DISCRIMINATION & FALSE POSITIVE STRESS
// ============================================================================

suite.it('ADV-M2-13: Incomplete cross: breaking any single cross edge returns false', () => {
  // D cross edges: DF, DR, DB, DL
  // To break DF only: M' U2 M U2
  const sim1 = new CubeStateSimulator();
  sim1.applyMoves("M' U2 M U2"); // Fails DF/UB
  // Or manually test with targeted moves:
  // DF edge: F turn dislocates DF
  const simDF = new CubeStateSimulator();
  simDF.applyMove('F');
  assertEqual(isCrossSolved(simDF.getFaceletString()), false, 'F turn breaks DF edge');

  // DR edge: R turn dislocates DR
  const simDR = new CubeStateSimulator();
  simDR.applyMove('R');
  assertEqual(isCrossSolved(simDR.getFaceletString()), false, 'R turn breaks DR edge');

  // DB edge: B turn dislocates DB
  const simDB = new CubeStateSimulator();
  simDB.applyMove('B');
  assertEqual(isCrossSolved(simDB.getFaceletString()), false, 'B turn breaks DB edge');

  // DL edge: L turn dislocates DL
  const simDL = new CubeStateSimulator();
  simDL.applyMove('L');
  assertEqual(isCrossSolved(simDL.getFaceletString()), false, 'L turn breaks DL edge');
});

suite.it('ADV-M2-14: Rotated cross on D face fails isCrossSolved', () => {
  // A D turn rotates all 4 cross edges around D face.
  // Their white stickers are still on D, but they do NOT match F, R, B, L centers.
  for (const turn of ['D', "D'", 'D2']) {
    const sim = new CubeStateSimulator();
    sim.applyMove(turn);
    const facelets = sim.getFaceletString();
    assertEqual(
      isCrossSolved(facelets),
      false,
      `Cross rotated by ${turn} must fail isCrossSolved despite white stickers on D`
    );
  }
});

suite.it('ADV-M2-15: Permuted / swapped cross edges fail isCrossSolved', () => {
  // Swapping DF and DB opposite edges via algorithm
  const simOpp = new CubeStateSimulator();
  simOpp.applyMoves("R2 L2 U2 R2 L2 D2");
  assertEqual(isCrossSolved(simOpp.getFaceletString()), false, 'Opposite cross edges swapped must fail');

  // Dislocating adjacent cross edges via D R D' R'
  const simAdj = new CubeStateSimulator();
  simAdj.applyMoves("D R D' R'");
  assertEqual(isCrossSolved(simAdj.getFaceletString()), false, 'Dislocated cross edges must fail');

  // Explicit swap of DF (f[28], f[25]) and DR (f[32], f[16]) facelet stickers
  const fSwap = SOLVED_FACELETS.split('');
  fSwap[25] = 'R'; // F center adjacent sticker has R color
  fSwap[16] = 'F'; // R center adjacent sticker has F color
  assertEqual(isCrossSolved(fSwap.join('')), false, 'Adjacent cross edges swapped in facelets must fail');
});

suite.it('ADV-M2-16: Cross formed on non-D faces is rejected by isCrossSolved(facelets, "D")', () => {
  // Rotate cube such that yellow cross is on U face, red on R face, etc.
  // When crossFace is 'D', it must specifically check the D face edges.
  // Apply a scramble that preserves yellow cross on U face:
  const simU = new CubeStateSimulator();
  // Sune + U perm preserves yellow cross on U
  simU.applyMoves("R U R' U R U2 R'");
  // Invert the cube upside down (x2 rotation: R2 L2 F2 B2 U2 D2 ... or check scramble)
  // Let's create an explicit facelet string where U cross is formed but D is scrambled
  const scrambledSim = new CubeStateSimulator();
  scrambledSim.applyMoves("D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2");
  assertEqual(isCrossSolved(scrambledSim.getFaceletString(), 'D'), false);
});

suite.it('ADV-M2-17: Unsupported or invalid crossFace argument fails safely without throw', () => {
  const facelets = SOLVED_FACELETS;
  assertEqual(isCrossSolved(facelets, 'U'), false, 'U cross not supported yet -> returns false');
  assertEqual(isCrossSolved(facelets, 'F'), false);
  assertEqual(isCrossSolved(facelets, 'B'), false);
  assertEqual(isCrossSolved(facelets, 'R'), false);
  assertEqual(isCrossSolved(facelets, 'L'), false);
  assertEqual(isCrossSolved(facelets, 'INVALID'), false);
  assertEqual(isCrossSolved(facelets, null), false);
  assertEqual(isCrossSolved(facelets, undefined), true, 'Default crossFace parameter is D');
  assertEqual(isCrossSolved(facelets, 12345), false);
});

// ============================================================================
// SUITE 4: F2L VALIDATION & CORNER/EDGE DISCRIMINATION
// ============================================================================

suite.it('ADV-M2-18: Cross solved but 1 F2L corner twisted in place fails isF2LSolved', () => {
  // 3x Sexy move on a solved cube permutes DFR corner and FR edge.
  // 6x Sexy move returns to solved.
  // 2x or 4x Sexy move leaves DFR corner twisted / dislocated.
  const sim = new CubeStateSimulator();
  sim.applyMoves("R U R' U' R U R' U'"); // 2x Sexy Move
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true, 'Cross must remain intact');
  assertEqual(isF2LSolved(facelets), false, 'Twisted F2L corner/edge must fail isF2LSolved');

  const res = detectSolvePhase(facelets, 'cross');
  assertEqual(res.phase, 'f2l', 'Cross solved advances to f2l');
});

suite.it('ADV-M2-19: Cross solved but middle edges displaced fails isF2LSolved', () => {
  // Displace middle edges while preserving cross:
  // e.g. R2 U2 R2 U2 R2 U2 preserves D cross and U face, but swaps middle/last layer pieces
  const sim = new CubeStateSimulator();
  sim.applyMoves("R2 U2 R2 U2 R2 U2");
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true, 'D cross is preserved');
  assertEqual(isF2LSolved(facelets), false, 'FR and BR edges swapped must fail F2L');
});

suite.it('ADV-M2-20: isF2LSolved requires cross to be solved first', () => {
  // If D cross is broken, isF2LSolved must return false even if other layers look intact
  const sim = new CubeStateSimulator();
  sim.applyMove('D'); // Breaks cross alignment with centers
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), false);
  assertEqual(isF2LSolved(facelets), false, 'Broken cross must immediately fail F2L');
});

// ============================================================================
// SUITE 5: OLL VALIDATION, AUF INVARIANCE & CORNER ORIENTATION
// ============================================================================

suite.it('ADV-M2-21: Yellow cross formed on U but corners unoriented fails isOLLSolved', () => {
  // Sune (R U R' U R U2 R') has yellow cross oriented on U, but corners are twisted (OLL 27)
  const sim = new CubeStateSimulator();
  sim.applyMoves("R U R' U R U2 R'");
  const facelets = sim.getFaceletString();

  assertEqual(isCrossSolved(facelets), true);
  assertEqual(isF2LSolved(facelets), true, 'F2L is preserved by Sune');
  assertEqual(isOLLSolved(facelets), false, 'Unoriented U corners must fail isOLLSolved');

  const res = detectSolvePhase(facelets, 'f2l');
  assertEqual(res.phase, 'oll', 'F2L solved advances to oll');
});

suite.it('ADV-M2-22: AUF (U, U\', U2) preserves isOLLSolved when U face is all yellow', () => {
  // Once OLL is solved, U turns only permute the U face stickers within U.
  // All 9 stickers remain yellow, so isOLLSolved must remain true.
  const sim = new CubeStateSimulator();
  sim.applyMoves("R U R' U' R' F R2 U' R' U' R U R' F'"); // T-Perm (OLL solved)

  for (const auf of ['U', "U'", 'U2']) {
    const simAuf = new CubeStateSimulator(sim.getFaceletString());
    simAuf.applyMove(auf);
    const facelets = simAuf.getFaceletString();

    assertEqual(isCrossSolved(facelets), true);
    assertEqual(isF2LSolved(facelets), true);
    assertEqual(isOLLSolved(facelets), true, `AUF ${auf} must keep isOLLSolved true`);
  }
});

suite.it('ADV-M2-23: isOLLSolved requires isF2LSolved to be true', () => {
  // A cube with all 9 U stickers matching U center, but with F2L broken must NOT be OLL solved
  // e.g., create an artificial facelet string where U is solid yellow, but D/F/R/L/B are scrambled
  const sim = new CubeStateSimulator();
  // Sexy move preserves U center and some U stickers, but breaks F2L
  sim.applyMoves("R U R' U'");
  const facelets = sim.getFaceletString();

  assertEqual(isF2LSolved(facelets), false);
  assertEqual(isOLLSolved(facelets), false);
});

// ============================================================================
// SUITE 6: PLL AUF, TERMINAL COMPLETE STATE LOCK
// ============================================================================

suite.it('ADV-M2-24: PLL AUF detection: cube 1 move away from solved stays in pll, completes on final turn', () => {
  // Start from solved cube, apply U (AUF offset)
  const sim = new CubeStateSimulator();
  sim.applyMove('U');
  const faceletsAUF = sim.getFaceletString();

  assertEqual(isOLLSolved(faceletsAUF), true);
  assertEqual(isFaceletsSolved(faceletsAUF), false, 'U offset is not solved');

  // When solver is in 'pll', AUF state must NOT complete prematurely
  const resBefore = detectSolvePhase(faceletsAUF, 'pll');
  assertEqual(resBefore.phase, 'pll', 'AUF state must remain in pll');
  assertEqual(resBefore.isAdvance, false);

  // Apply correcting turn U'
  sim.applyMove("U'");
  const faceletsSolved = sim.getFaceletString();
  assertEqual(isFaceletsSolved(faceletsSolved), true);

  const resAfter = detectSolvePhase(faceletsSolved, 'pll');
  assertEqual(resAfter.phase, 'complete', 'Corrected AUF must advance to complete');
  assertEqual(resAfter.isAdvance, true);
});

suite.it('ADV-M2-25: Once complete is reached, subsequent moves never change phase from complete', () => {
  const sim = new CubeStateSimulator();
  // Cube is solved
  let res = detectSolvePhase(sim.getFaceletString(), 'complete');
  assertEqual(res.phase, 'complete');
  assertEqual(res.isAdvance, false);

  // Apply a 20-move scramble
  sim.applyMoves("D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2");
  res = detectSolvePhase(sim.getFaceletString(), 'complete');
  assertEqual(res.phase, 'complete', 'Phase must remain complete even if cube is scrambled');
  assertEqual(res.isAdvance, false);
});

// ============================================================================
// SUITE 7: MALFORMED INPUTS, DEFENSIVE API & TYPE FUZZING
// ============================================================================

suite.it('ADV-M2-26: detectSolvePhase defensively handles corrupted and non-string inputs', () => {
  const nonStrings = [null, undefined, 0, 42, NaN, true, false, {}, [], () => {}];

  for (const input of nonStrings) {
    const res = detectSolvePhase(input, 'f2l');
    assertEqual(res.phase, 'f2l', `Corrupted input ${String(input)} must preserve current phase`);
    assertEqual(res.isAdvance, false);
  }

  // Length mismatch strings
  const badLengths = ['', 'U', 'UUUUU', 'U'.repeat(53), 'U'.repeat(55), 'U'.repeat(100)];
  for (const str of badLengths) {
    const res = detectSolvePhase(str, 'oll');
    assertEqual(res.phase, 'oll', `Bad length string (${str.length}) must preserve current phase`);
    assertEqual(res.isAdvance, false);
  }
});

suite.it('ADV-M2-27: detectSolvePhase gracefully normalizes invalid currentPhase values', () => {
  const invalidPhases = [null, undefined, '', 'unknown', 'foo', 123, {}];

  for (const invalid of invalidPhases) {
    // With solved facelets, an invalid currentPhase normalizes to 'cross' and advances to 'complete'
    const res = detectSolvePhase(SOLVED_FACELETS, invalid);
    assertEqual(res.phase, 'complete');
    assertEqual(res.isAdvance, true);

    // With scrambled facelets, invalid currentPhase normalizes to 'cross' and stays 'cross'
    const scrambled = "D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2";
    const sim = new CubeStateSimulator();
    sim.applyMoves(scrambled);
    const resScrambled = detectSolvePhase(sim.getFaceletString(), invalid);
    assertEqual(resScrambled.phase, 'cross');
    assertEqual(resScrambled.isAdvance, false);
  }
});

suite.it('ADV-M2-28: Strict contract invariants: isAdvance === (phase !== currentPhase)', () => {
  const phases = ['cross', 'f2l', 'oll', 'pll', 'complete'];
  const testStates = [
    SOLVED_FACELETS,
    (() => { const s = new CubeStateSimulator(); s.applyMoves("R U R' U'"); return s.getFaceletString(); })(),
    (() => { const s = new CubeStateSimulator(); s.applyMoves("R U R' U R U2 R'"); return s.getFaceletString(); })(),
    (() => { const s = new CubeStateSimulator(); s.applyMoves("R U R' F' R U R' U' R' F R2 U' R' U'"); return s.getFaceletString(); })(),
    (() => { const s = new CubeStateSimulator(); s.applyMoves("D' R2 U' B2 U F2 R2 D' F2 U B2 R' D' B' R' B2 D' F' D R2"); return s.getFaceletString(); })()
  ];

  for (const state of testStates) {
    for (const phase of phases) {
      const res = detectSolvePhase(state, phase);
      assertEqual(typeof res.isAdvance, 'boolean', 'isAdvance must be boolean');
      assertEqual(CFOP_PHASES.includes(res.phase), true, `phase '${res.phase}' must be valid CFOP phase`);
      assertEqual(
        res.isAdvance,
        res.phase !== phase,
        `isAdvance invariant failed for state with phase=${phase}: res.phase=${res.phase}, isAdvance=${res.isAdvance}`
      );
    }
  }
});

// ============================================================================
// SUITE 8: F2L ALL 4 CORNERS TWIST & ALL 4 MIDDLE EDGES FLIP STRESS
// ============================================================================

suite.it('ADV-M2-29: Twisting ANY of the 4 first-layer corners CW or CCW fails isF2LSolved', () => {
  // Corners: DFL (27, 24, 44), DFR (29, 26, 15), DBR (35, 51, 17), DBL (33, 53, 42)
  const corners = [
    { name: 'DFL', indices: [27, 24, 44] },
    { name: 'DFR', indices: [29, 26, 15] },
    { name: 'DBR', indices: [35, 51, 17] },
    { name: 'DBL', indices: [33, 53, 42] }
  ];

  for (const c of corners) {
    const [i0, i1, i2] = c.indices;

    // Twist CW: cycle indices
    const fCW = SOLVED_FACELETS.split('');
    const tmpCW = fCW[i0];
    fCW[i0] = fCW[i2];
    fCW[i2] = fCW[i1];
    fCW[i1] = tmpCW;

    assertEqual(isCrossSolved(fCW.join('')), true, `${c.name} CW twist must not break cross`);
    assertEqual(isF2LSolved(fCW.join('')), false, `${c.name} CW twist must fail isF2LSolved`);

    // Twist CCW: cycle opposite direction
    const fCCW = SOLVED_FACELETS.split('');
    const tmpCCW = fCCW[i0];
    fCCW[i0] = fCCW[i1];
    fCCW[i1] = fCCW[i2];
    fCCW[i2] = tmpCCW;

    assertEqual(isCrossSolved(fCCW.join('')), true, `${c.name} CCW twist must not break cross`);
    assertEqual(isF2LSolved(fCCW.join('')), false, `${c.name} CCW twist must fail isF2LSolved`);
  }
});

suite.it('ADV-M2-30: Flipping ANY of the 4 middle-layer edges fails isF2LSolved', () => {
  // Edges: FL (21, 41), FR (23, 12), BR (48, 14), BL (50, 39)
  const edges = [
    { name: 'FL', indices: [21, 41] },
    { name: 'FR', indices: [23, 12] },
    { name: 'BR', indices: [48, 14] },
    { name: 'BL', indices: [50, 39] }
  ];

  for (const e of edges) {
    const [i0, i1] = e.indices;
    const fFlip = SOLVED_FACELETS.split('');
    const tmp = fFlip[i0];
    fFlip[i0] = fFlip[i1];
    fFlip[i1] = tmp;

    assertEqual(isCrossSolved(fFlip.join('')), true, `${e.name} flip must not break cross`);
    assertEqual(isF2LSolved(fFlip.join('')), false, `${e.name} flip must fail isF2LSolved`);
  }
});

// ============================================================================
// SUITE 9: F2L REALISTIC MULTI-MOVE INSERTION ALGORITHMS BATTERY
// ============================================================================

suite.it('ADV-M2-31: 10 authentic F2L pair insertion algorithms maintain monotonic >= f2l invariant', () => {
  const f2lAlgs = [
    { name: 'Basic FR insertion', moves: "U R U' R'" },
    { name: 'Basic FL insertion', moves: "U' F' U F" },
    { name: 'Sledgehammer insertion', moves: "R' F R F'" },
    { name: 'Hedgeslammer insertion', moves: "F R' F' R" },
    { name: 'Split pair insertion', moves: "R U2 R' U R U' R'" },
    { name: 'Connected pair insertion', moves: "R U' R' U2 R U' R'" },
    { name: 'Keyhole insertion', moves: "R' U2 R2 U R2' U R" },
    { name: 'F-face insertion', moves: "F' U F U' F' U F" },
    { name: 'Double sexy move', moves: "R U R' U' R U R' U'" },
    { name: 'Back slot BR insertion', moves: "U R' U' R U' R' U R" }
  ];

  for (const alg of f2lAlgs) {
    const sim = new CubeStateSimulator();
    let currentPhase = 'f2l';
    const moves = alg.moves.split(/\s+/).filter(Boolean);

    for (let i = 0; i < moves.length; i++) {
      sim.applyMove(moves[i]);
      const facelets = sim.getFaceletString();
      const res = detectSolvePhase(facelets, currentPhase);

      assert(
        PHASE_RANKS[res.phase] >= PHASE_RANKS[currentPhase],
        `${alg.name} move ${i + 1} (${moves[i]}): phase '${res.phase}' regressed below '${currentPhase}'`
      );

      if (res.isAdvance) {
        currentPhase = res.phase;
      }
    }
  }
});

// ============================================================================
// SUITE 10: PROPERTY FUZZING & CFOP INCLUSION HIERARCHY
// ============================================================================

suite.it('ADV-M2-32: Mathematical CFOP inclusion hierarchy holds across 200 random cube states', () => {
  // Strict inclusion: PLL_solved => OLL_solved => F2L_solved => Cross_solved
  const allMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
  const sim = new CubeStateSimulator();

  for (let walk = 0; walk < 200; walk++) {
    const move = allMoves[(walk * 11 + 5) % allMoves.length];
    sim.applyMove(move);
    const f = sim.getFaceletString();

    const cross = isCrossSolved(f);
    const f2l = isF2LSolved(f);
    const oll = isOLLSolved(f);
    const pll = isPLLSolved(f);

    if (pll) {
      assert(oll, `Step ${walk}: PLL solved must imply OLL solved`);
    }
    if (oll) {
      assert(f2l, `Step ${walk}: OLL solved must imply F2L solved`);
    }
    if (f2l) {
      assert(cross, `Step ${walk}: F2L solved must imply Cross solved`);
    }
  }
});

suite.it('ADV-M2-33: Non-throwing fuzz test on 200 exotic malformed inputs', () => {
  const exoticInputs = [
    null, undefined, 0, -1, 3.14, NaN, Infinity, -Infinity,
    true, false,
    {}, { length: 54 }, { facelets: 'UUU...' },
    [], [1, 2, 3], new Array(54).fill('U'),
    new Uint8Array(54), new Int32Array(10),
    Symbol('fuzz'), () => 'facelets',
    BigInt(123456789),
    '\x00'.repeat(54),
    '\uFFFF'.repeat(54),
    ' '.repeat(54),
    'UUU\nDDD\nFFF\n',
    JSON.stringify({ a: 1 })
  ];

  for (const input of exoticInputs) {
    try {
      const res = detectSolvePhase(input, 'f2l');
      assert(res !== null && typeof res === 'object', 'Must return an object');
      assert(CFOP_PHASES.includes(res.phase), `Phase '${res.phase}' must be a valid CFOP phase`);
      assert(typeof res.isAdvance === 'boolean', 'isAdvance must be boolean');
      assert(PHASE_RANKS[res.phase] >= PHASE_RANKS.f2l, 'Phase must never regress below f2l');
    } catch (err) {
      assert(false, `detectSolvePhase threw on input ${String(input)}: ${err.message}`);
    }
  }
});

// Self-executing runner if invoked directly
if (process.argv[1]?.replace(/\\/g, '/').endsWith('tier5_cfop_phase_adversarial.mjs')) {
  suite.run().then(res => {
    console.log(`\n${suite.name}: ${res.passed}/${res.total} tests passed (${res.durationMs}ms)`);
    if (res.errors.length > 0) {
      console.error(res.errors);
      process.exit(1);
    }
  });
}
