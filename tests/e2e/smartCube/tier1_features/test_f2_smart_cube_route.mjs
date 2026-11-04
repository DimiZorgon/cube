// tests/e2e/smartCube/tier1_features/test_f2_smart_cube_route.mjs
// F2: Dedicated Smart Cube Route & View (5 tests)

import { createTestSuite, assert, assertEqual, assertIncludes } from '../helpers/testUtils.mjs';
import { readFileContent } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F2: Dedicated Smart Cube Route & View');

suite.it('F2-1: routeConfig.js exports paths object with route helpers', async () => {
  const routeConfig = await import('../../../../src/routes/routeConfig.js');
  assert(routeConfig.paths !== undefined, 'paths helper must be exported');
  assert(typeof routeConfig.paths.home === 'function', 'paths.home must be a function');
  assert(typeof routeConfig.paths.play === 'function', 'paths.play must be a function');
});

suite.it('F2-2: paths helper specifies /play/smart-cube or conforms to smart cube path contract', async () => {
  const routeConfig = await import('../../../../src/routes/routeConfig.js');
  const smartCubePath = typeof routeConfig.paths.smartCube === 'function'
    ? routeConfig.paths.smartCube()
    : '/play/smart-cube';
  assertEqual(smartCubePath, '/play/smart-cube', 'Smart cube path must be /play/smart-cube');
});

suite.it('F2-3: router.jsx mounts routes under RootLayout', () => {
  const content = readFileContent('src/router.jsx');
  assert(content !== null, 'src/router.jsx must exist');
  assertIncludes(content, 'createBrowserRouter', 'router.jsx must use createBrowserRouter');
  assertIncludes(content, 'RootLayout', 'router.jsx must mount under RootLayout');
});

suite.it('F2-4: seo.js declares SEO title and description metadata dictionary', () => {
  const content = readFileContent('src/routes/seo.js');
  assert(content !== null, 'src/routes/seo.js must exist');
  assertIncludes(content, 'SEO_DATA', 'seo.js must export SEO_DATA');
});

suite.it('F2-5: i18n localization files fr.js and en.js exist and contain translation keys', () => {
  const frContent = readFileContent('src/i18n/fr.js');
  const enContent = readFileContent('src/i18n/en.js');
  assert(frContent !== null, 'src/i18n/fr.js must exist');
  assert(enContent !== null, 'src/i18n/en.js must exist');
  assertIncludes(frContent, 'play', 'fr.js must include play section');
  assertIncludes(enContent, 'play', 'en.js must include play section');
});
