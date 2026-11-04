// tests/e2e/smartCube/tier1_features/test_f8_gatt_write_queue.mjs
// F8: GATT Write Queue Serialization (5 tests)

import { createTestSuite, assert, assertEqual, assertDeepEqual } from '../helpers/testUtils.mjs';
import { GattWriteQueue } from '../helpers/contractAdapters.mjs';

export const suite = createTestSuite('F8: GATT Write Queue Serialization');

suite.it('F8-1: Executes single write operation successfully', async () => {
  const queue = new GattWriteQueue();
  let executed = false;
  await queue.enqueue(async () => {
    executed = true;
    return 'done';
  });
  assertEqual(executed, true);
});

suite.it('F8-2: Serializes multiple concurrent write requests in strict sequential order', async () => {
  const queue = new GattWriteQueue();
  const executionOrder = [];

  const op1 = queue.enqueue(async () => {
    await new Promise(r => setTimeout(r, 15));
    executionOrder.push(1);
  });

  const op2 = queue.enqueue(async () => {
    await new Promise(r => setTimeout(r, 5));
    executionOrder.push(2);
  });

  const op3 = queue.enqueue(async () => {
    executionOrder.push(3);
  });

  await Promise.all([op1, op2, op3]);
  assertDeepEqual(executionOrder, [1, 2, 3], 'Operations must execute in FIFO arrival order');
});

suite.it('F8-3: Prevents concurrent overlapping write executions', async () => {
  const queue = new GattWriteQueue();
  let inFlight = 0;
  let maxConcurrent = 0;

  const runTask = () => queue.enqueue(async () => {
    inFlight++;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    await new Promise(r => setTimeout(r, 10));
    inFlight--;
  });

  await Promise.all([runTask(), runTask(), runTask(), runTask()]);
  assertEqual(maxConcurrent, 1, 'Never more than 1 write in flight concurrently');
});

suite.it('F8-4: Recovers and continues executing subsequent tasks if one operation rejects', async () => {
  const queue = new GattWriteQueue();
  const completed = [];

  const op1 = queue.enqueue(async () => {
    completed.push('op1');
  });

  const opFail = queue.enqueue(async () => {
    throw new Error('BLE Write Failed');
  }).catch(err => err.message);

  const op2 = queue.enqueue(async () => {
    completed.push('op2');
  });

  const [res1, errRes, res2] = await Promise.all([op1, opFail, op2]);
  assertEqual(errRes, 'BLE Write Failed');
  assertDeepEqual(completed, ['op1', 'op2'], 'Subsequent operations must execute despite earlier rejection');
});

suite.it('F8-5: Returns exact promise resolution value to the caller', async () => {
  const queue = new GattWriteQueue();
  const result = await queue.enqueue(async () => {
    return { status: 'acknowledged', bytesWritten: 20 };
  });
  assertEqual(result.status, 'acknowledged');
  assertEqual(result.bytesWritten, 20);
});
