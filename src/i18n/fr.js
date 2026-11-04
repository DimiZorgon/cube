import { CFOP_DATA, CFOP_SECTIONS } from '../data/cfopData.js';
import {
  BLD_CORE_CASES,
  BLD_TABS,
  CORNER_SETUPS,
  EDGE_SETUPS,
  BLD_GUIDE_STEPS,
  SPEFFZ_FACES
} from '../data/blind3x3Data.js';
import { ORTEGA_DATA, ORTEGA_SECTIONS } from '../data/ortegaData.js';
import { SIMPLE_2X2_STEPS } from '../data/simple2x2Data.js';
import { SIMPLE_3X3_STEPS } from '../data/simple3x3Data.js';
import { SIMPLE_4X4_STEPS } from '../data/simple4x4Data.js';
import { YAU_DATA, YAU_SECTIONS } from '../data/yau4x4Data.js';
import { PROFESSOR_DATA, PROFESSOR_SECTIONS } from '../data/professor5x5Data.js';

const messages = {
  'english.title': 'Version anglaise en préparation',
  'english.description': 'Les guides sont actuellement disponibles en français.',
  'english.back': 'Continuer en français',
  'app.home.eyebrow': 'Application interactive 3D',
  'app.home.title': 'Cube Studio',
  'app.home.description': 'Entraînez-vous au speedcubing, visualisez les algorithmes en 3D et maîtrisez chaque méthode.',
  'app.home.play.title': 'Jouer',
  'app.home.play.description': 'Simulateur 2x2, 3x3 & 4x4',
  'app.home.learn.title': 'Algorithmes',
  'app.home.learn.description': 'Guides 2x2, 3x3, CFOP, Ortega & Yau',
  'app.home.settings.title': 'Paramètres',
  'app.home.settings.description': 'Style creux, couleurs, taille & vitesse',
  'settings.title': 'Paramètres du Cube',
  'settings.reset': 'Par défaut',
  'settings.testTurn': 'Tester la vitesse',
  'settings.previewCaption': 'Ces réglages s’appliquent aux modes Jouer, Entraînement et Démo 3D.',
  'settings.visual.title': 'Visuel du Cube',
  'settings.visual.desc': 'Affichez le cœur noir classique ou uniquement les stickers pour voir les faces opposées.',
  'settings.visual.solid': 'Classique (Plein)',
  'settings.visual.hollow': 'Creux (Stickers seuls)',
  'settings.scale.label': 'Taille du cube',
  'settings.speed.label': 'Vitesse de rotation',
  'settings.speed.slow': 'Lent',
  'settings.speed.normal': 'Standard (5.5)',
  'settings.speed.fast': 'Rapide',
  'settings.cameraSpeed.label': 'Vitesse de la caméra',
  'settings.audio.title': 'Effets Sonores',
  'settings.audio.desc': 'Sons de rotation réalistes, signaux du chronomètre et son de victoire.',
  'settings.audio.enabled': 'Activés',
  'settings.audio.disabled': 'Muet',
  'settings.audio.volume': 'Volume des sons',
  'settings.audio.test': 'Tester le son',
  'settings.colors.title': 'Couleurs du Cube',
  'settings.colors.desc': 'Choisissez une palette rapide ou personnalisez chaque face.',
  'settings.preset.wca': 'WCA Standard',
  'settings.preset.pastel': 'Pastel',
  'settings.preset.neon': 'Néon',
  'settings.face.up': 'Haut (U)',
  'settings.face.down': 'Bas (D)',
  'settings.face.front': 'Avant (F)',
  'settings.face.back': 'Arrière (B)',
  'settings.face.right': 'Droite (R)',
  'settings.face.left': 'Gauche (L)',
  'app.play.eyebrow': 'Simulateur 3D',
  'app.play.title': 'Choisissez votre Cube',
  'app.play.description': 'Sélectionnez un format pour lancer une session chronométrée ou libre.',
  'app.play.2x2.title': 'Pocket Cube 2x2',
  'app.play.2x2.description': 'Rapide & nerveux',
  'app.play.3x3.title': "Rubik's Cube 3x3",
  'app.play.3x3.description': 'Format classique WCA',
  'app.play.4x4.title': 'Master Cube 4x4',
  'app.play.4x4.description': 'Centres mobiles & Parités',
  'app.play.5x5.title': 'Professor Cube 5x5',
  'app.play.5x5.description': 'Professor’s Cube officiel WCA',
  'app.play.smartCube.title': 'Smart Cube GAN 16 ui',
  'app.play.smartCube.description': 'Connexion Bluetooth & 3D en direct',
  'app.play.smartCube.chip': 'GAN 16 ui',
  'app.play.smartCube.back': 'Jeux',
  'app.play.smartCube.subtitle': 'Synchronisation Bluetooth & Chronométrage',
  'smartCube.eyebrow': 'Cube connecté',
  'smartCube.title': 'Smart Cube GAN 16 ui',
  'smartCube.description': 'Connectez votre cube en Bluetooth, visualisez vos mouvements en 3D en temps réel et analysez votre vitesse.',
  'smartCube.unsupported.title': 'Navigateur incompatible',
  'smartCube.unsupported.desc': 'L’API Web Bluetooth n’est pas disponible sur ce navigateur. Utilisez Google Chrome, Microsoft Edge ou Opera sur ordinateur ou Android.',
  'smartCube.bluetoothUnavailableTitle': 'Navigateur non compatible Web Bluetooth',
  'smartCube.bluetoothUnavailableDesc': "L'API Web Bluetooth n'est pas prise en charge par ce navigateur. Pour connecter votre smart cube GAN 16 ui, veuillez utiliser un navigateur basé sur Chromium (Google Chrome, Microsoft Edge, Brave, Opera) ou Bluefy sur iOS.",
  'smartCube.status.label': 'Statut',
  'smartCube.status.disconnected': 'Non connecté',
  'smartCube.status.connecting': 'Connexion...',
  'smartCube.status.connected': 'Connecté',
  'smartCube.status.error': 'Erreur',
  'smartCube.connect': 'Connecter le Smart Cube',
  'smartCube.disconnect': 'Déconnecter',
  'smartCube.connecting': 'Recherche du cube...',
  'smartCube.battery': 'Batterie',
  'smartCube.recalibrateGyro': 'Centrer le gyroscope',
  'smartCube.resetFacelets': 'Réinitialiser le cube',
  'smartCube.back': 'Retour au menu',
  'smartCube.action.connect': 'Connecter GAN 16 ui',
  'smartCube.action.connecting': 'Connexion...',
  'smartCube.action.disconnect': 'Déconnecter',
  'smartCube.action.newScramble': 'Nouveau',
  'smartCube.action.scramble': 'Mélanger',
  'smartCube.action.inspect': 'Inspecter',
  'smartCube.action.recalibrate': 'Recentrer orientation 3D',
  'smartCube.action.recalibrateShort': 'Recentrer',
  'smartCube.action.reset': 'Réinitialiser',
  'smartCube.action.copySequence': 'Copier la séquence',
  'smartCube.action.sequenceCopied': 'Copié !',
  'smartCube.action.clearTape': 'Effacer',
  'smartCube.telemetry.gyroToggle': 'Gyroscope',
  'smartCube.telemetry.gyroActive': 'Actif',
  'smartCube.telemetry.gyroInactive': 'Inactif',
  'smartCube.telemetry.scramble': 'Mélange WCA',
  'smartCube.telemetry.battery': 'Batterie',
  'smartCube.telemetry.moves': 'Mouvements',
  'smartCube.telemetry.liveTps': 'TPS actuel',
  'smartCube.telemetry.finalTps': 'TPS final',
  'smartCube.telemetry.moveTape': 'Séquence de mouvements',
  'smartCube.telemetry.waitingMove': 'En attente du premier mouvement...',
  'smartCube.timer.ready': 'Prêt',
  'smartCube.timer.scrambled': 'Mélangé — Tournez pour lancer',
  'smartCube.timer.inspecting': 'Inspection WCA',
  'smartCube.timer.solving': 'Chrono en cours',
  'smartCube.timer.solved': 'Résolu !',
  'smartCube.stats.title': 'Statistiques de session',
  'smartCube.stats.solves': 'Résolutions',
  'smartCube.stats.best': 'Meilleur',
  'smartCube.stats.worst': 'Moins bon',
  'smartCube.stats.mo3': 'Mo3',
  'smartCube.stats.ao5': 'Ao5',
  'smartCube.stats.ao12': 'Ao12',
  'smartCube.stats.avgTps': 'TPS moyen',
  'smartCube.history.title': 'Historique des temps',
  'smartCube.history.empty': 'Aucun temps enregistré',
  'smartCube.history.delete': 'Supprimer ce temps',
  'smartCube.history.clear': 'Vider la session',
  'smartCube.history.confirmClear': 'Effacer tous les temps de la session ?',
  'smartCube.history.toggle': 'Historique',
  'smartCube.history.solveNumber': 'Résolution #{{number}}',
  'smartCube.history.penaltyOk': 'OK',
  'smartCube.history.penaltyPlus2': '+2',
  'smartCube.history.penaltyDnf': 'DNF',
  'smartCube.view3d': 'Vue 3D temps réel',
  'smartCube.action.changeMac': 'Changer MAC',
  'smartCube.macModal.title': 'Adresse MAC du GAN 16 ui',
  'smartCube.macModal.subtitle': 'Nécessaire pour déchiffrer les données Bluetooth',
  'smartCube.macModal.howToFind': 'Comment obtenir l’adresse MAC :',
  'smartCube.macModal.step1': 'Ouvrez un nouvel onglet : ',
  'smartCube.macModal.step2': 'Repérez votre cube (ex. GAN-16ui-MAX-...)',
  'smartCube.macModal.step3': 'Copiez la valeur de la colonne "Address"',
  'smartCube.macModal.inputLabel': 'Adresse MAC (12 caractères hexadécimaux)',
  'smartCube.macModal.errorInvalid': 'Format attendu : XX:XX:XX:XX:XX:XX ou 12 caractères hexadécimaux',
  'smartCube.macModal.remember': 'Mémoriser cette adresse sur cet appareil',
  'smartCube.macModal.saveAndConnect': 'Enregistrer & Connecter',
  'app.play.timer.title': 'Chronomètre WCA',
  'app.play.timer.description': 'Mode csTimer pour cube réel',
  'app.algos.eyebrow': 'Apprentissage & Entraînement',
  'app.algos.title': 'Guides & Algorithmes',
  'app.algos.description': 'Explorez les méthodes pas à pas ou entraînez-vous sur les cas officiels.',
  'app.algos.simple2x2.tag': '2x2 • Débutant',
  'app.algos.simple2x2.title': 'Méthode Simple 2x2',
  'app.algos.simple2x2.description': 'Résolvez le 2x2 pas à pas avec 3 étapes visuelles ultra simples.',
  'app.algos.ortega2x2.tag': '2x2 • Intermédiaire / Speed',
  'app.algos.ortega2x2.title': 'Méthode Ortega 2x2',
  'app.algos.ortega2x2.description': '1ère face, 7 OLL et 5 PBL pour descendre sous les 5 secondes.',
  'app.algos.simple3x3.tag': '3x3 • Débutant',
  'app.algos.simple3x3.title': 'Méthode Simple 3x3',
  'app.algos.simple3x3.description': 'Le guide complet en 7 étapes illustrées (Marguerite, Belge, Chaise).',
  'app.algos.cfop3x3.tag': '3x3 • Avancé (Fridrich)',
  'app.algos.cfop3x3.title': 'Méthode CFOP 3x3',
  'app.algos.cfop3x3.description': 'Répertoire complet F2L, 2-Look & Full OLL (57) et PLL (21).',
  'app.algos.blind3x3.tag': '3x3 • Blindfolded (À l’aveugle)',
  'app.algos.blind3x3.title': 'Méthode Old Pochmann (Speffz)',
  'app.algos.blind3x3.description': 'Patron Speffz A–X interactif, Buffers B/A, Setups Arêtes & Coins et Parité.',
  'app.algos.simple4x4.tag': '4x4 • Débutant (Réduction)',
  'app.algos.simple4x4.title': 'Méthode Simple 4x4',
  'app.algos.simple4x4.description': '6 Centres, paires d’arêtes, réduction en 3x3 et Parités OLL/PLL.',
  'app.algos.yau4x4.tag': '4x4 • Avancé (Speed / CFOP)',
  'app.algos.yau4x4.title': 'Méthode Yau 4x4',
  'app.algos.yau4x4.description': 'Croix directe, 4 derniers centres, appariement 3-2-3 et Parités Speed.',
  'app.algos.professor5x5.tag': '5x5 • Avancé (Réduction)',
  'app.algos.professor5x5.title': 'Méthode Professor 5x5',
  'app.algos.professor5x5.description': 'Réduction complète des centres et arêtes selon Francocube Cyril.',
  'method.simple2x2.title': 'Méthode Simple 2x2 (Débutant)',
  'method.simple3x3.title': 'Méthode Simple 3x3 (Débutant)',
  'method.simple4x4.title': 'Méthode Simple 4x4 (Débutant)',
  'method.ortega2x2.title': 'Méthode Ortega 2x2',
  'method.cfop3x3.title': 'Algorithmes CFOP · {{section}}',
  'method.yau4x4.title': 'Méthode Yau 4x4 (Speedcubing / CFOP)',
  'method.professor5x5.title': 'Méthode 5x5 Professor (Francocube Cyril)',
  'common.back': 'Retour',
  'common.loading': 'Chargement...',
  'notFound.eyebrow': 'Erreur 404',
  'notFound.title': 'Page introuvable',
  'notFound.description': 'Cette page n’existe pas ou a été déplacée.',
  'notFound.home': 'Retour à l’accueil',
  'common.backHome': 'Retour à l’accueil',
  'common.backCubes': 'Menu des cubes',
  'common.backAlgos': 'Retour aux méthodes',
  'common.close': 'Fermer',
  'common.case': 'Cas',
  'common.name': 'Nom',
  'common.nameLabel': 'Nom :',
  'common.demo3d': 'Démo 3D',
  'common.test': 'Tester',
  'common.learned': 'Appris',
  'common.markLearned': 'Marquer comme appris',
  'language.switchToEnglish': 'Passer en anglais',
  'language.switchToFrench': 'Passer en français',
  'game.record': 'Record : {{time}}',
  'game.case': 'Cas : {{name}}',
  'move.ariaLabel': 'Mouvement {{label}}',
  'game.resetCase': 'Réinitialiser le cas',
  'game.shuffle': 'Mélanger',
  'game.showAlgorithm': 'Afficher l’algorithme',
  'game.hideAlgorithm': 'Masquer l’algorithme',
  'game.locked': 'Verrouillé',
  'game.free': 'Libre',
  'game.moves': 'Mouvements : {{count}}',
  'game.caseSolved': 'Cas résolu !',
  'game.cubeSolved': 'Cube résolu !',
  'game.result': 'Temps : {{time}} · Mouvements : {{count}}',
  'game.retryCase': 'Recommencer ce cas',
  'game.replay': 'Rejouer',
    'timer.backToMenu': 'Retour au menu',
    'timer.menu': 'Menu',
    'timer.session': 'Session',
    'timer.session.standard': 'Standard',
    'timer.session.practice': 'Entraînement',
    'timer.session.warmup': 'Échauffement',
    'timer.clearSession': 'Vider la session actuelle',
    'timer.exportCsTimer': 'Exporter la session au format csTimer',
    'timer.noSolvesToExport': 'Aucun temps à exporter dans cette session',
    'timer.pbCard.title': 'Carte de Record (PB)',
    'timer.pbCard.buttonTooltip': 'Partager la carte de record',
    'timer.pbCard.singlePb': 'SINGLE PB',
    'timer.pbCard.bestAo5': 'MEILLEUR AO5',
    'timer.pbCard.bestAo12': 'MEILLEUR AO12',
    'timer.pbCard.totalSolves': 'RÉSOLUTIONS',
    'timer.pbCard.copyText': 'Copier le texte (Discord)',
    'timer.pbCard.copyImage': "Copier l'image",
    'timer.pbCard.downloadImage': 'Télécharger PNG',
    'timer.pbCard.copied': 'Copié !',
    'timer.current': 'Actuel',
    'timer.best': 'Meilleur',
    'timer.metric.time': 'Temps',
    'timer.metric.mo3': 'mo3',
    'timer.metric.ao5': 'ao5',
    'timer.metric.ao12': 'ao12',
    'timer.solves': 'Résolutions :',
    'timer.mean': 'Moyenne :',
    'timer.emptyHistory': 'Aucun temps enregistré',
    'timer.penaltyPlus2': 'Pénalité +2 s',
    'timer.deleteTime': 'Supprimer ce temps',
    'timer.previousScramble': 'Précédent',
    'timer.nextScramble': 'Mélange suivant',
    'timer.copyScramble': 'Copier le mélange',
    'timer.hidePreview': 'Masquer le patron 2D',
    'timer.showPreview': 'Afficher le patron 2D',
    'timer.hold': 'Maintenez enfoncé…',
    'timer.ready': 'Prêt ! Relâchez pour lancer',
    'timer.stopHint': 'Appuyez sur Espace ou cliquez pour arrêter',
    'timer.startHint': 'Maintenez Espace ou le clic gauche pour démarrer',
    'timer.plusTwo': '+2 s',
    'timer.undoSolve': 'Annuler cette résolution',
    'timer.averageAo5': 'Moyenne ao5 :',
    'timer.averageAo12': 'Moyenne ao12 :',
    'timer.scramblePreview': 'Aperçu du mélange ({{puzzle}})',
    'timer.openHistory': 'Historique & statistiques',
    'timer.closeHistory': "Fermer l'historique",
  'algo.dragToRotate': 'Glissez pour orienter',
  'algo.step': 'Étape {{current}} / {{total}}',
  'algo.start': 'Début',
  'algo.previous': 'Préc.',
  'algo.play': 'Lecture',
  'algo.pause': 'Pause',
  'algo.replay': 'Rejouer',
  'algo.next': 'Suiv.',
  'algo.titleBack': 'Retour au début',
  'algo.titlePrevious': 'Mouvement précédent',
  'algo.titleNext': 'Mouvement suivant',
  'algo.testOnCube': 'Tester sur le cube',
  'algo.return': 'Retour',
  'algo.categoryMenu': 'Ouvrir le menu des catégories',
  'algo.categories': 'Catégories',
  'algo.training': 'Entraînement CFOP 3 × 3',
  'algo.selectStage': 'Choisissez une étape',
  'algo.onlyToLearn': 'À apprendre uniquement',
  'algo.showAll': 'Tout afficher',
  'algo.learnedCount': '{{count}} / {{total}} appris',
  'algo.markedLearned': 'Marqué comme appris',
  'algo.notMarkedLearned': 'Marquer comme appris',
  'algo.selectMethod': 'Tout Ortega',
  'algo.filter.allYau': 'Tout (Yau)',
  'quiz.modeTitle': 'Mode Quiz',
  'quiz.title': 'Reconnaissance de cas',
  'quiz.startTraining': 'Lancer le quiz de reconnaissance',
  'quiz.score': 'Score',
  'quiz.streak': 'Série',
  'quiz.time': 'Temps',
  'quiz.progress': 'Cas {{current}} / {{total}}',
  'quiz.nextCase': 'Cas suivant',
  'quiz.seeResults': 'Voir le bilan',
  'quiz.finishedTitle': 'Quiz terminé !',
  'quiz.finishedSubtitle': 'Vous avez passé en revue tous les cas de cette série sans répétition.',
  'quiz.restart': 'Recommencer le quiz',
  'quiz.accuracy': 'Précision',
  'quiz.bestStreak': 'Meilleure série',
  'quiz.avgTime': 'Temps moyen',
  'quiz.testOnCube': 'Tester en 3D',
  'bld.title': '3 × 3 à l’aveugle (Old Pochmann · Speffz)',
  'bld.interactivePattern': 'Patron Speffz interactif (A à X)',
  'bld.patternHelp': 'Sélectionnez une lettre pour voir son setup et la séquence en 3D.',
  'bld.edges': 'Arêtes (buffer B → cible D)',
  'bld.corners': 'Coins (buffer A → cible P)',
  'bld.buffer': 'Buffer',
  'bld.target': 'Cible',
  'bld.orientation': 'Orientation : blanc en haut (U), vert devant (F)',
  'bld.coreAlgorithms': 'Les trois algorithmes de base (arêtes, coins et parité)',
  'bld.coreHelp': 'La résolution à l’aveugle repose sur ces trois algorithmes issus de CFOP.',
  'bld.setups.edges': 'Table des setups d’arêtes (buffer B → cible D + T-Perm)',
  'bld.setups.corners': 'Table des setups de coins (buffer A → cible P + Y-Perm modifiée)',
  'bld.setups.help': 'Sélectionnez une lettre pour voir la séquence complète : setup, algorithme et annulation du setup.',
  'bld.allFaces': 'Toutes (24)',
  'bld.face': 'Face {{face}}',
  'bld.piece': 'Pièce {{position}}',
  'bld.setup': 'Setup :',
  'bld.undo': 'Annulation :',
  'bld.noSetup': 'Aucun',
  'bld.viewSetup': 'Voir le setup et l’algorithme',
  'bld.learnSetup': 'Marquer ce setup comme appris',
  'bld.edgesTab': 'Arêtes',
  'bld.cornersTab': 'Coins',
  'bld.tabGuide': '1. Guide et patron Speffz',
  'bld.tabCore': '2. Algorithmes (3)',
  'bld.tabEdges': '3. Setups d’arêtes (cible D)',
  'bld.tabCorners': '4. Setups de coins (cible P)',
  'bld.roleBuffer': 'BUFFER',
  'bld.roleTarget': 'CIBLE'
};

function addCase(item) {
  for (const field of ['name', 'category', 'description', 'face', 'pos', 'note']) {
    if (typeof item[field] === 'string') {
      messages[`data.case.${item.id}.${field}`] = item[field];
    }
  }
}

function addCases(items) {
  items.forEach(addCase);
}

function addSteps(steps) {
  for (const step of steps) {
    messages[`data.step.${step.id}.title`] = step.title;
    messages[`data.step.${step.id}.subtitle`] = step.subtitle;
    step.explanation?.forEach((text, index) => {
      messages[`data.step.${step.id}.explanation.${index}`] = text;
    });
    step.content?.forEach((text, index) => {
      messages[`data.step.${step.id}.content.${index}`] = text;
    });
    addCases(step.cases || []);
  }
}

function addGroups(namespace, groups) {
  for (const group of groups) {
    const id = group.section;
    messages[`data.group.${namespace}.${id}.title`] = group.group;
    if (group.description) {
      messages[`data.group.${namespace}.${id}.description`] = group.description;
    }
    addCases(group.cases);
  }
}

addSteps(SIMPLE_2X2_STEPS);
addSteps(SIMPLE_3X3_STEPS);
addSteps(SIMPLE_4X4_STEPS);
addSteps(BLD_GUIDE_STEPS);
addGroups('ortega', ORTEGA_DATA);
addGroups('yau', YAU_DATA);
addGroups('professor', PROFESSOR_DATA);
addCases(BLD_CORE_CASES);
addCases(EDGE_SETUPS);
addCases(CORNER_SETUPS);

for (const section of ORTEGA_SECTIONS) {
  messages[`data.section.ortega.${section.id}`] = section.label;
}

for (const section of YAU_SECTIONS) {
  messages[`data.section.yau.${section.id}`] = section.label;
}

for (const section of PROFESSOR_SECTIONS) {
  messages[`data.section.professor.${section.id}`] = section.label;
}

for (const tab of BLD_TABS) {
  messages[`data.section.bld.${tab.id}`] = tab.label;
}

for (const face of SPEFFZ_FACES) {
  messages[`data.face.bld.${face.id}`] = face.name;
}

for (const section of CFOP_SECTIONS) {
  messages[`data.section.cfop.${section.id}`] = section.label;
}

for (const [sectionId, groups] of Object.entries(CFOP_DATA)) {
  groups.forEach((group, index) => {
    messages[`data.group.cfop.${sectionId}.${index}`] = group.group;
    addCases(group.cases);
  });
}

export default messages;
