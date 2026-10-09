import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Exercises only a local fixture named ssh on PATH. No real SSH binary or network is invoked.
if (process.platform === 'win32') {
  console.log('LB13_POSIX_SSH_FIXTURE_SKIPPED_ON_WINDOWS');
} else {
  const rootBase = process.env.LOCALBRIDGE_LB13_FIXTURE_ROOT || os.tmpdir();
  await fs.mkdir(rootBase, { recursive: true });
  const scratch = await fs.mkdtemp(path.join(rootBase, 'ssh-pty-'));
  const fakeSsh = path.join(scratch, 'ssh');
  const previousPath = process.env.PATH;
  const originalError = console.error;
  const capturedErrors: string[] = [];

  try {
    await fs.writeFile(fakeSsh, [
      '#!/bin/sh',
      'for arg in "$@"; do',
      '  printf "ARG{%s}\\n" "$arg"',
      'done'
    ].join('\n') + '\n');
    await fs.chmod(fakeSsh, 0o700);
    process.env.PATH = scratch + path.delimiter + (previousPath || '');
    console.error = (...args: unknown[]) => { capturedErrors.push(args.map(String).join(' ')); };

    const { terminalManager } = await import('../src/core/terminal-manager.js');
    const run = async (command: string) => {
      const response = await terminalManager.executeCommand(command, 2500, '/bin/sh', false);
      assert.equal(response.status, 'process_exit', 'local ssh fixture must exit normally');
      assert.equal(response.isComplete, true);
      assert.equal(response.exitCode, 0);
      return response.output;
    };

    // Explicit no-TTY must win over legacy auto-PTY. Never inject a conflicting -t.
    const disabled = await run('ssh -T example.invalid');
    assert.match(disabled, /ARG\{-T\}/);
    assert.doesNotMatch(disabled, /ARG\{-t\}/);

    // OpenSSH's explicit RequestTTY=no must likewise not be silently overridden.
    const requestTtyNo = await run('ssh -o RequestTTY=no example.invalid');
    assert.match(requestTtyNo, /ARG\{RequestTTY=no\}/);
    assert.doesNotMatch(requestTtyNo, /ARG\{-t\}/);

    // Existing explicit PTY choice must not receive another -t.
    const force = await run('ssh -tt example.invalid');
    assert.match(force, /ARG\{-tt\}/);
    assert.doesNotMatch(force, /ARG\{-t\}/);

    // Legacy bare SSH still uses its old default until a separately reviewed API migration.
    const legacy = await run('ssh example.invalid');
    assert.match(legacy, /ARG\{-t\}/);

    // Diagnostic output must never echo sensitive command arguments.
    await run('ssh example.invalid --synthetic-token=LB13_PRIVATE_FIXTURE');
    assert.equal(capturedErrors.some(line => line.includes('LB13_PRIVATE_FIXTURE')), false, 'raw SSH argv leaked to console');
    console.log('LB13_SSH_PTY_ARGUMENTS_AND_COMMAND_LOG_PRIVACY_PASS');
  } finally {
    console.error = originalError;
    process.env.PATH = previousPath;
    await fs.rm(scratch, { recursive: true, force: true });
  }
}
