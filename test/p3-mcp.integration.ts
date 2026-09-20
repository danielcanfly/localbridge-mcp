import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { DANIEL_COMMANDER_TOOL_NAMES } from '../src/mcp/server.js';

function textOf(result: any): string {
  return (result.content || [])
    .filter((item: any) => item.type === 'text')
    .map((item: any) => item.text)
    .join('');
}

function jsonOf(result: any): any {
  return JSON.parse(textOf(result));
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  return client.callTool({ name, arguments: args });
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'daniel-commander-p3-'));
const configDir = path.join(root, 'config');
const workspace = path.join(root, 'workspace');
await fs.mkdir(configDir, { recursive: true });
await fs.mkdir(workspace, { recursive: true });
await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
  blockedCommands: ['sudo', 'su', 'shutdown', 'reboot', 'dd', 'mkfs'],
  defaultShell: process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh'),
  allowedDirectories: [workspace],
  fileReadLineLimit: 1000,
  fileWriteLineLimit: 2000
}, null, 2));

await fs.writeFile(path.join(workspace, 'alpha.txt'), 'alpha\nneedle line\nomega\n');
await fs.writeFile(path.join(workspace, 'second.txt'), 'second file\n');

const transport = new StdioClientTransport({
  command: '/usr/bin/env',
  args: [
    `DANIEL_COMMANDER_CONFIG_DIR=${configDir}`,
    process.execPath,
    path.resolve('dist/src/index.js')
  ],
  cwd: process.cwd(),
  stderr: 'pipe'
});

let stderr = '';
transport.stderr?.on('data', chunk => { stderr += chunk.toString(); });

const client = new Client({ name: 'daniel-commander-p3-test', version: '0.0.1' });

try {
  await client.connect(transport);

  const listed = await client.listTools();
  const names = listed.tools.map(tool => tool.name).sort();
  assert.deepEqual(names, [...DANIEL_COMMANDER_TOOL_NAMES].sort());
  assert.equal(listed.tools.length, 17);
  const writeTool = listed.tools.find(tool => tool.name === 'write_file');
  const processTool = listed.tools.find(tool => tool.name === 'start_process');
  assert.equal(writeTool?.annotations?.destructiveHint, true);
  assert.equal(processTool?.annotations?.openWorldHint, true);
  console.log('P3_TOOL_DISCOVERY_PASS');

  const read = await call(client, 'read_file', { path: path.join(workspace, 'alpha.txt') });
  assert.equal(textOf(read), 'alpha\nneedle line\nomega\n');
  const multi = jsonOf(await call(client, 'read_multiple_files', {
    paths: [path.join(workspace, 'alpha.txt'), path.join(workspace, 'second.txt')]
  }));
  assert.equal(multi.length, 2);
  assert.match(multi[1].content, /second file/);

  const listing = jsonOf(await call(client, 'list_directory', { path: workspace }));
  assert(listing.some((x: any) => x.name === 'alpha.txt'));
  const info = jsonOf(await call(client, 'get_file_info', { path: path.join(workspace, 'alpha.txt') }));
  assert.equal(info.isFile, true);

  const nested = path.join(workspace, 'created', 'nested');
  assert.match(textOf(await call(client, 'create_directory', { path: nested })), /CREATED/);
  const writePath = path.join(nested, 'write.txt');
  assert.match(textOf(await call(client, 'write_file', {
    path: writePath,
    content: 'ONE\n',
    mode: 'rewrite'
  })), /WROTE/);
  await call(client, 'write_file', { path: writePath, content: 'TWO\n', mode: 'append' });
  assert.equal(await fs.readFile(writePath, 'utf8'), 'ONE\nTWO\n');

  const movedPath = path.join(nested, 'moved.txt');
  await call(client, 'move_file', { source: writePath, destination: movedPath });
  assert.equal(await fs.readFile(movedPath, 'utf8'), 'ONE\nTWO\n');
  console.log('P3_FILESYSTEM_TOOLS_PASS');

  const editPath = path.join(workspace, 'edit.txt');
  await fs.writeFile(editPath, 'Hello brave old world\n');
  const editExact = jsonOf(await call(client, 'edit_block', {
    path: editPath,
    old_string: 'brave old',
    new_string: 'bright new',
    expected_replacements: 1
  }));
  assert.equal(editExact.fuzzy, false);
  const editFuzzy = jsonOf(await call(client, 'edit_block', {
    path: editPath,
    old_string: 'Hello bright new world!',
    new_string: 'Hello fuzzy world',
    expected_replacements: 1
  }));
  assert.equal(editFuzzy.fuzzy, true);
  assert.match(await fs.readFile(editPath, 'utf8'), /Hello fuzzy world/);
  console.log('P3_EDIT_TOOL_PASS');

  const searchStart = jsonOf(await call(client, 'start_search', {
    root_path: workspace,
    pattern: 'needle',
    search_type: 'content',
    literal_search: true,
    max_results: 20
  }));
  const searchId = searchStart.sessionId;
  assert.match(searchId, /^search_/);

  let searchPage: any = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 30));
    searchPage = jsonOf(await call(client, 'get_more_search_results', {
      session_id: searchId,
      offset: 0,
      length: 100
    }));
    if (searchPage.isComplete) break;
  }
  assert(searchPage.results.some((r: any) => r.file.endsWith('alpha.txt')));
  const searches = jsonOf(await call(client, 'list_searches'));
  assert(searches.some((s: any) => s.sessionId === searchId));
  const stop = jsonOf(await call(client, 'stop_search', { session_id: searchId }));
  assert.equal(stop.stopped, true);
  console.log('P3_SEARCH_TOOLS_PASS');

  const blocked = await call(client, 'start_process', { command: 'sudo -n true', timeout_ms: 250 });
  assert.equal(blocked.isError, true);
  assert.match(textOf(blocked), /blocked/i);

  const persistent = jsonOf(await call(client, 'start_process', {
    command: `node -e "process.stdin.setEncoding('utf8'); console.log('READY>'); process.stdin.on('data',d=>console.log('ECHO:'+d.trim()))"`,
    timeout_ms: 750
  }));
  assert(persistent.pid > 0);
  let initialOutput: any = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    initialOutput = jsonOf(await call(client, 'read_process_output', {
      pid: persistent.pid,
      offset: -20,
      length: 20
    }));
    if (initialOutput.lines.join('\n').includes('READY')) break;
  }
  assert.match(initialOutput.lines.join('\n'), /READY/);

  const interaction = await call(client, 'interact_with_process', {
    pid: persistent.pid,
    input: 'hello'
  });
  assert.match(textOf(interaction), /INPUT_SENT/);
  await new Promise(resolve => setTimeout(resolve, 150));

  const output = jsonOf(await call(client, 'read_process_output', {
    pid: persistent.pid,
    offset: -20,
    length: 20
  }));
  assert.match(output.lines.join('\n'), /ECHO:hello/);

  const sessions = jsonOf(await call(client, 'list_sessions'));
  assert(sessions.active.some((s: any) => s.pid === persistent.pid));

  const terminated = await call(client, 'force_terminate', { pid: persistent.pid });
  assert.match(textOf(terminated), /TERMINATION_REQUESTED/);
  console.log('P3_TERMINAL_TOOLS_PASS');

  const escape = await call(client, 'read_file', { path: '/etc/hosts' });
  assert.equal(escape.isError, true);
  assert.match(textOf(escape), /outside allowed directories/i);
  console.log('P3_POLICY_BOUNDARY_PASS');

  assert.match(stderr, /Daniel Commander MCP ready on stdio/);
  console.log('P3_MCP_STDIO_PASS');
} finally {
  await client.close();
  await fs.rm(root, { recursive: true, force: true });
}
