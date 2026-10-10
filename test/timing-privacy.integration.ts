import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Nonnetwork, local-only T09 contract check. The fixture writes synthetic data;
// this test must fail on any timing metadata leak or unbounded event history.
const fixtureRoot = process.env.LOCALBRIDGE_LB15_FIXTURE_ROOT || process.env.TMPDIR;
assert.ok(fixtureRoot, 'worksite-local fixture root or TMPDIR is mandatory');
await fs.mkdir(fixtureRoot, { recursive: true });
const root = await fs.mkdtemp(path.join(fixtureRoot, 'lb15-timing-'));
process.env.LOCALBRIDGE_MCP_CONFIG_DIR = path.join(root, 'config');
const { configManager } = await import('../src/config-manager.js');
const core = await import('../src/core/index.js');
await configManager.updateConfig({
  defaultShell: process.platform === 'win32' ? 'powershell.exe' : (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh'),
  allowedDirectories: [root],
});

const canary = 'LB15_SYNTHETIC_NOT_A_CREDENTIAL_CANARY';
function shellQuote(v: string) {
  return process.platform === 'win32' ? JSON.stringify(v) : "'" + v.replace(/'/g, "'\"'\"'") + "'";
}
try {
  // Use fixed synthetic source with Node -e rather than turning a TMPDIR-
  // derived file path into a shell argument. This keeps the same stdout/stderr
  // timing stress but eliminates a false-positive environment-to-shell flow.
  const inlineFixture = [
    "const wait = ms => new Promise(resolve => setTimeout(resolve, ms));",
    "(async () => {",
    "for (let i = 0; i < 240; i++) {",
    "  process.stdout.write('LB15_SYNTHETIC_NOT_A_CREDENTIAL_CANARY_STDOUT_' + i + '\\n');",
    "  process.stderr.write('LB15_SYNTHETIC_NOT_A_CREDENTIAL_CANARY_STDERR_' + i + '\\n');",
    "  await wait(3);",
    "}",
    "})().catch(() => { process.exitCode = 1; });"
  ].join('\n');
  const result = await core.startProcess(
    [process.execPath, '-e', inlineFixture].map(shellQuote).join(' '), 5000
  );
  assert.equal(result.isComplete, true, 'fixture needs a final child result');
  assert.equal(result.exitCode, 0);
  assert.match(result.output, /LB15_SYNTHETIC_NOT_A_CREDENTIAL_CANARY/);
  const events = result.timingInfo?.outputEvents;
  assert.ok(Array.isArray(events) && events.length > 0, 'timing events should exist for exercised fixture');
  assert.ok(events.length <= 128, 'timing event metadata must have strict 128-record cap');
  assert.ok(events.some(e => e.source === 'stdout'));
  assert.ok(events.some(e => e.source === 'stderr'));
  for (const event of events) {
    assert.ok(Number.isFinite(event.timestamp));
    assert.ok(event.length > 0);
    assert.equal(event.snippet, '[redacted]', 'legacy required snippet must carry no raw stdout/stderr');
  }
  assert.doesNotMatch(JSON.stringify(result.timingInfo), /LB15_SYNTHETIC_NOT_A_CREDENTIAL_CANARY/);
  // The normal result and paged child output are intentionally NOT redacted:
  // this contract only prevents a redundant telemetry copy of raw child data.
  assert.ok(result.output.includes(canary));
  console.log('LB15_T09_TIMING_METADATA_REDACTED_AND_BOUNDED_PASS');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}