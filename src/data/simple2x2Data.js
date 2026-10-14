// src/data/simple2x2Data.js
export const SIMPLE_2X2_STEPS = [
  {
    id: 's2_step1',
    title: 'Étape 1 : La Face Blanche (L’Ascenseur)',
    subtitle: 'Construire le premier étage blanc en alignant les couleurs des côtés',
    explanation: [
      "Le 2x2 se compose uniquement de 8 coins. Choisis un coin blanc et garde-le en bas devant à gauche : ce sera ton point de repère. Regarde sa couleur sur le côté (par exemple Vert) : le coin qui viendra à sa droite devra avoir du Blanc ET du Vert.",
      "Place le coin blanc que tu veux faire descendre juste au-dessus de sa place (en haut à droite), et regarde où pointe sa facette blanche :"
    ],
    cases: [
      {
        id: 's2_c1_right',
        name: 'Blanc à droite',
        category: '2x2 Simple - Étape 1',
        alg: "R U R'",
        view: 'iso',
        maskMode: 'first_layer',
        yellowTop: true,
        description: "L'ascenseur monte (R), le coin rentre dedans (U), l'ascenseur redescend (R')."
      },
      {
        id: 's2_c1_front',
        name: 'Blanc devant soi',
        category: '2x2 Simple - Étape 1',
        alg: "U R U' R'",
        view: 'iso',
        maskMode: 'first_layer',
        yellowTop: true,
        description: "Le coin s'écarte à gauche (U), l'ascenseur monte (R), il rentre (U') et redescend (R')."
      },
      {
        id: 's2_c1_up',
        name: 'Blanc vers le haut (3x Ascenseur)',
        category: '2x2 Simple - Étape 1',
        alg: "(R U R' U') (R U R' U') (R U R' U')",
        view: 'iso',
        maskMode: 'first_layer',
        yellowTop: true,
        description: "Répète 3 fois de suite : Je monte (R), je tourne (U), je descends (R'), je reviens (U')."
      }
    ]
  },
  {
    id: 's2_step2',
    title: 'Étape 2 : Toute la Face Jaune (L’Histoire de la Chaise)',
    subtitle: 'Mettre toutes les facettes jaunes vers le haut avec une seule formule',
    explanation: [
      "Avec la seule histoire de la Chaise (R U R' U R U2 R'), tu peux orienter tous les coins jaunes vers le haut.",
      "Comment tenir ton cube avant de lancer la formule :\n• S'il y a 1 seul coin jaune en haut : place-le devant à GAUCHE.\n• S'il y a 0 coin jaune en haut : tourne le haut pour avoir une facette jaune sur le côté GAUCHE.\n• S'il y a 2 coins jaunes en haut : tourne le haut pour avoir une facette jaune qui te fait face DEVANT à gauche."
    ],
    cases: [
      {
        id: 's2_sune',
        name: 'L’Histoire de la Chaise (Sune)',
        category: '2x2 Simple - Étape 2',
        alg: "(R U R' U) (R U2 R')",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true,
        description: "Il se lève (R), il part (U), la chaise tombe (R'), il avance (U), il relève la chaise (R), il revient vite (U2) et se rassoit (R')."
      }
    ]
  },
  {
    id: 's2_step3',
    title: 'Étape 3 : Les Phares de Voiture (Terminer le 2x2)',
    subtitle: 'Échanger les 2 derniers coins pour résoudre le cube',
    explanation: [
      "1. Tourne l'étage du haut pour aligner le plus de couleurs possible. Cherche deux coins côte à côte qui ont la MÊME couleur sur un côté (une barre de 2 couleurs identiques).",
      "2. Place cette barre résolue sur ta GAUCHE, puis exécute la formule ci-dessous pour échanger les deux coins de droite. Si aucune barre n'est présente, fais la formule une première fois pour la faire apparaître."
    ],
    cases: [
      {
        id: 's2_niklas_swap',
        name: 'Échange des 2 coins de droite',
        category: '2x2 Simple - Étape 3',
        alg: "(R U R' U') (R' F R2 U') R' U' (R U R' F')",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Garde la barre résolue à gauche et échange les deux coins de droite.',
        arrows: [{ from: [0, 1], to: [1, 1], bi: true }]
      }
    ]
  }
];