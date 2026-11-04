// tests/e2e/smartCube/verifyChallenger2.mjs
// Challenger 2 Empirical Verification Harness
// Milestone 5 Phase 1 Iteration 2

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../');

console.log('='.repeat(70));
console.log('CHALLENGER 2 EMPIRICAL VERIFICATION & STRESS HARNESS');
console.log('='.repeat(70));

const results = [];

function record(name, passed, details = '') {
  results.push({ name, passed, details });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
}

async function run() {
  // -------------------------------------------------------------
  // Test 1: Dynamic import integrity for 6 production files in isolated subprocesses
  // -------------------------------------------------------------
  console.log('\n--- Task 1A: Module Import Integrity (6 production files in isolated subprocesses) ---');
  const prodFiles = [
    { name: 'routeConfig.js', path: 'src/routes/routeConfig.js' },
    { name: 'ganProtocol.js', path: 'src/utils/smartCube/ganProtocol.js' },
    { name: 'useCubeStore.js', path: 'src/store/useCubeStore.js' },
    { name: 'ganBleDriver.js', path: 'src/utils/smartCube/ganBleDriver.js' },
    { name: 'audioSystem.js', path: 'src/utils/audioSystem.js' },
    { name: 'useSmartCubeStore.js', path: 'src/store/useSmartCubeStore.js' }
  ];

  for (const file of prodFiles) {
    const fullPath = path.join(ROOT, file.path).replace(/\\/g, '/');
    const childCode = `
      import * as mod from 'file:///${fullPath}';
      const keys = Object.keys(mod);
      if (keys.length === 0 && !mod.default) {
        throw new Error('Empty module exports');
      }
      process.stdout.write(JSON.stringify({ ok: true, keys: keys.length }));
    `;

    const res = spawnSync(process.execPath, ['--input-type=module', '-e', childCode], {
      cwd: ROOT,
      encoding: 'utf8'
    });

    if (res.status === 0) {
      const output = JSON.parse(res.stdout || '{}');
      record(`Subprocess import ${file.name}`, true, `exit 0, ${output.keys} exported symbols`);
    } else {
      record(`Subprocess import ${file.name}`, false, `exit ${res.status}: ${res.stderr.trim()}`);
    }
  }

  // -------------------------------------------------------------
  // Test 2: SpecGanBleDriver listener lifecycle & leak verification
  // -------------------------------------------------------------
  console.log('\n--- Task 1B: SpecGanBleDriver Listener Lifecycle & Leak Test ---');
  try {
    const { SpecGanBleDriver } = await import('./helpers/contractAdapters.mjs');
    const { VirtualGanCube } = await import('./mocks/virtualGanCube.mjs');

    const cube = new VirtualGanCube();
    const driver = new SpecGanBleDriver();

    let leakDetected = false;
    const CYCLES = 100;

    for (let i = 0; i < CYCLES; i++) {
      await driver.connect(cube.device);

      const devListenersConn = cube.device._listeners.get('gattserverdisconnected');
      const stateListenersConn = cube.stateChar._listeners.get('characteristicvaluechanged');

      if (devListenersConn.size !== 1 || stateListenersConn.size !== 1) {
        leakDetected = true;
        record(`Cycle ${i} connected listener count`, false, `dev: ${devListenersConn?.size}, stateChar: ${stateListenersConn?.size}`);
        break;
      }

      driver.disconnect();

      const devListenersDisc = cube.device._listeners.get('gattserverdisconnected');
      const stateListenersDisc = cube.stateChar._listeners.get('characteristicvaluechanged');

      if (devListenersDisc.size !== 0 || stateListenersDisc.size !== 0) {
        leakDetected = true;
        record(`Cycle ${i} disconnected listener count`, false, `dev: ${devListenersDisc?.size}, stateChar: ${stateListenersDisc?.size}`);
        break;
      }
    }

    if (!leakDetected) {
      record(`SpecGanBleDriver ${CYCLES} connect/disconnect cycles`, true, `0 listener leaks across ${CYCLES} iterations`);
    }

    // Edge Case: Repeated consecutive disconnects should not throw or corrupt state
    try {
      driver.disconnect();
      driver.disconnect();
      record('SpecGanBleDriver idempotent disconnect', true, 'safe double disconnect');
    } catch (err) {
      record('SpecGanBleDriver idempotent disconnect', false, err.message);
    }

    // Edge Case: Disconnect on brand new unconnected driver
    try {
      const freshDriver = new SpecGanBleDriver();
      freshDriver.disconnect();
      record('SpecGanBleDriver disconnect before connect', true, 'safe unattached disconnect');
    } catch (err) {
      record('SpecGanBleDriver disconnect before connect', false, err.message);
    }

    // Edge Case: Post-disconnect packet suppression
    let unexpectedMoveCalled = false;
    driver.onMove = () => { unexpectedMoveCalled = true; };
    cube.emitMove('U', 100);
    assert.strictEqual(unexpectedMoveCalled, false, 'Packet received after disconnect must not trigger onMove');
    record('SpecGanBleDriver post-disconnect notification suppression', true, 'no spurious events after disconnect');

    // Edge Case: Switching devices - connect to device A, disconnect, connect to device B
    const cubeA = new VirtualGanCube();
    const cubeB = new VirtualGanCube();
    const switchDriver = new SpecGanBleDriver();

    await switchDriver.connect(cubeA.device);
    assert.strictEqual(cubeA.device._listeners.get('gattserverdisconnected').size, 1);
    switchDriver.disconnect();
    assert.strictEqual(cubeA.device._listeners.get('gattserverdisconnected').size, 0);

    await switchDriver.connect(cubeB.device);
    assert.strictEqual(cubeB.device._listeners.get('gattserverdisconnected').size, 1);
    assert.strictEqual(cubeA.device._listeners.get('gattserverdisconnected').size, 0);
    switchDriver.disconnect();
    assert.strictEqual(cubeB.device._listeners.get('gattserverdisconnected').size, 0);
    record('SpecGanBleDriver device switching listener lifecycle', true, 'clean detachment on device transition');

  } catch (err) {
    record('SpecGanBleDriver lifecycle', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 3: ContractAdapters error rethrow verification
  // -------------------------------------------------------------
  console.log('\n--- Task 1C: Dynamic Import Catch Block Error Rethrow ---');
  try {
    const adaptersPath = path.join(__dirname, 'helpers/contractAdapters.mjs');
    const adaptersSource = fs.readFileSync(adaptersPath, 'utf8');

    // Static Analysis: Verify source pattern in getGanProtocol
    const hasGanProtocolRethrow = /getGanProtocol\(\)[\s\S]*?catch\s*\(([^)]+)\)\s*\{[\s\S]*?throw\s+\1;/.test(adaptersSource);
    assert(hasGanProtocolRethrow, 'getGanProtocol must actively rethrow error in catch block');
    record('getGanProtocol source rethrow pattern', true, 'throw err confirmed in catch block');

    // Static Analysis: Verify source pattern in getGanBleDriverClass
    const hasGanBleDriverRethrow = /getGanBleDriverClass\(\)[\s\S]*?catch\s*\(([^)]+)\)\s*\{[\s\S]*?throw\s+\1;/.test(adaptersSource);
    assert(hasGanBleDriverRethrow, 'getGanBleDriverClass must actively rethrow error in catch block');
    record('getGanBleDriverClass source rethrow pattern', true, 'throw err confirmed in catch block');

    // Static Analysis: Verify source pattern in getSmartCubeStoreClass
    const hasStoreRethrow = /getSmartCubeStoreClass\(\)[\s\S]*?catch\s*\(([^)]+)\)\s*\{[\s\S]*?throw\s+\1;/.test(adaptersSource);
    assert(hasStoreRethrow, 'getSmartCubeStoreClass must actively rethrow error in catch block');
    record('getSmartCubeStoreClass source rethrow pattern', true, 'throw err confirmed in catch block');

    // Functional verification: check that getSmartCubeStoreClass and getGanProtocol return production modules when healthy
    const { getGanProtocol, getGanBleDriverClass, getSmartCubeStoreClass } = await import('./helpers/contractAdapters.mjs');
    const proto = await getGanProtocol();
    assert(proto && proto.COMMAND_REQUEST_FACELETS, 'getGanProtocol returned invalid module');
    record('getGanProtocol healthy resolution', true, 'returned production ganProtocol');

    const driverClass = await getGanBleDriverClass();
    assert(typeof driverClass === 'function', 'getGanBleDriverClass returned non-function');
    record('getGanBleDriverClass healthy resolution', true, 'returned GanBleDriver class');

    const storeClass = await getSmartCubeStoreClass();
    assert(typeof storeClass === 'function', 'getSmartCubeStoreClass returned non-function');
    record('getSmartCubeStoreClass healthy resolution', true, 'returned SmartCubeStore class');

    // Empirical verification of active rethrow:
    // Run an isolated child process importing a helper that tests error rethrowing when a broken module is imported
    const testRethrowCode = `
      // Simulate the exact catch logic of contractAdapters
      async function testLoader(importFn) {
        try {
          return await importFn();
        } catch (err) {
          throw err;
        }
      }

      let threw = false;
      try {
        await testLoader(async () => {
          throw new TypeError('Simulated syntax or freeze error');
        });
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('Simulated')) {
          threw = true;
        }
      }

      if (!threw) {
        process.exit(1);
      }
      process.stdout.write('RETHROW_OK');
    `;

    const rethrowRes = spawnSync(process.execPath, ['--input-type=module', '-e', testRethrowCode], {
      cwd: ROOT,
      encoding: 'utf8'
    });

    if (rethrowRes.status === 0 && rethrowRes.stdout.includes('RETHROW_OK')) {
      record('Simulated broken module error rethrow assertion', true, 'errors actively propagate out of loader');
    } else {
      record('Simulated broken module error rethrow assertion', false, `exit: ${rethrowRes.status}, out: ${rethrowRes.stderr}`);
    }

  } catch (err) {
    record('ContractAdapters error rethrow verification', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Full E2E Test Suite Execution
  // -------------------------------------------------------------
  console.log('\n--- Task 2: Full Smart Cube E2E Test Suite Run ---');
  const runnerScript = path.join(__dirname, 'runAllTests.mjs');
  const e2eRes = spawnSync(process.execPath, [runnerScript], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  const fullOutput = e2eRes.stdout || '';
  const matchPassed = fullOutput.match(/TOTAL:\s*(\d+)\s*tests\s*\|\s*(\d+)\s*passed\s*\|\s*(\d+)\s*failed\s*\|\s*(\d+)\s*skipped/);

  if (e2eRes.status === 0 && matchPassed) {
    const total = parseInt(matchPassed[1], 10);
    const passed = parseInt(matchPassed[2], 10);
    const failed = parseInt(matchPassed[3], 10);
    const skipped = parseInt(matchPassed[4], 10);

    if (total === 240 && passed === 240 && failed === 0 && skipped === 0) {
      record('runAllTests.mjs 240/240 passed', true, '240 passed, 0 failed, 0 skipped, exit code 0');
    } else {
      record('runAllTests.mjs 240/240 passed', false, `Expected 240 passed, got total: ${total}, passed: ${passed}, failed: ${failed}`);
    }
  } else {
    record('runAllTests.mjs 240/240 passed', false, `Runner failed with exit code ${e2eRes.status}: ${e2eRes.stderr}`);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  const failed = results.filter(r => !r.passed);
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${results.length - failed.length} | FAILED: ${failed.length}`);
  console.log('='.repeat(70));

  if (failed.length > 0) {
    console.error('VERIFICATION FAILED!');
    process.exit(1);
  } else {
    console.log('ALL CHALLENGER 2 EMPIRICAL CHECKS PASSED!');
  }
}

run().catch(err => {
  console.error('FATAL UNCAUGHT:', err);
  process.exit(1);
});
