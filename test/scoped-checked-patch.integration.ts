import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  checkedPatchFixture,
  CheckedPatchDenied,
  type CheckedPatchPolicy
} from '../src/core/scoped-checked-patch.js';

const base = process.env.LOCALBRIDGE_LB21_FIXTURE_ROOT || process.env.TMPDIR;
assert.ok(base, 'dedicated fixture root or TMPDIR required');
await fs.mkdir(base, { recursive: true });
const outer = await fs.mkdtemp(path.join(base, 'lb21-'));
const root = path.join(outer, 'approved');
await fs.mkdir(root, { mode: 0o700 });
const filename = 'synthetic.txt';
const target = path.join(root, filename);
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const policy: CheckedPatchPolicy = {
  enabled: true, approvedRoot: root, maxFileBytes: 4096,
  maxReplacementBytes: 128
};
async function denied(run: () => Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(run, err => err instanceof CheckedPatchDenied, reason);
}
function request(content: string, find = 'BETA', replace = 'GAMMA', name = filename) {
  return { filename: name, expectedSha256: digest(content), find, replace };
}
try {
  const before = 'ALPHA\nBETA\nOMEGA\n';
  await fs.writeFile(target, before, { mode: 0o600 });
  const snapshot = await fs.readFile(target, 'utf8');

  await denied(
    () => checkedPatchFixture({ ...policy, enabled: false }, request(before)),
    'default-disabled scope must deny'
  );
  assert.equal(await fs.readFile(target, 'utf8'), snapshot);
  console.log('LB21_S01_DEFAULT_OFF_AND_NO_CHANGE_PASS');

  const result = await checkedPatchFixture(policy, request(before));
  assert.equal(result.oldSha256, digest(before));
  assert.equal(result.newSha256, digest('ALPHA\nGAMMA\nOMEGA\n'));
  assert.equal(await fs.readFile(target, 'utf8'), 'ALPHA\nGAMMA\nOMEGA\n');
  assert.equal((await fs.stat(target)).mode & 0o777, 0o600);
  console.log('LB21_S02_EXACT_SHA_SINGLE_MATCH_ATOMIC_REPLACE_PASS');

  const current = await fs.readFile(target, 'utf8');
  await denied(() => checkedPatchFixture(policy, request(before)), 'stale sha denial');
  await denied(() => checkedPatchFixture(policy, request(current, 'MISSING')), 'zero matches');
  await denied(() => checkedPatchFixture(policy, request(current, '\n', '_')), 'multiple matches');
  await denied(() => checkedPatchFixture(policy, request(current, 'GAMMA', 'X'.repeat(129))), 'oversized replacement');
  await denied(() => checkedPatchFixture(policy, request(current, 'GAMMA', 'X', '../escape.txt')), 'traversal');
  await denied(() => checkedPatchFixture(policy, request(current, 'GAMMA', 'X', '.env')), 'dotfile');
  await denied(() => checkedPatchFixture(policy, request(current, 'GAMMA', 'X', '.git/config')), 'git internals');
  assert.equal(await fs.readFile(target, 'utf8'), current);
  console.log('LB21_S03_STALE_AMBIGUOUS_OVERSIZE_NO_MUTATION_PASS');

  const outside = path.join(outer, 'protected.txt');
  await fs.writeFile(outside, 'SYNTHETIC_PROTECTED\n');
  const outsideHash = digest('SYNTHETIC_PROTECTED\n');
  const symlink = path.join(root, 'symlink.txt');
  await fs.symlink(outside, symlink);
  await denied(() => checkedPatchFixture(policy, request('SYNTHETIC_PROTECTED\n', 'SYNTHETIC', 'X', 'symlink.txt')), 'symlink denied');
  const linked = path.join(root, 'linked.txt');
  await fs.link(outside, linked);
  await denied(() => checkedPatchFixture(policy, request('SYNTHETIC_PROTECTED\n', 'SYNTHETIC', 'X', 'linked.txt')), 'hardlink denied');
  assert.equal(digest(await fs.readFile(outside, 'utf8')), outsideHash);
  console.log('LB21_S04_SYMLINK_HARDLINK_ESCAPE_DENIED_PASS');

  const concurrent = 'RED\nBETA\nBLUE\n';
  await fs.writeFile(target, concurrent);
  const req = request(concurrent);
  const outcomes = await Promise.allSettled([
    checkedPatchFixture(policy, req),
    checkedPatchFixture(policy, req)
  ]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(x => x.status === 'rejected').length, 1);
  assert.equal(await fs.readFile(target, 'utf8'), 'RED\nGAMMA\nBLUE\n');
  console.log('LB21_S05_COOPERATING_CONCURRENT_CALLERS_SINGLE_WIN_PASS');

  const fileNames = (await fs.readdir(root)).sort();
  assert.deepEqual(fileNames, ['linked.txt', 'symlink.txt', 'synthetic.txt']);
  console.log('LB21_NO_STALE_LOCK_OR_TEMP_FILES_PASS');
} finally {
  await fs.rm(outer, { recursive: true, force: true });
}
