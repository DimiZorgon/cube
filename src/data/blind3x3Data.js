// src/data/blind3x3Data.js
import { invertAlgo } from '../utils/algoParser.js';

export const BLD_ALGOS = {
  T_PERM: "(R U R' U') (R' F R2 U') R' U' (R U R' F')",
  Y_PERM_MOD: "(R U' R' U') (R U R' F') (R U R' U') (R' F R)",
  RA_PERM: "(R U' R' U') (R U R D) (R' U' R D') (R' U2 R' U')"
};

export const BLD_TABS = [
  { id: 'GUIDE', label: '1. Cours & Patron Speffz' },
  { id: 'CORE_ALGOS', label: '2. Algorithmes (3)' },
  { id: 'EDGES_SETUP', label: '3. Setups Arêtes (Cible D)' },
  { id: 'CORNERS_SETUP', label: '4. Setups Coins (Cible P)' }
];

// Configuration des 6 faces du Patron Speffz (sens horaire en partant d'en haut à gauche)
export const SPEFFZ_FACES = [
  { id: 'U', name: 'U (Haut - Blanc)', color: '#FFFFFF', textColor: '#0f172a', letters: ['A', 'B', 'C', 'D'], gridPos: [0, 1] },
  { id: 'L', name: 'L (Gauche - Orange)', color: '#ff9900', textColor: '#0f172a', letters: ['E', 'F', 'G', 'H'], gridPos: [1, 0] },
  { id: 'F', name: 'F (Face - Vert)', color: '#009B48', textColor: '#ffffff', letters: ['I', 'J', 'K', 'L'], gridPos: [1, 1] },
  { id: 'R', name: 'R (Droite - Rouge)', color: '#B71234', textColor: '#ffffff', letters: ['M', 'N', 'O', 'P'], gridPos: [1, 2] },
  { id: 'B', name: 'B (Arrière - Bleu)', color: '#0003ad', textColor: '#ffffff', letters: ['Q', 'R', 'S', 'T'], gridPos: [1, 3] },
  { id: 'D', name: 'D (Bas - Jaune)', color: '#fbff00', textColor: '#0f172a', letters: ['U', 'V', 'W', 'X'], gridPos: [2, 1] }
];

// Les 3 algorithmes fondamentaux d'exécution
export const BLD_CORE_CASES = [
  {
    id: 'bld_edge_tperm',
    name: 'Échange Arêtes (T-Perm)',
    category: 'BLD - Arêtes (Buffer B ↔ Cible D)',
    alg: BLD_ALGOS.T_PERM,
    setup: null,
    view: 'top',
    maskMode: 'bld_swap',
    yellowTop: false,
    description: 'Échange le Buffer B (UR) avec la Cible D (UL), tout en échangeant les deux coins de droite (UFR ↔ UBR).',
    arrows: [
      { from: [1, 0], to: [1, 2], bi: true },
      { from: [0, 2], to: [2, 2], bi: true }
    ]
  },
  {
    id: 'bld_corner_yperm',
    name: 'Échange Coins (Y-Perm Modifiée)',
    category: 'BLD - Coins (Buffer A ↔ Cible P)',
    alg: BLD_ALGOS.Y_PERM_MOD,
    setup: null,
    view: 'iso',
    maskMode: 'bld_swap',
    yellowTop: false,
    description: "Y-Perm sans le F initial et le F' final : échange le Buffer A (UBL) directement avec la Cible P (sticker Rouge en bas devant à droite DFR), tout en échangeant les arêtes UB et UL."
  },
  {
    id: 'bld_parity_raperm',
    name: 'Algorithme de Parité (Ra-Perm)',
    category: 'BLD - Parité (Entre Arêtes et Coins)',
    alg: BLD_ALGOS.RA_PERM,
    setup: null,
    view: 'top',
    maskMode: 'bld_swap',
    yellowTop: false,
    description: "À exécuter après les arêtes et avant les coins uniquement si vous avez mémorisé un nombre IMPAIR de lettres.",
    arrows: [
      { from: [0, 1], to: [1, 0], bi: true },
      { from: [0, 2], to: [2, 2], bi: true }
    ]
  }
];

// Fonction utilitaire qui génère la séquence complète : [Setup] + [Algo] + [Undo Setup]
function buildFullBldAlg(setupMove, coreAlg) {
  if (!setupMove || setupMove === 'Buffer' || setupMove === 'Target') {
    return coreAlg;
  }
  const undo = invertAlgo(setupMove, true);
  return `${setupMove} ${coreAlg} ${undo}`;
}

// ==========================================
// TABLEAU DES SETUP MOVES : ARÊTES (CIBLE D)
// ==========================================
const RAW_EDGE_SETUPS = [
  { letter: 'A', face: 'U (Blanc)', pos: 'UB', setupMove: "Lw2 D' L2", role: 'normal', note: 'Amène A sur la cible D sans toucher au buffer B' },
  { letter: 'B', face: 'U (Blanc)', pos: 'UR', setupMove: 'Buffer', role: 'buffer', note: 'Pièce Buffer (avec M) : ne s’exécute jamais' },
  { letter: 'C', face: 'U (Blanc)', pos: 'UF', setupMove: 'Lw2 D L2', role: 'normal', note: 'Amène C sur la cible D' },
  { letter: 'D', face: 'U (Blanc)', pos: 'UL', setupMove: 'Target', role: 'target', note: 'Cible directe : aucun setup, T-Perm directe' },

  { letter: 'E', face: 'L (Orange)', pos: 'LU', setupMove: "L Dw' L", role: 'normal', note: 'Même arête que D mais orientée côté Orange' },
  { letter: 'F', face: 'L (Orange)', pos: 'LF', setupMove: "Dw' L", role: 'normal', note: 'Tranche équatoriale puis montée sur D' },
  { letter: 'G', face: 'L (Orange)', pos: 'LD', setupMove: "L' Dw' L", role: 'normal', note: "Place l’arête en LF puis Dw' L" },
  { letter: 'H', face: 'L (Orange)', pos: 'LB', setupMove: "Dw L'", role: 'normal', note: 'Tranche arrière vers la gauche' },

  { letter: 'I', face: 'F (Vert)', pos: 'FU', setupMove: "Lw D' L2", role: 'normal', note: 'Même arête que C (orientée côté Vert)' },
  { letter: 'J', face: 'F (Vert)', pos: 'FR', setupMove: 'Dw2 L', role: 'normal', note: 'Demi-tour Dw2 puis montée L' },
  { letter: 'K', face: 'F (Vert)', pos: 'FD', setupMove: 'Lw D L2', role: 'normal', note: 'Descente Lw puis alignement D L2' },
  { letter: 'L', face: 'F (Vert)', pos: 'FL', setupMove: "L'", role: 'normal', note: 'Insertion directe en 1 mouvement' },

  { letter: 'M', face: 'R (Rouge)', pos: 'RU', setupMove: 'Buffer', role: 'buffer', note: 'Facette latérale du Buffer B (pièce UR)' },
  { letter: 'N', face: 'R (Rouge)', pos: 'RB', setupMove: 'Dw L', role: 'normal', note: 'Rotation Dw puis montée L' },
  { letter: 'O', face: 'R (Rouge)', pos: 'RD', setupMove: "D2 L' Dw' L", role: 'normal', note: 'Amène RD à gauche puis oriente vers D' },
  { letter: 'P', face: 'R (Rouge)', pos: 'RF', setupMove: "Dw' L'", role: 'normal', note: "Rotation Dw' puis montée L'" },

  { letter: 'Q', face: 'B (Bleu)', pos: 'BU', setupMove: "Lw' D L2", role: 'normal', note: 'Même arête que A (orientée côté Bleu)' },
  { letter: 'R', face: 'B (Bleu)', pos: 'BL', setupMove: 'L', role: 'normal', note: 'Insertion directe en 1 mouvement' },
  { letter: 'S', face: 'B (Bleu)', pos: 'BD', setupMove: "Lw' D' L2", role: 'normal', note: "Bascule Lw' puis D' L2" },
  { letter: 'T', face: 'B (Bleu)', pos: 'BR', setupMove: "Dw2 L'", role: 'normal', note: "Demi-tour Dw2 puis montée L'" },

  { letter: 'U', face: 'D (Jaune)', pos: 'DF', setupMove: "D' L2", role: 'normal', note: 'Aligne sous L puis monte en D avec L2' },
  { letter: 'V', face: 'D (Jaune)', pos: 'DR', setupMove: 'D2 L2', role: 'normal', note: 'Demi-tour en bas puis L2' },
  { letter: 'W', face: 'D (Jaune)', pos: 'DB', setupMove: 'D L2', role: 'normal', note: 'Quart de tour D puis L2' },
  { letter: 'X', face: 'D (Jaune)', pos: 'DL', setupMove: 'L2', role: 'normal', note: 'Montée directe en L2' }
];

export const EDGE_SETUPS = RAW_EDGE_SETUPS.map(item => ({
  ...item,
  id: `bld_edge_${item.letter}`,
  name: `Arête ${item.letter} (${item.pos})`,
  category: `BLD Arête • Face ${item.face}`,
  undo: item.role === 'normal' ? invertAlgo(item.setupMove, true) : '-',
  alg: buildFullBldAlg(item.setupMove, BLD_ALGOS.T_PERM),
  setup: null,
  yellowTop: false,
  maskMode: 'bld_edge', 
  view: 'iso'
}));

// ==========================================
// TABLEAU DES SETUP MOVES : COINS (CIBLE P)
// ==========================================
const RAW_CORNER_SETUPS = [
  { letter: 'A', face: 'U (Blanc)', pos: 'UBL', setupMove: 'Buffer', role: 'buffer', note: 'Pièce Buffer (avec E et R) : ne s’exécute jamais' },
  { letter: 'B', face: 'U (Blanc)', pos: 'UBR', setupMove: "R D'", role: 'normal', note: 'Descend le coin UBR vers la cible P' },
  { letter: 'C', face: 'U (Blanc)', pos: 'UFR', setupMove: 'F', role: 'normal', note: '1 seul mouvement vers la cible P' },
  { letter: 'D', face: 'U (Blanc)', pos: 'UFL', setupMove: "F' D2 R", role: 'normal', note: 'Descend en bas puis place sur P' },

  { letter: 'E', face: 'L (Orange)', pos: 'LUB', setupMove: 'Buffer', role: 'buffer', note: 'Facette Orange du Buffer A (UBL)' },
  { letter: 'F', face: 'L (Orange)', pos: 'LUF', setupMove: 'F2', role: 'normal', note: 'Demi-tour F2 direct vers P' },
  { letter: 'G', face: 'L (Orange)', pos: 'LDF', setupMove: 'D2 R', role: 'normal', note: 'Demi-tour D2 puis R' },
  { letter: 'H', face: 'L (Orange)', pos: 'LDB', setupMove: 'D2', role: 'normal', note: 'Demi-tour D2 direct vers P' },

  { letter: 'I', face: 'F (Vert)', pos: 'FUL', setupMove: "F' D", role: 'normal', note: "Descend F' puis aligne D vers P" },
  { letter: 'J', face: 'F (Vert)', pos: 'FUR', setupMove: 'F2 D', role: 'normal', note: 'Demi-tour F2 puis D vers P' },
  { letter: 'K', face: 'F (Vert)', pos: 'FDR', setupMove: 'D R', role: 'normal', note: 'Même coin que P mais facette Verte' },
  { letter: 'L', face: 'F (Vert)', pos: 'FDL', setupMove: 'D', role: 'normal', note: 'Quart de tour D direct vers P' },

  { letter: 'M', face: 'R (Rouge)', pos: 'RFU', setupMove: "R'", role: 'normal', note: "Quart de tour R' direct vers P" },
  { letter: 'N', face: 'R (Rouge)', pos: 'RUB', setupMove: 'R2', role: 'normal', note: 'Demi-tour R2 direct vers P' },
  { letter: 'O', face: 'R (Rouge)', pos: 'RBD', setupMove: 'R', role: 'normal', note: 'Quart de tour R direct vers P' },
  { letter: 'P', face: 'R (Rouge)', pos: 'RDF', setupMove: 'Target', role: 'target', note: 'Cible directe : aucun setup, Y-Perm modifiée directe' },

  { letter: 'Q', face: 'B (Bleu)', pos: 'BUR', setupMove: "R' F", role: 'normal', note: 'Ramène le coin arrière-droit sur P' },
  { letter: 'R', face: 'B (Bleu)', pos: 'BUL', setupMove: 'Buffer', role: 'buffer', note: 'Facette Bleue du Buffer A (UBL)' },
  { letter: 'S', face: 'B (Bleu)', pos: 'BDL', setupMove: "D' R", role: 'normal', note: 'Aligne en bas puis monte R' },
  { letter: 'T', face: 'B (Bleu)', pos: 'BDR', setupMove: "D'", role: 'normal', note: 'Amène BDR sur la cible P' },

  { letter: 'U', face: 'D (Jaune)', pos: 'DFL', setupMove: "F'", role: 'normal', note: "Quart de tour F' direct vers P" },
  { letter: 'V', face: 'D (Jaune)', pos: 'DFR', setupMove: "R' D'", role: 'normal', note: 'Même coin que P mais facette Jaune' },
  { letter: 'W', face: 'D (Jaune)', pos: 'DBR', setupMove: "D2 F'", role: 'normal', note: "Demi-tour D2 puis F'" },
  { letter: 'X', face: 'D (Jaune)', pos: 'DBL', setupMove: "D F'", role: 'normal', note: "Quart de tour D puis F'" }
];

export const CORNER_SETUPS = RAW_CORNER_SETUPS.map(item => ({
  ...item,
  id: `bld_corner_${item.letter}`,
  name: `Coin ${item.letter} (${item.pos})`,
  category: `BLD Coin • Face ${item.face}`,
  undo: item.role === 'normal' ? invertAlgo(item.setupMove, true) : '-',
  alg: buildFullBldAlg(item.setupMove, BLD_ALGOS.Y_PERM_MOD),
  setup: null,
  yellowTop: false,
  maskMode: 'bld_corner', 
  view: 'iso'
}));

// ==========================================
// LES 5 SECTIONS DU COURS DE RÉVISION BLD
// ==========================================
export const BLD_GUIDE_STEPS = [
  {
    id: 'bld_step1',
    title: '1. Les Bases : Orientation et Notation Speffz',
    subtitle: 'Comprendre la numérotation universelle de A à X sur les 6 faces',
    content: [
      "Orientation fixe obligatoire : tenez toujours votre cube avec le centre BLANC en haut (U) et le centre VERT face à vous (F). Ainsi, l'Orange est à gauche (L), le Rouge à droite (R), le Bleu derrière (B) et le Jaune en bas (D).",
      "Le système Speffz attribue 4 lettres par face dans le sens des aiguilles d'une montre en commençant toujours par le coin/arête en haut à gauche de la face :\n• Haut (U - Blanc) : A, B, C, D\n• Gauche (L - Orange) : E, F, G, H\n• Face (F - Vert) : I, J, K, L\n• Droite (R - Rouge) : M, N, O, P\n• Arrière (B - Bleu) : Q, R, S, T\n• Bas (D - Jaune) : U, V, W, X"
    ]
  },
  {
    id: 'bld_step2',
    title: '2. Buffers, Cibles et Algorithmes d’Exécution',
    subtitle: 'Échanger une seule pièce à la fois grâce au principe [Setup + Algo + Undo Setup]',
    content: [
      "En méthode Old Pochmann, on résout les pièces une par une depuis une position de départ fixe (le Buffer) vers une position d'arrivée fixe (la Cible) :\n• Pour les ARÊTES : le Buffer est en B (facette blanche de l'arête UR) et la Cible est en D (facette blanche de l'arête UL). On les échange avec la T-Perm.\n• Pour les COINS : le Buffer est en A (facette blanche du coin UBL) et la Cible est en P (facette rouge du coin DFR en bas à droite). On les échange avec la Y-Perm modifiée.",
      "La règle d'or : pour envoyer le Buffer vers n'importe quelle lettre du cube :\n1. Faites le Setup Move de la lettre pour amener cette étiquette sur la Cible (sans déranger le Buffer).\n2. Exécutez l'algorithme d'échange (T-Perm pour une arête, Y-Perm modifiée pour un coin).\n3. Annulez exactement le Setup Move (Undo Setup) !"
    ]
  },
  {
    id: 'bld_step3',
    title: '3. Tracing, Mémorisation & Cycle Breaks',
    subtitle: 'Comment construire sa suite de lettres et gérer les cycles fermés',
    content: [
      "Le Tracing (Suivi) : regardez quelle étiquette se trouve actuellement dans votre Buffer (B pour les arêtes, A pour les coins). Notez la lettre où cette étiquette doit aller. Regardez ensuite quelle étiquette se trouve à cet endroit-là, notez sa lettre, et continuez ainsi de suite.",
      "Cycle Break (Casser un cycle) : si vous tombez sur une pièce appartenant au Buffer (lettres B ou M pour les arêtes ; lettres A, E ou R pour les coins) alors que le cube n'est pas terminé, le cycle est fermé ! Choisissez n'importe quelle lettre d'une pièce non résolue pour l'envoyer dans le Buffer et poursuivez jusqu'à revenir sur cette même pièce.",
      "Pièce retournée sur place (Flip / Twist) : si une arête est déjà à sa place mais inversée, résolvez-la en ajoutant ses 2 lettres (ex: C puis I). Même principe pour un coin tordu sur place (2 lettres pour le remettre droit)."
    ]
  },
  {
    id: 'bld_step4',
    title: '4. La Parité (Nombre impair de lettres)',
    subtitle: 'Corriger l’échange des 2 coins/arêtes quand la mémorisation est impaire',
    content: [
      "Chaque T-Perm échange à la fois votre arête cible ET les deux coins de droite. Si vous avez un nombre PAIR de lettres à exécuter, ces échanges parasites s'annulent tout seuls.",
      "En revanche, si vous avez mémorisé un nombre IMPAIR de lettres pour les arêtes (et donc aussi un nombre impair pour les coins), vous avez une Parité ! Il suffit d'exécuter une seule fois la PLL Ra juste après avoir fini toutes vos arêtes et avant de commencer vos coins."
    ]
  },
  {
    id: 'bld_step5',
    title: '5. Déroulement d’un Solve Complet de A à Z',
    subtitle: 'L’ordre optimal de mémorisation et d’exécution pour ne rien oublier',
    content: [
      "1. Mémorisez les COINS en premier : regroupez vos lettres par paires (ex: K - B → « Koala Bleu ») et créez une petite histoire visuelle pour la mémoire à long terme.",
      "2. Mémorisez les ARÊTES en second : utilisez des syllabes ou des mots rapides (mémoire court terme).",
      "3. Baissez le bandeau et résolvez les ARÊTES immédiatement pendant qu'elles sont fraîches en tête (Setup + T-Perm + Undo Setup).",
      "4. Si le nombre de lettres était impair, exécutez l'algorithme de PARITÉ (Ra-Perm).",
      "5. Terminez par l'exécution des COINS grâce à votre histoire mémorisée (Setup + Y-Perm modifiée + Undo Setup) !"
    ]
  }
];