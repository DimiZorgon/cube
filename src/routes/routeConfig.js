// src/routes/routeConfig.js
// Source unique de vérité pour les URLs du site.
// ⚠️ Module "pur" (aucun import React / data / three) : il est aussi importé
// par scripts/prerender-meta.mjs côté Node pour générer les pages HTML et le sitemap.

export const SITE_URL = 'https://cube.noullez.com';
export const LANGS = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

/** Langue déduite de l'URL : FR à la racine, EN sous /en/. */
export function detectLang(pathname) {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'fr';
}

/** basename du routeur pour une langue. */
export function basenameFor(lang) {
  return lang === 'en' ? '/en' : '';
}

/** Chemin public (avec préfixe de langue) d'une route interne. */
export function localizedPath(path, lang) {
  if (lang !== 'en') return path;
  return path === '/' ? '/en/' : `/en${path}`;
}

/** URL absolue d'une route interne pour une langue. */
export function absoluteUrl(path, lang) {
  return `${SITE_URL}${localizedPath(path, lang)}`;
}

export const PUZZLES = ['2x2', '3x3', '4x4'];

/**
 * Méthodes d'apprentissage.
 * - sections : onglets exposés en sous-route (slug d'URL ↔ id utilisé dans les data).
 * - defaultSection : slug vers lequel on redirige quand l'URL n'a pas de section.
 * - allSectionId : id du filtre « Tout » affiché quand l'URL n'a pas de section.
 */
export const METHODS = [
  { key: 'simple2x2', size: '2x2', slug: 'simple', sections: [] },
  {
    key: 'ortega2x2',
    size: '2x2',
    slug: 'ortega',
    allSectionId: 'ALL',
    sections: [
      { slug: 'face1', id: 'FACE1' },
      { slug: 'oll', id: 'OLL' },
      { slug: 'pbl', id: 'PBL' }
    ]
  },
  { key: 'simple3x3', size: '3x3', slug: 'simple', sections: [] },
  {
    key: 'cfop3x3',
    size: '3x3',
    slug: 'cfop',
    defaultSection: 'f2l',
    sections: [
      { slug: 'f2l', id: 'F2L' },
      { slug: '2look-oll', id: '2-LOOK OLL' },
      { slug: 'oll', id: 'OLL' },
      { slug: '2look-pll', id: '2-LOOK PLL' },
      { slug: 'pll', id: 'PLL' }
    ]
  },
  {
    key: 'blind3x3',
    size: '3x3',
    slug: 'blind',
    defaultSection: 'guide',
    sections: [
      { slug: 'guide', id: 'GUIDE' },
      { slug: 'algorithms', id: 'CORE_ALGOS' },
      { slug: 'edges-setup', id: 'EDGES_SETUP' },
      { slug: 'corners-setup', id: 'CORNERS_SETUP' }
    ]
  },
  { key: 'simple4x4', size: '4x4', slug: 'simple', sections: [] },
  {
    key: 'yau4x4',
    size: '4x4',
    slug: 'yau',
    allSectionId: 'ALL',
    sections: [
      { slug: 'centers-cross', id: 'CENTERS_CROSS' },
      { slug: 'last-centers', id: 'LAST_CENTERS' },
      { slug: 'pairing-323', id: 'PAIRING_323' },
      { slug: 'oll-parity', id: 'OLL_PARITY' },
      { slug: 'pll-parity', id: 'PLL_PARITY' }
    ]
  }
];

export function findMethod(size, slug) {
  return METHODS.find(m => m.size === size && m.slug === slug) || null;
}

export function findMethodByKey(key) {
  return METHODS.find(m => m.key === key) || null;
}

export function sectionBySlug(method, slug) {
  return method?.sections.find(s => s.slug === slug) || null;
}

export function sectionById(method, id) {
  return method?.sections.find(s => s.id === id) || null;
}

/** Constructeurs de chemins internes (sans préfixe de langue : géré par le basename). */
export const paths = {
  home: () => '/',
  play: () => '/play',
  game: size => `/play/${size}`,
  timer: () => '/timer',
  settings: () => '/settings',
  algos: () => '/algos',
  method: (method, sectionSlug = null) =>
    `/algos/${method.size}/${method.slug}${sectionSlug ? `/${sectionSlug}` : ''}`,
  training: (method, caseId) =>
    `/algos/${method.size}/${method.slug}/test/${encodeURIComponent(caseId)}`
};

/**
 * Liste des routes indexables (prérendu des métadonnées + sitemap).
 * Les routes de redirection (/algos/3x3/cfop → /pll) et d'entraînement sont exclues.
 */
export function listIndexableRoutes() {
  const routes = [
    { path: paths.home(), seoKey: 'home' },
    { path: paths.play(), seoKey: 'play' },
    ...PUZZLES.map(size => ({ path: paths.game(size), seoKey: `game.${size}` })),
    { path: paths.timer(), seoKey: 'timer' },
    { path: paths.settings(), seoKey: 'settings' },
    { path: paths.algos(), seoKey: 'algos' }
  ];

  for (const method of METHODS) {
    if (!method.defaultSection) {
      routes.push({ path: paths.method(method), seoKey: `method.${method.key}` });
    }
    for (const section of method.sections) {
      routes.push({
        path: paths.method(method, section.slug),
        seoKey: `method.${method.key}.${section.slug}`
      });
    }
  }

  return routes;
}

