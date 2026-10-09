import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Regression: a failed local child spawn must not print a supplied shell command
// or child-supplied exception text into LocalBridge server-side diagnostics.
// No real SSH, provider, network, or privileged command is executed.
const fixtureRoot = process.env.LOCALBRIDGE_LB14_FIXTURE_ROOT;
assert.ok(fixtureRoot, 'isolated fixture root is mandatory');
await fs.mkdir(fixtureRoot, { recursive: true });
const configDir = path.join(fixtureRoot, 'config');
process.env.LOCALBRIDGE_MCP_CONFIG_DIR = configDir;

const { terminalManager } = await import('../src/core/terminal-manager.js');
const captured: string[] = [];
const priorError = console.error;
const secretMarker = 'LB14_SYNTHETIC_PRIVATE_ARG_CANARY';
try {
  console.error = (...values: unknown[]) => captured.push(values.map(String).join(' '));

  // Deliberately unavailable local shell: ENOENT is emitted by Node's spawn
  // mechanism, and must produce an ordinary spawn_error, not a policy label.
  const result = await terminalManager.executeCommand(
    'printf ' + secretMarker,
    750,
    '/nonexistent/lb14-synthetic-shell',
    false
  );
  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(result.isComplete, true);
  assert.equal(result.status, 'spawn_error');
  assert.equal(result.isBlocked, false);
} finally {
  console.error = priorError;
}
const output = captured.join('\n');
assert.doesNotMatch(output, /LB14_SYNTHETIC_PRIVATE_ARG_CANARY/);
assert.doesNotMatch(output, /\/nonexistent\/lb14-synthetic-shell/);
console.log('LB14_SPAWN_ERROR_STDERR_REDACTION_PASS');
