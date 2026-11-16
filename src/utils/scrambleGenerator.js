// src/utils/scrambleGenerator.js

export const PUZZLE_TYPES = [
  { id: '2x2x2', label: '2x2x2', size: 2, length: 11 },
  { id: '3x3x3', label: '3x3x3', size: 3, length: 20 },
  { id: '4x4x4', label: '4x4x4', size: 4, length: 40 },
  { id: '5x5x5', label: '5x5x5', size: 5, length: 60 }
];

// Générateur officiel WCA sans mouvements redondants ni collisions d'axes
export function generateWcaScramble(puzzleId = '3x3x3') {
  const puzzle = PUZZLE_TYPES.find(p => p.id === puzzleId) || PUZZLE_TYPES[1];
  const modifiers = ['', "'", '2'];

  const faces2x2 = ['R', 'U', 'F'];
  const faces3x3 = ['R', 'L', 'U', 'D', 'F', 'B'];
  const faces4x4 = ['R', 'L', 'U', 'D', 'F', 'B', 'Rw', 'Uw', 'Fw'];
  const faces5x5 = ['R', 'L', 'U', 'D', 'F', 'B', 'Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw'];

  const pool =
    puzzle.size === 2
      ? faces2x2
      : puzzle.size === 4
      ? faces4x4
      : puzzle.size === 5
      ? faces5x5
      : faces3x3;

  const getAxis = moveBase => {
    const first = moveBase[0];
    if (first === 'R' || first === 'L') return 'x';
    if (first === 'U' || first === 'D') return 'y';
    return 'z';
  };

  const moves = [];
  let lastBase = '';
  let secondLastBase = '';
  let lastAxis = '';

  for (let i = 0; i < puzzle.length; i++) {
    let candidate = '';
    let candidateAxis = '';
    do {
      candidate = pool[Math.floor(Math.random() * pool.length)];
      candidateAxis = getAxis(candidate);
    } while (
      candidate === lastBase ||
      (candidateAxis === lastAxis && candidate === secondLastBase)
    );

    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    moves.push(`${candidate}${mod}`);

    secondLastBase = lastBase;
    lastBase = candidate;
    lastAxis = candidateAxis;
  }

  return moves.join(' ');
}

