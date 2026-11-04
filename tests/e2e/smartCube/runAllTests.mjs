// tests/e2e/smartCube/runAllTests.mjs
// Standalone opaque-box E2E test runner for Smart Cube GAN 16 ui integration.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function discoverTestFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await discoverTestFiles(fullPath));
    } else if (entry.isFile() && (entry.name.startsWith('test_') || entry.name.startsWith('boundary_')) && entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  SMART CUBE GAN 16 ui E2E TEST RUNNER');
  console.log('  Node.js: ' + process.version + ' | Platform: ' + process.platform);
  console.log('='.repeat(70) + '\n');

  const suiteDirs = [
    { tier: 'Tier 1: Feature Coverage (F1..F20)', path: path.join(__dirname, 'tier1_features') },
    { tier: 'Tier 2: Boundary & Stress Cases', path: path.join(__dirname, 'tier2_boundaries') },
    { tier: 'Tier 3: Pairwise Cross-Feature', path: path.join(__dirname, 'tier3_combinations') },
    { tier: 'Tier 4: Realistic Real-World Scenarios', path: path.join(__dirname, 'tier4_realworld') }
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const allErrors = [];
  const tierSummaries = [];

  const overallStartTime = Date.now();

  for (const group of suiteDirs) {
    const files = await discoverTestFiles(group.path);
    if (files.length === 0) continue;

    console.log(`\n--- [${group.tier}] (${files.length} test files) ---`);
    let groupPassed = 0;
    let groupFailed = 0;
    let groupSkipped = 0;
    let groupTotal = 0;

    for (const filePath of files) {
      const relPath = path.relative(__dirname, filePath).replace(/\\/g, '/');
      const fileUrl = pathToFileURL(filePath).href;

      try {
        const mod = await import(fileUrl);
        const suite = mod.suite || mod.default;

        if (!suite || typeof suite.run !== 'function') {
          console.warn(`  ⚠️  [${relPath}] No executable test suite found`);
          continue;
        }

        const res = await suite.run();
        groupTotal += res.total;
        groupPassed += res.passed;
        groupFailed += res.failed;
        groupSkipped += res.skipped;

        const statusIcon = res.failed === 0 ? '✓' : '✗';
        const skipInfo = res.skipped > 0 ? ` (${res.skipped} skipped)` : '';
        console.log(`  ${statusIcon} ${res.suiteName} [${res.passed}/${res.total} passed${skipInfo}] (${res.durationMs}ms)`);

        if (res.errors.length > 0) {
          for (const err of res.errors) {
            allErrors.push({
              file: relPath,
              suite: res.suiteName,
              testName: err.testName,
              error: err.error
            });
            console.error(`      ✗ ${err.testName}: ${err.error.message}`);
          }
        }
      } catch (importErr) {
        groupFailed++;
        allErrors.push({
          file: relPath,
          suite: 'Module Import',
          testName: 'import()',
          error: importErr
        });
        console.error(`  ✗ [LOAD ERROR] ${relPath}: ${importErr.message}`);
      }
    }

    tierSummaries.push({
      tier: group.tier,
      total: groupTotal,
      passed: groupPassed,
      failed: groupFailed,
      skipped: groupSkipped
    });

    totalTests += groupTotal;
    totalPassed += groupPassed;
    totalFailed += groupFailed;
    totalSkipped += groupSkipped;
  }

  const overallDurationMs = Date.now() - overallStartTime;

  console.log('\n' + '='.repeat(70));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(70));
  for (const s of tierSummaries) {
    const status = s.failed === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${s.tier.padEnd(42)} ${status} [${s.passed}/${s.total}] (skipped: ${s.skipped})`);
  }
  console.log('-'.repeat(70));
  console.log(`  TOTAL: ${totalTests} tests | ${totalPassed} passed | ${totalFailed} failed | ${totalSkipped} skipped`);
  console.log(`  EXECUTION TIME: ${overallDurationMs} ms`);
  console.log('='.repeat(70) + '\n');

  if (allErrors.length > 0) {
    console.error(`\n🚨 ${allErrors.length} TEST(S) FAILED:\n`);
    allErrors.forEach((e, idx) => {
      console.error(`[${idx + 1}] in ${e.file} -> "${e.testName}"`);
      console.error(`    ${e.error.stack || e.error.message}\n`);
    });
    process.exit(1);
  } else {
    console.log('🎉 ALL SMART CUBE E2E TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
