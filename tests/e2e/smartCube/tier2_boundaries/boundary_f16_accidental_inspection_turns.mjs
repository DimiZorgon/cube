// tests/e2e/smartCube/tier2_boundaries/boundary_f16_accidental_inspection_turns.mjs
// Boundary F16: Accidental Inspection Turns & WCA Rule Simulation (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';
import { SpecSmartCubeStore } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('Boundary F16: Accidental Inspection Turns');

suite.it('B16-1: Any physical turn during inspection immediately starts the timer (WCA compliant)', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');

  // Accidental turn during inspection
  store.handleIncomingMove('U');
  assertEqual(store.getState().timerStatus, 'solving');
});

suite.it('B16-2: Gyro movement during inspection does NOT start the timer', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.startInspection();
  assertEqual(store.getState().timerStatus, 'inspecting');

  // Inspecting involves rotating the cube in hands (gyro only)
  store.driver.onGyro([0.1, 0.2, 0.3, 0.9]);
  assertEqual(store.getState().timerStatus, 'inspecting', 'Physical rotation in hand must not start timer');
});

suite.it('B16-3: Turning cube face in idle state does not trigger timer without scramble', () => {
  const store = new SpecSmartCubeStore();
  assertEqual(store.getState().timerStatus, 'idle');

  store.handleIncomingMove('R');
  assertEqual(store.getState().timerStatus, 'idle', 'Unscrambled practice moves stay idle');
});

suite.it('B16-4: Rapid back-and-forth wiggle (R then R\') starts timer on first turn', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R U R' U'");
  store.startInspection();

  store.handleIncomingMove('R', 1000);
  assertEqual(store.getState().timerStatus, 'solving');

  store.handleIncomingMove("R'", 1050);
  assertEqual(store.getState().timerStatus, 'solving');
  assertEqual(store.getState().moveCount, 2);
});

suite.it('B16-5: Starting inspection on already solving cube is ignored', () => {
  const store = new SpecSmartCubeStore();
  store.newScramble("R");
  store.handleIncomingMove('R');
  assertEqual(store.getState().timerStatus, 'solving');

  store.startInspection();
  assertEqual(store.getState().timerStatus, 'solving');
});
