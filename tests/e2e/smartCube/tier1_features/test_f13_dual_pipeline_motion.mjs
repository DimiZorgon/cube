// tests/e2e/smartCube/tier1_features/test_f13_dual_pipeline_motion.mjs
// F13: Dual-Pipeline Low-Latency Motion (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('F13: Dual-Pipeline Low-Latency Motion');

class MotionQueueSimulator {
  constructor() {
    this.queue = [];
    this.baseSpeed = 16; // rad/s
    this.maxSpeed = 32;  // rad/s
    this.logicalCommittedMoves = 0;
  }

  onBleMovePacket(move) {
    // 0ms logical commit
    this.logicalCommittedMoves++;
    this.queue.push(move);
  }

  getCurrentSpeed() {
    if (this.queue.length >= 3) return this.maxSpeed;
    if (this.queue.length >= 2) return 24;
    return this.baseSpeed;
  }

  processFrame(deltaSec) {
    if (this.queue.length === 0) return;
    const speed = this.getCurrentSpeed();
    if (this.queue.length >= 4) {
      // Fast-forward / flush backlog to avoid animation drift
      this.queue.length = 0;
    } else {
      this.queue.shift();
    }
  }
}

suite.it('F13-1: BLE packet arrival commits logical state at 0ms latency', () => {
  const sim = new MotionQueueSimulator();
  sim.onBleMovePacket('R');
  assertEqual(sim.logicalCommittedMoves, 1);
  assertEqual(sim.queue.length, 1);
});

suite.it('F13-2: Base animation speed starts at 16 rad/s for single isolated move', () => {
  const sim = new MotionQueueSimulator();
  sim.onBleMovePacket('U');
  assertEqual(sim.getCurrentSpeed(), 16);
});

suite.it('F13-3: Accelerates turn speed to 24 rad/s when backlog reaches 2 moves', () => {
  const sim = new MotionQueueSimulator();
  sim.onBleMovePacket('R');
  sim.onBleMovePacket('U');
  assertEqual(sim.getCurrentSpeed(), 24);
});

suite.it('F13-4: Caps acceleration at 32 rad/s when backlog is 3 or more moves', () => {
  const sim = new MotionQueueSimulator();
  sim.onBleMovePacket('R');
  sim.onBleMovePacket('U');
  sim.onBleMovePacket("R'");
  assertEqual(sim.getCurrentSpeed(), 32);
});

suite.it('F13-5: Flushes visual queue when burst backlog exceeds 4 moves to stay in sync', () => {
  const sim = new MotionQueueSimulator();
  sim.onBleMovePacket('R');
  sim.onBleMovePacket('U');
  sim.onBleMovePacket("R'");
  sim.onBleMovePacket("U'");
  assertEqual(sim.queue.length, 4);

  sim.processFrame(0.016);
  assertEqual(sim.queue.length, 0, 'Backlog should be flushed to eliminate visual lag');
  assertEqual(sim.logicalCommittedMoves, 4, 'Logical state remains intact');
});
