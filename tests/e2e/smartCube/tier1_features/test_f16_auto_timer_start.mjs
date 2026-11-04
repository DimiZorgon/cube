// tests/e2e/smartCube/tier1_features/test_f16_auto_timer_start.mjs
// F16: Automatic Solve Timer Start (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F16: Automatic Solve Timer Start');

suite.it('F16-1: Timer starts in idle status', () => {
  const store = new SpecSmartCubeStore();
  assertEqual(store.getState().timerStatus, 'idle');
});

suite.it('F16-2: New scramble transitions timer status to scrambled', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  assertEqual(store.getState().timerStatus, 'scrambled');
});

suite.it('F16-3: StartInspection transitions timer from scrambled to inspecting', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');
});

suite.it('F16-4: First physical move auto-triggers timer to solving state from scrambled', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  assertEqual(store.getState().timerStatus, 'scrambled');

  store.handleIncomingMove('U');
  assertEqual(store.getState().timerStatus, 'solving');
});

suite.it('F16-5: First physical move auto-triggers timer to solving state from inspecting', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');

  store.handleIncomingMove('R');
  assertEqual(store.getState().timerStatus, 'solving');
});
