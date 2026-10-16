# 🧊 Cube Studio — Rubik's Cube 3D & Speedcubing Hub

Simulateur 3D interactif multi-puzzles (2x2, 3x3, 4x4), bibliothèque complète de méthodes d'apprentissage avec lecteur 3D d'algorithmes pas à pas, et chronomètre officiel de speedcubing (style csTimer).

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.186-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)
![Zustand](https://img.shields.io/badge/Zustand-5-764ABC)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Fonctionnalités

### 🎲 Simulateur 3D Multi-Puzzles (2x2, 3x3, 4x4)
- **Puzzles réalistes** : 2x2x2 Pocket Cube, 3x3x3 Rubik's Cube classique et 4x4x4 Rubik's Revenge.
- **Rendu Three.js optimisé** : cubies avec biseaux réalistes, géométrie allégée (cœurs internes masqués pour la performance) et couleurs WCA officielles.
- **Mouvements complets** :
  - Faces simples : `R, L, U, D, F, B` et leurs inverses (`'`).
  - Tranches centrales & wide moves : `M`, `Rw, Lw, Uw, Dw, Fw, Bw`.
  - Double tours : notation `2`.
- **Contrôles polyvalents** : boutons tactiles à l'écran (avec appui long 500ms pour les wide moves), raccourcis clavier complets, et glisser-déposer 3D.
- **Caméra intelligente** :
  - *Mapping dynamique* : les boutons de mouvements s'adaptent automatiquement selon l'angle de vue de la caméra.
  - *Snap magnétique* : la caméra s'aligne automatiquement sur la face la plus proche au relâchement.
  - *Verrouillage d'axe* : mode rotation horizontale seule pour une concentration optimale.
- **Système de jeu** : chronomètre en jeu au centième, mélange intelligent sans annulations, comptage de mouvements, détection automatique de victoire et explosion de confettis 🎉.
- **Records personnels** : meilleur score sauvegardé localement par taille de puzzle.

---

### 📚 Guides d'Algorithmes & Entraîneur Interactif
7 méthodes complètes de résolution avec progression enregistrée :

| Puzzle | Méthode | Niveau | Description |
|---|---|---|---|
| **2x2** | **Méthode Débutant** | Débutant | Résolution face par face intuitive en 3 étapes simples. |
| **2x2** | **Méthode Ortega** | Intermédiaire | Face blanche, OLL 2x2, puis PBL (Permutation of Both Layers). |
| **3x3** | **Méthode Débutant** | Débutant | Méthode couche par couche (LBL) avec schémas explicatifs. |
| **3x3** | **CFOP / Fridrich** | Avancé | Bibliothèque complète : Cross, 41 cas F2L, 57 cas OLL, 21 cas PLL. |
| **3x3** | **Blindfolded (À l'aveugle)** | Expert | Méthode Old Pochmann (coins) & M2 (arêtes) avec patron Speffz interactif cliquable (A-X) et gestion des parités. |
| **4x4** | **Méthode Débutant** | Intermédiaire | Centres, appariement d'arêtes (réduction 3x3) et gestion des parités OLL/PLL 4x4. |
| **4x4** | **Méthode Yau** | Avancé | Centres blanc/jaune, 3 arêtes de croix, centres restants, arêtes restantes et parités 4x4. |

---

### 🎬 Visualiseur 3D d'Algorithmes & Schémas 2D
- **Lecteur 3D dynamique (`AlgoDemoModal`)** :
  - Visualisation de l'algorithme animé pas à pas sur un cube 3D dédié.
  - Contrôles de lecture : Play/Pause, étape suivante, étape précédente, réinitialisation.
  - Réglage de la vitesse de rotation.
  - **Bouton « Tester en jeu »** : charge instantanément le cas exact sur le cube de jeu interactif pour s'entraîner en conditions réelles !
- **Schémas 2D d'orientation (`CubeDiagram2D`)** : vues de dessus et patrons dépliés pour identifier rapidement les cas d'OLL, PLL et PBL.
- **Suivi d'apprentissage** : cases à cocher persistantes en `localStorage` pour suivre vos algorithmes maîtrisés.

---

### ⏱️ Chronomètre Speedcubing WCA (`SpeedTimer`)
Une alternative complète intégrée à csTimer :
- **Mélanges officiels WCA** : générateurs de scrambles aléatoires sans mouvements redondants pour 2x2 (11 mvs), 3x3 (20 mvs) et 4x4 (40 mvs).
- **Aperçu 2D du mélange** : diagramme déplié du cube mélangé pour vérifier son placement avant de lancer le solve.
- **Inspection WCA 15 secondes** : décompte sonore/visuel avec pénalités officielles (+2 à 15s, DNF à 17s).
- **Déclenchement tactile / barre d'espace** : maintien pour armer (rouge ➔ vert), relâchement pour lancer.
- **Statistiques en direct** : temps courant, meilleur temps (PB), moyennes élaguées WCA **ao5**, **ao12**, et moyenne globale.
- **Gestion des sessions** : pénalités (+2 / DNF), suppression de temps, historique détaillé.
- **Export csTimer** : sauvegarde au format JSON compatible csTimer et export presse-papier en un clic.

---

### 🌐 Internationalisation & SEO
- **Bilingue complet** : Français (`/`) et Anglais (`/en/`) géré avec `react-i18next`.
- **Routage multi-pages Vite** : génération statique de `index.html` et `en/index.html` avec balises OpenGraph, Twitter Cards et balises canoniques / `hreflang` pour le référencement.

---

## 🎮 Commandes et Raccourcis

### Raccourcis Clavier

| Touche | Mouvement | Touche + Maj (`Shift`) |
|---|---|---|
| <kbd>R</kbd> | Face Droite (horaire) | `R'` (anti-horaire) |
| <kbd>L</kbd> | Face Gauche | `L'` |
| <kbd>U</kbd> | Face Haute | `U'` |
| <kbd>D</kbd> | Face Basse | `D'` |
| <kbd>F</kbd> | Face Avant | `F'` |
| <kbd>B</kbd> | Face Arrière | `B'` |
| <kbd>M</kbd> (3x3) | Tranche Milieu | `M'` |
| <kbd>X</kbd>, <kbd>Y</kbd>, <kbd>Z</kbd> | Rotation du cube entier | Rotation inverse |

### Contrôles Souris / Tactile

| Action | Contrôle |
|---|---|
| **Pivoter la vue** | Clic gauche / Toucher glisser sur l'arrière-plan |
| **Tourner une tranche** | Clic sur les boutons de commande autour du cube |
| **Wide Move (double tranche)** | Appui long (500ms) sur un bouton de face |
| **Snap magnétique** | Relâcher la vue pour aligner la caméra sur la face la plus proche |
| **Verrouillage horizontal** | Icône 🔒 / 🔓 en haut à droite |

---

## 🏗️ Architecture du Projet

```text
cube/
├── public/                     # Favicons, assets statiques et images OG
├── en/
│   └── index.html              # Point d'entrée bilingue anglais
├── index.html                  # Point d'entrée principal français
├── vite.config.js              # Configuration Vite multi-pages & chunk splitting
└── src/
    ├── main.jsx                # Initialisation React & i18n
    ├── App.jsx                 # Routeur d'états principal, chargement lazy des vues
    ├── index.css               # Styles globaux & mise en page du canvas
    ├── App.css                 # Styles de navigation & cartes de menus
    ├── components/
    │   ├── CubeGame.jsx        # Moteur générique de jeu 3D (timer, shuffle, record, HUD)
    │   ├── Cube2x2.jsx         # Vue et contrôles spécifiques au 2x2
    │   ├── Cube3x3.jsx         # Vue et contrôles spécifiques au 3x3
    │   ├── Cube4x4.jsx         # Vue et contrôles spécifiques au 4x4
    │   ├── RubiksCube.jsx      # Orchestrateur d'animations Three.js synchronisé avec Zustand
    │   ├── Cubie.jsx           # Composant 3D d'une pièce individuelle (biseaux & facettes)
    │   ├── MiniCube.jsx        # Cube 3D miniature autonome pour les boutons du menu
    │   ├── SpeedTimer.jsx      # Chronomètre speedcubing, calcul de statistiques et export
    │   ├── CameraMapper.jsx    # Calcul des vecteurs caméra pour adapter les boutons
    │   ├── LockCamera.jsx      # Contrôleur Orbit/Trackball avec verrouillage d'axes
    │   ├── MoveButton.jsx      # Bouton de mouvement tactile avec support d'appui long
    │   ├── LanguageSwitcher.jsx# Sélecteur de langue (FR / EN)
    │   └── algos/              # Vues détaillées des méthodes de résolution
    │       ├── AlgoDemoModal.jsx   # Lecteur 3D d'animation d'algorithme pas à pas
    │       ├── CubeDiagram2D.jsx   # Schéma vectoriel 2D des cas (OLL, PLL, PBL)
    │       ├── MethodeSimple2x2.jsx
    │       ├── MethodeOrtega2x2.jsx
    │       ├── MethodeSimple3x3.jsx
    │       ├── MethodeCFOP3x3.jsx
    │       ├── MethodeBlind3x3.jsx
    │       ├── MethodeSimple4x4.jsx
    │       └── MethodeYau4x4.jsx
    ├── data/                   # Données des algorithmes et cas d'entraînement
    │   ├── simple2x2Data.js
    │   ├── ortegaData.js
    │   ├── simple3x3Data.js
    │   ├── cfopData.js
    │   ├── blind3x3Data.js
    │   ├── simple4x4Data.js
    │   └── yau4x4Data.js
    ├── i18n/                   # Traductions FR/EN et localisation dynamique des algorithmes
    │   ├── index.js
    │   ├── fr.js
    │   ├── en.js
    │   └── localizeData.js
    ├── store/
    │   └── useCubeStore.js     # État global Zustand (cubies, rotation active, file, validation)
    ├── styles/                 # Feuilles de styles modulaires
    │   ├── menu.css
    │   ├── speedTimer.css
    │   ├── algoModal.css
    │   ├── blind3x3.css
    │   ├── trainer.css
    │   └── accordion.css
    └── utils/
        ├── cubeMath.js         # Génération géométrique & algorithme de résolution universel
        └── algoParser.js       # Analyseur d'algorithmes, inversion de mouvements et masquage
```

---

## 🛠️ Stack Technique

| Domaine | Technologies |
|---|---|
| **Core** | [React 19](https://react.dev), [JavaScript ES Modules](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Modules) |
| **3D & Canvas** | [Three.js 0.186](https://threejs.org), [@react-three/fiber](https://r3f.docs.pmnd.rs), [@react-three/drei](https://drei.docs.pmnd.rs) |
| **Gestion d'état** | [Zustand 5](https://zustand.docs.pmnd.rs) |
| **Styling & Design** | [Tailwind CSS 4](https://tailwindcss.com), CSS modulaire, [Lucide React](https://lucide.dev) |
| **Effets** | [canvas-confetti](https://github.com/catdad/canvas-confetti) |
| **Internationalisation** | [i18next](https://www.i18next.com), [react-i18next](https://react.i18next.com) |
| **Tooling & Build** | [Vite 8](https://vite.dev), [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) |

---

## 🚀 Installation & Développement

### Prérequis
- [Node.js](https://nodejs.org) (v18 ou supérieur recommandé)
- `npm`

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/DimiZorgon/cube.git
cd cube

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application est accessible sur [http://localhost:5173](http://localhost:5173).

### Commandes disponibles

```bash
npm run dev      # Démarre le serveur local de développement avec HMR
npm run build    # Génère le bundle de production optimisé dans dist/
npm run preview  # Prévisualise localement le build de production
npm run lint     # Analyse le code avec Oxlint ultra-rapide
```

---

## 📜 Licence

Ce projet est sous licence [MIT](LICENSE).
