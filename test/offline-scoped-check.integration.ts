import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createOfflineFixtureChecker, ScopedCheckDenied,
  type ScopedFixturePolicy
} from '../src/core/offline-scoped-check.js';

const fixture = process.env.LOCALBRIDGE_LB21_FIXTURE_ROOT || process.env.TMPDIR;
assert.ok(fixture, 'isolated fixture directory required');
await fs.mkdir(fixture, { recursive: true });
const root = await fs.mkdtemp(path.join(fixture, 'lb21-recipes-'));
const executable = await fs.realpath(process.execPath);
const recipes = {
  benign: {
    binary: executable,
    argv: ['-e', "process.stdout.write('LB21_SAFE_FIXED_RECIPE')"],
    timeoutMs: 1200,
    maxOutputBytes: 256
  },
  wait: {
    binary: executable,
    argv: ['-e', "setTimeout(() => process.stdout.write('DONE'), 1400)"],
    timeoutMs: 150,
    maxOutputBytes: 256
  },
  flood: {
    binary: executable,
    argv: ['-e', "process.stdout.write('X'.repeat(65536))"],
    timeoutMs: 1200,
    maxOutputBytes: 128
  },
  busy: {
    binary: executable,
    argv: ['-e', "setTimeout(() => process.stdout.write('DONE'), 600)"],
    timeoutMs: 1800,
    maxOutputBytes: 256
  }
} as const;
const policy: ScopedFixturePolicy = {
  enabled: true, approvedRoot: root, recipes
};
async function denied(run: () => Promise<unknown>) {
  await assert.rejects(run, err => err instanceof ScopedCheckDenied);
}
try {
  const disabled = createOfflineFixtureChecker({ ...policy, enabled: false });
  await denied(() => disabled('benign'));
  const run = createOfflineFixtureChecker(policy);
  await denied(() => run('missing'));
  await denied(() => run('benign; echo MALICIOUS'));
  await denied(() => run('../benign'));
  await denied(() => run('BENIGN'));
  console.log('LB21_S06_S07_DEFAULT_DENY_UNKNOWN_RECIPE_AND_ARG_INJECTION_PASS');

  const result = await run('benign');
  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
  assert.equal(result.outputExceeded, false);
  assert.equal(result.stdout, 'LB21_SAFE_FIXED_RECIPE');
  assert.equal(result.stderr, '');
  console.log('LB21_S08_APPROVED_LOCAL_FIXED_BINARY_ARGV_SHELL_FALSE_PASS');

  const timeout = await run('wait');
  assert.equal(timeout.timedOut, true);
  assert.notEqual(timeout.exitCode, 0);
  const flood = await run('flood');
  assert.equal(flood.outputExceeded, true);
  assert.ok(Buffer.byteLength(flood.stdout) <= 128);
  const simultaneous = await Promise.allSettled([run('busy'), run('busy')]);
  assert.equal(simultaneous.filter(x => x.status === 'fulfilled').length, 1,
    'simultaneous callers must not both pass the concurrency gate');
  assert.equal(simultaneous.filter(x => x.status === 'rejected').length, 1);
  const first = run('busy');
  await new Promise(resolve => setTimeout(resolve, 40));
  await denied(() => run('busy'));
  const last = await first;
  assert.equal(last.exitCode, 0);
  assert.equal(last.stdout, 'DONE');
  console.log('LB21_S09_TIMEOUT_OUTPUT_CAP_COOPERATING_CONCURRENCY_PASS');

  assert.deepEqual(await fs.readdir(root), []);
  console.log('LB21_NO_FILESYSTEM_MUTATIONS_BY_FIXED_RECIPES_PASS');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
