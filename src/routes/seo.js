// src/routes/seo.js
// Métadonnées SEO par route (titre, description, robots) + construction du <head>.
// ⚠️ Module "pur" : partagé entre le navigateur (useSeo) et scripts/prerender-meta.mjs.

import { absoluteUrl } from './routeConfig.js';

export const BRAND = 'Cube Studio';

const OG_LOCALES = { fr: 'fr_FR', en: 'en_US' };

const TEXTS = {
  fr: {
    home: {
      title: "Cube Studio | Simulateur de Rubik's Cube et guides",
      description:
        "Jouez au Rubik's Cube 2x2, 3x3 et 4x4, découvrez des méthodes de résolution et entraînez-vous avec des algorithmes interactifs.",
      rawTitle: true
    },
    play: {
      title: 'Jouer au Rubik’s Cube en 3D',
      description: 'Choisissez votre puzzle : simulateur 3D de Rubik’s Cube 2x2, 3x3 ou 4x4, ou chronomètre de speedcubing WCA.'
    },
    'game.2x2': {
      title: 'Simulateur Rubik’s Cube 2x2 en ligne',
      description: 'Résolvez un Pocket Cube 2x2 en 3D dans votre navigateur : mélange aléatoire, chronomètre et record personnel.'
    },
    'game.3x3': {
      title: 'Simulateur Rubik’s Cube 3x3 en ligne',
      description: 'Résolvez un Rubik’s Cube 3x3 en 3D dans votre navigateur : contrôles clavier et tactiles, mélange, chronomètre et record.'
    },
    'game.4x4': {
      title: 'Simulateur Rubik’s Revenge 4x4 en ligne',
      description: 'Résolvez un Rubik’s Cube 4x4 en 3D dans votre navigateur : mouvements larges, mélange, chronomètre et record.'
    },
    'game.5x5': {
      title: 'Simulateur Rubik’s Cube 5x5 en ligne (Professor’s Cube)',
      description: 'Résolvez un Rubik’s Cube 5x5 en 3D dans votre navigateur : mouvements larges, mélange WCA, chronomètre et record.'
    },
    timer: {
      title: 'Chronomètre de speedcubing WCA',
      description: 'Chronomètre speedcubing avec mélanges WCA, inspection 15 s, ao5, ao12 et export csTimer pour 2x2, 3x3 et 4x4.'
    },
    settings: {
      title: 'Paramètres du cube',
      description: 'Personnalisez les couleurs, le style creux, la taille et la vitesse de rotation du Rubik’s Cube 3D.'
    },
    algos: {
      title: 'Méthodes de résolution du Rubik’s Cube',
      description: 'Guides interactifs pour résoudre le Rubik’s Cube : débutant 2x2, 3x3 et 4x4, Ortega, CFOP, Blindfolded et Yau.'
    },
    'method.simple2x2': {
      name: 'Méthode débutant 2x2',
      title: 'Méthode débutant 2x2 – Résoudre le Pocket Cube',
      description: 'Apprenez à résoudre le Rubik’s Cube 2x2 en 3 étapes avec démonstrations 3D et algorithmes à tester.'
    },
    'method.ortega2x2': {
      name: 'Méthode Ortega 2x2',
      title: 'Méthode Ortega 2x2 – Première face, OLL et PBL',
      description: 'Tous les algorithmes de la méthode Ortega pour 2x2 : première face, 7 cas OLL et cas PBL, avec démonstrations 3D.'
    },
    'method.ortega2x2.face1': {
      title: 'Ortega 2x2 – Première face',
      description: 'Construisez la première face du 2x2 avec la méthode Ortega : cas, explications et démonstrations 3D.'
    },
    'method.ortega2x2.oll': {
      title: 'Ortega 2x2 – Les 7 cas OLL',
      description: 'Les 7 algorithmes OLL de la méthode Ortega 2x2 (Sune, Anti-Sune, H, Pi, T, U, L) avec démonstrations 3D.'
    },
    'method.ortega2x2.pbl': {
      title: 'Ortega 2x2 – Algorithmes PBL',
      description: 'Permutation des deux couches (PBL) de la méthode Ortega 2x2 : tous les cas avec démonstrations 3D.'
    },
    'method.simple3x3': {
      name: 'Méthode débutant 3x3',
      title: 'Méthode débutant 3x3 – Résoudre le Rubik’s Cube couche par couche',
      description: 'Résolvez le Rubik’s Cube 3x3 pas à pas : croix, coins, deuxième couronne, croix jaune et dernière face, en 3D.'
    },
    'method.cfop3x3': {
      name: 'Méthode CFOP 3x3',
      title: 'Méthode CFOP 3x3',
      description: 'Bibliothèque complète CFOP / Fridrich : F2L, OLL, PLL et versions 2-look avec démonstrations 3D.'
    },
    'method.cfop3x3.f2l': {
      title: 'CFOP – Les 41 algorithmes F2L',
      description: 'Les 41 cas F2L (First Two Layers) de la méthode CFOP avec diagrammes, démonstrations 3D et suivi d’apprentissage.'
    },
    'method.cfop3x3.2look-oll': {
      title: 'CFOP – OLL en 2 étapes (2-look OLL)',
      description: 'Orientez la dernière couche en deux étapes : algorithmes 2-look OLL pour débuter le CFOP, avec démonstrations 3D.'
    },
    'method.cfop3x3.oll': {
      title: 'CFOP – Les 57 algorithmes OLL',
      description: 'Les 57 cas OLL (Orientation of the Last Layer) de la méthode CFOP avec diagrammes et démonstrations 3D.'
    },
    'method.cfop3x3.2look-pll': {
      title: 'CFOP – PLL en 2 étapes (2-look PLL)',
      description: 'Permutez la dernière couche en deux étapes avec 6 algorithmes PLL essentiels, démontrés en 3D.'
    },
    'method.cfop3x3.pll': {
      title: 'CFOP – Les 21 algorithmes PLL',
      description: 'Les 21 cas PLL (Permutation of the Last Layer) de la méthode CFOP avec flèches, diagrammes et démonstrations 3D.'
    },
    'method.blind3x3': {
      name: 'Méthode à l’aveugle 3x3',
      title: 'Résoudre le Rubik’s Cube à l’aveugle (Blindfolded)',
      description: 'Méthode Blindfolded 3x3 : Old Pochmann, M2, patron Speffz interactif et setups.'
    },
    'method.blind3x3.guide': {
      title: 'Blindfolded 3x3 – Cours et patron Speffz',
      description: 'Apprenez à résoudre le Rubik’s Cube à l’aveugle : mémorisation Speffz, buffers, parité et patron interactif.'
    },
    'method.blind3x3.algorithms': {
      title: 'Blindfolded 3x3 – Les 3 algorithmes essentiels',
      description: 'T-Perm, Y-Perm modifiée et Ra-Perm : les trois algorithmes nécessaires pour résoudre le 3x3 à l’aveugle.'
    },
    'method.blind3x3.edges-setup': {
      title: 'Blindfolded 3x3 – Setups des arêtes',
      description: 'Tous les setup moves des arêtes vers la cible D pour la méthode à l’aveugle, lettre par lettre (Speffz).'
    },
    'method.blind3x3.corners-setup': {
      title: 'Blindfolded 3x3 – Setups des coins',
      description: 'Tous les setup moves des coins vers la cible P pour la méthode à l’aveugle, lettre par lettre (Speffz).'
    },
    'method.simple4x4': {
      name: 'Méthode débutant 4x4',
      title: 'Méthode débutant 4x4 – Résoudre le Rubik’s Revenge',
      description: 'Résolvez le 4x4 par réduction : centres, appariement des arêtes, résolution 3x3 et parités OLL/PLL.'
    },
    'method.yau4x4': {
      name: 'Méthode Yau 4x4',
      title: 'Méthode Yau 4x4 – Speedcubing',
      description: 'La méthode Yau pour 4x4 : centres opposés, croix, derniers centres, arêtes 3-2-3 et parités.'
    },
    'method.yau4x4.centers-cross': {
      title: 'Yau 4x4 – Centres opposés et 3 arêtes de croix',
      description: 'Première étape de la méthode Yau : centres opposés et trois arêtes de croix, avec démonstrations 3D.'
    },
    'method.yau4x4.last-centers': {
      title: 'Yau 4x4 – Les 4 derniers centres',
      description: 'Terminez les centres du 4x4 avec la méthode Yau : techniques et algorithmes en 3D.'
    },
    'method.yau4x4.pairing-323': {
      title: 'Yau 4x4 – Appariement des arêtes 3-2-3',
      description: 'Appariez les arêtes du 4x4 avec la technique 3-2-3 de la méthode Yau, démonstrations 3D incluses.'
    },
    'method.yau4x4.oll-parity': {
      title: 'Yau 4x4 – Parité OLL',
      description: 'Algorithmes de parité OLL du 4x4 (Lucas et pure) avec démonstrations 3D.'
    },
    'method.yau4x4.pll-parity': {
      title: 'Yau 4x4 – Parité PLL',
      description: 'Algorithmes de parité PLL du 4x4 (arêtes opposées, adjacentes, coins diagonaux) avec démonstrations 3D.'
    },
    'method.professor5x5': {
      name: 'Méthode Professor 5x5 (Francocube)',
      title: 'Méthode Professor 5x5 – Réduction (Francocube Cyril)',
      description: 'Apprenez à résoudre le Rubik’s Cube 5x5 par réduction : centres en barres 1x3, arêtes 3 par 3, parité d’arête et finalisation 3x3.'
    },
    'method.professor5x5.centers': {
      title: '5x5 Professor – Les 6 centres (Barres 1x3)',
      description: 'Construisez les 6 centres du 5x5 avec les barres 1x3 et commutateurs (méthode Francocube Cyril).'
    },
    'method.professor5x5.edges': {
      title: '5x5 Professor – Appariement des arêtes',
      description: 'Regroupez les 12 arêtes du 5x5 (arête centrale et 2 ailes) avec la technique Slice-Flip-Slice.'
    },
    'method.professor5x5.last-edges': {
      title: '5x5 Professor – Les 2 dernières arêtes',
      description: 'Résolvez les deux dernières arêtes du 5x5 sans détruire les centres déjà constitués.'
    },
    'method.professor5x5.parity': {
      title: '5x5 Professor – Parité de l’arête centrale',
      description: 'Algorithme officiel Francocube Cyril pour retourner l’arête centrale inversée sur le 5x5.'
    },
    'method.professor5x5.reduction-3x3': {
      title: '5x5 Professor – Phase finale 3x3',
      description: 'Résolvez le 5x5 réduit comme un 3x3 standard avec les méthodes CFOP ou débutant.'
    },
    training: {
      title: 'Entraînement : {{caseName}} – {{methodName}}',
      description: 'Entraînez-vous sur le cas {{caseName}} ({{methodName}}) directement sur le Rubik’s Cube 3D.'
    },
    notFound: {
      title: 'Page introuvable',
      description: 'Cette page n’existe pas ou a été déplacée.'
    }
  },
  en: {
    home: {
      title: "Cube Studio | 3D Rubik's Cube Simulator and Guides",
      description:
        "Solve the 2x2, 3x3, and 4x4 Rubik's Cube, learn beginner and speedcubing methods, and practise algorithms interactively.",
      rawTitle: true
    },
    play: {
      title: "Play the Rubik's Cube in 3D",
      description: "Pick your puzzle: 3D 2x2, 3x3 or 4x4 Rubik's Cube simulator, or a WCA speedcubing timer."
    },
    'game.2x2': {
      title: "Online 2x2 Rubik's Cube Simulator",
      description: 'Solve a 2x2 Pocket Cube in 3D in your browser: random scrambles, timer and personal best.'
    },
    'game.3x3': {
      title: "Online 3x3 Rubik's Cube Simulator",
      description: "Solve a 3x3 Rubik's Cube in 3D in your browser: keyboard and touch controls, scrambles, timer and personal best."
    },
    'game.4x4': {
      title: "Online 4x4 Rubik's Revenge Simulator",
      description: "Solve a 4x4 Rubik's Cube in 3D in your browser: wide moves, scrambles, timer and personal best."
    },
    'game.5x5': {
      title: "Online 5x5 Rubik's Cube Simulator (Professor's Cube)",
      description: "Solve a 5x5 Rubik's Cube in 3D in your browser: wide moves, WCA scrambles, timer and personal best."
    },
    timer: {
      title: 'WCA Speedcubing Timer',
      description: 'Speedcubing timer with WCA scrambles, 15 s inspection, ao5, ao12 and csTimer export for 2x2, 3x3 and 4x4.'
    },
    settings: {
      title: 'Cube Settings',
      description: "Customise colours, hollow style, size and turn speed of the 3D Rubik's Cube."
    },
    algos: {
      title: "Rubik's Cube Solving Methods",
      description: "Interactive guides to solve the Rubik's Cube: beginner 2x2, 3x3 and 4x4, Ortega, CFOP, Blindfolded and Yau."
    },
    'method.simple2x2': {
      name: '2x2 beginner method',
      title: '2x2 Beginner Method – Solve the Pocket Cube',
      description: "Learn to solve the 2x2 Rubik's Cube in 3 steps with 3D demos and algorithms you can try."
    },
    'method.ortega2x2': {
      name: '2x2 Ortega method',
      title: '2x2 Ortega Method – First Face, OLL and PBL',
      description: 'Every Ortega algorithm for the 2x2: first face, 7 OLL cases and PBL cases, with 3D demos.'
    },
    'method.ortega2x2.face1': {
      title: 'Ortega 2x2 – First Face',
      description: 'Build the first face of the 2x2 with the Ortega method: cases, explanations and 3D demos.'
    },
    'method.ortega2x2.oll': {
      title: 'Ortega 2x2 – The 7 OLL Cases',
      description: 'The 7 OLL algorithms of the 2x2 Ortega method (Sune, Anti-Sune, H, Pi, T, U, L) with 3D demos.'
    },
    'method.ortega2x2.pbl': {
      title: 'Ortega 2x2 – PBL Algorithms',
      description: 'Permutation of Both Layers (PBL) for the 2x2 Ortega method: every case with 3D demos.'
    },
    'method.simple3x3': {
      name: '3x3 beginner method',
      title: "3x3 Beginner Method – Solve the Rubik's Cube Layer by Layer",
      description: "Solve the 3x3 Rubik's Cube step by step: cross, corners, second layer, yellow cross and last layer, in 3D."
    },
    'method.cfop3x3': {
      name: '3x3 CFOP method',
      title: '3x3 CFOP Method',
      description: 'Complete CFOP / Fridrich library: F2L, OLL, PLL and 2-look versions with 3D demos.'
    },
    'method.cfop3x3.f2l': {
      title: 'CFOP – All 41 F2L Algorithms',
      description: 'All 41 F2L (First Two Layers) cases of the CFOP method with diagrams, 3D demos and progress tracking.'
    },
    'method.cfop3x3.2look-oll': {
      title: 'CFOP – 2-Look OLL',
      description: 'Orient the last layer in two steps: 2-look OLL algorithms to get started with CFOP, with 3D demos.'
    },
    'method.cfop3x3.oll': {
      title: 'CFOP – All 57 OLL Algorithms',
      description: 'All 57 OLL (Orientation of the Last Layer) cases of the CFOP method with diagrams and 3D demos.'
    },
    'method.cfop3x3.2look-pll': {
      title: 'CFOP – 2-Look PLL',
      description: 'Permute the last layer in two steps with 6 essential PLL algorithms, demonstrated in 3D.'
    },
    'method.cfop3x3.pll': {
      title: 'CFOP – All 21 PLL Algorithms',
      description: 'All 21 PLL (Permutation of the Last Layer) cases of the CFOP method with arrows, diagrams and 3D demos.'
    },
    'method.blind3x3': {
      name: '3x3 blindfolded method',
      title: "Solve the Rubik's Cube Blindfolded",
      description: '3x3 Blindfolded method: Old Pochmann, M2, interactive Speffz scheme and setup moves.'
    },
    'method.blind3x3.guide': {
      title: 'Blindfolded 3x3 – Course and Speffz Scheme',
      description: "Learn to solve the Rubik's Cube blindfolded: Speffz memorisation, buffers, parity and an interactive scheme."
    },
    'method.blind3x3.algorithms': {
      title: 'Blindfolded 3x3 – The 3 Core Algorithms',
      description: 'T-Perm, modified Y-Perm and Ra-Perm: the three algorithms you need to solve the 3x3 blindfolded.'
    },
    'method.blind3x3.edges-setup': {
      title: 'Blindfolded 3x3 – Edge Setup Moves',
      description: 'Every edge setup move to target D for blindfolded solving, letter by letter (Speffz).'
    },
    'method.blind3x3.corners-setup': {
      title: 'Blindfolded 3x3 – Corner Setup Moves',
      description: 'Every corner setup move to target P for blindfolded solving, letter by letter (Speffz).'
    },
    'method.simple4x4': {
      name: '4x4 beginner method',
      title: "4x4 Beginner Method – Solve the Rubik's Revenge",
      description: 'Solve the 4x4 by reduction: centres, edge pairing, 3x3 stage and OLL/PLL parities.'
    },
    'method.yau4x4': {
      name: '4x4 Yau method',
      title: '4x4 Yau Method – Speedcubing',
      description: 'The Yau method for the 4x4: opposite centres, cross, last centres, 3-2-3 edge pairing and parities.'
    },
    'method.yau4x4.centers-cross': {
      title: 'Yau 4x4 – Opposite Centres and 3 Cross Edges',
      description: 'First step of the Yau method: opposite centres and three cross edges, with 3D demos.'
    },
    'method.yau4x4.last-centers': {
      title: 'Yau 4x4 – Last 4 Centres',
      description: 'Finish the 4x4 centres with the Yau method: techniques and algorithms in 3D.'
    },
    'method.yau4x4.pairing-323': {
      title: 'Yau 4x4 – 3-2-3 Edge Pairing',
      description: 'Pair the 4x4 edges with the Yau 3-2-3 technique, 3D demos included.'
    },
    'method.yau4x4.oll-parity': {
      title: 'Yau 4x4 – OLL Parity',
      description: '4x4 OLL parity algorithms (Lucas and pure) with 3D demos.'
    },
    'method.yau4x4.pll-parity': {
      title: 'Yau 4x4 – PLL Parity',
      description: '4x4 PLL parity algorithms (opposite edges, adjacent edges, diagonal corners) with 3D demos.'
    },
    'method.professor5x5': {
      name: '5x5 Professor Method (Reduction)',
      title: '5x5 Professor Method – Reduction (Francocube Cyril)',
      description: 'Learn to solve the 5x5 Rubik’s Cube using reduction: 1x3 center bars, 3-piece edge pairing, parity and 3x3 stage.'
    },
    'method.professor5x5.centers': {
      title: '5x5 Professor – 6 Centers (1x3 Bars)',
      description: 'Build the 6 centers of the 5x5 using 1x3 bars and commutators with 3D demos.'
    },
    'method.professor5x5.edges': {
      title: '5x5 Professor – Edge Pairing',
      description: 'Pair the 12 edges of the 5x5 (center edge and 2 wings) using the Slice-Flip-Slice technique.'
    },
    'method.professor5x5.last-edges': {
      title: '5x5 Professor – Last 2 Edges',
      description: 'Solve the last two edges of the 5x5 without breaking completed centers.'
    },
    'method.professor5x5.parity': {
      title: '5x5 Professor – Center Edge Parity',
      description: 'Official algorithm to flip the reversed center edge on the 5x5 Professor Cube.'
    },
    'method.professor5x5.reduction-3x3': {
      title: '5x5 Professor – Final 3x3 Stage',
      description: 'Finish solving the reduced 5x5 just like a classic 3x3 Rubik’s Cube.'
    },
    training: {
      title: 'Practice: {{caseName}} – {{methodName}}',
      description: "Practise the {{caseName}} case ({{methodName}}) directly on the 3D Rubik's Cube."
    },
    notFound: {
      title: 'Page not found',
      description: 'This page does not exist or has been moved.'
    }
  }
};

/** Clés non indexables (pages éphémères ou d'erreur). */
const NOINDEX_KEYS = new Set(['training', 'notFound']);

const interpolate = (text, vars) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] ?? '').toString());

export function hasSeoEntry(key, lang = 'fr') {
  return Boolean(TEXTS[lang]?.[key]);
}

/** Nom lisible d'une méthode (utilisé dans le titre des pages d'entraînement). */
export function methodName(methodKey, lang) {
  return TEXTS[lang]?.[`method.${methodKey}`]?.name || methodKey;
}

/**
 * Construit les données du <head> d'une route.
 * @param {object} p
 * @param {string} p.key   clé SEO (ex. 'method.cfop3x3.pll')
 * @param {string} p.lang  'fr' | 'en'
 * @param {string} p.path  chemin interne sans préfixe de langue (ex. '/algos/3x3/cfop/pll')
 * @param {object} [p.vars] variables d'interpolation
 */
export function buildHead({ key, lang, path, vars = {} }) {
  const entry = TEXTS[lang]?.[key] || TEXTS[lang]?.notFound;
  const baseTitle = interpolate(entry.title, vars);
  const title = entry.rawTitle ? baseTitle : `${baseTitle} | ${BRAND}`;
  const description = interpolate(entry.description, vars);
  const noindex = NOINDEX_KEYS.has(key);

  return {
    lang,
    title,
    description,
    robots: noindex ? 'noindex, follow' : 'index, follow',
    canonical: absoluteUrl(path, lang),
    alternates: {
      fr: absoluteUrl(path, 'fr'),
      en: absoluteUrl(path, 'en'),
      'x-default': absoluteUrl(path, 'fr')
    },
    ogLocale: OG_LOCALES[lang],
    ogUrl: absoluteUrl(path, lang)
  };
}

