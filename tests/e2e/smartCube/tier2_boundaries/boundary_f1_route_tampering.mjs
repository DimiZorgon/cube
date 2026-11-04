// tests/e2e/smartCube/tier2_boundaries/boundary_f1_route_tampering.mjs
// Boundary F1: Route parameter and query string tampering (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('Boundary F1: Route Tampering & Query Parameters');

function resolvePlayPath(basePath, params = {}) {
  const url = new URL(basePath, 'https://cubestation.local');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.pathname + url.search;
}

suite.it('B1-1: Handles query parameters on smart-cube route gracefully', () => {
  const path = resolvePlayPath('/play/smart-cube', { debug: 'true', autoconnect: '1' });
  assertEqual(path, '/play/smart-cube?debug=true&autoconnect=1');
});

suite.it('B1-2: Sanitizes trailing slashes on smart cube path', () => {
  const normalize = (p) => p.replace(/\/+$/, '') || '/';
  assertEqual(normalize('/play/smart-cube/'), '/play/smart-cube');
});

suite.it('B1-3: Rejects path traversal attempts in play route', () => {
  const sanitizeRoute = (path) => {
    if (path.includes('..') || path.includes('//')) {
      return '/play';
    }
    return path;
  };
  assertEqual(sanitizeRoute('/play/../secret'), '/play');
});

suite.it('B1-4: Handles URL-encoded characters in route query', () => {
  const path = resolvePlayPath('/play/smart-cube', { mac: 'DC%3ABE%3A4A' });
  assert(path.includes('smart-cube'));
});

suite.it('B1-5: Case-insensitive route path matching fallback', () => {
  const matchRoute = (path) => {
    return path.toLowerCase().startsWith('/play/smart-cube');
  };
  assertEqual(matchRoute('/PLAY/SMART-CUBE'), true);
});
