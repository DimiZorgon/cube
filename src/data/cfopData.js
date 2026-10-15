// src/data/cfopData.js

export const CFOP_SECTIONS = [
  { id: 'F2L', label: 'F2L' },
  { id: '2-LOOK OLL', label: '2-LOOK OLL' },
  { id: 'OLL', label: 'OLL (57)' },
  { id: '2-LOOK PLL', label: '2-LOOK PLL' },
  { id: 'PLL', label: 'PLL (21)' }
];

export const CFOP_DATA = {
  // ==========================================
  // PLL (21 CAS COMPLETS AVEC FLÈCHES SVG)
  // ==========================================
  PLL: [
    {
      group: 'Permutations des arêtes uniquement',
      cases: [
        {
          id: 'pll_ub',
          name: 'Ub',
          category: 'PLL',
          alg: "R2 U (R U R' U') R' U' (R' U R')",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          twoLook: true,
          arrows: [
            { from: [1, 0], to: [1, 2], bi: false },
            { from: [1, 2], to: [2, 1], bi: false },
            { from: [2, 1], to: [1, 0], bi: false }
          ]
        },
        {
          id: 'pll_ua',
          name: 'Ua',
          category: 'PLL',
          alg: "(R U' R U) R U (R U' R' U') R2",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          twoLook: true,
          arrows: [
            { from: [1, 2], to: [1, 0], bi: false },
            { from: [1, 0], to: [2, 1], bi: false },
            { from: [2, 1], to: [1, 2], bi: false }
          ]
        },
        {
          id: 'pll_z',
          name: 'Z',
          category: 'PLL',
          alg: "(M2 U M2 U) (M' U2) (M2 U2 M') U2",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          twoLook: true,
          arrows: [
            { from: [0, 1], to: [1, 0], bi: true },
            { from: [2, 1], to: [1, 2], bi: true }
          ]
        },
        {
          id: 'pll_h',
          name: 'H',
          category: 'PLL',
          alg: "(M2 U M2) U2 (M2 U M2)",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          twoLook: true,
          arrows: [
            { from: [0, 1], to: [2, 1], bi: true },
            { from: [1, 0], to: [1, 2], bi: true }
          ]
        }
      ]
    },
    {
      group: 'Permutations des coins uniquement',
      cases: [
        {
          id: 'pll_aa',
          name: 'Aa',
          category: 'PLL',
          alg: "x (R' U R') D2 (R U' R') D2 R2 x'",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [0, 2], bi: false },
            { from: [0, 2], to: [2, 2], bi: false },
            { from: [2, 2], to: [0, 0], bi: false }
          ]
        },
        {
          id: 'pll_ab',
          name: 'Ab',
          category: 'PLL',
          alg: "x R2 D2 (R U R') D2 (R U' R) x'",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 2], to: [0, 0], bi: false },
            { from: [0, 0], to: [2, 2], bi: false },
            { from: [2, 2], to: [0, 2], bi: false }
          ]
        },
        {
          id: 'pll_e',
          name: 'E',
          category: 'PLL',
          alg: "x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [2, 0], bi: true },
            { from: [0, 2], to: [2, 2], bi: true }
          ]
        }
      ]
    },
    {
      group: 'Échange de 2 coins adjacents',
      cases: [
        {
          id: 'pll_ra',
          name: 'Ra',
          category: 'PLL',
          alg: "(R U' R' U') (R U R D) (R' U' R D') (R' U2 R') U'",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 1], to: [1, 0], bi: true },
            { from: [0, 2], to: [2, 2], bi: true }
          ]
        },
        {
          id: 'pll_rb',
          name: 'Rb',
          category: 'PLL',
          alg: "(R' U2 R U2) R' F (R U R' U') R' F' R2 U'",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [0, 2], bi: true },
            { from: [1, 2], to: [2, 1], bi: true }
          ]
        },
        {
          id: 'pll_ja',
          name: 'Ja',
          category: 'PLL',
          alg: "(R' U L' U2) (R U' R' U2 R) L U'",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [0, 2], bi: true },
            { from: [0, 1], to: [1, 0], bi: true }
          ]
        },
        {
          id: 'pll_jb',
          name: 'Jb',
          category: 'PLL',
          alg: "(R U R' F') (R U R' U') R' F R2 U' R' U'",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 2], to: [2, 2], bi: true },
            { from: [0, 1], to: [1, 2], bi: true }
          ]
        },
        {
          id: 'pll_t',
          name: 'T',
          category: 'PLL',
          alg: "(R U R' U') (R' F R2 U') R' U' (R U R' F')",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          twoLook: true,
          arrows: [
            { from: [0, 2], to: [2, 2], bi: true },
            { from: [1, 0], to: [1, 2], bi: true }
          ]
        },
        {
          id: 'pll_f',
          name: 'F',
          category: 'PLL',
          alg: "(R' U' F') (R U R' U') (R' F R2 U') (R' U' R U) (R' U R)",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 1], to: [2, 1], bi: true },
            { from: [0, 2], to: [2, 2], bi: true }
          ]
        }
      ]
    },
    {
      group: 'Échange de 2 coins diagonaux',
      cases: [
        {
          id: 'pll_v',
          name: 'V',
          category: 'PLL',
          alg: "(R' U R' U') y (R' F' R2 U') (R' U R' F) R F",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [2, 2], bi: true },
            { from: [0, 1], to: [1, 2], bi: true }
          ]
        },
        {
          id: 'pll_y',
          name: 'Y',
          category: 'PLL',
          alg: "F (R U' R' U') (R U R' F') (R U R' U') (R' F R F')",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          twoLook: true,
          arrows: [
            { from: [0, 0], to: [2, 2], bi: true },
            { from: [0, 1], to: [1, 0], bi: true }
          ]
        },
        {
          id: 'pll_na',
          name: 'Na',
          category: 'PLL',
          alg: "(R U R' U) (R U R' F') (R U R' U') (R' F R2 U') R' U2 (R U' R')",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 2], to: [2, 0], bi: true },
            { from: [1, 0], to: [1, 2], bi: true }
          ]
        },
        {
          id: 'pll_nb',
          name: 'Nb',
          category: 'PLL',
          alg: "(R' U R U') (R' F' U' F) (R U R' F) R' F' (R U' R)",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [2, 2], bi: true },
            { from: [1, 0], to: [1, 2], bi: true }
          ]
        }
      ]
    },
    {
      group: 'Permutations G (cycles doubles)',
      cases: [
        {
          id: 'pll_ga',
          name: 'Ga',
          category: 'PLL',
          alg: "R2 U (R' U R' U') (R U' R2) D U' (R' U R D') U",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [0, 2], bi: false },
            { from: [0, 2], to: [2, 0], bi: false },
            { from: [2, 0], to: [0, 0], bi: false },
            { from: [0, 1], to: [1, 0], bi: false },
            { from: [1, 0], to: [1, 2], bi: false },
            { from: [1, 2], to: [0, 1], bi: false }
          ]
        },
        {
          id: 'pll_gb',
          name: 'Gb',
          category: 'PLL',
          alg: "(F' U' F) (R2 u R' U) (R U' R u') R2",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [2, 0], bi: false },
            { from: [2, 0], to: [0, 2], bi: false },
            { from: [0, 2], to: [0, 0], bi: false },
            { from: [0, 1], to: [1, 2], bi: false },
            { from: [1, 2], to: [1, 0], bi: false },
            { from: [1, 0], to: [0, 1], bi: false }
          ]
        },
        {
          id: 'pll_gc',
          name: 'Gc',
          category: 'PLL',
          alg: "R2 U' (R U' R U) (R' U R2 D') (U R U' R') D U'",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [0, 0], to: [2, 2], bi: false },
            { from: [2, 2], to: [2, 0], bi: false },
            { from: [2, 0], to: [0, 0], bi: false },
            { from: [1, 0], to: [2, 1], bi: false },
            { from: [2, 1], to: [1, 2], bi: false },
            { from: [1, 2], to: [1, 0], bi: false }
          ]
        },
        {
          id: 'pll_gd',
          name: 'Gd',
          category: 'PLL',
          alg: "D' (R U R' U') D (R2 U' R U') (R' U R' U) R2 [U]",
          view: 'top',
          maskMode: 'full',
          yellowTop: true,
          arrows: [
            { from: [2, 0], to: [0, 2], bi: false },
            { from: [0, 2], to: [0, 0], bi: false },
            { from: [0, 0], to: [2, 0], bi: false },
            { from: [2, 1], to: [0, 1], bi: false },
            { from: [0, 1], to: [1, 0], bi: false },
            { from: [1, 0], to: [2, 1], bi: false }
          ]
        }
      ]
    }
  ],

  // ==========================================
  // 2-LOOK OLL (10 CAS ESSENTIELS)
  // ==========================================
  '2-LOOK OLL': [
    {
      group: 'Étape 1 : Orientation des arêtes (Croix Jaune)',
      cases: [
        {
          id: '2oll_line',
          name: 'Ligne (Line)',
          category: '2-LOOK OLL',
          alg: "F (R U R' U') F'",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: '2oll_l',
          name: 'Virage (L-Shape)',
          category: '2-LOOK OLL',
          alg: "f (R U R' U') f'",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: '2oll_dot',
          name: 'Point (Dot)',
          category: '2-LOOK OLL',
          alg: "F (R U R' U') F' f (R U R' U') f'",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        }
      ]
    },
    {
      group: 'Étape 2 : Orientation des coins (OCLL)',
      cases: [
        {
          id: 'oll_26',
          name: 'Antisune',
          category: '2-LOOK OLL',
          alg: "R U2 R' U' R U' R'",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: 'oll_27',
          name: 'Sune',
          category: '2-LOOK OLL',
          alg: "R U R' U R U2 R'",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: 'oll_21',
          name: 'H',
          category: '2-LOOK OLL',
          alg: "(R U2 R') (U' R U R') (U' R U' R')",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: 'oll_22',
          name: 'Pi',
          category: '2-LOOK OLL',
          alg: "R U2 R2 U' R2 U' R2 U2 R",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: 'oll_24',
          name: 'T',
          category: '2-LOOK OLL',
          alg: "(r U R' U') (r' F R F')",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: 'oll_25',
          name: 'L',
          category: '2-LOOK OLL',
          alg: "y F' (r U R' U') r' F R",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        },
        {
          id: 'oll_23',
          name: 'U',
          category: '2-LOOK OLL',
          alg: "R2 D (R' U2 R) D' (R' U2 R')",
          view: 'top',
          maskMode: 'oll',
          yellowTop: true
        }
      ]
    }
  ],

  // ==========================================
  // FULL OLL (57 CAS COMPLETS)
  // ==========================================
  OLL: [
    {
      group: 'Croix orientée (OCLL)',
      cases: [
        { id: 'foll_26', name: 'Antisune', category: 'OLL', alg: "R U2 R' U' R U' R'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_27', name: 'Sune', category: 'OLL', alg: "R U R' U R U2 R'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_21', name: 'H', category: 'OLL', alg: "(R U2 R') (U' R U R') (U' R U' R')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_22', name: 'Pi', category: 'OLL', alg: "R U2 R2 U' R2 U' R2 U2 R", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_24', name: 'T', category: 'OLL', alg: "(r U R' U') (r' F R F')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_25', name: 'L', category: 'OLL', alg: "y F' (r U R' U') r' F R", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_23', name: 'U', category: 'OLL', alg: "R2 D (R' U2 R) D' (R' U2 R')", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes en T',
      cases: [
        { id: 'foll_33', name: 'Key', category: 'OLL', alg: "(R U R' U') (R' F R F')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_45', name: 'T', category: 'OLL', alg: "F (R U R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Carrés',
      cases: [
        { id: 'foll_5', name: 'Lefty Square', category: 'OLL', alg: "(r' U2 R U R' U r)", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_6', name: 'Righty Square', category: 'OLL', alg: "(r U2 R' U' R U' r')", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes en C',
      cases: [
        { id: 'foll_34', name: 'City (C and T)', category: 'OLL', alg: "(R U R2 U') (R' F R U) R U' F'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_46', name: "Seein' Headlights (C and headlights)", category: 'OLL', alg: "R' U' (R' F R F') U R", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes en W',
      cases: [
        { id: 'foll_36', name: 'Wario', category: 'OLL', alg: "(R' U' R U') (R' U R U) l U' R' U x", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_38', name: 'Mario', category: 'OLL', alg: "(R U R' U) (R U' R' U') (R' F R F')", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Coins corrects, arêtes inversées',
      cases: [
        { id: 'foll_28', name: 'Arrow', category: 'OLL', alg: "(r U R' U') M (U R U' R')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_57', name: 'Mummy', category: 'OLL', alg: "(R U R' U') M' (U R U' r')", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes en P',
      cases: [
        { id: 'foll_31', name: 'Couch', category: 'OLL', alg: "(R' U' F) (U R U' R') F' R", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_32', name: 'Anti-Couch', category: 'OLL', alg: "R U B' (U' R' U) (R B R')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_43', name: 'Anti-P', category: 'OLL', alg: "y R' U' F' U F R", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_44', name: 'P', category: 'OLL', alg: "f (R U R' U') f'", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes en I',
      cases: [
        { id: 'foll_51', name: 'Bottlecap', category: 'OLL', alg: "f (R U R' U') (R U R' U') f'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_56', name: 'Streetlights', category: 'OLL', alg: "r' U' r (U' R' U R) (U' R' U R) r' U r", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_52', name: 'Rice Cooker', category: 'OLL', alg: "(R' U' R U' R' U) y' (R' U R) B", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_55', name: 'Highway', category: 'OLL', alg: "y (R' F R U) (R U' R2 F') R2 U' R' (U R U R')", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes de poisson',
      cases: [
        { id: 'foll_9', name: 'Kite', category: 'OLL', alg: "(R U R' U') R' F (R2 U R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_10', name: 'Anti-Kite', category: 'OLL', alg: "(R U R' U) (R' F R F') (R U2 R')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_35', name: 'Fish Salad', category: 'OLL', alg: "(R U2) (R2 F R F') (R U2 R')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_37', name: 'Mounted Fish', category: 'OLL', alg: "F (R U' R' U') (R U R' F')", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes de cavalier',
      cases: [
        { id: 'foll_13', name: 'Gun', category: 'OLL', alg: "(r U' r') (U' r U r') y' (R' U R)", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_14', name: 'Anti-Gun', category: 'OLL', alg: "(R' F R) (U R' F' R) (F U' F')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_16', name: 'Squeegee', category: 'OLL', alg: "(r U r') (R U R' U') (r U' r')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_15', name: 'Anti-Squeegee', category: 'OLL', alg: "(r' U' r) (R' U' R U) (r' U r)", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes bizarres',
      cases: [
        { id: 'foll_29', name: 'Spotted Chameleon', category: 'OLL', alg: "y (R U R' U') (R U' R') (F' U' F) (R U R')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_30', name: 'Anti-Spotted Chameleon', category: 'OLL', alg: "y' F U (R U2 R' U') (R U2 R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_41', name: 'Awkward Fish', category: 'OLL', alg: "(R U R' U R U2 R') F (R U R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_42', name: 'Lefty Awkward Fish', category: 'OLL', alg: "(R' U' R U' R' U2 R) F (R U R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Formes en L',
      cases: [
        { id: 'foll_48', name: 'Breakneck', category: 'OLL', alg: "F (R U R' U') (R U R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_47', name: 'Anti-Breakneck', category: 'OLL', alg: "F' (L' U' L U) (L' U' L U) F", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_49', name: 'Right back squeezy', category: 'OLL', alg: "r U' r2 U r2 U r2 U' r", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_50', name: 'Right front squeezy', category: 'OLL', alg: "r' U r2 U' r2 U' r2 U r'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_53', name: 'Frying Pan', category: 'OLL', alg: "(r' U' R U') (R' U R U') R' U2 r", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_54', name: 'Anti-Frying Pan', category: 'OLL', alg: "(r U R' U) (R U' R' U) R U2 r'", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Éclairs',
      cases: [
        { id: 'foll_7', name: 'Wide Sune', category: 'OLL', alg: "(r U R' U R U2 r')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_8', name: 'Wide Anti-sune', category: 'OLL', alg: "(r' U' R U' R' U2 r)", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_11', name: 'Downstairs', category: 'OLL', alg: "r' (R2 U R' U R U2 R') U M'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_12', name: 'Upstairs', category: 'OLL', alg: "M' (R' U' R U' R' U2 R) U' M", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_39', name: 'Fung', category: 'OLL', alg: "(L F') (L' U' L U) F U' L'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_40', name: 'Anti-Fung', category: 'OLL', alg: "(R' F) (R U R' U') F' U R", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    },
    {
      group: 'Aucune arête retournée correctement',
      cases: [
        { id: 'foll_1', name: 'Runway', category: 'OLL', alg: "(R U2) (R2 F R F') U2 (R' F R F')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_2', name: 'Zamboni', category: 'OLL', alg: "F (R U R' U') F' f (R U R' U') f'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_3', name: 'Anti-Nazi', category: 'OLL', alg: "f (R U R' U') f' U' F (R U R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_4', name: 'Nazi', category: 'OLL', alg: "f (R U R' U') f' U F (R U R' U') F'", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_18', name: 'Crown', category: 'OLL', alg: "y R U2 (R2 F R F') U2 M' (U R U' r')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_19', name: 'Bunny', category: 'OLL', alg: "M U (R U R' U') M' (R' F R F')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_17', name: 'Diagonal', category: 'OLL', alg: "(R U R' U) (R' F R F') U2 (R' F R F')", view: 'top', maskMode: 'oll', yellowTop: true },
        { id: 'foll_20', name: 'X', category: 'OLL', alg: "M U (R U R' U') M2 (U R U' r')", view: 'top', maskMode: 'oll', yellowTop: true }
      ]
    }
  ],

  // ==========================================
  // F2L (41 CAS COMPLETS CONFORMES AUX CAPTURES)
  // ==========================================
  F2L: [
    {
      group: 'Insertions de base',
      cases: [
        { id: 'f2l_1', name: '1', category: 'F2L', alg: "U (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_2', name: '2', category: 'F2L', alg: "y' U' (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_3', name: '3', category: 'F2L', alg: "y' (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_4', name: '4', category: 'F2L', alg: "(R U R')", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    },
    {
      group: 'Blanc sur un côté, couleurs différentes en haut',
      cases: [
        { id: 'f2l_5', name: '5', category: 'F2L', alg: "U' (R U' R' U) y' (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_6', name: '6', category: 'F2L', alg: "y' U (R' U' R U') (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_7', name: '7', category: 'F2L', alg: "U' (R U2 R' U) y' (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_8', name: '8', category: 'F2L', alg: "y' R' U2 R2 U R2 U R", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_9', name: '9', category: 'F2L', alg: "y' U (R' U R U') (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_10', name: '10', category: 'F2L', alg: "U' (R U' R' U) (R U R')", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    },
    {
      group: 'Blanc sur un côté, mêmes couleurs en haut',
      cases: [
        { id: 'f2l_11', name: '11', category: 'F2L', alg: "(U' R U R') U2 (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_12', name: '12', category: 'F2L', alg: "y' (U R' U' R) U2 (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_13', name: '13', category: 'F2L', alg: "U' (R U2 R') U2 (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_14', name: '14', category: 'F2L', alg: "y' U (R' U2 R) U2 (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    },
    {
      group: 'Blanc en haut, arête en haut',
      cases: [
        { id: 'f2l_15', name: '15', category: 'F2L', alg: "U (R U2 R') U (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_16', name: '16', category: 'F2L', alg: "y' U' (R' U2 R) U' (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_17', name: '17', category: 'F2L', alg: "U2 (R U R' U) (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_18', name: '18', category: 'F2L', alg: "y' U2 (R' U' R) U' (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    },
    {
      group: 'Pièces en haut, mal connectées',
      cases: [
        { id: 'f2l_19', name: '19', category: 'F2L', alg: "y' (R' U R) U2 y (R U R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_20', name: '20', category: 'F2L', alg: "(R U' R' U2) y' (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_21', name: '21', category: 'F2L', alg: "(R U2 R') U' (R U R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_22', name: '22', category: 'F2L', alg: "y' (R' U2 R) U (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_23', name: '23', category: 'F2L', alg: "U (R U' R' U') (R U' R' U) (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_24', name: '24', category: 'F2L', alg: "y' U' (R' U R U) (R' U R U') (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    },
    {
      group: 'Coin dans le slot (Bas)',
      cases: [
        { id: 'f2l_25', name: '25', category: 'F2L', alg: "U' F' (R U R' U') R' F R", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_26', name: '26', category: 'F2L', alg: "U (R U' R') U' (F' U F)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_27', name: '27', category: 'F2L', alg: "(R U' R' U) (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_28', name: '28', category: 'F2L', alg: "y' (R' U R U') (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_29', name: '29', category: 'F2L', alg: "y' (R' U' R U) (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_30', name: '30', category: 'F2L', alg: "(R U R' U') (R U R')", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    },
    {
      group: 'Arête dans le slot (Milieu)',
      cases: [
        { id: 'f2l_31', name: '31', category: 'F2L', alg: "(R U' R' U) y' (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_32', name: '32', category: 'F2L', alg: "(U R U' R') (U R U' R') (U R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_33', name: '33', category: 'F2L', alg: "(U' R U' R') U2 (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_34', name: '34', category: 'F2L', alg: "U (R U R') U2 (R U R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_35', name: '35', category: 'F2L', alg: "(U' R U R') U y' (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_36', name: '36', category: 'F2L', alg: "U (F' U' F) U' (R U R')", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    },
    {
      group: 'Coin et Arête déjà dans le slot',
      cases: [
        { id: 'f2l_37', name: '37', category: 'F2L', alg: "(R U' R') d (R' U2 R) U2 (R' U R)", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_38', name: '38', category: 'F2L', alg: "(R U' R' U') R U R' U2 (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_39', name: '39', category: 'F2L', alg: "(R U' R' U) (R U2 R') U (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_40', name: '40', category: 'F2L', alg: "(F' U F) U2 (R U R' U) (R U' R')", view: 'iso', maskMode: 'f2l', yellowTop: true },
        { id: 'f2l_41', name: '41', category: 'F2L', alg: "(R U R' U') (R U' R') U2 y' (R' U' R)", view: 'iso', maskMode: 'f2l', yellowTop: true }
      ]
    }
  ]
};

// Génération automatique de la section 2-LOOK PLL
CFOP_DATA['2-LOOK PLL'] = [
  {
    group: 'Étape 1 : Permutation des coins (Diagonal ou Adjacent)',
    cases: CFOP_DATA.PLL.flatMap(g => g.cases).filter(c => c.id === 'pll_t' || c.id === 'pll_y')
  },
  {
    group: 'Étape 2 : Permutation des arêtes (Ua, Ub, Z, H)',
    cases: CFOP_DATA.PLL.flatMap(g => g.cases).filter(c => ['pll_ua', 'pll_ub', 'pll_z', 'pll_h'].includes(c.id))
  }
];