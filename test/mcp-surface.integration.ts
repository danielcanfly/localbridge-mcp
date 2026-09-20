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
  fileWriteLineLimit: 2
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
  const writeTool = listed.tools.find(tool => tool.name === 'dc_write_text');
  const processTool = listed.tools.find(tool => tool.name === 'dc_run_shell');
  assert.equal(writeTool?.annotations?.destructiveHint, true);
  assert.equal(processTool?.annotations?.openWorldHint, true);
  console.log('MCP_TOOL_DISCOVERY_PASS');

  const read = await call(client, 'dc_read_text', { file_path: path.join(workspace, 'alpha.txt') });
  assert.equal(textOf(read), 'alpha\nneedle line\nomega\n');
  const multi = jsonOf(await call(client, 'dc_read_many_texts', {
    file_paths: [path.join(workspace, 'alpha.txt'), path.join(workspace, 'second.txt')]
  }));
  assert.equal(multi.length, 2);
  assert.match(multi[1].content, /second file/);

  const listing = jsonOf(await call(client, 'dc_list_entries', { directory_path: workspace }));
  assert(listing.some((x: any) => x.name === 'alpha.txt'));
  const info = jsonOf(await call(client, 'dc_stat_path', { target_path: path.join(workspace, 'alpha.txt') }));
  assert.equal(info.isFile, true);

  const nested = path.join(workspace, 'created', 'nested');
  assert.match(textOf(await call(client, 'dc_make_directory', { directory_path: nested })), /CREATED/);
  const writePath = path.join(nested, 'write.txt');
  assert.match(textOf(await call(client, 'dc_write_text', {
    file_path: writePath,
    text: 'ONE\n',
    write_mode: 'rewrite'
  })), /WROTE/);
  await call(client, 'dc_write_text', { file_path: writePath, text: 'TWO\n', write_mode: 'append' });
  assert.equal(await fs.readFile(writePath, 'utf8'), 'ONE\nTWO\n');

  const advisoryPath = path.join(nested, 'advisory.txt');
  const advisory = textOf(await call(client, 'dc_write_text', {
    file_path: advisoryPath,
    text: 'one\ntwo\nthree',
    write_mode: 'rewrite'
  }));
  assert.match(advisory, /configured advisory threshold is 2/);

  const movedPath = path.join(nested, 'moved.txt');
  await call(client, 'dc_move_path', { from_path: writePath, to_path: movedPath });
  assert.equal(await fs.readFile(movedPath, 'utf8'), 'ONE\nTWO\n');
  console.log('MCP_FILESYSTEM_TOOLS_PASS');

  const editPath = path.join(workspace, 'edit.txt');
  await fs.writeFile(editPath, 'Hello brave old world\n');
  const editExact = jsonOf(await call(client, 'dc_patch_text_block', {
    file_path: editPath,
    find_text: 'brave old',
    replace_text: 'bright new',
    expected_matches: 1
  }));
  assert.equal(editExact.fuzzy, false);
  const editFuzzy = jsonOf(await call(client, 'dc_patch_text_block', {
    file_path: editPath,
    find_text: 'Hello bright new world!',
    replace_text: 'Hello fuzzy world',
    expected_matches: 1
  }));
  assert.equal(editFuzzy.fuzzy, true);
  assert.match(await fs.readFile(editPath, 'utf8'), /Hello fuzzy world/);
  console.log('MCP_EDIT_TOOL_PASS');

  const searchStart = jsonOf(await call(client, 'dc_search_start', {
    search_root: workspace,
    query_text: 'needle',
    query_kind: 'content',
    fixed_string: true,
    result_limit: 20
  }));
  const searchId = searchStart.sessionId;
  assert.match(searchId, /^search_/);

  let searchPage: any = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 30));
    searchPage = jsonOf(await call(client, 'dc_search_read', {
      search_id: searchId,
      result_offset: 0,
      result_count: 100
    }));
    if (searchPage.isComplete) break;
  }
  assert(searchPage.results.some((r: any) => r.file.endsWith('alpha.txt')));
  const searches = jsonOf(await call(client, 'dc_search_sessions'));
  assert(searches.some((s: any) => s.sessionId === searchId));
  const stop = jsonOf(await call(client, 'dc_search_cancel', { search_id: searchId }));
  assert.equal(stop.stopped, true);
  console.log('MCP_SEARCH_TOOLS_PASS');

  const blocked = await call(client, 'dc_run_shell', { command_line: 'sudo -n true', wait_ms: 250 });
  assert.equal(blocked.isError, true);
  assert.match(textOf(blocked), /blocked/i);

  const persistent = jsonOf(await call(client, 'dc_run_shell', {
    command_line: `node -e "process.stdin.setEncoding('utf8'); console.log('READY>'); process.stdin.on('data',d=>console.log('ECHO:'+d.trim()))"`,
    wait_ms: 750
  }));
  assert(persistent.pid > 0);
  let initialOutput: any = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    initialOutput = jsonOf(await call(client, 'dc_shell_output', {
      process_id: persistent.pid,
      line_offset: -20,
      line_count: 20
    }));
    if (initialOutput.lines.join('\n').includes('READY')) break;
  }
  assert.match(initialOutput.lines.join('\n'), /READY/);

  const interaction = await call(client, 'dc_shell_input', {
    process_id: persistent.pid,
    stdin_text: 'hello'
  });
  assert.match(textOf(interaction), /INPUT_SENT/);
  await new Promise(resolve => setTimeout(resolve, 150));

  const output = jsonOf(await call(client, 'dc_shell_output', {
    process_id: persistent.pid,
    line_offset: -20,
    line_count: 20
  }));
  assert.match(output.lines.join('\n'), /ECHO:hello/);

  const sessions = jsonOf(await call(client, 'dc_shell_sessions'));
  assert(sessions.active.some((s: any) => s.pid === persistent.pid));

  const terminated = await call(client, 'dc_shell_kill', { process_id: persistent.pid });
  assert.match(textOf(terminated), /TERMINATION_REQUESTED/);
  console.log('MCP_TERMINAL_TOOLS_PASS');

  const escape = await call(client, 'dc_read_text', { file_path: '/etc/hosts' });
  assert.equal(escape.isError, true);
  assert.match(textOf(escape), /outside allowed directories/i);
  console.log('MCP_POLICY_BOUNDARY_PASS');

  assert.match(stderr, /Daniel Commander MCP ready on stdio/);
  console.log('MCP_MCP_STDIO_PASS');
} finally {
  await client.close();
  await fs.rm(root, { recursive: true, force: true });
}
