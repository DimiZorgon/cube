// src/data/simple3x3Data.js
export const SIMPLE_3X3_STEPS = [
  {
    id: 'step1_cross',
    title: 'Étape 1 : La Marguerite puis la Croix Blanche',
    subtitle: 'L’astuce infaillible pour réussir la croix blanche sans jamais se tromper',
    explanation: [
      "1. Fabrique une Marguerite : mets le centre JAUNE tout en haut. Cherche les 4 arêtes blanches (les pièces du milieu qui ont 2 couleurs) et place-les autour du centre jaune : tu obtiens un cœur jaune entouré de 4 pétales blancs.",
      "2. Envoie les pétales en bas : regarde la 2ème couleur d'un pétale blanc (par exemple le Vert). Tourne l'étage du haut jusqu'à l'aligner avec le centre Vert, puis tourne cette face 2 fois (F2) pour envoyer le pétale tout en bas.",
      "3. Répète cela pour les 4 pétales : ta Croix Blanche est terminée et bien alignée sur les côtés ! Si une arête est inversée ou coincée sur le côté, utilise l'un des 2 cas ci-dessous :"
    ],
    cases: [
      {
        id: 's3_cross_flip',
        name: 'Retourner un pétale à l’envers',
        category: 'Étape 1 - Croix',
        alg: "F' U L' U'",
        view: 'iso',
        maskMode: 'cross',
        yellowTop: false,
        description: "Si ton arête blanche est au bon endroit mais que le blanc regarde devant au lieu d'être en haut."
      },
      {
        id: 's3_cross_insert',
        name: 'Sortir un pétale du 2ème étage',
        category: 'Étape 1 - Croix',
        alg: "U' R U",
        view: 'iso',
        maskMode: 'cross',
        yellowTop: false,
        description: "Fait monter l'arête coincée à droite sans abîmer les pétales déjà placés."
      }
    ]
  },
  {
    id: 'step2_corners',
    title: 'Étape 2 : Les 4 Coins Blancs (L’Ascenseur)',
    subtitle: 'Terminer toute la face blanche avec sa première couronne de couleurs',
    explanation: [
      "1. Mets ta croix blanche EN BAS. Cherche à l'étage du haut un coin qui possède du BLANC. Regarde ses 2 autres couleurs (par exemple Vert et Rouge) et tourne le haut (U) pour placer ce coin juste au-dessus de son emplacement (entre les centres Vert et Rouge).",
      "2. Regarde où pointe la facette blanche de ce coin : à droite, devant toi, ou vers le haut ? Utilise alors le mouvement de l'Ascenseur correspondant :"
    ],
    cases: [
      {
        id: 's3_c1_right',
        name: 'Blanc à droite (Ascenseur direct)',
        category: 'Étape 2 - 1ère Couronne',
        alg: "R U R'",
        view: 'iso',
        maskMode: 'first_layer',
        yellowTop: true,
        description: "L'ascenseur de droite monte (R), le coin entre dedans (U), et l'ascenseur redescend (R')."
      },
      {
        id: 's3_c1_front',
        name: 'Blanc devant soi',
        category: 'Étape 2 - 1ère Couronne',
        alg: "U R U' R'",
        view: 'iso',
        maskMode: 'first_layer',
        yellowTop: true,
        description: "Le coin s'écarte d'abord à gauche (U), l'ascenseur monte (R), le coin rentre (U') et l'ascenseur redescend (R')."
      },
      {
        id: 's3_c1_up',
        name: 'Blanc vers le haut (3x Ascenseur)',
        category: 'Étape 2 - 1ère Couronne',
        alg: "(R U R' U') (R U R' U') (R U R' U')",
        view: 'iso',
        maskMode: 'first_layer',
        yellowTop: true,
        description: "Répète 3 fois de suite : Je monte (R), je tourne (U), je descends (R'), je reviens (U')."
      }
    ]
  },
  {
    id: 'step3_belge',
    title: 'Étape 3 : Le 2ème Étage (L’Histoire du Belge)',
    subtitle: 'Placer les 4 arêtes du milieu grâce à une histoire mnémotechnique',
    explanation: [
      "1. Garde toujours la face blanche en bas. Cherche sur l'étage du haut une arête qui N'A PAS DE JAUNE. Tourne le haut pour aligner sa couleur de devant avec son centre : cela forme un grand « T » de la même couleur.",
      "2. Regarde la couleur du dessus de cette arête : doit-elle aller à DROITE ou à GAUCHE ?\nRaconte l'histoire du Belge :\n• Le Belge part d'abord du côté opposé à sa destination.\n• Ses amis montent le chercher.\n• Le Belge revient, et ses amis redescendent avec lui.\n• On pousse encore un coup, on ouvre la face avant, on remet le coin blanc et on referme."
    ],
    cases: [
      {
        id: 's3_belge_droite',
        name: 'Le Belge à Droite',
        category: 'Étape 3 - 2ème Couronne',
        alg: "(U R U' R') (U' F' U F)",
        view: 'iso',
        maskMode: 'f2l_all',
        yellowTop: true,
        description: "Il doit aller à droite : il part à gauche (U), la droite monte (R), il revient (U'), la droite descend (R'), puis on remet le coin blanc (U' F' U F)."
      },
      {
        id: 's3_belge_gauche',
        name: 'Le Belge à Gauche',
        category: 'Étape 3 - 2ème Couronne',
        alg: "(U' L' U L) (U F U' F')",
        view: 'iso',
        maskMode: 'f2l_all',
        yellowTop: true,
        description: "Il doit aller à gauche : il part à droite (U'), la gauche monte (L'), il revient (U), la gauche descend (L), puis on remet le coin blanc (U F U' F')."
      }
    ]
  },
  {
    id: 'step4_yellow_cross',
    title: 'Étape 4 : La Croix Jaune (L’Horloge de 9h00)',
    subtitle: 'Former une croix jaune sur le dessus avec une seule petite formule',
    explanation: [
      "Ne regarde que les arêtes jaunes sur le dessus (ignore les coins pour l'instant). Tu verras soit un Point, soit une petite Horloge (un virage en L), soit une Ligne.",
      "La formule est toujours la même : F (R U R' U') F' :\n1. On bascule la face avant vers la droite (F).\n2. On fait 1 coup d'Ascenseur (R U R' U').\n3. On remet la face avant en place (F').\n\n• Si tu as l'Horloge (le petit L) : place les aiguilles sur 9h00 (en haut et à gauche).\n• Si tu as la Ligne : tiens-la couchée HORIZONTALEMENT (de gauche à droite)."
    ],
    cases: [
      {
        id: 's3_yc_line',
        name: 'Depuis la Ligne horizontale',
        category: 'Étape 4 - Croix Jaune',
        alg: "F (R U R' U') F'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true,
        description: 'Tiens la ligne bien à plat (gauche-droite) et exécute la formule 1 fois.'
      },
      {
        id: 's3_yc_l',
        name: 'Depuis l’Horloge (9h00)',
        category: 'Étape 4 - Croix Jaune',
        alg: "F (R U R' U') (R U R' U') F'",
        view: 'top',
        maskMode: 'oll',
        yellowTop: true,
        description: 'Mets le petit virage jaune en haut à gauche (9h00) et fais 2 fois l’Ascenseur au milieu.'
      }
    ]
  },
  {
    id: 'step5_yellow_edges',
    title: 'Étape 5 : Aligner la Croix Jaune (L’Histoire de la Chaise)',
    subtitle: 'Mettre les 4 branches de la croix jaune en face de leurs bonnes couleurs',
    explanation: [
      "1. Tourne l'étage du haut (U) : tu peux TOUJOURS aligner au moins 2 arêtes avec la couleur de leur centre.",
      "2. Si les 2 bonnes arêtes sont côte à côte, place-les AU FOND et À DROITE (si elles sont en face l'une de l'autre, fais la formule une première fois n'importe où).\nRaconte ensuite l'histoire de la Chaise :\n• Il se lève de sa chaise (R)\n• Il part se promener (U)\n• Sa chaise tombe (R')\n• Il fait encore un pas plus loin (U)\n• Il revient relever sa chaise (R)\n• Il court à toute vitesse en faisant demi-tour (U2)\n• Et il se rassoit sur sa chaise (R')."
    ],
    cases: [
      {
        id: 's3_chair',
        name: 'L’Histoire de la Chaise',
        category: 'Étape 5 - Arêtes Jaunes',
        alg: "(R U R' U) (R U2 R') U",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Échange les deux arêtes de devant et de gauche sans bouger celles du fond et de droite.'
      }
    ]
  },
  {
    id: 'step6_yellow_corners_pos',
    title: 'Étape 6 : Placer les Coins Jaunes (L’Histoire des Amis)',
    subtitle: 'Mettre chaque coin à son bon emplacement (même s’il est encore mal orienté)',
    explanation: [
      "1. Un coin est « bien placé » s'il possède les 3 couleurs des faces qui l'entourent (même si le jaune ne regarde pas encore vers le haut).",
      "2. Si tu trouves 1 coin bien placé, garde-le DEVANT À DROITE (s'il n'y en a aucun, fais la formule une première fois n'importe où).\nRaconte l'histoire des Amis :\n• Le coin de droite va rendre visite à gauche (U)\n• Ses amis de droite montent (R)\n• Il revient chez lui (U')\n• Ses amis de gauche montent aussi (L')\n• Il retourne les saluer (U)\n• Les amis de droite redescendent (R')\n• Il rentre à sa place (U') et les amis de gauche redescendent (L)."
    ],
    cases: [
      {
        id: 's3_friends',
        name: 'L’Histoire des Amis (Niklas)',
        category: 'Étape 6 - Placer les Coins',
        alg: "U R U' L' U R' U' L",
        view: 'top',
        maskMode: 'full',
        yellowTop: true,
        description: 'Fait tourner 3 coins entre eux tout en gardant le coin avant-droit immobile.'
      }
    ]
  },
  {
    id: 'step7_yellow_corners_orient',
    title: 'Étape 7 : Orienter les Derniers Coins (La Double Chaise)',
    subtitle: 'La touche finale pour résoudre le Rubik’s Cube 3x3',
    explanation: [
      "Tous tes coins sont au bon endroit ! Il suffit maintenant de les faire pivoter sur place pour mettre le jaune en haut.",
      "Place les 2 coins à tourner sur ton côté DROIT, puis exécute la Double Chaise :\n• D'abord la Chaise inversée avec la main DROITE : (R U2 R' U' R U' R')\n• Puis exactement le mouvement miroir avec la main GAUCHE : (L' U2 L U L' U L)."
    ],
    cases: [
      {
        id: 's3_double_chair',
        name: 'La Double Chaise',
        category: 'Étape 7 - Orienter les Coins',
        alg: "(R U2 R' U' R U' R') (L' U2 L U L' U L)",
        view: 'iso',
        maskMode: 'full',
        yellowTop: true,
        description: 'Fait pivoter les 2 coins de droite sur place sans rien déranger d’autre.'
      }
    ]
  }
];