import { describe, it, expect } from 'vitest';
import {
  PUZZLE_TYPES,
  generateWcaScramble,
} from '../../src/utils/scrambleGenerator.js';

// Fonction utilitaire de test pour vérifier les règles WCA d'un mélange :
// Nombre exact de mouvements (11, 20, 40 ou 60 selon le cube)
// Pas deux mouvements consécutifs sur la même face (ex: R suivi de R' ou R2)
// Pas de boucle sur un même axe (ex: R L R), car R et L commutent et pourraient s'annuler
function assertValidScramble(scramble, expectedLength) {
  const moves = scramble.split(' ');
  expect(moves).toHaveLength(expectedLength);

  // Retire les modificateurs (' et 2) pour ne garder que la face (ex: "Rw'" -> "Rw", "U2" -> "U")
  const getBase = (move) => move.replace(/['2]/g, '');

  // Détermine l'axe de rotation d'après la première lettre : R/L -> x, U/D -> y, F/B -> z
  const getAxis = (base) =>
    'RL'.includes(base[0]) ? 'x' : 'UD'.includes(base[0]) ? 'y' : 'z';

  for (let i = 1; i < moves.length; i++) {
    const base = getBase(moves[i]);
    const prevBase = getBase(moves[i - 1]);

    // Règle 1 : jamais deux fois la même face de suite
    expect(base).not.toBe(prevBase);

    // Règle 2 : si deux mouvements consécutifs sont sur le même axe (ex: R puis L),
    // le mouvement suivant ne peut pas revenir sur la face précédente (ex: R L R interdit)
    if (i >= 2 && getAxis(base) === getAxis(prevBase)) {
      expect(base).not.toBe(getBase(moves[i - 2]));
    }
  }
}

describe('generateWcaScramble', () => {
  // `it.each` exécute le même test pour chaque ligne du tableau [puzzleId, longueurAttendue].
  // `PUZZLE_TYPES` étant un tableau d'objets, on passe directement les ids ('2x2x2', '3x3x3', etc.).
  it.each([
    ['2x2x2', 11],
    ['3x3x3', 20],
    ['4x4x4', 40],
    ['5x5x5', 60],
  ])('génère un mélange valide pour %s (%i mouvements)', (puzzleId, expectedLength) => {
    const scramble = generateWcaScramble(puzzleId);

    // Le `w` est inclus pour les mouvements larges du 4x4 et 5x5 (Rw, Uw, Fw, etc.)
    expect(scramble).toMatch(/^[UDLRFBw'2 ]+$/);
    assertValidScramble(scramble, expectedLength);
  });

  it('utilise 3x3x3 par défaut si le type de puzzle est inconnu', () => {
    // Dans scrambleGenerator.js, un id inconnu retombe sur PUZZLE_TYPES[1] (3x3x3 -> 20 mouvements)
    const scramble = generateWcaScramble('unsupported');
    expect(scramble).toMatch(/^[UDLRFBw'2 ]+$/);
    assertValidScramble(scramble, PUZZLE_TYPES[1].length);
  });
});
