// src/pages/lazyViews.js
// Vues métier (méthodes chargées directement pour éviter tout échec de chunk réseau → 404,
// simulateurs 3D chargés à la demande avec récupération automatique).
import { lazy } from 'react';
import { MethodeSimple2x2 } from '../components/algos/MethodeSimple2x2';
import { MethodeOrtega2x2 } from '../components/algos/MethodeOrtega2x2';
import { MethodeSimple3x3 } from '../components/algos/MethodeSimple3x3';
import { MethodeCFOP3x3 } from '../components/algos/MethodeCFOP3x3';
import { MethodeBlind3x3 } from '../components/algos/MethodeBlind3x3';
import { MethodeSimple4x4 } from '../components/algos/MethodeSimple4x4';
import { MethodeYau4x4 } from '../components/algos/MethodeYau4x4';
import { MethodeProfessor5x5 } from '../components/algos/MethodeProfessor5x5';

const named = (loader, name) =>
  lazy(() =>
    loader()
      .then(m => ({ default: m[name] }))
      .catch(err => {
        if (typeof window !== 'undefined' && !sessionStorage.getItem('chunk_reload_tried')) {
          sessionStorage.setItem('chunk_reload_tried', '1');
          window.location.reload();
        }
        throw err;
      })
  );

export const GAME_VIEWS = {
  '2x2': named(() => import('../components/Cube2x2'), 'Cube2x2'),
  '3x3': named(() => import('../components/Cube3x3'), 'Cube3x3'),
  '4x4': named(() => import('../components/Cube4x4'), 'Cube4x4'),
  '5x5': named(() => import('../components/Cube5x5'), 'Cube5x5')
};

export const SpeedTimer = named(() => import('../components/SpeedTimer'), 'SpeedTimer');
export const SettingsPage = named(() => import('../components/SettingsPage'), 'SettingsPage');
export const TrainingRoute = named(() => import('./TrainingRoute'), 'TrainingRoute');
export const SmartCubePage = named(() => import('./SmartCubePage'), 'SmartCubePage');

/** Clé de méthode (routeConfig.METHODS[].key) → composant du guide. */
export const METHOD_VIEWS = {
  simple2x2: MethodeSimple2x2,
  ortega2x2: MethodeOrtega2x2,
  simple3x3: MethodeSimple3x3,
  cfop3x3: MethodeCFOP3x3,
  blind3x3: MethodeBlind3x3,
  simple4x4: MethodeSimple4x4,
  yau4x4: MethodeYau4x4,
  professor5x5: MethodeProfessor5x5
};

