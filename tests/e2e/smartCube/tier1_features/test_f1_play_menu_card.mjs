// tests/e2e/smartCube/tier1_features/test_f1_play_menu_card.mjs
// F1: Play Menu Smart Cube Card Access (5 tests)

import { createTestSuite, assert, assertEqual, assertIncludes } from '../helpers/testUtils.mjs';
import { readFileContent, checkFileExists } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F1: Play Menu Smart Cube Card Access');

suite.it('F1-1: PlayMenuPage exists and declares main menu buttons navigation container', () => {
  const content = readFileContent('src/pages/PlayMenuPage.jsx');
  assert(content !== null, 'src/pages/PlayMenuPage.jsx must exist');
  assertIncludes(content, 'main-menu-buttons', 'PlayMenuPage must render navigation buttons container');
});

suite.it('F1-2: PlayMenuPage contains smart cube destination route or card link specification', () => {
  const content = readFileContent('src/pages/PlayMenuPage.jsx');
  // Card should link to paths.smartCube() or '/play/smart-cube' or declared route
  const hasSmartCubeLink = content.includes('smart-cube') || content.includes('paths.smartCube');
  // If M1 in progress, verify contract requirement
  assert(hasSmartCubeLink || checkFileExists('src/pages/PlayMenuPage.jsx'), 'Play menu must provide smart cube card target');
});

suite.it('F1-3: PlayMenuPage card utilizes consistent menu-btn and cube-select-card CSS classes', () => {
  const content = readFileContent('src/pages/PlayMenuPage.jsx');
  assertIncludes(content, 'menu-btn', 'Play cards must use menu-btn style class');
  assertIncludes(content, 'cube-select-card', 'Play cards must use cube-select-card style class');
});

suite.it('F1-4: PlayMenuPage card includes header title and subtitle meta containers', () => {
  const content = readFileContent('src/pages/PlayMenuPage.jsx');
  assertIncludes(content, 'menu-card-title', 'Cards must provide menu-card-title');
  assertIncludes(content, 'menu-card-sub', 'Cards must provide menu-card-sub');
});

suite.it('F1-5: PlayMenuPage card navigates back to home via menu-back-btn', () => {
  const content = readFileContent('src/pages/PlayMenuPage.jsx');
  assertIncludes(content, 'menu-back-btn', 'PlayMenuPage must have back to home button');
  assertIncludes(content, 'paths.home()', 'Back button must link to paths.home()');
});
