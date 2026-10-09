import { spawnSync } from 'node:child_process';

function fail(message, exitCode = 2) {
  console.error(`RELEASE_HISTORY_POLICY_FAIL: ${message}`);
  process.exit(exitCode);
}

const gitEnvironment = { ...process.env };
for (const key of Object.keys(gitEnvironment)) {
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
    delete gitEnvironment[key];
  }
}
Object.assign(gitEnvironment, {
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_TERMINAL_PROMPT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_PAGER: 'cat'
});

function git(args) {
  try {
    const result = spawnSync(
      'git',
      [
        '--no-replace-objects',
        '-c', 'core.hooksPath=/dev/null',
        '-c', 'core.fsmonitor=false',
        '-c', 'protocol.allow=never',
        ...args
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: gitEnvironment,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true
      }
    );
    if (result.error || typeof result.stdout !== 'string' || typeof result.stderr !== 'string') {
      return { status: null, stdout: '', stderr: '' };
    }
    return result;
  } catch {
    return { status: null, stdout: '', stderr: '' };
  }
}

function gitExit(result) {
  return Number.isInteger(result.status) ? String(result.status) : 'unknown';
}

const [baseline, privacyPattern] = process.argv.slice(2);
if (!/^[0-9a-f]{40}$/i.test(baseline ?? '')) {
  fail('baseline must be a full commit SHA');
}
if (!privacyPattern) {
  fail('privacy pattern is required');
}
if (privacyPattern.length > 4096) {
  fail('privacy pattern is too long');
}

const head = git(['rev-parse', '--verify', 'HEAD^{commit}']);
const headCommit = head.stdout.trim();
if (head.status !== 0 || !/^[0-9a-f]{40}$/i.test(headCommit)) {
  fail(`cannot resolve HEAD (git exit ${gitExit(head)})`);
}

const baselineCommit = git(['rev-parse', '--verify', `${baseline}^{commit}`]);
if (
  baselineCommit.status !== 0 ||
  baselineCommit.stdout.trim().toLowerCase() !== baseline.toLowerCase()
) {
  fail(`cannot resolve baseline commit (git exit ${gitExit(baselineCommit)})`);
}

const shallow = git(['rev-parse', '--is-shallow-repository']);
if (shallow.status !== 0 || !/^(?:true|false)\s*$/.test(shallow.stdout)) {
  fail(`cannot determine repository depth (git exit ${gitExit(shallow)})`);
}
if (shallow.stdout.trim() === 'true') {
  fail('shallow repository cannot prove full reachable history');
}

const commits = git(['rev-list', 'HEAD']);
if (commits.status !== 0) {
  fail(`cannot enumerate reachable history (git exit ${gitExit(commits)})`);
}

const reachableCommits = commits.stdout.trim().split(/\r?\n/).filter(Boolean);
if (reachableCommits.length === 0 || reachableCommits.some((commit) => !/^[0-9a-f]{40}$/i.test(commit))) {
  fail('reachable history returned an invalid commit list');
}

for (const commit of reachableCommits) {
  const scan = git([
    'grep', '-q', '-E', '-e', privacyPattern, commit, '--',
    ':!package-lock.json', ':!gate/package-lock.json'
  ]);
  if (scan.status === 0) {
    fail(`privacy hit in commit ${commit} (matching content withheld from logs)`, 8);
  }
  if (scan.status !== 1) {
    fail(`git grep failed for commit ${commit} (exit ${gitExit(scan)})`, 9);
  }
}

const ancestor = git(['merge-base', '--is-ancestor', baseline, 'HEAD']);
if (ancestor.status !== 0) {
  fail('release is not descended from published baseline');
}

const newHistory = git(['log', `${baseline}..HEAD`, '--format=%ae%n%ce']);
if (newHistory.status !== 0) {
  fail(`cannot inspect new author history (git exit ${gitExit(newHistory)})`);
}
const badNewAuthorCount = newHistory.stdout
  .split(/\r?\n/)
  .filter((email) => email && !email.endsWith('@users.noreply.github.com'))
  .length;
if (badNewAuthorCount !== 0) {
  fail(`new history includes ${badNewAuthorCount} non-noreply author/committer identities`);
}

const publicHistory = git(['log', baseline, '--format=%ae%n%ce']);
if (publicHistory.status !== 0) {
  fail(`cannot inspect public baseline history (git exit ${gitExit(publicHistory)})`);
}
const existingPublicExceptions = publicHistory.stdout
  .split(/\r?\n/)
  .filter((email) => email && !email.endsWith('@users.noreply.github.com'))
  .length;

console.log(`RELEASE_EXISTING_PUBLIC_AUTHOR_EXCEPTIONS=${existingPublicExceptions} (immutable v0.2.1 history)`);
console.log('RELEASE_REACHABLE_HISTORY_PRIVACY_PASS');
console.log('RELEASE_NEW_AUTHOR_NOREPLY_PASS');
