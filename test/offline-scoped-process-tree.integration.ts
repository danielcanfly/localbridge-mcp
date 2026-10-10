import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createOfflineFixtureChecker } from '../src/core/offline-scoped-check.js';

if (process.platform === 'win32') {
  console.log('LB22_POSIX_PROCESS_GROUP_CASE_NOT_RUN_ON_WINDOWS');
} else {
  const fixture = process.env.LOCALBRIDGE_LB22_FIXTURE_ROOT || process.env.TMPDIR;
  assert.ok(fixture, 'LB22 requires explicitly isolated scratch directory');
  await fs.mkdir(fixture, { recursive: true });
  const root = await fs.mkdtemp(path.join(fixture, 'lb22-child-tree-'));
  const pidFile = path.join(root, 'fixture-grandchild.pid');
  const marker = path.join(root, 'synthetic-marker.txt');
  let fixturePid: number | undefined;
  try {
    const grandchildCode = [
      "const fs = require('node:fs');",
      "setInterval(() => fs.appendFileSync(" + JSON.stringify(marker) + ", 'x'), 45);"
    ].join('\n');
    const parentCode = [
      "const fs = require('node:fs');",
      "const cp = require('node:child_process');",
      "const child = cp.spawn(process.execPath, ['-e', " + JSON.stringify(grandchildCode) + "], { stdio: 'ignore' });",
      "fs.writeFileSync(" + JSON.stringify(pidFile) + ", String(child.pid));",
      "setInterval(() => {}, 1000);"
    ].join('\n');

    const binary = await fs.realpath(process.execPath);
    const parentScript = path.join(root, 'synthetic-parent.cjs');
    await fs.writeFile(parentScript, parentCode);
    const run = createOfflineFixtureChecker({
      enabled: true,
      approvedRoot: root,
      recipes: {
        childtree: {
          binary,
          argv: [parentScript],
          timeoutMs: 1800,
          maxOutputBytes: 256
        }
      }
    });
    const result = await run('childtree');
    assert.equal(result.timedOut, true, 'parent fixture must time out');
    assert.notEqual(result.exitCode, 0);
    fixturePid = Number((await fs.readFile(pidFile, 'utf8')).trim());
    assert.ok(Number.isSafeInteger(fixturePid) && fixturePid > 1, 'fixture child pid required');

    // We never kill an unrelated process. The descendant was created by the
    // synthetic test itself; its only behavior is writing inside this scratch.
    const bytesBefore = (await fs.stat(marker)).size;
    await new Promise(resolve => setTimeout(resolve, 350));
    const bytesAfter = (await fs.stat(marker)).size;
    assert.equal(bytesAfter, bytesBefore,
      'timed-out scoped check left its synthetic descendant writing after parent exit');
    console.log('LB22_TIMEOUT_DESCENDANT_OUTPUT_STOPPED_PASS');

    // An output-flood cancellation must clean up the same process tree, not
    // just the immediate recipe process that exceeded the output budget.
    const floodMarker = path.join(root, 'synthetic-flood-marker.txt');
    const floodPid = path.join(root, 'synthetic-flood-grandchild.pid');
    const floodChildCode = [
      "const fs = require('node:fs');",
      "setInterval(() => fs.appendFileSync(" + JSON.stringify(floodMarker) + ", 'x'), 45);"
    ].join('\n');
    const floodParentCode = [
      "const fs = require('node:fs');",
      "const cp = require('node:child_process');",
      "const child = cp.spawn(process.execPath, ['-e', " + JSON.stringify(floodChildCode) + "], { stdio: 'ignore' });",
      "fs.writeFileSync(" + JSON.stringify(floodPid) + ", String(child.pid));",
      "setTimeout(() => process.stdout.write('F'.repeat(32768)), 400);",
      "setInterval(() => {}, 1000);"
    ].join('\n');
    const floodParentScript = path.join(root, 'synthetic-flood-parent.cjs');
    await fs.writeFile(floodParentScript, floodParentCode);
    const floodRun = createOfflineFixtureChecker({
      enabled: true,
      approvedRoot: root,
      recipes: {
        floodtree: {
          binary,
          argv: [floodParentScript],
          timeoutMs: 2600,
          maxOutputBytes: 128
        }
      }
    });
    const floodResult = await floodRun('floodtree');
    assert.equal(floodResult.outputExceeded, true);
    assert.ok(Buffer.byteLength(floodResult.stdout, 'utf8') <= 128);
    fixturePid = Number((await fs.readFile(floodPid, 'utf8')).trim());
    assert.ok(Number.isSafeInteger(fixturePid) && fixturePid > 1);
    const beforeFlood = (await fs.stat(floodMarker)).size;
    await new Promise(resolve => setTimeout(resolve, 350));
    const afterFlood = (await fs.stat(floodMarker)).size;
    assert.equal(afterFlood, beforeFlood,
      'output flood cancellation left synthetic descendant writing');
    console.log('LB22_OUTPUT_FLOOD_DESCENDANT_OUTPUT_STOPPED_PASS');

    // Normal parent exit should not leave a fixture descendant behind either.
    const exitMarker = path.join(root, 'synthetic-exit-marker.txt');
    const exitPid = path.join(root, 'synthetic-exit-grandchild.pid');
    const exitChildCode = [
      "const fs = require('node:fs');",
      "setInterval(() => fs.appendFileSync(" + JSON.stringify(exitMarker) + ", 'x'), 45);"
    ].join('\n');
    const exitParentCode = [
      "const fs = require('node:fs');",
      "const cp = require('node:child_process');",
      "const child = cp.spawn(process.execPath, ['-e', " + JSON.stringify(exitChildCode) + "], { stdio: 'ignore' });",
      "fs.writeFileSync(" + JSON.stringify(exitPid) + ", String(child.pid));",
      "setTimeout(() => process.exit(0), 450);"
    ].join('\n');
    const exitParentScript = path.join(root, 'synthetic-exit-parent.cjs');
    await fs.writeFile(exitParentScript, exitParentCode);
    const exitRun = createOfflineFixtureChecker({
      enabled: true,
      approvedRoot: root,
      recipes: {
        exitparent: {
          binary,
          argv: [exitParentScript],
          timeoutMs: 2600,
          maxOutputBytes: 128
        }
      }
    });
    const exitResult = await exitRun('exitparent');
    assert.equal(exitResult.exitCode, 0);
    assert.equal(exitResult.timedOut, false);
    fixturePid = Number((await fs.readFile(exitPid, 'utf8')).trim());
    assert.ok(Number.isSafeInteger(fixturePid) && fixturePid > 1);
    const beforeExit = (await fs.stat(exitMarker)).size;
    await new Promise(resolve => setTimeout(resolve, 350));
    const afterExit = (await fs.stat(exitMarker)).size;
    assert.equal(afterExit, beforeExit,
      'normal recipe parent exit left a background child writing');
    console.log('LB22_NORMAL_EXIT_DESCENDANT_OUTPUT_STOPPED_PASS');
  } finally {
    if (fixturePid && fixturePid > 1) {
      try { process.kill(fixturePid, 'SIGKILL'); } catch { /* already exited */ }
    }
    await fs.rm(root, { recursive: true, force: true });
  }
}
