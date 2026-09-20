import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const wrapperPath = 'scripts/macos-tunnel-wrapper.sh';
const wrapper = await fs.readFile(wrapperPath, 'utf8');
const service = await fs.readFile('scripts/macos-service.sh', 'utf8');
const status = await fs.readFile('scripts/macos-runtime-status.sh', 'utf8');

assert.match(wrapper, /\/usr\/bin\/caffeinate -i -w "\$tunnel_pid"/);
assert.match(wrapper, /"\$REAL_TUNNEL_CLIENT" "\$@" &/);
assert.match(wrapper, /CAFFEINATE_PID_FILE/);
assert.match(wrapper, /trap forward_stop TERM INT/);
assert.match(service, /DANIEL_COMMANDER_TUNNEL_CLIENT": tunnel_wrapper/);
assert.match(service, /DANIEL_COMMANDER_REAL_TUNNEL_CLIENT": tunnel_client/);
assert.match(status, /caffeinate\.pid/);
assert.match(status, /CAFFEINATE_COUNT=/);
assert.match(status, /CAFFEINATE_PID=/);
console.log('LIFECYCLE_ACTIVE_ONLY_CONTRACT_PASS');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function childPids(parentPid: number, commandName: string): number[] {
  const result = spawnSync('/usr/bin/pgrep', ['-P', String(parentPid), '-x', commandName], {
    encoding: 'utf8'
  });
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`pgrep failed with status ${result.status}: ${result.stderr}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(Number);
}

function processCommand(pid: number): string {
  const result = spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs = 100
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(intervalMs);
  }
  return predicate();
}

if (process.platform === 'darwin') {
  const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'daniel-commander-p8-'));
  const child = spawn(wrapperPath, ['30'], {
    env: {
      ...process.env,
      DANIEL_COMMANDER_REAL_TUNNEL_CLIENT: '/bin/sleep',
      DANIEL_COMMANDER_STATE_DIR: stateDir
    },
    stdio: 'ignore'
  });

  assert.ok(child.pid, 'wrapper process did not start');
  const wrapperPid = child.pid;

  try {
    const tunnelAppeared = await waitFor(() => childPids(wrapperPid, 'sleep').length === 1, 3000);
    assert.equal(tunnelAppeared, true, 'exactly one wrapped tunnel child did not appear');
    const [tunnelPid] = childPids(wrapperPid, 'sleep');

    const caffeinateAppeared = await waitFor(() => childPids(wrapperPid, 'caffeinate').length === 1, 3000);
    assert.equal(caffeinateAppeared, true, 'exactly one caffeinate child did not appear');
    const [caffeinatePid] = childPids(wrapperPid, 'caffeinate');

    const command = processCommand(caffeinatePid);
    assert.match(command, new RegExp(`caffeinate -i -w ${tunnelPid}$`));

    const pidFile = path.join(stateDir, 'caffeinate.pid');
    const persistedPid = Number((await fs.readFile(pidFile, 'utf8')).trim());
    assert.equal(persistedPid, caffeinatePid, 'caffeinate pid file did not match live process');
    console.log('LIFECYCLE_CAFFEINATE_CHILD_LIVE_PASS');
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
  }

  await new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    child.once('exit', () => resolve());
  });

  const descendantsGone = await waitFor(
    () => childPids(wrapperPid, 'sleep').length === 0 && childPids(wrapperPid, 'caffeinate').length === 0,
    3000
  );
  assert.equal(descendantsGone, true, 'wrapper descendants survived shutdown');

  await assert.rejects(
    fs.access(path.join(stateDir, 'caffeinate.pid')),
    'caffeinate pid file survived shutdown'
  );
  await fs.rm(stateDir, { recursive: true, force: true });
  console.log('LIFECYCLE_CAFFEINATE_CLEANUP_LIVE_PASS');
} else {
  console.log('LIFECYCLE_CAFFEINATE_LIVE_SKIPPED_NON_DARWIN');
}
