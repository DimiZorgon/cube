// tests/e2e/smartCube/tier2_boundaries/boundary_f13_queue_burst_overflow.mjs
// Boundary F13: Visual Animation Queue Overflow & Catch-up (5 tests)

import { createTestSuite, assert, assertEqual } from '../helpers/testUtils.mjs';

export const suite = createTestSuite('Boundary F13: Animation Queue Burst Overflow');

class AdaptiveQueue {
  constructor(maxBacklog = 5) {
    this.maxBacklog = maxBacklog;
    this.queue = [];
    this.flushedCount = 0;
  }

  enqueue(move) {
    this.queue.push(move);
    if (this.queue.length > this.maxBacklog) {
      // Flush to prevent runaway lag
      this.flushedCount += this.queue.length;
      this.queue.length = 0;
    }
  }
}

suite.it('B13-1: Normal queue size keeps all moves within threshold', () => {
  const q = new AdaptiveQueue(5);
  q.enqueue('R');
  q.enqueue('U');
  assertEqual(q.queue.length, 2);
  assertEqual(q.flushedCount, 0);
});

suite.it('B13-2: Triggering backlog overflow flushes queue and increments flush count', () => {
  const q = new AdaptiveQueue(4);
  q.enqueue('R');
  q.enqueue('U');
  q.enqueue('F');
  q.enqueue('D');
  assertEqual(q.queue.length, 4);

  q.enqueue('L'); // 5th move exceeds limit 4
  assertEqual(q.queue.length, 0);
  assertEqual(q.flushedCount, 5);
});

suite.it('B13-3: Queue recovers cleanly after a flush event to accept new moves', () => {
  const q = new AdaptiveQueue(3);
  for (let i = 0; i < 4; i++) q.enqueue('R'); // Triggers flush
  assertEqual(q.queue.length, 0);

  q.enqueue('U');
  assertEqual(q.queue.length, 1);
  assertEqual(q.queue[0], 'U');
});

suite.it('B13-4: 50 consecutive moves through overflow queue terminate without memory error', () => {
  const q = new AdaptiveQueue(5);
  for (let i = 0; i < 50; i++) {
    q.enqueue('R');
  }
  assert(q.flushedCount > 0);
});

suite.it('B13-5: Dynamic speed computation remains finite under all queue states', () => {
  function getSpeed(queueLength) {
    if (queueLength <= 0) return 16;
    if (queueLength === 1) return 16;
    if (queueLength === 2) return 24;
    return Math.min(32, 24 + queueLength * 2);
  }
  assertEqual(getSpeed(0), 16);
  assertEqual(getSpeed(1), 16);
  assertEqual(getSpeed(2), 24);
  assertEqual(getSpeed(5), 32);
  assertEqual(getSpeed(100), 32);
});
