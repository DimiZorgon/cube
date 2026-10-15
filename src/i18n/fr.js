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
  'app.play.eyebrow': 'Simulateur 3D',
  'app.play.title': 'Choisissez votre Cube',
  'app.play.description': 'Sélectionnez un format pour lancer une session chronométrée ou libre.',
  'app.play.2x2.title': 'Pocket Cube 2x2',
  'app.play.2x2.description': 'Rapide & nerveux',
  'app.play.3x3.title': "Rubik's Cube 3x3",
  'app.play.3x3.description': 'Format classique WCA',
  'app.play.4x4.title': 'Master Cube 4x4',
  'app.play.4x4.description': 'Centres mobiles & Parités',
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
  'method.simple2x2.title': 'Méthode Simple 2x2 (Débutant)',
  'method.simple3x3.title': 'Méthode Simple 3x3 (Débutant)',
  'method.simple4x4.title': 'Méthode Simple 4x4 (Débutant)',
  'method.ortega2x2.title': 'Méthode Ortega 2x2',
  'method.cfop3x3.title': 'Algorithmes CFOP · {{section}}',
  'method.yau4x4.title': 'Méthode Yau 4x4 (Speedcubing / CFOP)',
  'common.back': 'Retour',
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
addCases(BLD_CORE_CASES);
addCases(EDGE_SETUPS);
addCases(CORNER_SETUPS);

for (const section of ORTEGA_SECTIONS) {
  messages[`data.section.ortega.${section.id}`] = section.label;
}

for (const section of YAU_SECTIONS) {
  messages[`data.section.yau.${section.id}`] = section.label;
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
