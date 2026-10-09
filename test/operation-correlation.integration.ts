import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const fixtureBase = process.env.LOCALBRIDGE_LB16_FIXTURE_ROOT || process.env.TMPDIR;
assert.ok(fixtureBase, 'LB16 requires an explicit isolated fixture root');
await fs.mkdir(fixtureBase, { recursive: true });
const root = await fs.mkdtemp(path.join(fixtureBase, 'lb16-opid-'));
const config = path.join(root, 'config');
const workspace = path.join(root, 'workspace');
await fs.mkdir(workspace, { recursive: true });
await fs.mkdir(config, { recursive: true });
await fs.writeFile(path.join(config, 'config.json'), JSON.stringify({
  allowedDirectories: [workspace],
  defaultShell: process.platform === 'win32' ? 'powershell.exe' : (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh'),
  blockedCommands: ['sudo']
}));

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.resolve('dist/src/index.js')],
  cwd: process.cwd(),
  env: { ...process.env, LOCALBRIDGE_MCP_CONFIG_DIR: config },
  stderr: 'pipe'
});
const client = new Client({ name: 'lb16-fixture', version: '1.0.0' });
function textOf(value: any): string {
  return (value.content || []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('');
}
async function call(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}
async function jsonCall(name: string, args: Record<string, unknown>): Promise<any> {
  const response = await call(name, args);
  assert.notEqual(response.isError, true, textOf(response));
  return JSON.parse(textOf(response));
}

try {
  await client.connect(transport);
  const names = (await client.listTools()).tools;
  assert.equal(names.length, 17, 'no new privileged tool names are added');

  const command = process.platform === 'win32'
    ? `"${process.execPath}" -e "console.log('LB16_QUEUED'); setTimeout(()=>console.log('LB16_FINISHED'), 1400)"`
    : `'${process.execPath.replace(/'/g, `'"'"'`)}' -e "console.log('LB16_QUEUED'); setTimeout(()=>console.log('LB16_FINISHED'), 1400)"`;

  const first = await jsonCall('lb_run_shell', { command_line: command, wait_ms: 30 });
  const second = await jsonCall('lb_run_shell', { command_line: command, wait_ms: 30 });
  assert.ok(first.pid > 0 && second.pid > 0 && first.pid !== second.pid);
  assert.match(first.operationId || '', /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i);
  assert.match(second.operationId || '', /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i);
  assert.notEqual(first.operationId, second.operationId, 'unique ID for each execution');
  assert.equal(first.isComplete, false, 'execution remains in progress');
  assert.equal(second.isComplete, false, 'execution remains in progress');

  // An operationId is a correlation hint (not authentication). It must match PID
  // when supplied; fail before reading or mutating another operation.
  const wrongOutput = await call('lb_shell_output', {
    process_id: first.pid, operation_id: second.operationId, line_offset: -10, line_count: 10
  });
  assert.equal(wrongOutput.isError, true);
  assert.match(textOf(wrongOutput), /operation/i);
  const wrongInput = await call('lb_shell_input', {
    process_id: first.pid, operation_id: second.operationId, stdin_text: 'never-send'
  });
  assert.equal(wrongInput.isError, true);
  const wrongKill = await call('lb_shell_kill', {
    process_id: first.pid, operation_id: second.operationId
  });
  assert.equal(wrongKill.isError, true);
  console.log('LB16_MISMATCHED_ID_FAIL_CLOSED_BEFORE_OUTPUT_INPUT_KILL_PASS');

  // A caller that omits the ID keeps the legacy same-PID retrieval contract.
  const legacy = await jsonCall('lb_shell_output', { process_id: first.pid, line_offset: -10, line_count: 10 });
  assert.equal(legacy.operationId, first.operationId, 'additive field on legacy reply');

  // Correlated followups must all report the same operationId and numeric exit0.
  for (const job of [first, second]) {
    let final: any = undefined;
    for (let i = 0; i < 100; i++) {
      const output = await jsonCall('lb_shell_output', {
        process_id: job.pid, operation_id: job.operationId, line_offset: -20, line_count: 20
      });
      assert.equal(output.operationId, job.operationId);
      if (output.isComplete) { final = output; break; }
      await new Promise(r => setTimeout(r, 35));
    }
    assert.ok(final, 'process must finish');
    assert.equal(final.exitCode, 0);
    assert.match(final.lines.join('\n'), /LB16_FINISHED/);
  }
  console.log('LB16_CONCURRENT_PID_CORRELATION_AND_EXIT0_PASS');

  const blocked = await call('lb_run_shell', { command_line: 'sudo -n true', wait_ms: 100 });
  assert.equal(blocked.isError, true);
  assert.equal(/operationId/.test(textOf(blocked)), false, 'no execution id for local policy denial');
  console.log('LB16_PRESPAWN_DENIAL_HAS_NO_OPERATION_ID_PASS');
} finally {
  await client.close();
  await fs.rm(root, { recursive: true, force: true });
}
