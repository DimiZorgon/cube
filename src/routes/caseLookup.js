// src/routes/caseLookup.js
// Retrouve un cas d'algorithme à partir de la méthode et de son id (route /algos/:size/:method/test/:caseId).
import { SIMPLE_2X2_STEPS } from '../data/simple2x2Data.js';
import { ORTEGA_DATA } from '../data/ortegaData.js';
import { SIMPLE_3X3_STEPS } from '../data/simple3x3Data.js';
import { CFOP_DATA } from '../data/cfopData.js';
import { BLD_CORE_CASES, EDGE_SETUPS, CORNER_SETUPS } from '../data/blind3x3Data.js';
import { SIMPLE_4X4_STEPS } from '../data/simple4x4Data.js';
import { YAU_DATA } from '../data/yau4x4Data.js';
import { PROFESSOR_DATA } from '../data/professor5x5Data.js';

const fromSteps = steps =>
  steps.flatMap(step => (step.cases || []).map(item => ({ item, sectionId: null })));

const fromGroups = groups =>
  groups.flatMap(group => group.cases.map(item => ({ item, sectionId: group.section })));

// Ordre CFOP : sections « complètes » d'abord, pour que pll_t renvoie vers PLL plutôt que 2-LOOK PLL
// (la section d'origine exacte est transmise via le state de navigation quand elle est connue).
const CFOP_LOOKUP_ORDER = ['F2L', 'OLL', 'PLL', '2-LOOK OLL', '2-LOOK PLL'];

const SOURCES = {
  simple2x2: () => fromSteps(SIMPLE_2X2_STEPS),
  ortega2x2: () => fromGroups(ORTEGA_DATA),
  simple3x3: () => fromSteps(SIMPLE_3X3_STEPS),
  cfop3x3: () =>
    CFOP_LOOKUP_ORDER.flatMap(sectionId =>
      (CFOP_DATA[sectionId] || []).flatMap(group =>
        group.cases.map(item => ({ item, sectionId }))
      )
    ),
  blind3x3: () => [
    ...BLD_CORE_CASES.map(item => ({ item, sectionId: 'CORE_ALGOS' })),
    ...EDGE_SETUPS.filter(item => item.role !== 'buffer').map(item => ({ item, sectionId: 'EDGES_SETUP' })),
    ...CORNER_SETUPS.filter(item => item.role !== 'buffer').map(item => ({ item, sectionId: 'CORNERS_SETUP' }))
  ],
  simple4x4: () => fromSteps(SIMPLE_4X4_STEPS),
  yau4x4: () => fromGroups(YAU_DATA),
  professor5x5: () => fromGroups(PROFESSOR_DATA)
};

/**
 * @returns {{ item: object, sectionId: string|null } | null}
 */
export function findCase(methodKey, caseId) {
  const source = SOURCES[methodKey];
  if (!source) return null;
  return source().find(entry => entry.item.id === caseId) || null;
}
