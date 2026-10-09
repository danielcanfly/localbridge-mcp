import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const helper = path.resolve('scripts/release-history-policy.mjs');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'localbridge-history-policy-'));
const noreply = '12345+bot@users.noreply.github.com';
const privacyMarker = 'synthetic_private_marker';
const tokenMarker = `sk-${'S'.repeat(24)}`;

type Result = SpawnSyncReturns<string>;

function cleanGitEnvironment(overrides: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env, ...overrides };
  for (const key of Object.keys(env)) {
    if (
      [
        'GIT_DIR',
        'GIT_WORK_TREE',
        'GIT_COMMON_DIR',
        'GIT_INDEX_FILE',
        'GIT_OBJECT_DIRECTORY',
        'GIT_ALTERNATE_OBJECT_DIRECTORIES',
        'GIT_CEILING_DIRECTORIES',
        'GIT_NAMESPACE',
        'GIT_SHALLOW_FILE',
        'GIT_REPLACE_REF_BASE',
        'GIT_CONFIG_COUNT',
        'GIT_CONFIG_PARAMETERS',
        'GIT_SSH_COMMAND',
        'GIT_ASKPASS',
        'SSH_ASKPASS'
      ].includes(key) ||
      /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(key)
    ) {
      delete env[key];
    }
  }
  return {
    ...env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0'
  };
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 16 * 1024 * 1024
  });
}

function git(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(
    'git',
    [
      '--no-replace-objects',
      '-c', 'core.hooksPath=/dev/null',
      '-c', 'core.fsmonitor=false',
      '-c', 'commit.gpgSign=false',
      ...args
    ],
    { cwd, encoding: 'utf8', env: cleanGitEnvironment(env) }
  );
  assert.equal(result.status, 0, `synthetic git fixture setup failed at ${args[0]}`);
  return result.stdout.trim();
}

function policy(repo: string, baseline: string, pattern = privacyMarker, env: NodeJS.ProcessEnv = {}) {
  return run(process.execPath, [helper, baseline, pattern], repo, env);
}

function identityEnvironment(authorEmail: string, committerEmail = authorEmail) {
  return {
    GIT_AUTHOR_NAME: 'Synthetic Author',
    GIT_AUTHOR_EMAIL: authorEmail,
    GIT_COMMITTER_NAME: 'Synthetic Committer',
    GIT_COMMITTER_EMAIL: committerEmail
  };
}

function assertRedacted(result: Result, forbidden: string[]) {
  const diagnostics = `${result.stdout}\n${result.stderr}`;
  for (const value of forbidden) {
    assert.equal(diagnostics.includes(value), false, 'policy diagnostic exposed fixture-sensitive data');
  }
}

async function createRepo(name: string, content = 'clean baseline\n') {
  const repo = path.join(sandbox, name);
  await fs.mkdir(repo);
  git(repo, ['init', '--quiet', '--initial-branch=main']);
  await fs.writeFile(path.join(repo, 'tracked.txt'), content);
  git(repo, ['add', 'tracked.txt']);
  git(repo, ['commit', '--quiet', '-m', 'published baseline'], identityEnvironment(
    'published@example.invalid',
    'published@example.invalid'
  ));
  return { repo, baseline: git(repo, ['rev-parse', 'HEAD']) };
}

async function commitFile(
  repo: string,
  relativePath: string,
  content: string | Buffer,
  message: string,
  authorEmail = noreply,
  committerEmail = authorEmail
) {
  const destination = path.join(repo, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content);
  git(repo, ['add', '--', relativePath]);
  git(repo, ['commit', '--quiet', '-m', message], identityEnvironment(authorEmail, committerEmail));
}

async function createMergeIdentityRepo(name: string, authorEmail: string, committerEmail: string) {
  const fixture = await createRepo(name);
  git(fixture.repo, ['checkout', '--quiet', '-b', 'side']);
  await commitFile(fixture.repo, 'side.txt', 'clean side\n', 'side identity', authorEmail, committerEmail);
  git(fixture.repo, ['checkout', '--quiet', 'main']);
  await commitFile(fixture.repo, 'main.txt', 'clean main\n', 'main child');
  git(
    fixture.repo,
    ['merge', '--quiet', '--no-ff', 'side', '-m', 'merge side parent'],
    identityEnvironment(noreply)
  );
  return fixture;
}

try {
  assert.equal(
    path.resolve(sandbox).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    true,
    'synthetic repositories must remain under the caller-owned TMPDIR'
  );

  const clean = await createRepo('clean');
  await commitFile(clean.repo, 'tracked.txt', 'clean child\n', 'clean child');
  const cleanResult = policy(clean.repo, clean.baseline);
  assert.equal(cleanResult.status, 0, cleanResult.stderr);
  assert.match(cleanResult.stdout, /RELEASE_EXISTING_PUBLIC_AUTHOR_EXCEPTIONS=2/);
  assert.match(cleanResult.stdout, /RELEASE_REACHABLE_HISTORY_PRIVACY_PASS/);
  assert.match(cleanResult.stdout, /RELEASE_NEW_AUTHOR_NOREPLY_PASS/);
  console.log('HIST05_SYNTHETIC_CLEAN_EXIT_0_PASS');

  const history = await createRepo('rename-copy-history');
  const originName = 'private-origin-name.txt';
  const renamedName = 'private-renamed-name.txt';
  const copiedName = 'private-copy-name.txt';
  await commitFile(history.repo, originName, `${privacyMarker}\n${tokenMarker}\n`, 'historical disclosure');
  git(history.repo, ['mv', '--', originName, renamedName]);
  git(history.repo, ['commit', '--quiet', '-m', 'rename historical file'], identityEnvironment(noreply));
  await fs.copyFile(path.join(history.repo, renamedName), path.join(history.repo, copiedName));
  git(history.repo, ['add', '--', copiedName]);
  git(history.repo, ['commit', '--quiet', '-m', 'copy historical file'], identityEnvironment(noreply));
  git(history.repo, ['rm', '--quiet', '--', renamedName, copiedName]);
  git(history.repo, ['commit', '--quiet', '-m', 'remove current disclosure'], identityEnvironment(noreply));
  const currentTreeScan = run(
    'git',
    ['grep', '-q', '-E', '-e', `${privacyMarker}|sk-[A-Za-z0-9_-]{20,}`, 'HEAD'],
    history.repo
  );
  assert.equal(currentTreeScan.status, 1);
  const historyResult = policy(history.repo, history.baseline, `${privacyMarker}|sk-[A-Za-z0-9_-]{20,}`);
  assert.equal(historyResult.status, 8);
  assert.match(historyResult.stderr, /privacy hit in commit [0-9a-f]{40} \(matching content withheld from logs\)/);
  assertRedacted(historyResult, [privacyMarker, tokenMarker, originName, renamedName, copiedName]);
  console.log('HIST01_RENAME_COPY_HISTORY_EXIT_8_PASS');

  const badAuthorEmail = 'merge-author@example.invalid';
  const mergedAuthor = await createMergeIdentityRepo('merge-author', badAuthorEmail, noreply);
  const mergedAuthorResult = policy(mergedAuthor.repo, mergedAuthor.baseline);
  assert.equal(mergedAuthorResult.status, 2);
  assert.match(mergedAuthorResult.stderr, /new history includes 1 non-noreply author\/committer identities/);
  assertRedacted(mergedAuthorResult, [badAuthorEmail]);

  const badCommitterEmail = 'merge-committer@example.invalid';
  const mergedCommitter = await createMergeIdentityRepo('merge-committer', noreply, badCommitterEmail);
  const mergedCommitterResult = policy(mergedCommitter.repo, mergedCommitter.baseline);
  assert.equal(mergedCommitterResult.status, 2);
  assert.match(mergedCommitterResult.stderr, /new history includes 1 non-noreply author\/committer identities/);
  assertRedacted(mergedCommitterResult, [badCommitterEmail]);
  console.log('HIST02_MERGE_ALL_PARENTS_AUTHOR_COMMITTER_EXIT_2_PASS');

  const malformedPinResult = policy(clean.repo, 'not-a-full-sha');
  assert.equal(malformedPinResult.status, 2);
  assertRedacted(malformedPinResult, ['not-a-full-sha']);

  const foreign = await createRepo('foreign-pin');
  const unreachablePinResult = policy(clean.repo, foreign.baseline);
  assert.equal(unreachablePinResult.status, 2);
  assertRedacted(unreachablePinResult, [foreign.baseline]);

  const invalidEncoding = await createRepo('invalid-encoding');
  await commitFile(
    invalidEncoding.repo,
    'invalid.bin',
    Buffer.concat([Buffer.from([0xff, 0xfe, 0x00]), Buffer.from(privacyMarker)]),
    'invalid encoding disclosure'
  );
  const invalidEncodingResult = policy(invalidEncoding.repo, invalidEncoding.baseline);
  assert.equal(invalidEncodingResult.status, 8);
  assertRedacted(invalidEncodingResult, [privacyMarker, 'invalid.bin']);

  const damaged = await createRepo('damaged-object');
  const damagedTree = git(damaged.repo, ['rev-parse', 'HEAD^{tree}']);
  await fs.rm(path.join(damaged.repo, '.git', 'objects', damagedTree.slice(0, 2), damagedTree.slice(2)));
  const damagedResult = policy(damaged.repo, damaged.baseline);
  assert.equal(damagedResult.status, 9);
  assert.match(damagedResult.stderr, /git grep failed for commit [0-9a-f]{40} \(exit 128\)/);

  const emptyPath = path.join(sandbox, 'empty-path');
  await fs.mkdir(emptyPath);
  const subprocessFailure = policy(clean.repo, clean.baseline, privacyMarker, { PATH: emptyPath });
  assert.equal(subprocessFailure.status, 2);
  assertRedacted(subprocessFailure, [privacyMarker]);
  console.log('HIST03_MALFORMED_UNREACHABLE_ENCODING_READ_SUBPROCESS_FAIL_CLOSED_PASS');

  const shellMarker = path.join(sandbox, 'shell-interpolation-marker');
  const literalPattern = `never-match;touch ${shellMarker}`;
  const literalPatternResult = policy(clean.repo, clean.baseline, literalPattern);
  assert.equal(literalPatternResult.status, 0, literalPatternResult.stderr);
  await assert.rejects(fs.stat(shellMarker), (error: any) => error?.code === 'ENOENT');
  assertRedacted(literalPatternResult, [literalPattern, shellMarker]);
  assertRedacted(historyResult, [badAuthorEmail, badCommitterEmail]);
  console.log('HIST04_REDACTED_ARGV_ONLY_DIAGNOSTICS_PASS');

  const hostile = await createRepo('hostile-repository');
  const executionMarker = path.join(sandbox, 'unexpected-execution-marker');
  const hostileScript = path.join(sandbox, 'hostile-command.sh');
  await fs.writeFile(hostileScript, `#!/bin/sh\n: > "${executionMarker}"\nexit 97\n`, { mode: 0o700 });
  const hostileHooks = path.join(sandbox, 'hostile-hooks');
  await fs.mkdir(hostileHooks);
  for (const name of ['post-checkout', 'post-merge', 'pre-commit', 'pre-auto-gc', 'reference-transaction']) {
    await fs.symlink(hostileScript, path.join(hostileHooks, name));
  }
  const outsideContent = path.join(sandbox, 'outside-content.txt');
  await fs.writeFile(outsideContent, `${privacyMarker}\n`);
  await fs.writeFile(path.join(hostile.repo, '.gitattributes'), '*.txt filter=hostile diff=hostile\n');
  await fs.symlink(outsideContent, path.join(hostile.repo, 'outside-link'));
  git(hostile.repo, ['add', '--', '.gitattributes', 'outside-link']);
  git(hostile.repo, ['commit', '--quiet', '-m', 'hostile metadata fixture'], identityEnvironment(noreply));
  git(hostile.repo, ['config', 'core.hooksPath', hostileHooks]);
  git(hostile.repo, ['config', 'core.fsmonitor', hostileScript]);
  git(hostile.repo, ['config', 'diff.hostile.command', hostileScript]);
  git(hostile.repo, ['config', 'filter.hostile.clean', hostileScript]);
  git(hostile.repo, ['config', 'filter.hostile.smudge', hostileScript]);
  git(hostile.repo, ['config', 'remote.hostile.url', 'ssh://invalid.example.invalid/repository']);
  const hostileHome = path.join(sandbox, 'hostile-home');
  await fs.mkdir(hostileHome);
  await fs.writeFile(
    path.join(hostileHome, '.gitconfig'),
    `[core]\n\thooksPath = ${hostileHooks}\n\tfsmonitor = ${hostileScript}\n[pager]\n\tlog = ${hostileScript}\n`
  );
  const fakeBin = path.join(sandbox, 'fake-network-bin');
  await fs.mkdir(fakeBin);
  for (const name of ['ssh', 'curl']) {
    await fs.symlink(hostileScript, path.join(fakeBin, name));
  }
  const hostileResult = policy(hostile.repo, hostile.baseline, 'marker-not-present', {
    HOME: hostileHome,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.fsmonitor',
    GIT_CONFIG_VALUE_0: hostileScript,
    GIT_SSH_COMMAND: hostileScript
  });
  assert.equal(hostileResult.status, 0, hostileResult.stderr);
  await assert.rejects(fs.stat(executionMarker), (error: any) => error?.code === 'ENOENT');
  console.log('HIST07_SYMLINK_ATTRIBUTES_CONFIG_HOOK_TRANSPORT_EXIT_0_PASS');
} finally {
  await fs.rm(sandbox, { recursive: true, force: true });
}
