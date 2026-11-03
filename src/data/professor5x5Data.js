// src/data/professor5x5Data.js
// Méthode de réduction du 5x5 (Professor's Cube) inspirée de la référence Francocube (Cyril).
export const PROFESSOR_SECTIONS = [
  { id: 'ALL', label: 'Tout (5x5)' },
  { id: 'CENTERS', label: '1. Les 6 Centres' },
  { id: 'EDGES', label: '2. Arêtes (3 par 3)' },
  { id: 'LAST_EDGES', label: '3. 2 Dernières Arêtes' },
  { id: 'PARITY', label: '4. Parité 5x5' },
  { id: 'REDUCTION_3X3', label: '5. Résolution 3x3' }
];

export const PROFESSOR_DATA = [
  {
    section: 'CENTERS',
    group: 'Étape 1 : Construire les 6 centres en barres de 1x3',
    description:
      "Sur le 5x5, chaque centre mesure 3x3 pièces (1 pièce centrale fixe + 4 coins de centre + 4 arêtes de centre). La méthode reine consiste à fabriquer 3 barres de 1x3 pour chaque face : la barre centrale d'abord, puis les 2 barres latérales !",
    cases: [
      {
        id: 'prof_center_bar',
        name: 'Insérer une barre de centre (Rw U2 Rw\')',
        category: 'Centres 5x5',
        alg: "Rw U2 Rw'",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: "Monte la barre latérale sur la face supérieure (Rw), décale-la avec U2 pour échanger de place, et redescends (Rw') pour restaurer les centres déjà faits."
      },
      {
        id: 'prof_center_swap',
        name: 'Échange de pièces de centre (Rw-Sune)',
        category: 'Centres 5x5',
        alg: "Rw U Rw' U Rw U2 Rw'",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: "Permet d'échanger des pièces spécifiques entre le centre du haut (U) et le centre de devant (F) sans affecter les centres opposés."
      },
      {
        id: 'prof_center_comm',
        name: 'Commutateur 1x1 de coin de centre',
        category: 'Centres 5x5',
        alg: "Rw U' Lw' U Rw' U' Lw",
        view: 'iso',
        maskMode: 'centers',
        yellowTop: true,
        description: "Technique de précision pour échanger un seul petit coin de centre isolé entre la face supérieure et la face latérale."
      }
    ]
  },
  {
    section: 'EDGES',
    group: 'Étape 2 : Assembler les 12 arêtes par groupe de 3 (Arête centrale + 2 Ailes)',
    description:
      'Chaque arête du 5x5 contient 3 pièces : 1 arête centrale et 2 ailes (wings). On utilise la technique du décalage de tranche (Slice-Flip-Slice) pour regrouper les ailes autour de leur arête centrale.',
    cases: [
      {
        id: 'prof_edge_pair',
        name: 'Apparier une aile latérale avec le centre',
        category: 'Arêtes 5x5',
        alg: "Uw' (R U R') Uw",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: "On glisse la double tranche supérieure (Uw') pour accoupler l'aile avec l'arête centrale, on évacue le bloc en haut avec R U R', puis on rétablit les centres avec Uw."
      },
      {
        id: 'prof_edge_flip',
        name: 'Formule de retournement d\'arête sur place',
        category: 'Arêtes 5x5',
        alg: "R U R' F R' F' R",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: "Formule clé pour retourner l'arête de droite sur place afin que ses couleurs s'alignent avec l'arête opposée avant de glisser."
      }
    ]
  },
  {
    section: 'LAST_EDGES',
    group: 'Étape 3 : Résoudre les 2 dernières arêtes',
    description:
      'Quand 10 arêtes sont terminées et stockées, il ne reste plus d\'arêtes non faites à échanger. On résout alors les 2 dernières arêtes en les manipulant face à face sur la face avant.',
    cases: [
      {
        id: 'prof_last_edge_wings',
        name: 'Échange direct des deux ailes opposées',
        category: 'Dernières arêtes',
        alg: "Uw' (R U R' F R' F' R) Uw",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: "Place les 2 arêtes incomplètes en face l'une de l'autre sur les tranches gauche et droite, puis applique le retournement avant de réaligner les centres."
      },
      {
        id: 'prof_last_edge_inner',
        name: 'Échange d\'aile via tranche interne (2R)',
        category: 'Dernières arêtes',
        alg: "2R U2 2R U2 F2 2R F2 2R' U2 2R2",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: "Permute directement 2 ailes spécifiques entre l'avant-gauche et l'avant-droite en utilisant des quarts de tour de la tranche 2R."
      }
    ]
  },
  {
    section: 'PARITY',
    group: 'Étape 4 : La Parité du 5x5 (Arête centrale inversée)',
    description:
      "Sur le 5x5, il n'y a AUCUNE parité de PLL ni de centres. La seule parité possible survient lorsque les deux ailes d'une arête sont bien orientées mais que l'arête centrale est retournée sur elle-même. Voici la formule officielle Francocube Cyril !",
    cases: [
      {
        id: 'prof_parity_edge',
        name: 'Parité Arête Centrale Francocube Cyril',
        category: 'Parité 5x5',
        alg: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 3Rw' U2 Rw U2 Rw' U2 Rw'",
        view: 'iso',
        maskMode: 'edges_4x4',
        yellowTop: true,
        description: "Place l'arête à parité en face supérieure avant (UF). Cette formule retourne l'arête centrale de 180° sans toucher aux ailes ni aux 6 centres !"
      }
    ]
  },
  {
    section: 'REDUCTION_3X3',
    group: 'Étape 5 : Résolution finale en 3x3',
    description:
      'Félicitations ! Avec les 6 centres complets et les 12 arêtes triples formées, votre 5x5 se résout exactement comme un Rubik\'s Cube 3x3 standard (Croix, F2L, OLL et PLL).',
    cases: [
      {
        id: 'prof_3x3_sune',
        name: 'Orientation finale (Sune)',
        category: 'Étape 3x3',
        alg: "R U R' U R U2 R'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true,
        description: "Appliquez vos algorithmes OLL et PLL classiques pour terminer le cube !"
      }
    ]
  }
];

