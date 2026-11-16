# 🧊 Cube Studio — 3D Rubik's Cube & Speedcubing Platform

Plateforme web moderne de simulation 3D de Rubik's Cube, hub d'apprentissage méthodique et chronomètre de speedcubing conforme aux standards WCA.

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-0.186-black?logo=three.js)](https://threejs.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-764ABC)](https://zustand.docs.pmnd.rs)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![WCA Scrambles](https://img.shields.io/badge/WCA-Compliant-blue)](#-chronomètre-speedcubing-wca)

---

## 📌 Sommaire

- [Aperçu & Architecture](#-architecture-du-système)
- [Fonctionnalités Principales](#-fonctionnalités-clés)
- [Guides de Résolution](#-guides-de-résolution--algorithmes)
- [Personnalisation](#-personnalisation--paramètres)
- [Contrôles & Raccourcis](#-contrôles--raccourcis)
- [Stack Technique](#-stack-technique)
- [Installation & Démarrage](#-installation--démarrage)
- [Licence](#-licence)

---

## 📐 Architecture du Système

Vue d'ensemble des flux de données, composants 3D et magasins d'état de l'application :

<p align="center">
  <img src="cube_diagram.png" alt="Architecture Cube Studio" width="100%" style="border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);" />
</p>

### Structure Modulaire

```text
cube/
├── en/                         # Point d'entrée statique anglais (SEO / hreflang)
├── index.html                  # Point d'entrée statique français
├── vite.config.js              # Build multi-pages & optimisation des bundles
└── src/
    ├── main.jsx                # Bootstrap React & configuration i18next
    ├── App.jsx                 # Point d'entrée RouterProvider
    ├── router.jsx              # Table des routes React Router v7 (FR et /en)
    ├── routes/                 # Configuration d'URL, SEO par page et résolution des cas
    ├── pages/                  # Pages et wrappers de routes chargés à la demande
    ├── store/
    │   ├── useCubeStore.js     # État du cube 3D (cubies, rotation active, file, validation)
    │   └── useSettingsStore.js # Configuration utilisateur persistante (thème, vitesse, échelle)
    ├── components/
    │   ├── RubiksCube.jsx      # Moteur de rendu 3D Three.js & contrôles gestuels tactiles
    │   ├── Cubie.jsx           # Modèle 3D géométrique unitaire (faces, biseaux, matériaux)
    │   ├── CubeGame.jsx        # Logique de jeu unifiée (mélange, timer, détection de victoire)
    │   ├── SettingsPage.jsx    # Interface complète de réglages graphiques et gameplay
    │   ├── SpeedTimer.jsx      # Chronomètre officiel, calcul des moyennes et export
    │   ├── CameraMapper.jsx    # Calcul trigonométrique d'orientation vue/commandes
    │   └── algos/              # Simulateurs 3D et fiches théoriques pas à pas
    ├── data/                   # Définitions des cas (CFOP, Ortega, Yau, Blindfolded, etc.)
    ├── i18n/                   # Dictionnaires FR/EN et adaptateurs de localisation
    └── utils/
        ├── cubeMath.js         # Algèbre géométrique 3D, quaternion et validateurs
        └── algoParser.js       # Parseur de notation standard WCA et générateurs d'états
```

---

## ⚡ Fonctionnalités Clés

### 🎲 Simulateur 3D Multi-Puzzles (2x2, 3x3, 4x4)
- **Rendu Three.js optimisé** : Géométrie modulaire, cubies biseautés réalistes, masquage automatique des cœurs internes pour des performances optimales (60 FPS constants).
- **Notation WCA complète** :
  - Mouvements simples : `R, L, U, D, F, B` et inverses (`'`).
  - Tranches internes : `M`.
  - Mouvements larges (*wide moves*) : `Rw, Lw, Uw, Dw, Fw, Bw`.
  - Doubles rotations : index `2`.
- **Contrôles tactiles & gestuels avancés** :
  - Détection intuitive de glisser-déposer sur les facettes 3D.
  - Boutons de commande à l'écran avec gestion d'appui long (500 ms) pour les wide moves.
  - Prise en charge multi-touch optimisée pour grands formats (4x4).
- **Caméra intelligente** :
  - *Dynamic View Mapping* : recalcul instantané de l'action des boutons selon l'angle de la caméra.
  - *Magnetic Snap* : recentrage automatique sur la face la plus proche après rotation libre.
  - *Verrouillage d'axe* : mode rotation horizontale dédiée pour un confort de jeu accru.
- **Moteur de jeu** :
  - Chronomètre de résolution intégré au centième de seconde.
  - Générateur de mélange intelligent sans redondance.
  - Détection automatique d'état résolu avec animation de confettis.
  - Sauvegarde locale du record personnel (*PB*) pour chaque format de cube.

---

### 🎨 Personnalisation & Paramètres
- **Gestionnaire de styles visuels** :
  - **Préréglages de couleurs** : Palette WCA Officielle, Thème Pastel, Thème Néon contrasté.
  - **Personnalisation fine** : Sélecteur hexadécimal couleur par couleur pour chaque face (`U, D, F, B, R, L`).
- **Options de rendu** :
  - Mode structure creuse (*Hollow Cube*) pour inspecter les pièces internes.
  - Ajustement de l'échelle d'affichage du cube (`0.8x` à `1.3x`).
  - Vitesse de rotation des tranches réglable de ultra-rapide à décomposition lente.
- **Persistance intégrale** : Tous les réglages sont sauvegardés automatiquement dans `localStorage` via Zustand.

---

### ⏱️ Chronomètre Speedcubing WCA
- **Générateur WCA certifié** : Scrambles pseudo-aléatoires sans mouvements inverses successifs (2x2 : 11 coups, 3x3 : 20 coups, 4x4 : 40 coups).
- **Phase d'inspection WCA 15s** : Avertissements sonores et visuels avec pénalités réglementaires (+2s à 15s, DNF au-delà de 17s).
- **Visualiseur 2D du mélange** : Patron déplié complet permettant la vérification physique du cube avant résolution.
- **Statistiques de session** : Calcul en temps réel des métriques WCA : Single, Best, **ao5** (moyenne élaguée sur 5), **ao12** et moyenne globale.
- **Export & Intégration** :
  - Export compatible csTimer (format JSON).
  - Copie instantanée du résumé de session dans le presse-papier.

---

## 📖 Guides de Résolution & Algorithmes

7 méthodes complètes documentées avec visualisation 3D pas à pas et suivi de progression :

| Puzzle | Méthode | Niveau | Contenu & Algorithmes |
|:---:|:---|:---:|:---|
| **2x2** | **Méthode Débutant** | Débutant | Résolution couche par couche intuitive en 3 étapes. |
| **2x2** | **Méthode Ortega** | Intermédiaire | Première face, OLL 2x2, puis PBL (*Permutation of Both Layers*). |
| **3x3** | **Méthode Débutant (LBL)** | Débutant | Croix blanche, coins première couche, arêtes deuxième couche, croix et orientation finale. |
| **3x3** | **CFOP / Fridrich** | Avancé | Bibliothèque complète : Cross, 41 cas F2L, 57 cas OLL, 21 cas PLL. |
| **3x3** | **Blindfolded (À l'aveugle)** | Expert | Old Pochmann (coins), M2 (arêtes), patron Speffz interactif cliquable et gestion des parités. |
| **4x4** | **Méthode Débutant** | Intermédiaire | Résolution des 6 centres, regroupement des arêtes par paires et parités OLL/PLL. |
| **4x4** | **Méthode Yau** | Avancé | Centres opposés, 3 arêtes de croix initiale, centres restants, réduction 3x3 et résolution rapide. |

### Lecteur 3D d'Algorithmes (`AlgoDemoModal`)
- **Animation pas à pas** : Lecture automatique avec pause, marche avant, marche arrière et réinitialisation.
- **Bouton « Tester en jeu »** : Injecte instantanément la situation de l'algorithme directement dans le simulateur 3D interactif pour mise en pratique immédiate.
- **Schémas vectoriels 2D** : Vues d'orientation et de permutation avec codes couleurs harmonisés.
- **Suivi d'apprentissage** : Sauvegarde locale de l'état d'apprentissage pour chaque algorithme.

---

## 🎮 Contrôles & Raccourcis

### Clavier

| Touche | Action normale | Avec `Shift` (Inverse `'`) |
|:---:|:---|:---|
| <kbd>R</kbd> | Face Droite horaire | Face Droite anti-horaire |
| <kbd>L</kbd> | Face Gauche horaire | Face Gauche anti-horaire |
| <kbd>U</kbd> | Face Haute horaire | Face Haute anti-horaire |
| <kbd>D</kbd> | Face Basse horaire | Face Basse anti-horaire |
| <kbd>F</kbd> | Face Avant horaire | Face Avant anti-horaire |
| <kbd>B</kbd> | Face Arrière horaire | Face Arrière anti-horaire |
| <kbd>M</kbd> | Tranche centrale (3x3) | Tranche centrale inverse |
| <kbd>X</kbd>, <kbd>Y</kbd>, <kbd>Z</kbd> | Rotation globale du cube | Rotation globale inverse |

### Souris & Tactile

| Action | Geste |
|:---|:---|
| **Tourner la caméra** | Clic gauche / Glisser sur le fond |
| **Tourner une tranche** | Glisser sur une pièce 3D ou clic sur bouton HUD |
| **Tranche large (*Wide Move*)** | Clic prolongé (>500 ms) sur un bouton HUD |
| **Snap magnétique** | Relâcher la vue pour aligner la caméra sur la face la plus proche |
| **Verrouillage horizontal** | Commutateur 🔒 / 🔓 dans la barre d'outils supérieure |

---

## 💻 Stack Technique

- **Front-End** : [React 19](https://react.dev), [JSX](https://react.dev/learn/writing-markup-with-jsx), [ES Modules](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Modules)
- **Moteur 3D** : [Three.js](https://threejs.org), [@react-three/fiber](https://r3f.docs.pmnd.rs), [@react-three/drei](https://drei.docs.pmnd.rs)
- **Gestion d'état** : [Zustand 5](https://zustand.docs.pmnd.rs) (avec persistance `localStorage`)
- **Styles & Design** : [Tailwind CSS 4](https://tailwindcss.com), CSS modulaire, [@getpapillon/papicons](https://github.com/thepapillonapp/papicons)
- **Internationalisation** : [i18next](https://www.i18next.com) & [react-i18next](https://react.i18next.com) (FR / EN)
- **Outillage de build** : [Vite 8](https://vite.dev), [Oxlint](https://oxc.rs)

---

## 🚀 Installation & Démarrage

### Prérequis
- [Node.js](https://nodejs.org) >= 18.0.0
- `npm`

### Installation

```bash
# 1. Cloner le projet
git clone https://github.com/DimiZorgon/cube.git
cd cube

# 2. Installer les dépendances
npm install

# 3. Démarrer le serveur de développement
npm run dev
```

Rendez-vous sur [http://localhost:5173](http://localhost:5173).

### Scripts Disponibles

```bash
npm run dev       # Serveur de développement avec Hot Module Replacement (HMR)
npm run build     # Compilation de production optimisée dans le dossier dist/
npm run preview   # Prévisualisation locale du build de production
npm run lint      # Analyse statique du code avec Oxlint
```

---

### Déploiement Nginx

Le script `npm run build` pré-génère un fichier `.html` par route indexable (FR et `/en`) ainsi que `dist/sitemap.xml`. Pour servir ces pages et assurer le repli SPA sur les routes dynamiques (`/algos/:size/:method/test/:caseId`), utilisez la configuration fournie dans [`deploy/nginx.conf.example`](deploy/nginx.conf.example) :

```nginx
location = /en { return 301 /en/; }
location /en/  { try_files $uri $uri.html /en/index.html; }
location /     { try_files $uri $uri.html /index.html; }
```

---

## 📄 Licence

Projet distribué sous licence [MIT](LICENSE).
