// src/data/yau4x4Data.js
export const YAU_SECTIONS = [
  { id: 'ALL', label: 'Tout (Yau)' },
  { id: 'CENTERS_CROSS', label: '1. Centres & 3 Arêtes Croix' },
  { id: 'LAST_CENTERS', label: '2. 4 Derniers Centres' },
  { id: 'PAIRING_323', label: '3. Arêtes 3-2-3' },
  { id: 'OLL_PARITY', label: '4. Parité OLL' },
  { id: 'PLL_PARITY', label: '5. Parité PLL' }
];

export const YAU_DATA = [
  {
    section: 'CENTERS_CROSS',
    group: 'Étapes 1 & 2 : 2 Centres Opposés + 3 Arêtes de la Croix',
    description:
      'En méthode Yau, on résout les centres Blanc et Jaune, puis on place directement 3 arêtes blanches à leur place finale sur la face gauche (D), en laissant 1 emplacement libre pour travailler.',
    cases: [
      {
        id: 'yau_opp_center',
        name: '2ème Centre Opposé (Jaune)',
        category: 'Yau - Centres',
        alg: "Rw U2 Rw'",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: 'Insère la deuxième barre du centre supérieur sans détruire le centre inférieur.'
      },
      {
        id: 'yau_cross_edge',
        name: 'Apparier et placer une arête de Croix',
        category: 'Yau - Croix',
        alg: "Uw' R U' R' Uw",
        view: 'iso',
        maskMode: 'yau_cross',
        yellowTop: true,
        description: 'Assemble une paire blanche et la descend vers la croix tout en gardant un slot libre.'
      }
    ]
  },
  {
    section: 'LAST_CENTERS',
    group: 'Étape 3 : Les 4 Derniers Centres (Half-Centers & Commutateurs)',
    description:
      'En utilisant uniquement la tranche Rw et la face U (grâce au 4ème slot de croix laissé libre), on résout les 4 centres latéraux sans jamais casser nos 3 arêtes de croix !',
    cases: [
      {
        id: 'yau_center_sune',
        name: 'Échange de barre (Rw-Sune)',
        category: 'Yau - 4 Centres',
        alg: "Rw U Rw' U Rw U2 Rw'",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: 'Échange 2 pièces de centre entre la face U et la face F sans toucher aux 3 arêtes de la croix.'
      },
      {
        id: 'yau_center_comm',
        name: 'Insertion barre latérale',
        category: 'Yau - 4 Centres',
        alg: "Rw U2 Rw' U' Rw U' Rw'",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: 'Complète les deux derniers centres adjacents en conservant les 3 arêtes de la croix intactes.'
      }
    ]
  },
  {
    section: 'PAIRING_323',
    group: 'Étape 4 : Finir la Croix & Appariement Rapide 3-2-3',
    description:
      "Une fois la 4ème arête de la croix placée en bas, la croix est 100 % terminée ! On apparie les 8 dernières arêtes en 3 séquences rapides (3 arêtes, puis 2, puis 3) avec Uw / Uw' avant d'enchaîner directement sur les F2L.",
    cases: [
      {
        id: 'yau_last_cross',
        name: '4ème Arête de la Croix',
        category: 'Yau - Croix finale',
        alg: "Uw' (R U R' F R' F' R) Uw",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: 'Assemble la 4ème arête blanche avant de la descendre pour compléter la croix.'
      },
      {
        id: 'yau_323_cycle',
        name: 'Cycle de 2 paires (Aller-Retour Uw)',
        category: 'Yau - 3-2-3 Pairing',
        alg: "Uw (R U' R') Uw'",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: 'Décale Uw pour former une paire à droite, insère la pièce suivante et revient (Uw\') pour former la 2ème paire.'
      },
      {
        id: 'yau_last_2_edges',
        name: '2 Dernières Paires (Flip Alg)',
        category: 'Yau - 3-2-3 Pairing',
        alg: "Uw' (R U R' F R' F' R) Uw",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: 'Résout les 2 dernières arêtes situées en face l’une de l’autre sur les slots avant-droit et avant-gauche.'
      }
    ]
  },
  {
    section: 'OLL_PARITY',
    group: 'Étape 5 : Parité OLL (Lucas Parity)',
    description:
      'Après les 4 F2L, si un nombre impair d’arêtes jaunes est orienté (1 ou 3 arêtes jaunes), exécutez l’algorithme standard de Lucas Parity.',
    cases: [
      {
        id: 'yau_oll_lucas',
        name: 'Lucas Parity (Standard Speed)',
        category: 'Yau - Parité OLL',
        alg: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true,
        description: "L'algorithme de parité OLL le plus rapide en compétition (fingertricks en Rw/U2)."
      },
      {
        id: 'yau_oll_pure',
        name: 'Pure OLL Parity (Double flip)',
        category: 'Yau - Parité OLL',
        alg: "Rw' U2 Rw U2 Rw' F2 Rw2 U2 Rw U2 Rw' U2 F2 Rw2 F2",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true,
        description: "Variante sans rotation x pour retourner l'arête avant."
      }
    ]
  },
  {
    section: 'PLL_PARITY',
    group: 'Étape 6 : Parité PLL & Combinaisons',
    description:
      'Tous les cas de permutation spécifiques au dernier étage du 4x4 (échange de 2 arêtes opposées, adjacentes ou de 2 coins).',
    cases: [
      {
        id: 'yau_pll_opp',
        name: 'Parité PLL Opposée (Pure)',
        category: 'Yau - Parité PLL',
        alg: "2R2 U2 2R2 Uw2 2R2 Uw2",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Échange les deux arêtes opposées (UF et UB).',
        arrows: [{ from: [0, 1], to: [2, 1], bi: true }]
      },
      {
        id: 'yau_pll_adj',
        name: 'Parité PLL Adjacente',
        category: 'Yau - Parité PLL',
        alg: "(R U R' U') (2R2 U2 2R2 Uw2 2R2 Uw2) (U R U' R')",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Échange deux arêtes adjacentes (UF et UR) via setup Sexy Move.',
        arrows: [{ from: [2, 1], to: [1, 2], bi: true }]
      },
      {
        id: 'yau_pll_diag_corners',
        name: 'Échange de 2 Coins Adjacents (T-Perm + Parité)',
        category: 'Yau - Parité PLL',
        alg: "(2R2 U2 2R2 Uw2 2R2 Uw2) (R U R' U') (R' F R2 U') R' U' (R U R' F')",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Échange uniquement les 2 coins de droite (combinaison Parité PLL + T-Perm).',
        arrows: [{ from: [0, 2], to: [2, 2], bi: true }]
      }
    ]
  }
];