// src/data/simple4x4Data.js
export const SIMPLE_4X4_STEPS = [
  {
    id: 's4_step1_centers',
    title: 'Étape 1 : Fabriquer les 6 Centres (Blocs 2x2)',
    subtitle: 'Regrouper les 4 petits carrés centraux de chaque couleur sans les mélanger',
    explanation: [
      "1. Pourquoi commencer par les centres ? Sur un 4x4, les centres ne sont pas fixes ! Chaque centre est un carré de 2x2 composé de 4 petites pièces. On commence toujours par faire le centre BLANC, puis le centre JAUNE à l'opposé.",
      "2. La règle d'or des barres : ne cherche jamais à placer les petits carrés un par un. Fabrique d'abord une barre de 2 carrés de la même couleur, puis une deuxième barre de 2, et réunis-les !",
      "3. L'ordre des 4 couleurs sur les côtés : une fois le Blanc en bas et le Jaune en haut, respecte bien l'ordre officiel en tournant vers la droite : ROUGE → VERT → ORANGE → BLEU (astuce : Rouge et Orange sont opposés, Vert et Bleu sont opposés)."
    ],
    cases: [
      {
        id: 's4_center_swap',
        name: 'Insérer une barre sans casser les autres centres',
        category: '4x4 Simple - Étape 1',
        alg: "Rw U2 Rw'",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: "Monte la moitié droite avec la barre (Rw), fais demi-tour en haut (U2) pour échanger avec l'autre barre, et redescends (Rw')."
      },
      {
        id: 's4_center_last',
        name: 'Échanger 2 pièces entre le Haut et Devant',
        category: '4x4 Simple - Étape 1',
        alg: "Rw U Rw' U Rw U2 Rw'",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: "C'est l'histoire de la Chaise (Sune) mais avec une double tranche (Rw) : idéal pour terminer les 2 derniers centres !"
      }
    ]
  },
  {
    id: 's4_step2_edges',
    title: 'Étape 2 : Assembler les Paires d’Arêtes (2 par 2)',
    subtitle: 'Marier chaque arête avec sa jumelle pour transformer le 4x4 en 3x3',
    explanation: [
      "1. Cherche deux arêtes jumelles (qui ont les 2 mêmes couleurs, par exemple Blanc-Rouge) et place-les sur la face avant : l'une à gauche et l'autre à droite.",
      "2. Si les deux pièces sont sur la MÊME ligne horizontale, il faut d'abord en retourner une sur place avec la petite formule de retournement (`R U R' F R' F' R`).",
      "3. Une fois qu'elles sont décalées (l'une en haut, l'autre en bas), glisse la moitié du cube (`Uw'`) pour les coller ensemble, remplace cette arête par une arête non faite du haut (`R U R'`), puis remets les centres en place (`Uw`) !"
    ],
    cases: [
      {
        id: 's4_edge_pair_basic',
        name: 'Marier 2 arêtes (Glisser - Sortir - Revenir)',
        category: '4x4 Simple - Étape 2',
        alg: "Uw' (R U R') Uw",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: "On glisse pour marier la paire (Uw'), on la monte au plafond en la remplaçant par une arête quelconque (R U R'), et on réaligne les centres (Uw)."
      },
      {
        id: 's4_edge_flip',
        name: 'Retourner l’arête de droite + Marier les 2 dernières',
        category: '4x4 Simple - Étape 2',
        alg: "Uw' (R U R' F R' F' R) Uw",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: "Pour les 2 toutes dernières paires d'arêtes : mettez-les face à face sur la même ligne et lancez cette formule."
      }
    ]
  },
  {
    id: 's4_step3_3x3',
    title: 'Étape 3 : Résoudre comme un 3x3 classique',
    subtitle: 'Utiliser uniquement les faces extérieures (R, L, U, D, F, B)',
    explanation: [
      "Bravo ! Tes 6 centres (2x2) sont faits et tes 12 paires d'arêtes (1x2) sont soudées : ton 4x4 est maintenant réduit à un 3x3 géant.",
      "À partir de maintenant, interdiction de tourner les tranches du milieu (Uw, Rw...) toutes seules ! Utilise exactement les mêmes étapes que sur le 3x3 :\n• La Croix Blanche en bas\n• Les 4 Coins Blancs (L'Ascenseur)\n• Le 2ème étage (Le Belge)\n• La Croix Jaune et le dernier étage (jusqu'à tomber éventuellement sur une Parité à l'étape 4)."
    ],
    cases: [
      {
        id: 's4_3x3_belge',
        name: 'Rappel : Le Belge à Droite sur 4x4',
        category: '4x4 Simple - Étape 3',
        alg: "(U R U' R') (U' F' U F)",
        view: 'iso',
        maskMode: 'f2l_all',
        yellowTop: true,
        description: "Les deux pièces de l'arête voyagent ensemble comme une seule arête de 3x3."
      }
    ]
  },
  {
    id: 's4_step4_parity',
    title: 'Étape 4 : Les 2 Cas de Parité (Spécial 4x4)',
    subtitle: 'Corriger l’arête jaune retournée (Parité OLL) ou les 2 arêtes inversées (Parité PLL)',
    explanation: [
      "Sur un 4x4, tu as 1 chance sur 2 de tomber sur un piège qui n'existe jamais sur un 3x3 :",
      "• La Parité OLL : en voulant faire ta Croix Jaune, 3 branches sont jaunes mais la 4ème arête est toute seule à l'envers ! Place cette arête retournée DEVANT TOI et fais la formule de Parité OLL.\n• La Parité PLL : à la toute fin du cube, tout est résolu sauf 2 arêtes en face l'une de l'autre (ou 2 coins) qui doivent s'échanger ! Fais la très courte formule de Parité PLL."
    ],
    cases: [
      {
        id: 's4_oll_parity',
        name: 'Parité OLL (Retourner 1 seule arête jaune)',
        category: '4x4 Simple - Étape 4',
        alg: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true,
        description: "Tiens l'arête mal orientée en face de toi et suis le rythme : uniquement des demi-tours U2 entre des mouvements Rw/Lw !"
      },
      {
        id: 's4_pll_parity',
        name: 'Parité PLL (Échanger 2 arêtes opposées)',
        category: '4x4 Simple - Étape 4',
        alg: "2R2 U2 2R2 Uw2 2R2 Uw2",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: "Échange les deux paires d'arêtes Avant et Arrière (2R2 = tourner uniquement la tranche interne droite 2 fois).",
        arrows: [{ from: [0, 1], to: [2, 1], bi: true }]
      }
    ]
  }
];
