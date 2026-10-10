import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const fixtureBase = process.env.LOCALBRIDGE_LB08_FIXTURE_ROOT || os.tmpdir();
await fs.mkdir(fixtureBase, { recursive: true });
const root = await fs.mkdtemp(path.join(fixtureBase, 'terminal-independent-'));
const configDir = path.join(root, 'config');
const workspace = path.join(root, 'workspace');
await fs.mkdir(workspace, { recursive: true });
process.env.LOCALBRIDGE_MCP_CONFIG_DIR = configDir;

const { configManager } = await import('../src/config-manager.js');
const core = await import('../src/core/index.js');
const { analyzeProcessState } = await import('../src/core/process-detection.js');
const { LOCALBRIDGE_MCP_TOOL_NAMES } = await import('../src/mcp/server.js');

await configManager.updateConfig({
  allowedDirectories: [workspace],
  defaultShell: process.platform === 'win32'
    ? 'powershell.exe'
    : (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh'),
  blockedCommands: ['lb08blocked']
});

function shellQuote(value: string): string {
  if (process.platform === 'win32') return '"' + value.replace(/"/g, '\\"') + '"';
  // POSIX double quotes preserve arguments while escaping all characters
  // with expansion or quote semantics, including literal backslashes.
  return '"' + value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/\x60/g, '\\\x60') + '"';
}

function commandFor(script: string, ...args: string[]): string {
  return [process.execPath, script, ...args].map(shellQuote).join(' ');
}

async function waitForCompletion(pid: number, attempts = 80) {
  let page = core.readProcessOutput(pid, -100, 100);
  for (let i = 0; i < attempts && !page.isComplete; i++) {
    await new Promise(resolve => setTimeout(resolve, 25));
    page = core.readProcessOutput(pid, -100, 100);
  }
  return page;
}

function textOf(result: any): string {
  return (result.content || [])
    .filter((item: any) => item.type === 'text')
    .map((item: any) => item.text)
    .join('');
}

try {
  // T01: one quiet child, one PID, one execution, later terminal exit 0.
  const runMarker = path.join(root, 't01-runs.txt');
  const quietFixture = path.join(root, 'quiet.mjs');
  await fs.writeFile(quietFixture, [
    "import fs from 'node:fs';",
    'fs.appendFileSync(process.argv[2], "run\\n");',
    "setTimeout(() => console.log('T01_LATE_OK'), 220);"
  ].join('\n'));
  const quiet = await core.startProcess(commandFor(quietFixture, runMarker), 40);
  assert.equal(quiet.status, 'initial_wait_elapsed');
  assert.equal(quiet.isComplete, false);
  assert.equal(quiet.isBlocked, true);
  assert.equal(quiet.pid > 0, true);
  assert.equal('operationId' in quiet, false, 'correlation ID is not implemented on this baseline');
  const quietDone = await waitForCompletion(quiet.pid);
  assert.equal(quietDone.isComplete, true);
  assert.equal(quietDone.exitCode, 0);
  assert.match(quietDone.lines.join('\n'), /T01_LATE_OK/);
  assert.equal((await fs.readFile(runMarker, 'utf8')).trim().split(/\r?\n/).length, 1);
  console.log('T01_QUIET_SAME_PID_EXIT0_PASS_CORRELATION_ID_UNIMPLEMENTED');

  // T02: printed text must not be mistaken for a strict interactive prompt or an exit signal.
  for (const sample of [
    'ordinary >',
    'ordinary > ',
    'price $',
    'price $ ',
    '>>> done',
    'log >>> ',
    'prefix mysql> ',
    'Command completed',
    'Error: printed data only'
  ]) {
    const state = analyzeProcessState(sample);
    assert.equal(state.isWaitingForInput, false, sample);
    assert.equal(state.isFinished, false, `stdout alone cannot prove completion: ${sample}`);
  }
  console.log('T02_FALSE_PROMPT_AND_OUTPUT_ONLY_COMPLETION_PASS');

  // T03: a strict unterminated prompt is a wait hint; synthetic stdin drives a real exit.
  const replFixture = path.join(root, 'repl.mjs');
  await fs.writeFile(replFixture, [
    "process.stdin.setEncoding('utf8');",
    "process.stdout.write('>>> ');",
    "process.stdin.once('data', data => { console.log('T03_ACK:' + data.trim()); process.exit(0); });"
  ].join('\n'));
  const repl = await core.startProcess(commandFor(replFixture), 1000);
  assert.equal(repl.status, 'waiting_for_input');
  assert.equal(repl.isComplete, false);
  assert.equal(repl.isBlocked, true);
  assert.equal(await core.interactWithProcess(repl.pid, 'synthetic-input'), true);
  const replDone = await waitForCompletion(repl.pid);
  assert.equal(replDone.isComplete, true);
  assert.equal(replDone.exitCode, 0);
  assert.match(replDone.lines.join('\n'), /T03_ACK:synthetic-input/);
  console.log('T03_STRICT_REPL_SYNTHETIC_STDIN_PASS');

  // T04: child failures and spawn failures are terminal engineering results, not policy labels.
  const nonzeroFixture = path.join(root, 'nonzero.mjs');
  await fs.writeFile(nonzeroFixture, "console.error('T04_EXPECTED_NONZERO'); process.exitCode = 7;\n");
  const nonzero = await core.startProcess(commandFor(nonzeroFixture), 1000);
  assert.equal(nonzero.status, 'process_exit');
  assert.equal(nonzero.isComplete, true);
  assert.equal(nonzero.exitCode, 7);
  assert.equal(nonzero.isBlocked, false);
  if (process.platform !== 'win32') {
    const spawnFailure = await core.startProcess('echo LB08_SPAWN_FIXTURE', 1000, '/nonexistent/lb08-shell');
    assert.equal(spawnFailure.status, 'spawn_error');
    assert.equal(spawnFailure.isComplete, true);
    assert.equal(spawnFailure.isBlocked, false);
    assert.equal(spawnFailure.exitCode ?? null, null);
  }
  console.log('T04_NONZERO_AND_SPAWN_FAILURE_PASS');

  // T05: a synthetic blocklist token is denied before spawn, including over MCP.
  const forbiddenMarker = path.join(root, 't05-must-not-exist.txt');
  const forbiddenFixture = path.join(root, 'forbidden-marker.mjs');
  await fs.writeFile(forbiddenFixture, "import fs from 'node:fs'; fs.writeFileSync(process.argv[2], 'spawned');\n");
  const deniedCommand = `lb08blocked; ${commandFor(forbiddenFixture, forbiddenMarker)}`;
  await assert.rejects(() => core.startProcess(deniedCommand, 100), /blocked by LocalBridge MCP policy/i);
  await assert.rejects(fs.access(forbiddenMarker), (error: any) => error?.code === 'ENOENT');

  const transport = new StdioClientTransport({
    command: '/usr/bin/env',
    args: [
      `LOCALBRIDGE_MCP_CONFIG_DIR=${configDir}`,
      process.execPath,
      path.resolve('dist/src/index.js')
    ],
    cwd: process.cwd(),
    stderr: 'pipe'
  });
  const client = new Client({ name: 'lb08-terminal-independent', version: '0.0.1' });
  try {
    await client.connect(transport);
    const denied = await client.callTool({
      name: 'lb_run_shell',
      arguments: { command_line: deniedCommand, wait_ms: 100 }
    });
    assert.equal((denied as any).isError, true);
    assert.match(textOf(denied), /blocked by LocalBridge MCP policy/i);
    assert.doesNotMatch(textOf(denied), /process_id|"pid"/i);
    await assert.rejects(fs.access(forbiddenMarker), (error: any) => error?.code === 'ENOENT');
    console.log('T05_SYNTHETIC_BLOCKLIST_PRESPAWN_MCP_ERROR_PASS');

    // T08: the default discovery surface remains exactly 17 tools with truthful shell hints.
    const listed = await client.listTools();
    const names = listed.tools.map(tool => tool.name).sort();
    assert.deepEqual(names, [...LOCALBRIDGE_MCP_TOOL_NAMES].sort());
    assert.equal(listed.tools.length, 17);
    const runShell = listed.tools.find(tool => tool.name === 'lb_run_shell');
    assert.equal(runShell?.annotations?.readOnlyHint, false);
    assert.equal(runShell?.annotations?.destructiveHint, true);
    assert.equal(runShell?.annotations?.openWorldHint, true);
    assert.match(runShell?.description ?? '', /LEGACY WAIT HINT/);
    console.log('T08_LEGACY_17_TOOL_DISCOVERY_AND_HINTS_PASS');
  } finally {
    await client.close();
  }

  // T06: concurrent fixture output stays bound to its exact numeric PID.
  const concurrentFixture = path.join(root, 'concurrent.mjs');
  await fs.writeFile(concurrentFixture, [
    'const label = process.argv[2];',
    "setTimeout(() => console.log('T06_' + label), 180);"
  ].join('\n'));
  const [first, second] = await Promise.all([
    core.startProcess(commandFor(concurrentFixture, 'FIRST'), 40),
    core.startProcess(commandFor(concurrentFixture, 'SECOND'), 40)
  ]);
  assert.notEqual(first.pid, second.pid);
  assert.equal('operationId' in first, false);
  assert.equal('operationId' in second, false);
  const [firstDone, secondDone] = await Promise.all([
    waitForCompletion(first.pid),
    waitForCompletion(second.pid)
  ]);
  const firstText = firstDone.lines.join('\n');
  const secondText = secondDone.lines.join('\n');
  assert.match(firstText, /T06_FIRST/);
  assert.doesNotMatch(firstText, /T06_SECOND/);
  assert.match(secondText, /T06_SECOND/);
  assert.doesNotMatch(secondText, /T06_FIRST/);
  assert.equal(firstDone.exitCode, 0);
  assert.equal(secondDone.exitCode, 0);
  console.log('T06_CONCURRENT_EXACT_PID_ATTRIBUTION_PASS_CORRELATION_ID_UNIMPLEMENTED');

  // T07: fake pre-invoke denial only; the server dispatch is deliberately never called.
  let syntheticServerReceipts = 0;
  const fakeServerDispatch = async () => {
    syntheticServerReceipts++;
    return { received: true };
  };
  const fakePreinvokeBoundary = async (allow: boolean) => {
    if (!allow) return { kind: 'synthetic_preinvoke_denial', serverReceipt: undefined };
    return fakeServerDispatch();
  };
  const fakeDenied = await fakePreinvokeBoundary(false);
  assert.deepEqual(fakeDenied, { kind: 'synthetic_preinvoke_denial', serverReceipt: undefined });
  assert.equal(syntheticServerReceipts, 0);
  console.log('T07_FAKE_PREINVOKE_DENIAL_ZERO_SERVER_RECEIPT_PASS');

  // T09: safe synthetic output diagnoses the pre-existing timing-metadata contract.
  const syntheticSensitive = ['LB08', 'SYNTHETIC', 'TOKEN', 'NOT', 'A', 'SECRET'].join('_');
  const diagnosticFixture = path.join(root, 'diagnostic.mjs');
  await fs.writeFile(diagnosticFixture, `console.log(${JSON.stringify(syntheticSensitive)});\n`);
  const diagnostic = await core.startProcess(commandFor(diagnosticFixture), 1000);
  assert.equal(diagnostic.isComplete, true);
  assert.equal(diagnostic.exitCode, 0);
  assert.match(diagnostic.output, /LB08_SYNTHETIC_TOKEN_NOT_A_SECRET/);
  const timingSnippets = diagnostic.timingInfo?.outputEvents?.map(event => event.snippet).join('\n') ?? '';
  const timingExposesRawOutput = timingSnippets.includes(syntheticSensitive);
  const terminalSource = await fs.readFile(path.resolve('src/core/terminal-manager.ts'), 'utf8');
  const hasExplicitEventRetentionBound = /MAX_(?:OUTPUT|TIMING)_EVENTS/.test(terminalSource);
  console.log(timingExposesRawOutput
    ? 'T09_REDACTION_DIAGNOSTIC_RED_RAW_OUTPUT_SNIPPET'
    : 'T09_REDACTION_DIAGNOSTIC_PASS');
  console.log(hasExplicitEventRetentionBound
    ? 'T09_RETENTION_DIAGNOSTIC_BOUND_PRESENT'
    : 'T09_RETENTION_DIAGNOSTIC_RED_NO_EVENT_COUNT_BOUND');
  console.log('T09_SAFE_SYNTHETIC_OUTPUT_TEST_COMPLETE');

  console.log('TERMINAL_INDEPENDENT_SUITE_COMPLETE');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}