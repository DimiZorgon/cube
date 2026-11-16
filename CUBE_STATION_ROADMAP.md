# Roadmap : Intégration GAN 16 ui & Expérience Cube Station

Ce document résume l'état exact des développements, les briques livrées et validées, ainsi que la spécification technique détaillée des fonctionnalités restantes à intégrer pour reproduire fidèlement l'application **GAN Cube Station**.

---

## 1. Ce qui est terminé et validé ✅

### Jalon 1 : Couche BLE Web Bluetooth & Télémétrie Batterie (M1)
- **Fichiers** : `src/utils/smartCube/ganBleDriver.js`, `src/utils/smartCube/ganProtocol.js`
- **Résolution du blocage Windows BLE / WinRT** :
  - Support des UUID canoniques 128-bit (`00000010-...`, `0000fff0-...`, etc.).
  - Résolution directe et découplée des caractéristiques `0000fff5-...` (TX) et `0000fff6-...` (RX).
  - Contournement du cache GATT WinRT vide via une boucle de découverte avec temporisation.
- **Télémétrie Batterie Gen4** :
  - Décodage précis des trames `0xEF` et sous-types `0xDD` avec lecture de l'offset dynamique `1 + dataLength`.
  - Transmission au store et mise à jour de l'état `batteryLevel` (0-100%).
- **Tests** : 12 tests M1, 19 tests de stress, 16 tests de fuzzing batterie, et 240 tests E2E passés à 100%.

### Jalon 2 : Simulateur & Moteur de Détection des Phases CFOP (M2)
- **Fichiers** : `src/utils/cubeMath.js`, `src/utils/smartCube/solvePhaseDetector.js`
- **Correction des permutations `CubeStateSimulator`** :
  - Correction des quarts de tour `F` et `B` pour s'aligner sur le repère 3D de Three.js.
- **Moteur CFOP monolithique et robuste (`solvePhaseDetector.js`)** :
  - Détecte l'avancement dans les 4 phases canoniques :
    1. **Cross** : Les 4 arêtes de la face D (blanc par défaut) alignées avec leurs centres respectifs.
    2. **F2L (First Two Layers)** : Cross + les 4 paires coin-arête des deux premiers étages résolues.
    3. **OLL (Orientation of the Last Layer)** : F2L + face supérieure U (jaune) entièrement orientée.
    4. **PLL (Permutation of the Last Layer)** : Toutes les pièces permutées (état résolu `isFaceletsSolved`).
  - **Progression strictement monotone** : la phase ne régresse jamais pendant une résolution en cours.
  - **Gestion des "skips"** (OLL skip -> passage direct à PLL, PLL skip -> passage direct à résolu).
- **Tests** : 28 tests unitaires M2, 13 tests adversariaux de stress (`tests/e2e/smartCube/test_m2_simulator_cfop.mjs`).

---

## 2. Ce qu'il reste à implémenter 📋

### Jalon 3 : Store & Logique de Suivi du Mélange et des Splits (M3)
**Fichier à modifier** : `src/store/useSmartCubeStore.js`

1. **Machine à états étendue pour le mélange interactif (`scrambling`)** :
   - États du timer : `'idle'` ➔ `'scrambling'` ➔ `'scrambled'` ➔ `'inspecting'` ➔ `'solving'` ➔ `'solved'`.
   - Lors de la génération d'un mélange WCA, initialiser :
     ```js
     scrambleTracking: {
       expectedMoves: parseScramble(scrambleString), // ex: ["D'", "R2", "U'", ...]
       currentMoveIndex: 0,
       isComplete: false
     }
     ```
   - À chaque mouvement physique reçu :
     - Si le mouvement correspond au mouvement attendu (`expectedMoves[currentMoveIndex]`), incrémenter l'index.
     - Prise en charge des mouvements doubles (`R2` = `R` + `R` ou un seul demi-tour physique).
     - Si une mauvaise face est tournée, afficher une alerte visuelle pour inviter l'utilisateur à annuler le tour.
     - Quand tous les mouvements sont effectués, passer l'état à `'scrambled'` (prêt à lancer l'inspection ou la résolution).

2. **Démarrage et Arrêt Automatique du Chrono** :
   - Démarrage automatique au premier mouvement physique dès que le cube quitte l'état `'scrambled'` ou `'inspecting'`.
   - Utilisation de `Date.now()` comme horloge murale synchronisée avec un RAF (60 fps) dans l'UI.
   - Arrêt instantané dès que `cubeSimulator.isSolved()` est vrai (temps figé à la milliseconde près).

3. **Enregistrement des Splits CFOP par résolution** :
   - Instancier `currentPhase = 'cross'` au début de la résolution.
   - À chaque mouvement, appeler `detectSolvePhase(cubeSimulator.getFaceletString(), currentPhase)`.
   - Dès qu'une phase est validée, enregistrer le timestamp, la durée depuis l'étape précédente, le nombre de mouvements et le TPS de cette phase :
     ```js
     splits: {
       cross: { durationMs: 2450, moves: 7, tps: 2.86 },
       f2l:   { durationMs: 6120, moves: 24, tps: 3.92 },
       oll:   { durationMs: 1850, moves: 9, tps: 4.86 },
       pll:   { durationMs: 2100, moves: 12, tps: 5.71 }
     }
     ```
   - Persister l'objet complet dans `sessionSolves` (avec support de sauvegarde dans `localStorage`).

---

### Jalon 4 : Interface Utilisateur Style "Cube Station" (M4)
**Fichier à modifier** : `src/pages/SmartCubePage.jsx`

1. **Composant Guide de Mélange Interactif (Scramble Progress)** :
   - Afficher la séquence de mélange sous forme de jetons horizontaux.
   - Mettre en surbrillance verte les mouvements déjà validés.
   - Mettre en évidence avec une animation pulsation le prochain mouvement attendu.
   - Affichage d'un badge "Mélangé - Prêt !" dès la fin de la séquence.

2. **Indicateur des 4 Phases CFOP en Direct** :
   - Barre de progression horizontale en 4 segments (`Cross`, `F2L`, `OLL`, `PLL`).
   - Le segment actif clignote en vert/bleu, les segments terminés affichent le split (`2.4s`, `6.1s`, etc.).

3. **Modal / Carte Récapitulative de Résolution (Post-Solve Analysis)** :
   - Dès que le cube est résolu, afficher une vue détaillée façon Cube Station :
     - **Temps total** et **TPS global**.
     - **Graphique en barres ou camembert des 4 étapes** avec le pourcentage de temps passé sur chaque étape (Cross %, F2L %, OLL %, PLL %).
     - Détection des pauses / hésitations entre les étapes.
   - Consultation des détails de chaque résolution depuis l'historique des temps.

---

### Jalon 5 : Tests et Durcissement (M5)
1. **Tests E2E du flux complet** :
   - Scramble tracking automatique avec injection de mouvements.
   - Test des 4 étapes CFOP avec solves réels (Cross, F2L, OLL, PLL).
   - Persistance et relecture des splits dans `sessionSolves`.
2. **Build de production et zéro avertissement lint**.

---

## 3. Commandes Utiles pour Reprendre le Travail

```bash
# Lancer les tests E2E Smart Cube (240 tests)
node tests/e2e/smartCube/runAllTests.mjs

# Lancer les tests du moteur CFOP
node tests/e2e/smartCube/test_m2_simulator_cfop.mjs
node tests/e2e/smartCube/test_m2_adversarial_challenger.mjs

# Lancer les tests de résilience BLE et batterie
node tests/e2e/smartCube/test_m1_ble_battery.mjs
node tests/e2e/smartCube/test_m1_challenger2_stress.mjs

# Lancer le serveur de développement Vite
npm run dev

# Vérifier le build de production
npm run build
```

