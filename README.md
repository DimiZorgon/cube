# 🧊 Rubik's Cube 3D

Simulateur de Rubik's Cube 3D interactif dans le navigateur, construit avec React et Three.js.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.186-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)

---

## ✨ Fonctionnalités

- 🎲 **Cube 3D réaliste** — 27 cubies avec couleurs standard (blanc, jaune, rouge, orange, vert, bleu)
- 🔄 **Notation officielle** — R, L, U, D, F, B + prime (') pour les mouvements inverses
- 🖐️ **Wide moves** — Appui long (500ms) pour tourner 2 tranches (r, l, u, d, f, b)
- 🧭 **Mouvements relatifs à la caméra** — Les boutons s'adaptent à l'angle de vue
- 🧲 **Snap magnétique** — La caméra s'aligne automatiquement au lâcher de souris
- 🔒 **Mode verrouillé** — Rotation horizontale uniquement pour se concentrer
- ⏱️ **Chronomètre** — Timer au centième, démarre automatiquement au premier mouvement
- 🏆 **High Score** — Meilleur temps sauvegardé localement
- 🎉 **Confetti** — Animation de victoire quand le cube est résolu
- 📱 **Responsive** — Adapté mobile et desktop
- 🔀 **Shuffle** — Mélange aléatoire intelligent (évite les annulations)

---

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/DimiZorgon/cube.git
cd cube

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173) dans le navigateur.

### Autres commandes

```bash
npm run build    # Build de production
npm run preview  # Prévisualiser le build
npm run lint     # Linter (oxlint)
```

---

## 🎮 Contrôles

### Mouvements du cube

| Bouton | Action | Appui long |
|--------|--------|------------|
| **R** / **R'** | Face droite (horaire / anti-horaire) | Wide move (r / r') |
| **L** / **L'** | Face gauche | Wide move (l / l') |
| **U** / **U'** | Face haute | Wide move (u / u') |
| **D** / **D'** | Face basse | Wide move (d / d') |
| **F** / **F'** | Face avant | Wide move (f / f') |
| **B** / **B'** | Face arrière | Wide move (b / b') |
| **M** / **M'** | Tranche du milieu | — |

### Caméra

| Action | Contrôle |
|--------|----------|
| **Rotation libre** | Clic + glisser sur le canvas |
| **Verrouiller** | Bouton 🔒 (rotation horizontale uniquement) |
| **Snap** | Relâcher la souris → alignement automatique |

---

## 🏗️ Architecture

```
src/
├── main.jsx                     # Point d'entrée
├── App.jsx                      # UI principale, timer, contrôles
├── index.css                    # Styles globaux
├── components/
│   ├── Cubie.jsx                # Rendu 3D d'un cubie (6 faces colorées)
│   ├── RubiksCube.jsx           # Orchestrateur des animations de rotation
│   ├── CameraMapper.jsx         # Mapping caméra → axes cube + snap magnétique
│   └── LockCamera.jsx           # Contrôle caméra verrouillée
└── store/
    └── useCubeStore.js           # État global (Zustand) : cubies, rotations, résolution
```

### Flux de données

```
Bouton cliqué → handleMove() → startRotation() [store]
    → activeRotation mise à jour
    → RubiksCube.useFrame() anime la rotation
    → commitRotation() applique la transformation 3D
    → checkIsSolved() vérifie si le cube est résolu
    → Si file d'attente non vide → rotation suivante
```

---

## 🛠️ Stack Technique

| Technologie | Rôle |
|-------------|------|
| [React](https://react.dev) | Interface utilisateur |
| [Three.js](https://threejs.org) | Rendu 3D |
| [React Three Fiber](https://r3f.docs.pmnd.rs) | Pont React ↔ Three.js |
| [Drei](https://drei.docs.pmnd.rs) | Helpers 3D (TrackballControls, OrbitControls) |
| [Zustand](https://zustand.docs.pmnd.rs) | Gestion d'état |
| [Vite](https://vite.dev) | Build tool |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | Animation victoire |

---

## 📜 Licence

MIT
