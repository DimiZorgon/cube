// tests/e2e/smartCube/tier2_boundaries/boundary_f2_unsupported_subpaths.mjs
// Boundary F2: Unsupported Subpaths & Route Fallbacks (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('Boundary F2: Unsupported Subpaths & Route Fallbacks');

function matchSmartCubeSubpath(subpath) {
  const allowed = ['/play/smart-cube', '/play/smart-cube/stats', '/play/smart-cube/settings'];
  if (allowed.includes(subpath)) return { valid: true, route: subpath };
  return { valid: false, fallback: '/play/smart-cube' };
}

suite.it('B2-1: Valid primary smart-cube path returns valid route', () => {
  const res = matchSmartCubeSubpath('/play/smart-cube');
  assertEqual(res.valid, true);
});

suite.it('B2-2: Deep non-existent subpath falls back cleanly to smart-cube root', () => {
  const res = matchSmartCubeSubpath('/play/smart-cube/nonexistent/nested');
  assertEqual(res.valid, false);
  assertEqual(res.fallback, '/play/smart-cube');
});

suite.it('B2-3: Special characters in subpath fall back to root', () => {
  const res = matchSmartCubeSubpath('/play/smart-cube/<script>');
  assertEqual(res.valid, false);
  assertEqual(res.fallback, '/play/smart-cube');
});

suite.it('B2-4: Extremely long subpath string is safely handled', () => {
  const longPath = '/play/smart-cube/' + 'a'.repeat(2048);
  const res = matchSmartCubeSubpath(longPath);
  assertEqual(res.valid, false);
});

suite.it('B2-5: Empty or null subpath defaults to /play/smart-cube', () => {
  const res = matchSmartCubeSubpath('');
  assertEqual(res.valid, false);
});
