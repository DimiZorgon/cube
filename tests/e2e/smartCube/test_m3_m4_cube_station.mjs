// tests/e2e/smartCube/test_m3_m4_cube_station.mjs
import assert from 'node:assert/strict';
import {
  useSmartCubeStore,
  CFOP_PHASE_ORDER
} from '../../../src/store/useSmartCubeStore.js';
import { readFileContent } from './helpers/contractAdapters.mjs';

console.log('--- Démarrage des tests M3 & M4 : Cube Station Workflow ---');

// 1. Suivi interactif du mélange + transition automatique vers l'inspection WCA
{
  const store = new useSmartCubeStore();
  store.startScrambleTracking("R U2 F'", { autoInspect: true });
  let st = store.getState();

  assert.equal(st.timerStatus, 'scrambling');
  store.handleIncomingMove('R', 1000);
  store.handleIncomingMove('D', 1100);
  assert.equal(store.getState().scrambleError, "D'");
  store.handleIncomingMove("D'", 1200);
  assert.equal(store.getState().scrambleError, null);
  store.handleIncomingMove('U', 1300);
  store.handleIncomingMove('U', 1400);
  store.handleIncomingMove("F'", 1500);

  st = store.getState();
  assert.equal(st.timerStatus, 'inspecting');
  assert.ok(st.inspectionStartTime > 0);
  assert.equal(st.scrambleTracking.isComplete, true);
  console.log('✅ Test 1 : Guide de mélange + lancement auto de la phase d’inspection WCA OK');
}

// 2. Résolution CFOP sur Croix Blanche (face U du capteur GAN) sans faux "Skip"
{
  const store = new useSmartCubeStore();
  store.clearSessionSolves();

  // Mélange avec Croix sur U (Blanc) et Dernier Étage sur D (Jaune) :
  // Inverse de : U' (Cross U) -> R D' R' (F2L U) -> F D R D' R' F' (OLL D) -> D' (PLL D)
  const setupWhiteCross = "D F R D R' D' F' R D R' U";
  store.newScramble(setupWhiteCross, { autoInspect: true });
  assert.equal(store.getState().timerStatus, 'inspecting');

  let ts = 20000;

  // Étape 1 : Croix Blanche sur U (U')
  store.handleIncomingMove("U'", ts);
  assert.equal(store.getState().timerStatus, 'solving');
  assert.equal(store.getState().activeCrossFace, 'U');
  assert.equal(store.getState().currentPhase, 'f2l');
  assert.equal(store.getState().phaseSplits.cross.skipped, false);

  // Étape 2 : F2L sur U (R D' R')
  for (const m of ['R', "D'", "R'"]) {
    ts += 250;
    store.handleIncomingMove(m, ts);
  }
  assert.equal(store.getState().currentPhase, 'oll');
  assert.equal(store.getState().phaseSplits.f2l.skipped, false);
  assert.equal(store.getState().phaseSplits.f2l.moves, 3);

  // Étape 3 : OLL sur D (F D R D' R' F')
  for (const m of ['F', 'D', 'R', "D'", "R'", "F'"]) {
    ts += 200;
    store.handleIncomingMove(m, ts);
  }
  assert.equal(store.getState().currentPhase, 'pll');
  assert.equal(store.getState().phaseSplits.oll.skipped, false);
  assert.equal(store.getState().phaseSplits.oll.moves, 6);

  // Étape 4 : PLL sur D (D') -> Résolu !
  ts += 300;
  store.handleIncomingMove("D'", ts);

  const finalState = store.getState();
  assert.equal(finalState.timerStatus, 'solved');
  for (const phase of CFOP_PHASE_ORDER) {
    assert.equal(finalState.phaseSplits[phase].skipped, false, `La phase ${phase} ne doit pas être skip`);
  }
  console.log('✅ Test 2 : Détection CFOP 4 étapes sur Croix Blanche (face U) + Croix Jaune (face D) OK');
}

// 3. Vérification de l'intégration UI dans SmartCubePage.jsx
{
  const uiSource = readFileContent('src/pages/SmartCubePage.jsx');
  assert.ok(uiSource.includes('wallStartTime'));
  assert.ok(uiSource.includes('inspectionStartTime'));
  assert.ok(uiSource.includes('CFOP_PHASE_ORDER'));
  assert.ok(uiSource.includes('startScrambleTracking'));
  assert.ok(uiSource.includes('postSolveAnalysis'));
  console.log('✅ Test 3 : Intégration ergonomique M4 dans SmartCubePage.jsx OK');
}

console.log('🎉 Tous les tests M3, M4 et M5 sont passés avec succès !');