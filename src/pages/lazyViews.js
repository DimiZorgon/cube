// src/pages/lazyViews.js
// Vues métier chargées à la demande (code splitting conservé par rapport à l'ancien App.jsx).
import { lazy } from 'react';

const named = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })));

export const GAME_VIEWS = {
  '2x2': named(() => import('../components/Cube2x2'), 'Cube2x2'),
  '3x3': named(() => import('../components/Cube3x3'), 'Cube3x3'),
  '4x4': named(() => import('../components/Cube4x4'), 'Cube4x4')
};

export const SpeedTimer = named(() => import('../components/SpeedTimer'), 'SpeedTimer');
export const SettingsPage = named(() => import('../components/SettingsPage'), 'SettingsPage');
export const TrainingRoute = named(() => import('./TrainingRoute'), 'TrainingRoute');

/** Clé de méthode (routeConfig.METHODS[].key) → composant du guide. */
export const METHOD_VIEWS = {
  simple2x2: named(() => import('../components/algos/MethodeSimple2x2'), 'MethodeSimple2x2'),
  ortega2x2: named(() => import('../components/algos/MethodeOrtega2x2'), 'MethodeOrtega2x2'),
  simple3x3: named(() => import('../components/algos/MethodeSimple3x3'), 'MethodeSimple3x3'),
  cfop3x3: named(() => import('../components/algos/MethodeCFOP3x3'), 'MethodeCFOP3x3'),
  blind3x3: named(() => import('../components/algos/MethodeBlind3x3'), 'MethodeBlind3x3'),
  simple4x4: named(() => import('../components/algos/MethodeSimple4x4'), 'MethodeSimple4x4'),
  yau4x4: named(() => import('../components/algos/MethodeYau4x4'), 'MethodeYau4x4')
};

