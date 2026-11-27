---
title: "Cube Studio · Simulateur 3D, Smart Cube & Guides WCA"
date: 2026-09-24
description: "Plateforme interactive de speedcubing en 3D (2x2 à 5x5) avec historique complet des solves, chronomètre WCA façon csTimer, Smart Cube GAN Bluetooth (analyse CFOP, replay 3D, exports) et guides interactifs d'algorithmes (CFOP, Ortega, Yau, Blindfolded)."
stack:
  - React
  - Three.js
  - Tailwind CSS
  - Zustand
  - Vite
  - Web Bluetooth
category: Développement Web
featured: true
github: 'https://github.com/DimiZorgon/cube'
website: 'https://cube.noullez.com'
images:
  - '/images/projets/cube/menus.gif'
  - '/images/projets/cube/algos.gif'
---

## Contexte

Création d'une plateforme complète de speedcubing interactive en 3D dans le navigateur. Le projet combine un simulateur multi-cubes, un chronomètre WCA de compétition conforme aux standards csTimer, la connexion d'un cube Bluetooth GAN (Smart Cube) avec analyse détaillée de chaque résolution, et des modules d'apprentissage visuels couvrant les méthodes débutantes et expertes. L'interface est pensée mobile-first.

## Fonctionnalités Clés

- **Simulateurs Multi-cubes (2x2 à 5x5)** : Mouvements simples, larges et tranches avec contrôles clavier/boutons/swipe tactile, gestion des centres et des cas de parité sur 4x4/5x5, mélanges WCA officiels et chronomètre haute précision (`performance.now()`).
- **Historique Virtual Cube Complet** : Chaque résolution est enregistrée par taille de cube (temps, mélange, séquence complète, **HTM / STM**, TPS, pénalités +2/DNF), avec statistiques (PB, mo3, ao5, ao12), détail du solve et export JSON/CSV.
- **Smart Cube GAN 16 ui (Web Bluetooth)** : Synchronisation 3D en temps réel (gyroscope), guide de mélange pas à pas, inspection WCA 15s et chrono automatique, batterie et reconnexion par adresse MAC.
- **Analyse CFOP Détaillée** : Découpage automatique Cross / F2L (4 paires, croix color-neutral sur les 6 faces) / OLL / PLL avec temps, coups et TPS par phase, séparation **reconnaissance vs exécution**, détection des pauses et des **regrips** (gyroscope), horodatage matériel précis des mouvements et suivi des paquets perdus.
- **Replay 3D des Solves** : Lecteur isolé en bas de la fiche détail d'un solve (play/pause, vitesses 0.25x à 2x, pas-à-pas, temps réel ou cadence uniforme), timeline CFOP cliquable et reconstruction annotée (`// Cross`, `// F2L 1-4`, `// OLL`, `// PLL`) copiable.
- **Statistiques & Exports Smart Cube** : mo3, ao5, ao12, **ao50, ao100** (élagage WCA), courbe d'évolution, distribution des temps, carte de record (PB) et exports **JSON complet, CSV analytique et csTimer**.
- **Chronomètre WCA (Mode csTimer)** : Prise en main conforme csTimer (maintien espace/tactile), calculs officiels des moyennes élaguées (mo3, ao5, ao12, ao50, ao100), aperçu 2D du patron de mélange et export JSON compatible csTimer.
- **Guides d'Algorithmes & Démo 3D** : Répertoires interactifs (Simple 2x2/3x3/4x4, Ortega, CFOP avec 119 cas, Yau, Professor 5x5, Blindfolded Speffz) dotés d'un lecteur 3D pas-à-pas, d'un quiz de reconnaissance et du test direct sur le cube ou sur le Smart Cube.
- **Internationalisation Bilingue (FR / EN)** : Expérience entièrement traduite avec bascule dynamique sans rechargement.

## Défis Techniques

- **Mathématiques 3D et Vecteurs d'Orientation** : Vérification d'état et détection de résolution par projection de vecteurs directionnels afin d'éviter le verrouillage cardan (gimbal lock).
- **Protocole Bluetooth GAN** : Décodage et déchiffrement AES des trames (mouvements multiples, gyroscope, facelets, batterie), gestion des particularités Windows BLE/GATT et résolution de l'horloge interne 32 bits du cube.
- **Moteur de Détection CFOP** : Simulateur de cube par facelets avec progression de phase strictement monotone, gestion des skips OLL/PLL et détection des paires F2L quelle que soit la face de croix.
- **Notation Canonique & Métriques** : Conversion de tout mouvement 3D (face, large, tranche, rotation) en notation standard, fusion/annulation des tours et calcul HTM/STM fiable de 2x2 à 5x5.
- **Replay Isolé & Persistance Robuste** : Lecteur 3D indépendant du cube live, seek instantané, sauvegarde `localStorage` avec protection contre les dépassements de quota.
- **Optimisation Bundle & Code-Splitting** : Isolation des dépendances lourdes (Three.js) dans des chunks distincts et chargement différé (*React.lazy* + *Suspense*) réduisant drastiquement le bundle initial.
- **Architecture Modulaire** : Découplage strict de la logique d'animation et de l'état du puzzle via *Zustand*, intégré dans une charte graphique sombre épurée avec *Tailwind CSS*.
