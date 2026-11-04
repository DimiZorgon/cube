// tests/e2e/smartCube/helpers/testUtils.mjs
// Lightweight self-contained test runner, assertions, bitstreams, and cube math helpers.

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new AssertionError(message, condition, true);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    const msg = message || `Expected deep equality:\nExpected: ${expectedStr}\nActual:   ${actualStr}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function assertRoughlyEqual(actual, expected, tolerance = 0.001, message) {
  if (Math.abs(actual - expected) > tolerance) {
    const msg = message || `Expected ${actual} to be within ${tolerance} of ${expected}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function assertIncludes(actual, search, message) {
  const ok = typeof actual === 'string'
    ? actual.includes(search)
    : Array.isArray(actual)
      ? actual.includes(search)
      : false;
  if (!ok) {
    const msg = message || `Expected ${JSON.stringify(actual)} to include ${JSON.stringify(search)}`;
    throw new AssertionError(msg, actual, search);
  }
}

function checkThrownError(caught, expectedRegexOrMessage) {
  if (expectedRegexOrMessage) {
    const fullMsg = caught?.name ? `${caught.name}: ${caught.message || ''}` : (caught?.message || String(caught));
    const msg = caught?.message || String(caught);
    if (expectedRegexOrMessage instanceof RegExp) {
      if (!expectedRegexOrMessage.test(fullMsg) && !expectedRegexOrMessage.test(msg)) {
        throw new AssertionError(`Error message "${fullMsg}" did not match pattern ${expectedRegexOrMessage}`, fullMsg, expectedRegexOrMessage.toString());
      }
    } else if (typeof expectedRegexOrMessage === 'string') {
      if (!fullMsg.includes(expectedRegexOrMessage) && !msg.includes(expectedRegexOrMessage)) {
        throw new AssertionError(`Error message "${fullMsg}" did not contain "${expectedRegexOrMessage}"`, fullMsg, expectedRegexOrMessage);
      }
    }
  }
}

export function assertThrows(fn, expectedRegexOrMessage) {
  let threw = false;
  let caught = null;
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.then(
        () => {
          throw new AssertionError('Expected function to throw an error, but it did not', null, 'Error');
        },
        (err) => {
          checkThrownError(err, expectedRegexOrMessage);
        }
      );
    }
  } catch (err) {
    threw = true;
    caught = err;
  }

  if (!threw) {
    throw new AssertionError('Expected function to throw an error, but it did not', null, 'Error');
  }
  checkThrownError(caught, expectedRegexOrMessage);
}

// -------------------------------------------------------------
// BitStream Utilities (Big-Endian & Little-Endian word extraction)
// -------------------------------------------------------------
export class BitReader {
  constructor(buffer) {
    this.buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  }

  getBitWord(offset, length, littleEndian = false) {
    let val = 0;
    if (littleEndian) {
      for (let i = 0; i < length; i++) {
        const bitIdx = offset + i;
        const byteIdx = Math.floor(bitIdx / 8);
        const bitInByte = bitIdx % 8;
        const bit = (this.buf[byteIdx] >> bitInByte) & 1;
        val |= (bit << i);
      }
    } else {
      for (let i = 0; i < length; i++) {
        const bitIdx = offset + i;
        const byteIdx = Math.floor(bitIdx / 8);
        const bitInByte = 7 - (bitIdx % 8);
        const bit = (this.buf[byteIdx] >> bitInByte) & 1;
        val = (val << 1) | bit;
      }
    }
    return val;
  }
}

export class BitWriter {
  constructor(lengthBytes = 20) {
    this.buf = new Uint8Array(lengthBytes);
  }

  setBitWord(offset, length, value, littleEndian = false) {
    if (littleEndian) {
      for (let i = 0; i < length; i++) {
        const bitIdx = offset + i;
        const byteIdx = Math.floor(bitIdx / 8);
        const bitInByte = bitIdx % 8;
        const bit = (value >> i) & 1;
        if (bit) {
          this.buf[byteIdx] |= (1 << bitInByte);
        } else {
          this.buf[byteIdx] &= ~(1 << bitInByte);
        }
      }
    } else {
      for (let i = 0; i < length; i++) {
        const bitIdx = offset + i;
        const byteIdx = Math.floor(bitIdx / 8);
        const bitInByte = 7 - (bitIdx % 8);
        const bit = (value >> (length - 1 - i)) & 1;
        if (bit) {
          this.buf[byteIdx] |= (1 << bitInByte);
        } else {
          this.buf[byteIdx] &= ~(1 << bitInByte);
        }
      }
    }
  }

  toUint8Array() {
    return new Uint8Array(this.buf);
  }
}

// -------------------------------------------------------------
// Facelet Model & Solved State Helpers
// Standard Kociemba 54-facelet representation:
// U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
// -------------------------------------------------------------
export const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

export function isFaceletsSolved(faceletString) {
  if (!faceletString || faceletString.length !== 54) return false;
  for (let face = 0; face < 6; face++) {
    const start = face * 9;
    const centerChar = faceletString[start + 4];
    for (let i = 0; i < 9; i++) {
      if (faceletString[start + i] !== centerChar) {
        return false;
      }
    }
  }
  return true;
}

// Minimal Rubik's Cube Facelet Move Simulator for Testing
export class CubeStateSimulator {
  constructor(facelets = SOLVED_FACELETS) {
    this.facelets = facelets.split('');
  }

  applyMove(moveNotation) {
    const move = moveNotation.trim();
    if (!move) return;
    const face = move[0];
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");
    const turns = isDouble ? 2 : isPrime ? 3 : 1;

    for (let t = 0; t < turns; t++) {
      this._applyQuarterTurn(face);
    }
  }

  applyMoves(moveList) {
    const moves = Array.isArray(moveList) ? moveList : moveList.split(/\s+/).filter(Boolean);
    for (const m of moves) {
      this.applyMove(m);
    }
  }

  getFaceletString() {
    return this.facelets.join('');
  }

  isSolved() {
    return isFaceletsSolved(this.getFaceletString());
  }

  _rotateFaceCW(offset) {
    const f = this.facelets;
    const [c0, c1, c2, c3, c4, c5, c6, c7, c8] = [
      f[offset], f[offset + 1], f[offset + 2],
      f[offset + 3], f[offset + 4], f[offset + 5],
      f[offset + 6], f[offset + 7], f[offset + 8],
    ];
    f[offset] = c6; f[offset + 1] = c3; f[offset + 2] = c0;
    f[offset + 3] = c7; f[offset + 4] = c4; f[offset + 5] = c1;
    f[offset + 6] = c8; f[offset + 7] = c5; f[offset + 8] = c2;
  }

  _applyQuarterTurn(face) {
    const f = this.facelets;
    // Indices: U: 0-8, R: 9-17, F: 18-26, D: 27-35, L: 36-44, B: 45-53
    if (face === 'U') {
      this._rotateFaceCW(0);
      const tmp = [f[18], f[19], f[20]]; // F top
      f[18] = f[9];  f[19] = f[10]; f[20] = f[11]; // F <- R
      f[9]  = f[45]; f[10] = f[46]; f[11] = f[47]; // R <- B
      f[45] = f[36]; f[46] = f[37]; f[47] = f[38]; // B <- L
      f[36] = tmp[0]; f[37] = tmp[1]; f[38] = tmp[2]; // L <- F
    } else if (face === 'D') {
      this._rotateFaceCW(27);
      const tmp = [f[24], f[25], f[26]]; // F bot
      f[24] = f[42]; f[25] = f[43]; f[26] = f[44]; // F <- L
      f[42] = f[51]; f[43] = f[52]; f[44] = f[53]; // L <- B
      f[51] = f[15]; f[52] = f[16]; f[53] = f[17]; // B <- R
      f[15] = tmp[0]; f[16] = tmp[1]; f[17] = tmp[2]; // R <- F
    } else if (face === 'R') {
      this._rotateFaceCW(9);
      const tmp = [f[2], f[5], f[8]]; // U right
      f[2] = f[20]; f[5] = f[23]; f[8] = f[26]; // U <- F
      f[20] = f[29]; f[23] = f[32]; f[26] = f[35]; // F <- D
      f[29] = f[51]; f[32] = f[48]; f[35] = f[45]; // D <- B (inverted)
      f[51] = tmp[0]; f[48] = tmp[1]; f[45] = tmp[2]; // B <- U (inverted)
    } else if (face === 'L') {
      this._rotateFaceCW(36);
      const tmp = [f[0], f[3], f[6]]; // U left
      f[0] = f[53]; f[3] = f[50]; f[6] = f[47]; // U <- B
      f[53] = f[27]; f[50] = f[30]; f[47] = f[33]; // B <- D
      f[27] = f[18]; f[30] = f[21]; f[33] = f[24]; // D <- F
      f[18] = tmp[0]; f[21] = tmp[1]; f[24] = tmp[2]; // F <- U
    } else if (face === 'F') {
      this._rotateFaceCW(18);
      const tmp = [f[6], f[7], f[8]]; // U bot
      f[6] = f[44]; f[7] = f[41]; f[8] = f[38]; // U <- L
      f[44] = f[27]; f[41] = f[28]; f[38] = f[29]; // L <- D
      f[27] = f[11]; f[28] = f[14]; f[29] = f[17]; // D <- R
      f[11] = tmp[0]; f[14] = tmp[1]; f[17] = tmp[2]; // R <- U
    } else if (face === 'B') {
      this._rotateFaceCW(45);
      const tmp = [f[0], f[1], f[2]]; // U top
      f[0] = f[9];  f[1] = f[12]; f[2] = f[15]; // U <- R
      f[9] = f[35]; f[12] = f[34]; f[15] = f[33]; // R <- D
      f[35] = f[42]; f[34] = f[39]; f[33] = f[36]; // D <- L
      f[42] = tmp[0]; f[39] = tmp[1]; f[36] = tmp[2]; // L <- U
    }
  }
}

// -------------------------------------------------------------
// Test Context Runner for Standalone File Execution
// -------------------------------------------------------------
export function createTestSuite(suiteName) {
  const tests = [];
  let beforeAllHooks = [];
  let afterAllHooks = [];
  let beforeEachHooks = [];
  let afterEachHooks = [];

  const suite = {
    name: suiteName,
    beforeAll(fn) { beforeAllHooks.push(fn); },
    afterAll(fn) { afterAllHooks.push(fn); },
    beforeEach(fn) { beforeEachHooks.push(fn); },
    afterEach(fn) { afterEachHooks.push(fn); },
    it(name, testFn) {
      tests.push({ name, fn: testFn });
    },
    async run() {
      const results = {
        suiteName,
        passed: 0,
        failed: 0,
        skipped: 0,
        total: tests.length,
        errors: [],
        durationMs: 0
      };

      const start = Date.now();
      for (const hook of beforeAllHooks) {
        await hook();
      }

      for (const test of tests) {
        for (const hook of beforeEachHooks) {
          await hook();
        }

        try {
          await test.fn();
          results.passed++;
        } catch (err) {
          if (err?.message?.startsWith('SKIP:')) {
            results.skipped++;
          } else {
            results.failed++;
            results.errors.push({ testName: test.name, error: err });
          }
        }

        for (const hook of afterEachHooks) {
          await hook();
        }
      }

      for (const hook of afterAllHooks) {
        await hook();
      }

      results.durationMs = Date.now() - start;
      return results;
    }
  };

  return suite;
}
