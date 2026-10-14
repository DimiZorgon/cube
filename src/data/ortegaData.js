export const ORTEGA_SECTIONS = [
  { id: 'ALL', label: 'Tout Ortega' },
  { id: 'FACE1', label: '1. Première Face' },
  { id: 'OLL', label: '2. OLL (7 cas)' },
  { id: 'PBL', label: '3. PBL (5+2 cas)' }
];

export const ORTEGA_DATA = [
  {
    section: 'FACE1',
    group: 'Étape 1 : Construire une face (sans se soucier de la couronne)',
    description:
      "Dans la méthode Ortega, la première face (souvent blanche) n'a pas besoin d'être couronnée : les coins peuvent être mal permutés entre eux, ce qui permet de la finir en 3 à 5 mouvements !",
    cases: [
      {
        id: 'ort_f1_right',
        name: 'Insertion Droite',
        category: 'Ortega - Face 1',
        alg: "R U R'",
        view: 'iso',
        maskMode: 'full',
        yellowTop: true,
        description: 'Insère le coin avant-droit sur la face du bas.'
      },
      {
        id: 'ort_f1_front',
        name: 'Insertion Avant',
        category: 'Ortega - Face 1',
        alg: "U R U' R'",
        view: 'iso',
        maskMode: 'full',
        yellowTop: true,
        description: 'Insère un coin dont la facette blanche nous fait face.'
      },
      {
        id: 'ort_f1_up',
        name: 'Blanc vers le haut',
        category: 'Ortega - Face 1',
        alg: "R U2 R' U' R U R'",
        view: 'iso',
        maskMode: 'full',
        yellowTop: true,
        description: 'Oriente et insère un coin ayant la facette blanche vers le haut.'
      }
    ]
  },
  {
    section: 'OLL',
    group: 'Étape 2 : OLL 2x2 (Orienter la face opposée - 7 cas)',
    description:
      'Orientez tous les coins jaunes vers le haut en un seul algorithme parmi ces 7 configurations :',
    cases: [
      {
        id: 'ort_oll_sune',
        name: 'Sune',
        category: 'Ortega - OLL',
        alg: "(R U R' U) (R U2 R')",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true
      },
      {
        id: 'ort_oll_antisune',
        name: 'Anti-Sune',
        category: 'Ortega - OLL',
        alg: "(R U2 R') (U' R U' R')",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true
      },
      {
        id: 'ort_oll_h',
        name: 'H (Double Sune)',
        category: 'Ortega - OLL',
        alg: "R2 U2 R U2 R2",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true
      },
      {
        id: 'ort_oll_pi',
        name: 'Pi (Bruno)',
        category: 'Ortega - OLL',
        alg: "F (R U R' U') (R U R' U') F'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true
      },
      {
        id: 'ort_oll_t',
        name: 'T (Chameleon)',
        category: 'Ortega - OLL',
        alg: "(R U R' U') (R' F R F')",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true
      },
      {
        id: 'ort_oll_u',
        name: 'U (Headlights)',
        category: 'Ortega - OLL',
        alg: "F (R U R' U') F'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true
      },
      {
        id: 'ort_oll_l',
        name: 'L',
        category: 'Ortega - OLL',
        alg: "F R U' (R' U' R U) R' F'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true
      }
    ]
  },
  {
    section: 'PBL',
    group: 'Étape 3 : PBL (Permuter les deux couches simultanément)',
    description:
      'Repérez le nombre de « barres » (2 couleurs identiques côte à côte) sur la couche du haut (U) et du bas (D) :',
    cases: [
      {
        id: 'ort_pbl_diag_diag',
        name: 'Diag / Diag (0 barre)',
        category: 'Ortega - PBL',
        alg: "R2 F2 R2",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Aucune barre ni en haut ni en bas : échange diagonal sur les deux étages.',
        arrows: [{ from: [0, 0], to: [1, 1], bi: true }]
      },
      {
        id: 'ort_pbl_adj_adj',
        name: 'Adj / Adj (2 barres devant)',
        category: 'Ortega - PBL',
        alg: "R2 U' B2 U2 R2 U' R2",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Une barre en haut et une barre en bas (placez les deux barres devant vous).',
        arrows: [{ from: [0, 0], to: [0, 1], bi: true }]
      },
      {
        id: 'ort_pbl_adj_diag',
        name: 'Haut Adj / Bas Diag',
        category: 'Ortega - PBL',
        alg: "(R U' R) F2 (R' U R')",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Une barre en haut (placez-la devant) et aucune barre en bas.',
        arrows: [{ from: [0, 0], to: [0, 1], bi: true }]
      },
      {
        id: 'ort_pbl_diag_adj',
        name: 'Haut Diag / Bas Adj',
        category: 'Ortega - PBL',
        alg: "R' D R' F2 R D' R",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Aucune barre en haut, une barre en bas (placez la barre du bas devant).',
        arrows: [{ from: [0, 0], to: [1, 1], bi: true }]
      },
      {
        id: 'ort_pbl_j',
        name: 'Haut Adj / Bas Résolu (J-Perm)',
        category: 'Ortega - PBL',
        alg: "(R U R' F') (R U R' U') R' F R2 U' R'",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Le bas est entièrement résolu, une barre à gauche en haut.',
        arrows: [{ from: [0, 1], to: [1, 1], bi: true }]
      },
      {
        id: 'ort_pbl_y',
        name: 'Haut Diag / Bas Résolu (Y-Perm)',
        category: 'Ortega - PBL',
        alg: "F (R U' R' U') (R U R' F') (R U R' U') (R' F R F')",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Le bas est entièrement résolu, échange diagonal en haut.',
        arrows: [{ from: [0, 0], to: [1, 1], bi: true }]
      }
    ]
  }
];